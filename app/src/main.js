// Coral Dusk Cover Studio — the editor.
// Wires the controls to the cover engine: photos, layouts, grades,
// lettering, per-panel crop, undo/redo and one-click PNG export.
// A `?shot=` query hands control to ./shots.js for fixed screenshots.

import { APP_NAME, GRADES, GRADE_IDS, LAYOUTS, LAYOUT_IDS, drawCover, renderCover } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { id: 's1', name: 'Boulevard', src: 'samples/1-boulevard.jpg' },
  { id: 's2', name: 'Rooftop', src: 'samples/2-rooftop.jpg' },
  { id: 's3', name: 'Neon Street', src: 'samples/3-neon-street.jpg' },
  { id: 's4', name: 'Pier', src: 'samples/4-pier.jpg' },
];

export const ASPECTS = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  landscape: { label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
  story: { label: 'Story 1080 x 1920', w: 1080, h: 1920 },
};

const DEFAULT_STATE = {
  layout: 'hero3',
  grade: 'sunset',
  aspect: 'landscape',
  title: 'CORAL DUSK',
  subtitle: 'Sunset Coast Nights',
  caption: 'Sunset Heist',
  roles: 'MARA — DRIVER\nDANTE — THE FIXER\nSOFIA — THE BOSS',
  billing: 'CORAL DUSK STUDIO PRESENTS A SUNSET COAST STORY\nSTARRING MARA VOSS • DANTE RUIZ • SOFIA LANE',
  badge: 'CORAL COAST',
  heat: 4,
  titlePos: 'bottom',
  grain: true,
  vignette: true,
  ink: true,
  halftone: true,
  popout: true,
  photos: SAMPLES.map((s) => ({ ...s })),
  panelPhotos: {},
  crops: {},
  selectedPanel: 0,
};

export const state = structuredClone(DEFAULT_STATE);
export const photoMap = new Map();
let uploadCount = 0;

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');

// ------------------------------------------------------------------ images
/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function ensureCrop(photoId) {
  if (!state.crops[photoId]) state.crops[photoId] = { cx: 0.5, cy: 0.42, zoom: 1 };
  return state.crops[photoId];
}

async function loadPhoto(photo) {
  if (photoMap.has(photo.id)) return photoMap.get(photo.id);
  const img = await loadImage(photo.src);
  photoMap.set(photo.id, img);
  ensureCrop(photo.id);
  return img;
}

export async function loadSamples() {
  await Promise.all(state.photos.map((p) => loadPhoto(p).catch(() => null)));
}

// ----------------------------------------------------------------- history
const history = [];
let historyIndex = -1;

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  history.splice(historyIndex + 1);
  history.push(snapshot());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  syncUndoButtons();
}

function restoreHistory(index) {
  // The snapshot carries the whole state, photos included: an upload's
  // object URL stays valid for the session, and photoMap still holds
  // its image, so restoring the snapshot restores the photo list too.
  const parsed = JSON.parse(history[index]);
  Object.assign(state, parsed);
  historyIndex = index;
  syncControls();
  render();
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undo-btn').disabled = historyIndex <= 0;
  document.getElementById('redo-btn').disabled = historyIndex >= history.length - 1;
}

// ------------------------------------------------------------------ render
let renderQueued = false;

export function render() {
  // In a ?shot=cover scene shots.js owns the canvas; never redraw the
  // preview over it.
  if (document.body.classList.contains('shot-cover')) return;
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const aspect = ASPECTS[state.aspect] ?? ASPECTS.landscape;
    const scale = Math.min(880 / aspect.w, 880 / aspect.h, 1);
    const w = Math.round(aspect.w * scale);
    const h = Math.round(aspect.h * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    drawCover(canvas, state, photoMap);
    highlightSelectedPanel();
  });
}

function scheduleRender() {
  render();
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ------------------------------------------------------------ control sync
function syncControls() {
  document.getElementById('title-input').value = state.title;
  document.getElementById('subtitle-input').value = state.subtitle;
  document.getElementById('caption-input').value = state.caption;
  document.getElementById('roles-input').value = state.roles;
  document.getElementById('billing-input').value = state.billing;
  document.getElementById('badge-input').value = state.badge;
  document.getElementById('heat-input').value = String(state.heat);
  document.getElementById('heat-value').textContent = `${state.heat} / 5`;
  document.getElementById('titlepos-select').value = state.titlePos;
  document.getElementById('aspect-select').value = state.aspect;
  for (const [key, id] of [['grain', 'grain-toggle'], ['vignette', 'vignette-toggle'], ['ink', 'ink-toggle'], ['halftone', 'halftone-toggle'], ['popout', 'popout-toggle']]) {
    document.getElementById(id).checked = Boolean(state[key]);
  }
  document.querySelectorAll('#layout-grid button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
    b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
  });
  document.querySelectorAll('#grade-grid button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
    b.setAttribute('aria-pressed', String(b.dataset.grade === state.grade));
  });
  syncSampleStrip();
  syncPanelControls();
}

