// Coral Dusk Cover Studio — entrypoint (gta6-cover-art-01).
// Hands the built app in: copies app/ and screenshots/ from this repository
// into the output directory, then writes /output/dossier.json with the kit's
// buildDossier so the scorer can rebuild the same dossier byte for byte.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000
};

function main(): void {
  const appDir = join(REPO_ROOT, 'app');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(appDir)) throw new Error('missing app/ in ' + REPO_ROOT);
  if (!existsSync(shotsDir)) throw new Error('missing screenshots/ in ' + REPO_ROOT);
  mkdirSync(OUT_DIR, { recursive: true });
  cpSync(appDir, join(OUT_DIR, 'app'), { recursive: true });
  cpSync(shotsDir, join(OUT_DIR, 'screenshots'), { recursive: true });
  const dossier = buildDossier(OUT_DIR, CAPS);
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
  const names = ['1-cover.jpg', '2-editor.jpg', '3-cover.jpg', '4-cover-square.jpg'];
  console.log('Coral Dusk Cover Studio handed in:');
  console.log('  output: ' + OUT_DIR);
  console.log('  dossier: ' + dossier.length + ' bytes');
  for (const name of names) {
    console.log('  screenshot: ' + name);
  }
}

main();
