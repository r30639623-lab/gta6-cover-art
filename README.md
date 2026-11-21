# Coral Dusk Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/r30639623-lab/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A cover-art studio app for the fictional city **Coral Coast**, built for the
[make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).
Design a poster for Mara, Dante and Sofia: pick one of 6 layouts, one of 7
colour grades, use the 4 sample photos or upload up to 9 of your own, then
export the finished cover as PNG in 4 sizes.

## Run it

```sh
node main.ts            # copies app/ + screenshots/ into ./dist and writes dossier.json
```

Or open `app/index.html` directly in a browser (serve the folder over HTTP
for the sample photos and fonts to load).

## What it does

- **6 poster layouts** — Magazine, Hero Stack, Triptych, Duo Split, Grid Four, Strip Story
- **7 colour grades** — Neon Vice (default), Coral Dusk, Dusk, Vice, Mono, Gold Hour, Teal Night
- **Photo grading** — luminance is quantised before the grade lookup, so
  smooth dusk skies grade into clean steps instead of muddy blotches, and a
  seeded grain pass breaks up any remaining banding
- **Safe crops** — portrait panels pop out at 1.08x, the wide hero stays at
  1.0x, and heads and feet are clamped inside the frame
- **Export PNG** — Poster 1080&times;1350, Square 1080&times;1080, Wide 1920&times;1080, Story 1080&times;1920

## Sample photos (all freely licensed)

- NYC skyline at dusk &mdash; Joseph Barrientos (CC0)
- Parque Central, Havana &mdash; Edgardo W. Olivera (CC BY 2.0)
- Street portrait &mdash; Thomas Leuthard (CC BY 2.0)
- Man in a trench coat &mdash; conorwithonen (CC BY 2.0)

Fonts: Anton and Pacifico (SIL Open Font License 1.1).

## Originality

Every name, the city and the characters are fictional. No Rockstar Games
names, logos or assets are used anywhere in this entry.