function syncSampleStrip() {
  const strip = document.getElementById('sample-strip');
  strip.querySelectorAll('button').forEach((b) => {
    const panelPhoto = state.panelPhotos[state.selectedPanel]
      ?? state.photos[state.selectedPanel % Math.max(1, state.photos.length)]?.id;
    b.classList.toggle('active', b.dataset.photo === panelPhoto);
  });
}

function syncPanelControls() {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero3;
  const panels = layout.panels(1);
  const panelSelect = document.getElementById('panel-select');
  panelSelect.innerHTML = panels.map((p, i) => {
    const label = p.hero ? `Panel ${i + 1} — Hero` : `Panel ${i + 1}`;
    return `<option value="${i}"${i === state.selectedPanel ? ' selected' : ''}>${label}</option>`;
  }).join('');
  const photoSelect = document.getElementById('panel-photo-select');
  const current = state.panelPhotos[state.selectedPanel]
    ?? state.photos[state.selectedPanel % Math.max(1, state.photos.length)]?.id;
  photoSelect.innerHTML = state.photos.map((p) => (
    `<option value="${p.id}"${p.id === current ? ' selected' : ''}>${p.name}</option>`
  )).join('');
  const crop = ensureCrop(current);
  document.getElementById('zoom-input').value = String(crop.zoom);
  document.getElementById('zoom-value').textContent = `${crop.zoom.toFixed(2)}x`;
}

function highlightSelectedPanel() {
  // A thin white corner frame around the selected panel, drawn on the
  // preview only (never on exports, which use a fresh canvas).
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero3;
  const panels = layout.panels(canvas.width / canvas.height);
  const panel = panels[state.selectedPanel];
  if (!panel || document.body.classList.contains('shot-cover')) return;
  const ctx = canvas.getContext('2d');
  const x = panel.x * canvas.width;
  const y = panel.y * canvas.height;
  const w = panel.w * canvas.width;
  const h = panel.h * canvas.height;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  ctx.restore();
}

// ------------------------------------------------------------------ export
async function exportPng(width, height, filename) {
  const off = renderCover(state, photoMap, width, height);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('export failed');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return blob.size;
}

async function exportCurrentSize() {
  const aspect = ASPECTS[state.aspect] ?? ASPECTS.landscape;
  try {
    const bytes = await exportPng(aspect.w, aspect.h, `coral-dusk-${aspect.w}x${aspect.h}.png`);
    setStatus(`Saved coral-dusk-${aspect.w}x${aspect.h}.png (${(bytes / 1024).toFixed(0)} KiB)`);
  } catch (e) {
    setStatus(`Export failed: ${e.message}`);
  }
}

