import { db } from "../database/jsonDatabase.mjs";

const DEFAULT_TASK_TITLE = "\u672a\u547d\u540d\u65e5\u7a0b";
const SPORT_TASK_TITLE = "\u4f53\u80b2\u8fd0\u52a8";
const SPORT_TASK_NOTE = "\u7531\u6bcf\u65e5\u4f8b\u884c\u52a9\u624b\u6dfb\u52a0";
const SPORT_PATTERN = /\u4f53\u80b2|\u8fd0\u52a8|\u8dd1\u6b65|\u5065\u8eab|\u953b\u70bc|\u8bad\u7ec3|\u745c\u4f3d|\u6e38\u6cf3|\u9a91\u884c/;
const IMPORTANT_PATTERN = /\u91cd\u8981|\u7d27\u6025|\u63d0\u9192|urgent|critical/i;

export async function upsertDay(date, payload) {
  const day = {
    tasks: Array.isArray(payload.tasks) ? payload.tasks.map(normalizeTask) : [],
    memos: Array.isArray(payload.memos) ? payload.memos : [],
    updatedAt: new Date().toISOString()
  };

  await db.update((data) => {
    data.days[date] = {
      ...(data.days[date] || {}),
      ...day
    };
  });

  return day;
}

export async function importLocalStorageDump(payload) {
  const imported = [];
  const days = payload && typeof payload.days === "object" ? payload.days : {};

  await db.update((data) => {
    for (const [date, day] of Object.entries(days)) {
      const existing = data.days[date] || { tasks: [], memos: [] };
      const mergedTasks = mergeById(existing.tasks || [], Array.isArray(day.tasks) ? day.tasks.map(normalizeTask) : []);
      const mergedMemos = mergeById(existing.memos || [], Array.isArray(day.memos) ? day.memos : []);
      data.days[date] = {
        ...existing,
        tasks: mergedTasks,
        memos: mergedMemos,
        updatedAt: new Date().toISOString()
      };
      imported.push({ date, tasks: mergedTasks.length, memos: mergedMemos.length });
    }
    return imported;
  });

  return imported;
}

export async function createTask(date, values) {
  return db.update((data) => {
    const day = data.days[date] || { tasks: [], memos: [] };
    const start = Number.isFinite(Number(values.start)) ? Number(values.start) : timeToMinutes(values.time || "09:00");
    const task = normalizeTask({
      id: values.id || createId(),
      title: values.title || DEFAULT_TASK_TITLE,
      note: values.note || "",
      time: values.time || minutesToTime(start),
      start,
      duration: values.duration || 60,
      done: Boolean(values.done),
      important: Boolean(values.important),
      createdAt: values.createdAt || new Date().toISOString()
    });

    day.tasks = [...(day.tasks || []), task];
    day.memos = day.memos || [];
    day.updatedAt = new Date().toISOString();
    data.days[date] = day;
    return task;
  });
}

export async function getDay(date) {
  const data = await db.read();
  return data.days[date] || { tasks: [], memos: [] };
}

export async function getAgentState(date) {
  const data = await db.read();
  return data.agentState[date] || {};
}

export async function patchAgentState(date, patch) {
  return db.update((data) => {
    data.agentState[date] = {
      ...(data.agentState[date] || {}),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    return data.agentState[date];
  });
}

export async function recordGithubMaintenance(date, payload = {}) {
  return patchAgentState(date, {
    githubMaintenance: {
      done: Boolean(payload.done),
      note: payload.note || "",
      recordedAt: new Date().toISOString()
    }
  });
}

export async function recordSportStatus(date, payload = {}) {
  return db.update((data) => {
    const day = data.days[date] || { tasks: [], memos: [] };
    const tasks = day.tasks || [];
    const sportTask = tasks.find(isSportTask);

    if (sportTask) {
      day.tasks = tasks.map((task) => task.id === sportTask.id ? normalizeTask({
        ...task,
        done: Boolean(payload.done)
      }) : task);
    } else if (payload.create !== false) {
      day.tasks = [...tasks, normalizeTask({
        id: createId(),
        title: SPORT_TASK_TITLE,
        note: payload.note || SPORT_TASK_NOTE,
        time: payload.time || "18:00",
        start: timeToMinutes(payload.time || "18:00"),
        duration: payload.duration || 45,
        done: Boolean(payload.done),
        createdAt: new Date().toISOString()
      })];
    }

    day.memos = day.memos || [];
    day.updatedAt = new Date().toISOString();
    data.days[date] = day;
    data.agentState[date] = {
      ...(data.agentState[date] || {}),
      sportChecked: true,
      sportDone: Boolean(payload.done),
      updatedAt: new Date().toISOString()
    };
    return data.agentState[date];
  });
}

export async function summarizeWeek(today = new Date()) {
  const start = addDays(today, -7);
  const end = addDays(today, -1);
  const data = await db.read();
  const days = [];

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const date = formatDate(cursor);
    const day = data.days[date] || { tasks: [], memos: [] };
    days.push({ date, tasks: day.tasks || [], memos: day.memos || [] });
  }

  const tasks = days.flatMap((day) => day.tasks.map((task) => ({ ...task, date: day.date })));
  const done = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const open = total - done;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const unfinishedTitles = tasks.filter((task) => !task.done).slice(0, 6).map((task) => `${task.date} ${task.title}`);

  return {
    start: formatDate(start),
    end: formatDate(end),
    total,
    done,
    open,
    rate,
    unfinishedTitles,
    days
  };
}

export function formatDate(date) {
  return date.toLocaleDateString("sv-SE");
}

export function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

export function isSportTask(task) {
  return SPORT_PATTERN.test(`${task.title || ""} ${task.note || ""}`);
}

export function isImportantTask(task) {
  return Boolean(task.important) || IMPORTANT_PATTERN.test(`${task.title || ""} ${task.note || ""}`);
}

function normalizeTask(task) {
  const start = Number.isFinite(Number(task.start)) ? Number(task.start) : timeToMinutes(task.time || "09:00");
  return {
    ...task,
    start,
    time: task.time || minutesToTime(start),
    duration: Number(task.duration) || 60,
    done: Boolean(task.done),
    important: isImportantTask(task)
  };
}

function mergeById(existing, incoming) {
  const map = new Map();
  existing.forEach((item, index) => map.set(item.id || `existing-${index}`, item));
  incoming.forEach((item, index) => map.set(item.id || `incoming-${Date.now()}-${index}`, item));
  return [...map.values()];
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function timeToMinutes(value) {
  const match = String(value || "09:00").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 9 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(minutes = 0) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
