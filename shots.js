// Re-shoots the screenshots in shots.json with headless Chromium.
// Serves app/ on a local port, opens each shot's URL, waits for the
// studio to finish its first render, then saves a JPEG.
//
// Usage: node shots.js [seed]
// The seed is recorded in shots.json by hand; the shots themselves are
// deterministic (fixed photo order, fixed layouts), so re-running with
// the same seed reproduces the same four frames.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(here, "app");
const shots = JSON.parse(fs.readFileSync(path.join(here, "shots.json"), "utf-8"));

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/" || rel === "") rel = "/index.html";
  const file = path.normalize(path.join(appDir, rel));
  if (!file.startsWith(appDir)) {
    res.writeHead(400);
    res.end("bad path");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
console.log(`serving app/ on http://127.0.0.1:${port}/`);

const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
    await page.goto(`http://127.0.0.1:${port}/${shot.query}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__studioReady === true, null, { timeout: 20000 });
    await page.waitForTimeout(500);
    const out = path.join(here, "screenshots", shot.name);
    await page.screenshot({ path: out, type: "jpeg", quality: 76 });
    const size = fs.statSync(out).size;
    console.log(`${shot.name}: ${shot.w}x${shot.h} -> ${size} bytes${size > 262144 ? "  OVER 256KiB CAP" : ""}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log("done");
