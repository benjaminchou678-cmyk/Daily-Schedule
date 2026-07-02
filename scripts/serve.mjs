import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const srcRoot = join(root, "src");
const publicRoot = join(root, "public");
const port = Number(process.env.PORT || 5173);

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

async function sendFile(response, filePath) {
  const body = await readFile(filePath);
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);
    let filePath;

    if (url.pathname === "/" || url.pathname === "/index.html") {
      filePath = join(srcRoot, "index.html");
    } else if (url.pathname.startsWith("/public/")) {
      filePath = safeJoin(publicRoot, url.pathname.replace("/public/", ""));
    } else {
      filePath = safeJoin(srcRoot, url.pathname);
    }

    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    await sendFile(response, filePath);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Server error");
  }
}).listen(port, () => {
  console.log(`Daily Schedule is running at http://localhost:${port}`);
});
