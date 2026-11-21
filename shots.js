// shots.js — Coral Dusk Cover Studio screenshot runner.
// Serves this repo over local HTTP, captures the four shots with
// headless Chrome, converts them to JPEG (quality 76) with PIL and
// checks each stays under 256 KB. Run: node shots.js
// Reads its shot list from shots.json (seed 7).

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = "/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome";
const SHOTS = JSON.parse(readFileSync(join(HERE, "shots.json"), "utf8"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".json": "application/json"
};

function serve() {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "/app/index.html" : urlPath;
    const file = join(HERE, rel);
    if (!file.startsWith(HERE) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolvePromise) => {
    server.listen(0, "127.0.0.1", () => resolvePromise(server));
  });
}

async function shoot(server, shot) {
  const port = server.address().port;
  const url = "http://127.0.0.1:" + port + "/app/index.html?shot=" + shot.mode + "&seed=" + SHOTS.seed;
  const png = join(HERE, "screenshots", shot.file.replace(/\.jpg$/, ".png"));
  const jpg = join(HERE, "screenshots", shot.file);
  mkdirSync(join(HERE, "screenshots"), { recursive: true });
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=" + shot.w + "," + shot.h,
    "--virtual-time-budget=9000",
    "--screenshot=" + png,
    url
  ];
  await run(CHROME, args, { timeout: 60000 });
  // Convert to JPEG quality 76 and enforce the 256 KB cap.
  const py = [
    "from PIL import Image",
    "im = Image.open(" + JSON.stringify(png) + ").convert('RGB')",
    "im.save(" + JSON.stringify(jpg) + ", 'JPEG', quality=76, optimize=True)"
  ].join("\n");
  await run("python3", ["-c", py], { timeout: 60000 });
  const size = statSync(jpg).size;
  const ok = size < 256 * 1024;
  console.log("  " + shot.file + " " + shot.w + "x" + shot.h + " " + size + " bytes " + (ok ? "OK" : "TOO BIG"));
  return { file: shot.file, width: shot.w, height: shot.h, bytes: size, ok };
}

async function main() {
  console.log("shots.js — seed " + SHOTS.seed + ", " + SHOTS.shots.length + " shots");
  const server = await serve();
  const results = [];
  try {
    for (const shot of SHOTS.shots) {
      console.log("shooting " + shot.file + " (" + shot.mode + ", " + shot.layout + "/" + shot.grade + ")");
      results.push(await shoot(server, shot));
    }
  } finally {
    server.close();
  }
  const bad = results.filter((r) => !r.ok);
  if (bad.length > 0) {
    console.error("FAILED: " + bad.map((r) => r.file).join(", ") + " over 256 KB");
    process.exit(1);
  }
  console.log("all shots OK");
}

main().catch((err) => {
  console.error("shots.js failed:", err && err.message ? err.message : String(err));
  process.exit(1);
});
