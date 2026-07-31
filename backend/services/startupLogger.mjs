import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logsDir } from "../config.mjs";

export async function writeStartupLog(message, extra = {}) {
  try {
    await mkdir(logsDir, { recursive: true });
    const entry = {
      time: new Date().toISOString(),
      message,
      ...extra
    };
    await appendFile(join(logsDir, "startup.log"), `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Logging must never block the local app.
  }
}
