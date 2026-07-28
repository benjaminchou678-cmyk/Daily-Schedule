import { generateWeeklyComment } from "./llmService.mjs";
import { notifyDesktop } from "./notificationService.mjs";
import { formatDate, getAgentState, getDay, isSportTask, patchAgentState, summarizeWeek } from "./scheduleService.mjs";

const importantTimers = new Map();

const MESSAGES = {
  sportTitle: "\u4eca\u65e5\u8fd0\u52a8\u786e\u8ba4",
  sportFound: (title) => `\u4eca\u5929\u6709\u8fd0\u52a8\u5b89\u6392\uff1a${title}\u3002\u8bf7\u6253\u5f00\u65e5\u7a0b\u7cfb\u7edf\u786e\u8ba4\u662f\u5426\u5b8c\u6210\u3002`,
  sportMissing: "\u4eca\u5929\u8fd8\u6ca1\u6709\u770b\u5230\u8fd0\u52a8\u5b89\u6392\u3002\u8bf7\u6253\u5f00\u65e5\u7a0b\u7cfb\u7edf\u786e\u8ba4\u662f\u5426\u9700\u8981\u6dfb\u52a0\u4f53\u80b2\u8fd0\u52a8\u3002",
  importantTitle: "\u91cd\u8981\u65e5\u7a0b\u786e\u8ba4",
  importantBody: "\u4eca\u5929\u6709\u91cd\u8981\u65e5\u7a0b\u5417\uff1f\u5982\u679c\u6709\uff0c\u8bf7\u5728\u65e5\u7a0b\u7cfb\u7edf\u4e2d\u65b0\u589e\uff0c\u6216\u901a\u8fc7 /api/tasks \u521b\u5efa\u4efb\u52a1\u3002",
  githubTitle: "GitHub \u7ef4\u62a4\u63d0\u9192",
  githubBody: "\u91cd\u8981\u4e8b\u9879\u786e\u8ba4\u540e\uff0c\u8bb0\u5f97\u8fdb\u884c\u4eca\u65e5\u7684 GitHub \u63d0\u4ea4\u3001\u7ef4\u62a4\u3002\u53ef\u901a\u8fc7 /api/habits/github \u8bb0\u5f55\u3002",
  creationTitle: "\u6bcf\u5468\u521b\u4f5c\u65e5",
  creationBody: "\u6b22\u8fce\u6765\u5230\u6bcf\u5468\u7684\u521b\u4f5c\u65e5\u65f6\u95f4\uff0c\u5e0c\u671b\u4f60\u5728\u4eca\u5929\u53ef\u4ee5\u4fdd\u6301\u70ed\u60c5\u7684\u521b\u4f5c\u6b32\u671b\u3001\u7406\u6027\u7684\u521b\u4f5c\u6001\u5ea6\uff0c\u575a\u6301\u4e0d\u61c8\u5730\u60f3\u7740\u76ee\u6807\u63a8\u8fdb\u3002",
  weeklyTitle: "\u5468\u5ea6\u8ba1\u5212\u5b8c\u6210\u60c5\u51b5",
  importantReminderTitle: "\u91cd\u8981\u65e5\u7a0b\u63d0\u9192",
  summaryTitle: "\u6bcf\u65e5\u603b\u7ed3\u63d0\u9192",
  summaryBody: "\u4e0d\u8981\u5fd8\u8bb0\u8bb0\u5f55\u6bcf\u65e5\u603b\u7ed3\u3002"
};

export async function runStartupRoutine(date = new Date()) {
  const dateKey = formatDate(date);
  const weekday = date.getDay();
  const day = await getDay(dateKey);
  const state = await getAgentState(dateKey);
  const tasks = day.tasks || [];
  const sportTask = tasks.find(isSportTask);

  if (!state.startupShown) {
    notifyDesktop(MESSAGES.sportTitle, sportTask ? MESSAGES.sportFound(sportTask.title) : MESSAGES.sportMissing);
    notifyDesktop(MESSAGES.importantTitle, MESSAGES.importantBody);
    notifyDesktop(MESSAGES.githubTitle, MESSAGES.githubBody);
    await patchAgentState(dateKey, { startupShown: true });
  }

  if (weekday === 6 && !state.creationDayShown) {
    notifyDesktop(MESSAGES.creationTitle, MESSAGES.creationBody);
    await patchAgentState(dateKey, { creationDayShown: true });
  }

  if (weekday === 0 && !state.weeklyReportShown) {
    const summary = await summarizeWeek(date);
    const comment = await generateWeeklyComment(summary);
    notifyDesktop(
      MESSAGES.weeklyTitle,
      `${summary.start} \u81f3 ${summary.end}\uff1a\u5171 ${summary.total} \u9879\uff0c\u5b8c\u6210 ${summary.done} \u9879\uff0c\u5b8c\u6210\u7387 ${summary.rate}%\u3002${comment}`
    );
    await patchAgentState(dateKey, { weeklyReportShown: true });
  }

  scheduleImportantReminders(dateKey, tasks);
}

export function scheduleImportantReminders(dateKey, tasks) {
  for (const [key, timer] of importantTimers.entries()) {
    if (key.startsWith(`${dateKey}:`)) {
      clearTimeout(timer);
      importantTimers.delete(key);
    }
  }

  const todayKey = formatDate(new Date());
  if (dateKey !== todayKey) return;

  tasks.filter((task) => task.important && !task.done).forEach((task) => {
    const key = `${dateKey}:${task.id}:${task.start}`;
    const taskTime = task.time || minutesToTime(task.start);
    const target = new Date(`${dateKey}T${taskTime}:00`);
    const delay = target.getTime() - Date.now();
    if (delay <= 0) return;

    const timer = setTimeout(() => {
      notifyDesktop(MESSAGES.importantReminderTitle, `${task.title}\n${taskTime} \u5f00\u59cb`);
      importantTimers.delete(key);
    }, delay);
    importantTimers.set(key, timer);
  });
}

export async function notifyDailySummaryReminder(dateKey = formatDate(new Date())) {
  const day = await getDay(dateKey);
  if ((day.memos || []).length) return false;
  notifyDesktop(MESSAGES.summaryTitle, MESSAGES.summaryBody);
  return true;
}

function minutesToTime(minutes = 0) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
