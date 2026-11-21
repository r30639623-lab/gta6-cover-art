# Duskline Cover Studio

[![make.fun](https://img.shields.io/badge/make.fun-bounty-blue)](https://make.fun/competitions/gta6-cover-art-01)
[![gta6-cover-art-01](https://img.shields.io/badge/gta6--cover--art--01-entry-purple)](https://make.fun/competitions/gta6-cover-art-01)
[![offline](https://img.shields.io/badge/offline-no%20network-green)](https://make.fun/competitions/gta6-cover-art-01)

Turn your photos into framed crime-epic key art — the kind of cover that
could hang on a cinema wall in the fictional city of **Solmar**.

## What it does

- **Face-aware crops.** Every frame keeps its face centred and whole:
  the crop follows the face, and a "Face-safe" badge warns you if a pan or
  zoom ever pushes a face to the edge. Click a frame to select it, drag to
  pan, scroll to zoom, flip it, or tap **Auto-fill** to reset every frame
  to a safe crop.
- **Six layouts.** Cast Mosaic, Hero Side, Triptych, Duo Split, Four Up
  and Full Bleed — each one re-arranges the same photos for 1:1, 4:5 and
  16:9 without ever cutting a face at the frame edge. The photos fill the
  top two thirds; the bottom third is a dark title band, so the title,
  subtitle, ribbon, billing and seal never sit on top of a face.
- **Seven grades.** Sunset Gold, Neon Vice, Neon Night, Tropic Teal,
  Ultraviolet, Retro Print and Mono — one click recolours the whole poster.
- **Full poster furniture, drawn on the canvas.** A striped gradient title
  (Anton), a glowing neon script subtitle (Yellowtail), a folded ribbon, a
  five-star quote bar with an edition box, a festival seal, a barcode and a
  billing block. Every line is editable: title, subtitle, ribbon, quote,
  billing, seal, release line and edition tag.
- **Export PNG in three sizes.** 1080×1080, 1080×1350 and 1920×1080, one
  at a time or all three with a single click.
- **Offline and private.** No network requests, no uploads — your photos
  never leave the device. Runs from any static file server.

## The cast

Six sample photos, all made for this entry with an image model — four
fictional people of Solmar (Mara the driver, Dante the boss, Sofia the
mechanic, Rico the captain) and two city scenes (the boulevard, the pier).
Upload your own photos to replace any of them.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Build the submission bundle with `node main.ts` (writes `/output`, or the
directory in `MAKEFUN_OUTPUT_DIR`).

## Fonts

Anton and Yellowtail (`app/fonts/`) are licensed under the SIL Open Font
License 1.1 — see `app/fonts/OFL.txt`.

## Entry

Built for the [gta6-cover-art-01](https://make.fun/competitions/gta6-cover-art-01)
bounty on [make.fun](https://make.fun). All art is original; no Rockstar
names, logos or artwork are used anywhere.
