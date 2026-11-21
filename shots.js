// Coral Dusk Cover Studio — screenshot runner.
// Serves app/ over local HTTP, shoots the four dossier screenshots with
// headless Chromium, converts them to JPEG, and enforces the gate limits:
// every screenshot at most 256 KiB, long side at most 1280 px, short side at
// least 480 px. Exits non-zero if any shot violates a limit, so a bad shoot
// can never be submitted by accident.

// The server must run in its OWN process: chrome is launched with spawnSync,
// which blocks this process's event loop, so an in-process server could never
// answer a request while a shot is running.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SHOTS_DIR = join(ROOT, 'screenshots');
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const MAX_BYTES = 256 * 1024;
const MAX_LONG = 1280;
const MIN_SHORT = 480;
const JPEG_QUALITY = 76;

const SERVER_PORT = 8933;

function startServer() {
  const child = spawn('python3', ['-m', 'http.server', String(SERVER_PORT), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
  for (let i = 0; i < 30; i++) {
    const probe = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://127.0.0.1:${SERVER_PORT}/app/index.html`], { encoding: 'utf-8', timeout: 5000 });
    if ((probe.stdout || '').trim() === '200') return child;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  child.kill();
  throw new Error('static server did not come up on port ' + SERVER_PORT);
}

function shootOne(serverPort, shot) {
  const url = `http://127.0.0.1:${serverPort}/${shot.url}`;
  const pngPath = `/tmp/cover-shot-${shot.name}.png`;
  const result = spawnSync(CHROME, [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    '--virtual-time-budget=10000',
    `--window-size=${shot.w},${shot.h}`,
    `--screenshot=${pngPath}`,
    url
  ], { encoding: 'utf-8', timeout: 120000 });
  if (result.status !== 0 || !existsSync(pngPath)) {
    throw new Error(`chrome failed for ${shot.name}: ${(result.stderr || '').slice(-500)}`);
  }
  return pngPath;
}

// Convert a PNG screenshot to JPEG with Pillow and return its dimensions.
function toJpeg(pngPath, jpgPath) {
  const script = [
    'from PIL import Image',
    `im = Image.open(${JSON.stringify(pngPath)}).convert('RGB')`,
    `im.save(${JSON.stringify(jpgPath)}, 'JPEG', quality=${JPEG_QUALITY})`,
    'print(f"{im.size[0]}x{im.size[1]}")'
  ].join('\n');
  const result = spawnSync('python3', ['-c', script], { encoding: 'utf-8', timeout: 60000 });
  if (result.status !== 0) throw new Error('PIL convert failed: ' + result.stderr);
  const m = /(\d+)x(\d+)/.exec(result.stdout || '');
  if (!m) throw new Error('cannot read dimensions for ' + jpgPath);
  return { w: parseInt(m[1], 10), h: parseInt(m[2], 10) };
}

async function main() {
  const shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf-8'));
  if (!Array.isArray(shots) || shots.length < 3 || shots.length > 4) {
    throw new Error(`shots.json must list 3 or 4 shots, got ${shots.length}`);
  }
  mkdirSync(SHOTS_DIR, { recursive: true });
  const server = startServer();
  const port = SERVER_PORT;
  const problems = [];
  try {
    for (const shot of shots) {
      const png = shootOne(port, shot);
      const jpgPath = join(SHOTS_DIR, shot.name);
      const dims = toJpeg(png, jpgPath);
      const bytes = statSync(jpgPath).size;
      const long = Math.max(dims.w, dims.h);
      const short = Math.min(dims.w, dims.h);
      const status = [];
      if (bytes > MAX_BYTES) status.push(`over 256 KiB (${bytes} bytes)`);
      if (long > MAX_LONG) status.push(`long side ${long} > 1280`);
      if (short < MIN_SHORT) status.push(`short side ${short} < 480`);
      if (dims.w !== shot.w || dims.h !== shot.h) status.push(`size ${dims.w}x${dims.h}, expected ${shot.w}x${shot.h}`);
      console.log(`${shot.name}: ${dims.w}x${dims.h}, ${bytes} bytes${status.length ? ' — FAIL: ' + status.join('; ') : ' — OK'}`);
      if (status.length) problems.push(`${shot.name}: ${status.join('; ')}`);
    }
  } finally {
    server.kill();
  }
  const files = readdirSync(SHOTS_DIR).filter((f) => !f.startsWith('.')).sort();
  if (files.length !== shots.length) problems.push(`screenshots/ holds ${files.length} files, expected ${shots.length}`);
  for (const f of files) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(f) || f.startsWith('-')) problems.push(`bad screenshot name: ${f}`);
  }
  if (problems.length) {
    console.error('GATE CHECK FAILED:');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }
  console.log('All screenshots pass the gate limits.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
