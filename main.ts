// main.ts — Coral Dusk Cover Studio entrypoint.
// Copies the studio app and its screenshots into an output directory
// and writes a dossier.json describing the entry. Run with Node 22:
//   node main.ts [outDir]
// Default output directory is ./dist.

import { cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const DOSSIER = {
  title: "Coral Dusk Cover Studio",
  city: "Coral Coast",
  characters: ["Mara", "Dante", "Sofia"],
  layouts: ["magazine", "hero-stack", "triptych", "duo-split", "grid-four", "strip-story"],
  grades: ["neon", "coral", "dusk", "vice", "mono", "gold", "teal"],
  defaultGrade: "neon",
  ribbon: "#ff2e63",
  subtitleGlow: "#ff2e9a",
  maxUploads: 9,
  exportSizes: [
    { id: "poster", width: 1080, height: 1350 },
    { id: "square", width: 1080, height: 1080 },
    { id: "wide", width: 1920, height: 1080 },
    { id: "story", width: 1080, height: 1920 }
  ],
  photos: [
    { file: "photos/1-skyline.jpg", label: "Skyline — hero", credit: "Joseph Barrientos (CC0)" },
    { file: "photos/2-plaza.jpg", label: "Plaza — boulevard", credit: "Edgardo W. Olivera (CC BY 2.0)" },
    { file: "photos/3-mara.jpg", label: "Mara — portrait", credit: "orange tuesday (CC BY 2.0)" },
    { file: "photos/4-dante.jpg", label: "Dante — portrait", credit: "sidewalk flying (CC BY 2.0)" }
  ],
  fonts: [
    { file: "fonts/Anton-Regular.ttf", license: "SIL Open Font License 1.1" },
    { file: "fonts/Pacifico-Regular.ttf", license: "SIL Open Font License 1.1" }
  ],
  screenshots: [
    "screenshots/1-cover.jpg",
    "screenshots/2-editor.jpg",
    "screenshots/3-cover.jpg",
    "screenshots/4-cover-square.jpg"
  ],
  note: "All names, the city and the characters are fictional. No Rockstar Games names, logos or assets are used."
};

async function listFiles(dir: string, base: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFiles(full, join(base, entry.name))));
    } else {
      out.push(join(base, entry.name));
    }
  }
  return out;
}

async function main(): Promise<void> {
  const outDir = resolve(process.argv[2] || join(HERE, "dist"));
  const appDir = join(HERE, "app");
  const shotsDir = join(HERE, "screenshots");

  await mkdir(outDir, { recursive: true });
  await cp(appDir, join(outDir, "app"), { recursive: true });
  await cp(shotsDir, join(outDir, "screenshots"), { recursive: true });

  const appFiles = await listFiles(appDir, "app");
  const shotFiles = await listFiles(shotsDir, "screenshots");
  const dossier = {
    ...DOSSIER,
    builtAt: new Date().toISOString(),
    files: [...appFiles, ...shotFiles].sort()
  };
  await writeFile(join(outDir, "dossier.json"), JSON.stringify(dossier, null, 2) + "\n", "utf8");

  const appSize = (await stat(join(outDir, "app"))).size;
  void appSize;
  console.log("Coral Dusk Cover Studio");
  console.log("  output: " + outDir);
  console.log("  app files: " + appFiles.length);
  console.log("  screenshots: " + shotFiles.length);
  console.log("  dossier: dist/dossier.json");
}

main().catch((err: unknown) => {
  console.error("main.ts failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
