import { getDay } from "./scheduleService.mjs";
import { formatDate, isAtOrAfterHour } from "./timeService.mjs";
import { showChoicePrompt } from "./notificationService.mjs";
import { appUrl } from "../config.mjs";
import { writeStartupLog } from "./startupLogger.mjs";
import { db } from "../database/jsonDatabase.mjs";

const HEARTBEAT_TIMEOUT_MS = 15_000;
const REFRESH_GRACE_MS = 8_000;
const MONITOR_INTERVAL_MS = 5_000;
const SUMMARY_TITLE = "\u6bcf\u65e5\u603b\u7ed3\u63d0\u9192";
const SUMMARY_BODY = "\u4e0d\u8981\u5fd8\u8bb0\u8bb0\u5f55\u6bcf\u65e5\u603b\u7ed3\u3002";

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
    status: "active",
    closingHandled: false
  });

  return { ok: true, sessionId, date: dateKey };
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

    session.status = "lost";
    session.closingHandled = true;
    await maybeNotifyDailySummaryOnClose(session.date, now);
  }
}

export async function maybeNotifyDailySummaryOnClose(dateKey = formatDate(), now = new Date()) {
  if (!isAtOrAfterHour(20, now)) return { notified: false, reason: "before_20" };

  const day = await getDay(dateKey);
  const hasOpenTasks = (day.tasks || []).some((task) => !task.done);
  const missingSummary = !(day.memos || []).length;
  if (!hasOpenTasks && !missingSummary) {
    return { notified: false, reason: "nothing_to_remind" };
  }

  const state = await setDailySummaryIfPending(dateKey);
  if (!state.shouldNotify) return { notified: false, reason: "already_notified" };

  const detail = [
    hasOpenTasks ? "今天还有未完成事项。" : "",
    missingSummary ? "今天还没有每日总结。" : "",
    "请选择填写、稍后提醒或退出。"
  ].filter(Boolean).join(" ");

  showChoicePrompt(SUMMARY_TITLE, detail || SUMMARY_BODY, {
    fillUrl: `${appUrl}/?date=${encodeURIComponent(dateKey)}&action=memo`,
    laterMessage: SUMMARY_BODY
  });
  writeStartupLog("daily_summary_close_notified", { date: dateKey });
  return { notified: true };
}

async function setDailySummaryIfPending(dateKey) {
  return db.update((data) => {
    data.agentState[dateKey] = data.agentState[dateKey] || {};
    const reminders = data.agentState[dateKey].dailyReminders || {};
    if (reminders.dailySummaryClose === "notified") {
      return { shouldNotify: false };
    }
    data.agentState[dateKey].dailyReminders = {
      ...reminders,
      dailySummaryClose: "notified"
    };
    data.agentState[dateKey].updatedAt = new Date().toISOString();
    return { shouldNotify: true };
  });
}
