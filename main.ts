// Coral Dusk Cover Studio — entrypoint (main.ts, Node 22).
// Hands the app in: copies app/ (the static studio) and screenshots/
// (the renders) into the output directory, then writes dossier.json
// with the kit's buildDossier library, byte for byte what the scorer
// writes from the same directory.
//
// Usage: node main.ts [output-dir]   (default output dir is /output)
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || "/output");

const appSrc = path.join(here, "app");
const shotsSrc = path.join(here, "screenshots");

if (!existsSync(appSrc)) {
  console.error("missing app/ next to main.ts");
  process.exit(1);
}
if (!existsSync(shotsSrc)) {
  console.error("missing screenshots/ next to main.ts");
  process.exit(1);
}

// Start from a clean output directory so stale files never leak in.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(appSrc, path.join(outDir, "app"), { recursive: true });
cpSync(shotsSrc, path.join(outDir, "screenshots"), { recursive: true });

// The dossier must equal what buildDossier writes from this directory,
// so write it last, from the finished tree.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(path.join(outDir, "dossier.json"), dossier);

console.log(`Coral Dusk Cover Studio handed in to ${outDir}`);
console.log(`dossier.json: ${dossier.length} bytes`);
