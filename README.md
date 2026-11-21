[![GTA 6 Cover Art — make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Coral Dusk Cover Studio

Turn any photo into a sunset-coast poster cover — a working studio app, not
just one image. Built for the [GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01)
on make.fun.

## What it does

- **6 poster layouts** — 9-Panel Grid, Hero + 3, Hero + 5, Tilted Snapshots,
  Slanted Panels, Full-Bleed Hero.
- **7 colour grades** — Neon Vice (default), Sunset, Gold, Teal Pink, Dusk,
  Coral, Noir. Photos are posterized first (luminance is quantized before
  the grade lookup), so skies stay clean instead of going muddy.
- **Up to 9 photos** — drop in your own, or tap one of the four included
  sample photos. Click a panel to select it, drag to reposition its photo.
- **Caption** — title, script subtitle, tagline and a three-person cast.
- **Export PNG in 4 sizes** — Poster 2:3, Square 1:1, Wide 16:9, Story 4:5.

The story is fictional: the city is **Coral Coast**, the cast is Mara Voss
(the driver), Dante Ruiz (the fixer) and Sofia Lane (the boss). No real
studio, film or game is affiliated, and no third-party game art, names or
logos are used.

## Run it

```sh
node main.ts            # hands the app in to /output (dossier.json included)
node main.ts ./out      # same, to a directory of your choice
```

To try the studio in a browser while developing, serve `app/` with any
static server, for example:

```sh
python3 -m http.server 4177 --directory app
# open http://localhost:4177/
```

## Layout

- `main.ts` — entrypoint: copies `app/` + `screenshots/` to the output
  directory and writes `dossier.json` with the kit's `buildDossier`.
- `app/` — the studio itself (`index.html`, `app.js`, `cover.js`,
  `style.css`, fonts and sample photos). Works offline.
- `app/cover.js` — the poster renderer: layouts, grades, posterize pass,
  halftone texture, title and credits layer.
- `vendor/makefun-app.ts` — the kit's dossier library, copied unchanged.
- `screenshots/` — renders of the app (see `shots.json`).
- `shots.js` — re-shoots the screenshots with headless Chromium.

## Sample photos

The four sample photos are Creative Commons photos found via Openverse
(Flickr): a pier jump at sunset, a Miami boulevard at night, a classic
convertible, and palm trees at dusk. The fonts are Anton and Pacifico
(SIL Open Font License).

## License

MIT — see [LICENSE](LICENSE).
