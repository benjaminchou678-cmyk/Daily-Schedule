import { db } from "../database/jsonDatabase.mjs";
import { formatDate } from "./timeService.mjs";

const DEFAULT_DAILY_REMINDERS = {
  sportHabit: "pending",
  importantSchedule: "pending",
  githubMaintenance: "pending",
  dailySummaryClose: "pending"
};

export async function getDailyReminderState(dateKey = formatDate()) {
  const data = await db.read();
  const existing = data.agentState[dateKey]?.dailyReminders || {};
  return {
    date: dateKey,
    reminders: {
      ...DEFAULT_DAILY_REMINDERS,
      ...existing
    }
  };
}

export async function setDailyReminderStatus(dateKey, reminderKey, status) {
  return db.update((data) => {
    data.agentState[dateKey] = data.agentState[dateKey] || {};
    data.agentState[dateKey].dailyReminders = {
      ...DEFAULT_DAILY_REMINDERS,
      ...(data.agentState[dateKey].dailyReminders || {}),
      [reminderKey]: status
    };
    data.agentState[dateKey].updatedAt = new Date().toISOString();
    return {
      date: dateKey,
      reminders: data.agentState[dateKey].dailyReminders
    };
  });
}
