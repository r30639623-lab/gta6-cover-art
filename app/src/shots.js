// Fixed scenes for screenshots. `?shot=` picks the scene; window.__shotReady
// is set once the fonts are loaded and the cover is painted, so the shoot
// script knows the page is ready to capture.
import { loadPhotos, defaultState, drawInto, bootEditor } from './main.js';
import { ASPECTS } from './cover.js';

const SHOTS = {
  // The editor, with the samples loaded and the mosaic cover drawn.
  editor: { aspect: 'wide', layout: 'mosaic', grade: 'sunset-gold', coverOnly: false },
  // The exported cover, full bleed, 16:9.
  cover: { aspect: 'wide', layout: 'mosaic', grade: 'sunset-gold', coverOnly: true },
  // The exported cover, full bleed, 4:5, Neon Vice triptych.
  cover45: { aspect: 'tall', layout: 'triptych', grade: 'neon-vice', coverOnly: true },
  // The exported cover, full bleed, 1:1, Tropic Teal four-up.
  coversq: { aspect: 'square', layout: 'four-up', grade: 'tropic-teal', coverOnly: true },
};

export async function runShot(shot) {
  const scene = SHOTS[shot];
  if (!scene) throw new Error(`Unknown shot: ${shot}`);
  if (!scene.coverOnly) {
    // The full editor, booted normally; it sets window.__shotReady itself.
    await bootEditor();
    return;
  }
  const photos = await loadPhotos();
  await Promise.all([
    document.fonts.load('16px Anton'),
    document.fonts.load('16px Yellowtail'),
    document.fonts.ready,
  ]);
  const state = defaultState();
  state.aspect = scene.aspect;
  state.layout = scene.layout;
  state.grade = scene.grade;
  const canvas = document.getElementById('previewCanvas');
  if (scene.coverOnly) {
    document.body.classList.add('shot-cover');
    // Size the canvas to the export pixels for this aspect.
    const size = ASPECTS[scene.aspect];
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawInto(canvas, photos, state);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
