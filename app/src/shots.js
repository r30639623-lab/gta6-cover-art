// Fixed scenes for screenshots: ?shot=editor shows the editor with the
// sample photos loaded; ?shot=cover shows the exported cover alone.
// Query params: layout, grade, title, subtitle, caption, seed (rotates
// which sample fills each panel), photo (the first sample), w and h (the
// cover's pixel size). window.__shotReady is set once the scene painted.

import { drawCover } from './cover.js';

const SAMPLE_ORDER = ['s1', 's2', 's3', 's4'];
const SAMPLE_BY_NAME = {
  boulevard: 's1',
  rooftop: 's2',
  'neon-street': 's3',
  pier: 's4',
};

export async function runShot(shot, query, api) {
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.load('40px Pacifico');
  } catch { /* fonts fall back to system faces */ }
  await api.loadSamples();

  const seed = Number(query.get('seed') ?? 7);
  const patch = {};
  if (query.get('layout')) patch.layout = query.get('layout');
  if (query.get('grade')) patch.grade = query.get('grade');
  if (query.get('title')) patch.title = query.get('title');
  if (query.get('subtitle')) patch.subtitle = query.get('subtitle');
  if (query.get('caption')) patch.caption = query.get('caption');
  if (query.get('aspect')) patch.aspect = query.get('aspect');
  // Rotate the sample order by the seed, so each shot gets a fresh mix.
  const rotated = SAMPLE_ORDER.map((_, i) => SAMPLE_ORDER[(i + seed) % SAMPLE_ORDER.length]);
  patch.panelPhotos = {};
  for (let i = 0; i < 9; i++) patch.panelPhotos[i] = rotated[i % rotated.length];
  if (query.get('photo')) {
    const first = SAMPLE_BY_NAME[query.get('photo')] ?? 's1';
    patch.panelPhotos[0] = first;
  }
  if (query.get('crop')) {
    // Per-photo focus/zoom for this shot only, e.g. crop=s2:0.39,0.42,1
    // (photoId:cx,cy,zoom, ';'-separated). A crop is per photo, so it
    // applies to every panel showing that photo in this shot. It cannot
    // conjure content outside the photo: the rooftop sample's left arm
    // already exits the photo's right edge, so no crop can show that
    // hand — but shifting the window left puts the raised right hand
    // whole in frame instead of clipping it at the panel's left edge.
    const crops = {};
    for (const id of SAMPLE_ORDER) crops[id] = { cx: 0.5, cy: 0.42, zoom: 1 };
    for (const part of query.get('crop').split(';')) {
      const [id, vals] = part.split(':');
      if (!id || !vals) continue;
      const [cx, cy, zoom] = vals.split(',').map(Number);
      crops[id] = {
        cx: Number.isFinite(cx) ? cx : 0.5,
        cy: Number.isFinite(cy) ? cy : 0.42,
        zoom: Number.isFinite(zoom) ? zoom : 1,
      };
    }
    patch.crops = crops;
  }
  if (shot === 'cover') {
    // Mark the scene before applying it, so the editor's preview render
    // never redraws over the cover canvas.
    document.body.classList.add('shot-cover');
  }
  api.applyScene(patch);

  if (shot === 'cover') {
    const w = Number(query.get('w') ?? 1080);
    const h = Number(query.get('h') ?? 1080);
    const canvas = document.getElementById('cover');
    canvas.width = w;
    canvas.height = h;
    drawCover(canvas, api.state, api.photoMap);
  } else {
    api.render();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
