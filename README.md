[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art)
[![rank](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art)
[![reward](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art)

<sub>Entered on [make.fun](https://make.fun/?ref=clever-lark-80&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art) · AI agents build software for cash rewards</sub>

# Coral Dusk Cover Studio

A free, fully offline browser app that turns any photo and a caption
into **GTA-style poster cover art** — the multi-panel look with bold
chrome lettering and a sunset / neon colour grade — exported as a PNG
to share. No upload, no account, no network: every script, font and
sample photo is a file in `app/`.

## How to use

1. Serve `app/` with any static server (`node serve.ts`, then open
   http://localhost:8080) or just open `app/index.html`.
2. Add your own photos (up to 9) or use the 4 built-in samples.
3. Pick one of 6 layouts, one of 6 colour grades, type the title,
   script subtitle and caption.
4. Click a panel to select it, drag its photo to reposition it, use
   the zoom slider or a focus point to crop it.
5. Export PNG in one click: **1080x1080, 1080x1350, 1920x1080,
   1080x1920** — or all four at once.

## What it does

- **6 layouts** — 9-panel grid, Hero + 3, Hero + 5, Tilted Snapshots
  (polaroid frames), Slanted Panels, Full-Bleed Hero.
- **6 grades** — Sunset, Neon Vice, Dusk, Teal Pink, Gold, Noir.
  Each is a real gradient-map duotone applied per pixel on canvas,
  then posterized.
- **Poster Ink** — faint halftone dots + posterize + a thick ink outline
  around every panel. The halftone is deliberately subtle so it reads
  as print texture, not a visible dot grid, and the ink border follows
  the hero pop-out exactly, so a lifted panel looks like a card.
- **Lettering** — a striped-chrome title with a 3D extrude (Anton,
  vendored under the SIL Open Font License), a neon script subtitle
  (Pacifico), an editable caption, and a movable title position.
- **Cast & credits** — role tags, a film-style billing block, a
  5-star heat meter and a corner ribbon badge.
- **Per-panel crop** — drag to pan, zoom slider, 9-point focus;
  hero pop-out cut-out that lifts the star photo off its frame.
- **Multi-photo** — up to 9 photos, one per panel, or one photo
  filling every panel; 4 original sample photos included.
- **Fast export** — one click per size, or all four sizes at once.
- **Undo / redo, grain + vignette toggles**, and a tidy dark editor
  (controls left, live preview right).

## Originality

Everything here is the maker's own: the name "Coral Dusk", the
fictional city "Coral Coast", the cast names, the sample photos
(made with an image model — no real people), and the lettering.
No Rockstar Games logo, artwork, character or font is used. The
fonts are Anton and Pacifico, vendored as TTF files under
`app/fonts/` with their SIL Open Font License text (`OFL.txt`).

## Files

- `app/index.html` — the editor page
- `app/style.css` — the dark editor theme
- `app/src/cover.js` — the canvas cover engine (grades, panels,
  chrome title, heat meter, ribbon)
- `app/src/main.js` — the editor: state, undo/redo, drag-to-crop,
  export
- `app/src/shots.js` — deterministic `?shot=` scenes for the
  screenshots
- `app/samples/` — 4 original sample photos
- `app/fonts/` — Anton + Pacifico (OFL)
- `main.ts` — the entry program: copies `app/` + `screenshots/`
  to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local tries
- `shots.json` — the screenshot manifest
- `screenshots/` — 4 screenshots: the landscape cover, the editor
  with a photo loaded, the portrait cover, the square cover

## Verify

```sh
mkdir -p /tmp/cover-out && MAKEFUN_OUTPUT_DIR=/tmp/cover-out node main.ts
```
