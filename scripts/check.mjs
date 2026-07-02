import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const htmlPath = join(root, "src", "index.html");
const html = await readFile(htmlPath, "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/);

if (!script) {
  throw new Error("No inline script was found in src/index.html.");
}

new Function(script[1]);
console.log("HTML script syntax OK");
