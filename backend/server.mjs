import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { port, publicDir, srcDir } from "./config.mjs";
import { notifyDesktop } from "./services/notificationService.mjs";
import { generateWeeklyComment } from "./services/llmService.mjs";
import { createTask, getDay, recordGithubMaintenance, recordSportStatus, summarizeWeek, upsertDay } from "./services/scheduleService.mjs";
import { notifyDailySummaryReminder, runStartupRoutine, scheduleImportantReminders } from "./services/reminderScheduler.mjs";

const DEFAULT_NOTIFICATION_TITLE = "\u65e5\u7a0b\u63d0\u9192";
const serverStartedAt = Date.now();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml"
};

function safeJoin(base, requestPath) {
  const normalized = normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(base, normalized.replace(/^[/\\]/, ""));
  return filePath.startsWith(base) ? filePath : null;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

async function sendFile(response, filePath) {
  const body = await readFile(filePath);
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/day") {
    const date = url.searchParams.get("date");
    if (!date) {
      sendJson(response, 400, { error: "date is required" });
      return true;
    }
    sendJson(response, 200, await getDay(date));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/sync/day") {
    const body = await readBody(request);
    if (!body.date) {
      sendJson(response, 400, { error: "date is required" });
      return true;
    }
    const day = await upsertDay(body.date, body);
    scheduleImportantReminders(body.date, day.tasks);
    sendJson(response, 200, { ok: true, day });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/tasks") {
    const body = await readBody(request);
    if (!body.date || !body.title) {
      sendJson(response, 400, { error: "date and title are required" });
      return true;
    }
    const task = await createTask(body.date, body);
    const day = await getDay(body.date);
    scheduleImportantReminders(body.date, day.tasks);
    sendJson(response, 201, { ok: true, task });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/habits/sport") {
    const body = await readBody(request);
    if (!body.date) {
      sendJson(response, 400, { error: "date is required" });
      return true;
    }
    const state = await recordSportStatus(body.date, body);
    const day = await getDay(body.date);
    sendJson(response, 200, { ok: true, state, day });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/habits/github") {
    const body = await readBody(request);
    if (!body.date) {
      sendJson(response, 400, { error: "date is required" });
      return true;
    }
    const state = await recordGithubMaintenance(body.date, body);
    sendJson(response, 200, { ok: true, state });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/startup-check") {
    await runStartupRoutine(new Date());
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/notifications/daily-summary-reminder") {
    const body = await readBody(request);
    const notified = await notifyDailySummaryReminder(body.date, body.now ? new Date(body.now) : new Date());
    sendJson(response, 200, { ok: true, notified });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/notifications") {
    const body = await readBody(request);
    notifyDesktop(body.title || DEFAULT_NOTIFICATION_TITLE, body.message || "");
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/weekly-summary") {
    const summary = await summarizeWeek(new Date());
    const comment = await generateWeeklyComment(summary);
    sendJson(response, 200, { ...summary, comment });
    return true;
  }

  return false;
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);
    if (url.pathname.startsWith("/api/") && await handleApi(request, response, url)) return;

    let filePath;
    if (url.pathname === "/" || url.pathname === "/index.html") {
      filePath = join(srcDir, "index.html");
    } else if (url.pathname.startsWith("/public/")) {
      filePath = safeJoin(publicDir, url.pathname.replace("/public/", ""));
    } else {
      filePath = safeJoin(srcDir, url.pathname);
    }

    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    await sendFile(response, filePath);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
}).listen(port, () => {
  console.log(`Daily Schedule backend is running at http://localhost:${port} in ${Date.now() - serverStartedAt}ms`);
  runStartupRoutine(new Date()).catch(() => {});
});
