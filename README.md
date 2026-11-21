# Coral Dusk Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline browser web app that turns your photos and a caption into GTA 6-style cover art — the iconic multi-panel poster and loading-screen look with a Vice City neon-sunset grade — exported as a PNG to share. Built for the [make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **6 poster layouts** — Magazine, Hero Stack, Triptych, Duo Split, Grid Four, Strip Story.
- **7 colour grades** — Neon Vice (default), Coral Dusk, Dusk, Vice, Mono, Gold Hour, Teal Night. Grades posterize luminance first, so skies band cleanly instead of turning muddy.
- **Any photo** — upload up to 9 of your own photos, or use the 4 included samples. Crop and position each panel with focus and zoom sliders; wide heroes never cut feet, portrait panels pop out slightly.
- **Bold lettering** — Anton title, Pacifico neon subtitle, letterspaced credit line, and a tilted "DUSK" ribbon.
- **Fast export** — one click to PNG in 1080 × 1080, 1080 × 1350, 1920 × 1080, or 1080 × 1920.
- **Fully offline** — static files under `app/`, no network requests. Photos never leave your machine.

## Run it

Serve `app/` with any static server and open `index.html` in desktop Chrome:

```sh
python3 -m http.server --directory app 8000
```

Or run the screenshot suite (needs headless Chromium + Pillow):

```sh
node shots.js
```

`main.ts` hands the app in for the bounty: it copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`.

## The fictional city

Coral Coast is invented for this app, with cast Mara, Dante and Sofia. No Rockstar Games logo, artwork, character or font is used anywhere.

## Credits

- Photos (CC BY 2.0, via Openverse/Flickr): "New York Skyline Sunset 2" by thenails · "Plaza de Cibeles" by Jorge Lascar · "Tribe woman, India" by orange tuesday · "Awesome dude, Rome" by sidewalk flying.
- Fonts Anton and Pacifico under the SIL Open Font License.

## License

MIT — see [LICENSE](LICENSE).
