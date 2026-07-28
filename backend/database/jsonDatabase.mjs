import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { databasePath } from "../config.mjs";

const emptyDatabase = {
  days: {},
  agentState: {},
  notificationLog: []
};

export class JsonDatabase {
  constructor(filePath = databasePath) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async read() {
    await mkdir(dirname(this.filePath), { recursive: true });
    if (!existsSync(this.filePath)) {
      await this.write(emptyDatabase);
    }

    try {
      const raw = await readFile(this.filePath, "utf8");
      return { ...emptyDatabase, ...JSON.parse(raw) };
    } catch {
      await this.write(emptyDatabase);
      return JSON.parse(JSON.stringify(emptyDatabase));
    }
  }

  async write(data) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const body = `${JSON.stringify(data, null, 2)}\n`;
    this.writeQueue = this.writeQueue.then(() => writeFile(this.filePath, body, "utf8"));
    await this.writeQueue;
  }

  async update(mutator) {
    const data = await this.read();
    const result = await mutator(data);
    await this.write(data);
    return result;
  }
}

export const db = new JsonDatabase();