async function exportAllSizes() {
  setStatus('Exporting all 4 sizes…');
  for (const [key, aspect] of Object.entries(ASPECTS)) {
    try {
      await exportPng(aspect.w, aspect.h, `coral-dusk-${aspect.w}x${aspect.h}.png`);
    } catch (e) {
      setStatus(`Export failed at ${aspect.w}x${aspect.h}: ${e.message}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  setStatus('Saved all 4 PNGs: 1080x1080, 1080x1350, 1920x1080, 1080x1920.');
}

// ------------------------------------------------------------- photo picks
function panelPhotoId(index) {
  return state.panelPhotos[index]
    ?? state.photos[index % Math.max(1, state.photos.length)]?.id;
}

function clampCropFor(photoId, panelPx) {
  const img = photoMap.get(photoId);
  if (!img) return;
  const crop = ensureCrop(photoId);
  const base = Math.max(panelPx.w / img.naturalWidth, panelPx.h / img.naturalHeight) * crop.zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const fx = Math.min(0.5, (panelPx.w / dw) / 2);
  const fy = Math.min(0.5, (panelPx.h / dh) / 2);
  crop.cx = Math.min(1 - fx, Math.max(fx, crop.cx));
  crop.cy = Math.min(1 - fy, Math.max(fy, crop.cy));
}

function panelAtPoint(px, py) {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero3;
  const panels = layout.panels(canvas.width / canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    const x = p.x * canvas.width;
    const y = p.y * canvas.height;
    const w = p.w * canvas.width;
    const h = p.h * canvas.height;
    if (px >= x && px <= x + w && py >= y && py <= y + h) return { index: i, rect: { x, y, w, h } };
  }
  return null;
}

// ------------------------------------------------------------------- build
function buildLayoutButtons() {
  const grid = document.getElementById('layout-grid');
  grid.innerHTML = LAYOUT_IDS.map((id) => (
    `<button type="button" data-layout="${id}">${LAYOUTS[id].label}</button>`
  )).join('');
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-layout]');
    if (!btn) return;
    state.layout = btn.dataset.layout;
    state.selectedPanel = 0;
    pushHistory();
    syncControls();
    render();
  });
}

function buildGradeButtons() {
  const grid = document.getElementById('grade-grid');
  grid.innerHTML = GRADE_IDS.map((id) => {
    const stops = GRADES[id].stops;
    const mid = stops[Math.floor(stops.length / 2)][1];
    const end = stops[stops.length - 1][1];
    return `<button type="button" data-grade="${id}" style="background:linear-gradient(135deg, ${stops[0][1]}, ${mid}, ${end})" title="${GRADES[id].label}">${GRADES[id].label}</button>`;
  }).join('');
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (!btn) return;
    state.grade = btn.dataset.grade;
    pushHistory();
    syncControls();
    render();
  });
}

function buildSampleStrip() {
  const strip = document.getElementById('sample-strip');
  strip.innerHTML = SAMPLES.map((s) => (
    `<button type="button" data-photo="${s.id}" title="${s.name}"><img src="${s.src}" alt="${s.name} sample photo"></button>`
  )).join('');
  strip.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-photo]');
    if (!btn) return;
    state.panelPhotos[state.selectedPanel] = btn.dataset.photo;
    pushHistory();
    syncControls();
    render();
    setStatus(`Panel ${state.selectedPanel + 1} now uses the ${btn.title} photo.`);
  });
}

function buildFocusGrid() {
  const grid = document.getElementById('focus-grid');
  const points = [[0.25, 0.25], [0.5, 0.25], [0.75, 0.25], [0.25, 0.5], [0.5, 0.5], [0.75, 0.5], [0.25, 0.75], [0.5, 0.75], [0.75, 0.75]];
  grid.innerHTML = points.map(([fx, fy]) => (
    `<button type="button" data-fx="${fx}" data-fy="${fy}" aria-label="Focus ${fx}, ${fy}"></button>`
  )).join('');
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-fx]');
    if (!btn) return;
    const crop = ensureCrop(panelPhotoId(state.selectedPanel));
    crop.cx = Number(btn.dataset.fx);
    crop.cy = Number(btn.dataset.fy);
    pushHistory();
    syncPanelControls();
    render();
  });
}

function bindTextInputs() {
  const pairs = [
    ['title-input', 'title'], ['subtitle-input', 'subtitle'], ['caption-input', 'caption'],
    ['roles-input', 'roles'], ['billing-input', 'billing'], ['badge-input', 'badge'],
  ];
  for (const [id, key] of pairs) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      state[key] = el.value;
      scheduleRender();
    });
    el.addEventListener('change', pushHistory);
  }
  document.getElementById('heat-input').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    document.getElementById('heat-value').textContent = `${state.heat} / 5`;
    scheduleRender();
  });
  document.getElementById('heat-input').addEventListener('change', pushHistory);
  document.getElementById('titlepos-select').addEventListener('change', (e) => {
    state.titlePos = e.target.value;
    pushHistory();
    render();
  });
  document.getElementById('aspect-select').addEventListener('change', (e) => {
    state.aspect = e.target.value;
    pushHistory();
    render();
  });
  for (const [key, id] of [['grain', 'grain-toggle'], ['vignette', 'vignette-toggle'], ['ink', 'ink-toggle'], ['halftone', 'halftone-toggle'], ['popout', 'popout-toggle']]) {
    document.getElementById(id).addEventListener('change', (e) => {
      state[key] = e.target.checked;
      pushHistory();
      render();
    });
  }
}

function bindPanelControls() {
  document.getElementById('panel-select').addEventListener('change', (e) => {
    state.selectedPanel = Number(e.target.value);
    syncControls();
    render();
  });
  document.getElementById('panel-photo-select').addEventListener('change', (e) => {
    state.panelPhotos[state.selectedPanel] = e.target.value;
    pushHistory();
    syncControls();
    render();
  });
  document.getElementById('zoom-input').addEventListener('input', (e) => {
    const crop = ensureCrop(panelPhotoId(state.selectedPanel));
    crop.zoom = Number(e.target.value);
    document.getElementById('zoom-value').textContent = `${crop.zoom.toFixed(2)}x`;
    scheduleRender();
  });
  document.getElementById('zoom-input').addEventListener('change', pushHistory);
  document.getElementById('fill-one-btn').addEventListener('click', () => {
    const first = state.photos[0]?.id;
    if (!first) return;
    const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero3;
    layout.panels(1).forEach((_, i) => { state.panelPhotos[i] = first; });
    pushHistory();
    syncControls();
    render();
    setStatus('One photo now fills every panel.');
  });
  document.getElementById('deal-btn').addEventListener('click', () => {
    const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero3;
    layout.panels(1).forEach((_, i) => { state.panelPhotos[i] = state.photos[i % state.photos.length].id; });
    pushHistory();
    syncControls();
    render();
    setStatus('Photos dealt across the panels.');
  });
}

function bindUpload() {
  document.getElementById('photo-input').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    for (const file of files) {
      if (state.photos.length >= 9) {
        setStatus('Nine photos is the most the cover holds — remove one first.');
        break;
      }
      const id = `u${++uploadCount}`;
      const photo = { id, name: file.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(file) };
      state.photos.push(photo);
      try {
        await loadPhoto(photo);
        setStatus(`Added ${photo.name}.`);
      } catch {
        setStatus(`Could not read ${photo.name}.`);
      }
    }
    pushHistory();
    syncControls();
    render();
    e.target.value = '';
  });
}

function bindExport() {
  document.getElementById('export-current').addEventListener('click', exportCurrentSize);
  document.getElementById('export-all').addEventListener('click', exportAllSizes);
  document.getElementById('undo-btn').addEventListener('click', () => {
    if (historyIndex > 0) restoreHistory(historyIndex - 1);
  });
  document.getElementById('redo-btn').addEventListener('click', () => {
    if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    const keep = state.photos;
    Object.assign(state, structuredClone(DEFAULT_STATE));
    state.photos = keep;
    pushHistory();
    syncControls();
    render();
    setStatus('Cover reset to the Coral Dusk defaults.');
  });
}

function bindDrag() {
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const hit = panelAtPoint(px, py);
    if (!hit) return;
    state.selectedPanel = hit.index;
    syncControls();
    const photoId = panelPhotoId(hit.index);
    const img = photoMap.get(photoId);
    if (!img) return;
    const crop = ensureCrop(photoId);
    const base = Math.max(hit.rect.w / img.naturalWidth, hit.rect.h / img.naturalHeight) * crop.zoom;
    dragging = {
      lastX: px, lastY: py,
      dw: img.naturalWidth * base, dh: img.naturalHeight * base,
      photoId, rect: hit.rect,
    };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const crop = ensureCrop(dragging.photoId);
    crop.cx -= (px - dragging.lastX) / dragging.dw;
    crop.cy -= (py - dragging.lastY) / dragging.dh;
    dragging.lastX = px;
    dragging.lastY = py;
    clampCropFor(dragging.photoId, dragging.rect);
    syncPanelControls();
    scheduleRender();
  });
  const endDrag = () => {
    if (dragging) { pushHistory(); dragging = null; }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

// -------------------------------------------------------------------- init
buildLayoutButtons();
buildGradeButtons();
buildSampleStrip();
buildFocusGrid();
bindTextInputs();
bindPanelControls();
bindUpload();
bindExport();
bindDrag();

document.getElementById('app-name').textContent = APP_NAME;
syncControls();
pushHistory();

const shot = new URLSearchParams(location.search).get('shot');
const api = {
  state,
  photoMap,
  loadSamples,
  render,
  syncControls,
  pushHistory,
  setStatus,
  applyScene(patch) {
    Object.assign(state, patch);
    syncControls();
    render();
  },
};

if (shot) {
  runShot(shot, new URLSearchParams(location.search), api);
} else {
  (async () => {
    try {
      await document.fonts.load('80px Anton');
      await document.fonts.load('40px Pacifico');
    } catch { /* fonts fall back to system faces */ }
    await loadSamples();
    render();
  })();
}

// Handles for screenshots and playtests.
window.__coverApp = { state, photoMap, render, exportPng, loadSamples, ASPECTS };
