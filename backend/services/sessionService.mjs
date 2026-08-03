import { formatDate } from "./timeService.mjs";
import { showYesNoPrompt } from "./notificationService.mjs";
import { writeStartupLog } from "./startupLogger.mjs";

const HEARTBEAT_TIMEOUT_MS = 15_000;
const REFRESH_GRACE_MS = 8_000;
const MONITOR_INTERVAL_MS = 5_000;
const END_WORK_TITLE = "\u7ed3\u675f\u5de5\u4f5c\u786e\u8ba4";
const END_WORK_BODY = "\u662f\u5426\u7ed3\u675f\u4eca\u5929\u4e00\u5929\u7684\u5de5\u4f5c\uff1f";
const SUMMARY_BODY = "\u8bb0\u5f97\u5b8c\u6210\u4eca\u65e5\u603b\u7ed3\u8bb0\u5f55";

const sessions = new Map();
let monitor = null;

export function recordSessionHeartbeat(payload = {}) {
  const sessionId = String(payload.sessionId || "");
  if (!sessionId) return { ok: false, error: "sessionId is required" };

  const now = Date.now();
  const dateKey = payload.date || formatDate();
  const existing = sessions.get(sessionId) || {};
  sessions.set(sessionId, {
    sessionId,
    date: dateKey,
    startedAt: existing.startedAt || now,
    lastSeenAt: now,
    lastHiddenAt: payload.visibility === "hidden" ? now : existing.lastHiddenAt,
    closeIntentAt: payload.visibility === "visible" ? null : existing.closeIntentAt,
    status: "active",
    closingHandled: false
  });

  return { ok: true, sessionId, date: dateKey };
}

export function recordClosingIntent(payload = {}) {
  const sessionId = String(payload.sessionId || "");
  if (!sessionId) return { ok: false, error: "sessionId is required" };

  const now = Date.now();
  const existing = sessions.get(sessionId) || {};
  sessions.set(sessionId, {
    sessionId,
    date: payload.date || existing.date || formatDate(),
    startedAt: existing.startedAt || now,
    lastSeenAt: existing.lastSeenAt || now,
    lastHiddenAt: existing.lastHiddenAt,
    closeIntentAt: now,
    status: "active",
    closingHandled: false
  });

  return { ok: true, sessionId };
}

export function startSessionMonitor() {
  if (monitor) return false;
  monitor = setInterval(() => {
    checkSessions().catch((error) => {
      writeStartupLog("session_monitor_error", {
        error: error instanceof Error ? error.message : "session monitor failed"
      });
    });
  }, MONITOR_INTERVAL_MS);
  monitor.unref?.();
  writeStartupLog("session_monitor_start", { intervalMs: MONITOR_INTERVAL_MS });
  return true;
}

export async function checkSessions(now = new Date()) {
  const timestamp = now.getTime();
  for (const session of sessions.values()) {
    if (session.closingHandled || session.status !== "active") continue;
    const timeoutMs = session.lastHiddenAt ? HEARTBEAT_TIMEOUT_MS + REFRESH_GRACE_MS : HEARTBEAT_TIMEOUT_MS;
    if (timestamp - session.lastSeenAt <= timeoutMs) continue;
    if (!session.closeIntentAt) {
      session.status = "lost";
      session.closingHandled = true;
      continue;
    }

    session.status = "lost";
    session.closingHandled = true;
    await maybePromptEndWorkOnClose(session.date, now);
  }
}

export async function maybePromptEndWorkOnClose(dateKey = formatDate(), now = new Date()) {
  showYesNoPrompt(END_WORK_TITLE, END_WORK_BODY, {
    yesMessage: SUMMARY_BODY
  });
  writeStartupLog("end_work_prompt_shown", { date: dateKey });
  return { prompted: true };
}
