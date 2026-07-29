import { resolve } from "node:path";

export const rootDir = resolve(import.meta.dirname, "..");
export const srcDir = resolve(rootDir, "src");
export const publicDir = resolve(rootDir, "public");
export const dataDir = resolve(rootDir, "backend", "data");
export const databasePath = resolve(dataDir, "daily-schedule.db.json");

export const port = Number(process.env.PORT || 5173);
export const appUrl = process.env.SCHEDULE_APP_URL || `http://127.0.0.1:${port}`;
export const timezone = process.env.SCHEDULE_TIMEZONE || "Asia/Shanghai";
export const llmModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
export const llmEndpoint = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/responses";
