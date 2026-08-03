import { getDailyReminderState, setDailyReminderStatus } from "./reminderStateService.mjs";
import { formatDate } from "./timeService.mjs";

const DAILY_REMINDERS = [
  {
    key: "sportHabit",
    type: "sport-habit",
    text: "是否需要将今天的运动计划记录到日程？"
  },
  {
    key: "importantSchedule",
    type: "important-schedule",
    text: "今天有重要日程需要记录吗？"
  },
  {
    key: "githubMaintenance",
    type: "github-maintenance",
    text: "记得进行今日的 GitHub 提交、维护。"
  }
];

export async function getDailyReminders(dateKey = formatDate()) {
  const state = await getDailyReminderState(dateKey);
  return {
    date: dateKey,
    reminders: DAILY_REMINDERS
      .filter((item) => state.reminders[item.key] === "pending")
      .map((item) => ({ ...item, status: "pending" })),
    state: state.reminders
  };
}

export async function completeDailyReminder(dateKey, reminderKey, status = "done") {
  if (!DAILY_REMINDERS.some((item) => item.key === reminderKey)) {
    return { ok: false, error: "unknown reminder" };
  }
  const nextStatus = ["done", "skipped", "closed"].includes(status) ? status : "done";
  const state = await setDailyReminderStatus(dateKey, reminderKey, nextStatus);
  return { ok: true, ...state };
}
