// Duskline Cover Studio — editor wiring.
// Loads the six sample photos, builds the studio controls (photo strip,
// layouts, grades, caption fields, panel tools), keeps an undo history, and
// exports the cover as PNG in 1:1, 4:5 and 16:9. When the page is opened
// with ?shot=..., the shot scenes in shots.js take over instead.
import { drawCover, GRADES, LAYOUTS, ASPECTS } from './cover.js';
import { runShot } from './shots.js';

export const PHOTO_DEFS = [
  { file: 'samples/mara.jpg', name: 'Mara', role: 'THE DRIVER', focus: { x: 0.5, y: 0.32 } },
  { file: 'samples/dante.jpg', name: 'Dante', role: 'THE BOSS', focus: { x: 0.5, y: 0.35 } },
  { file: 'samples/sofia.jpg', name: 'Sofia', role: 'THE MECHANIC', focus: { x: 0.5, y: 0.42 } },
  { file: 'samples/rico.jpg', name: 'Rico', role: 'THE CAPTAIN', focus: { x: 0.5, y: 0.4 } },
  { file: 'samples/boulevard.jpg', name: 'Boulevard', role: 'SOLMAR BOULEVARD', focus: { x: 0.55, y: 0.22 } },
  { file: 'samples/pier.jpg', name: 'Pier', role: 'SOLMAR PIER', focus: { x: 0.42, y: 0.28 } },
];

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

export async function loadPhotos() {
  const photos = [];
  for (const def of PHOTO_DEFS) {
    photos.push({ ...def, img: await loadImage(def.file) });
  }
  return photos;
}

export function defaultState() {
  return {
    aspect: 'wide',
    layout: 'mosaic',
    grade: 'sunset-gold',
    title: 'SOLMAR NIGHTS',
    titleFont: 'anton',
    subtitle: 'Chasing the Last Light',
    scriptFont: 'yellowtail',
    ribbon: 'Everyone wants a piece of the night',
    quote: 'A sunset you can steal',
    quoteSource: 'Solmar Gazette',
    billing: 'A Duskline Pictures production in association with Neon Harbor Films · Solmar Nights · Music by the Night Shift Orchestra · Edited by J. Morrow · Written by M. Delacroix · Directed by R. Valentine',
    sealRing: 'Solmar Film Festival',
    seal: 'BEST CAST',
    release: 'Coming soon',
    edition: 'Vol. 1',
    showQuote: true,
    showSeal: true,
    showBarcode: true,
    showBilling: true,
    slots: PHOTO_DEFS.map((_, i) => ({ photo: i, zoom: 1, dx: 0, dy: 0, flip: false })),
    selectedSlot: 1,
  };
}

// Draws the state into a canvas sized for its aspect. Returns the
// per-panel face-safe flags from the renderer.
export function drawInto(canvas, photos, state) {
  const size = ASPECTS[state.aspect];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  return drawCover(canvas, photos, state);
}

const $ = (id) => document.getElementById(id);
const GRADE_CHIPS = {
  'sunset-gold': 'linear-gradient(135deg,#ffd166,#ff8a3c,#ff5e7a)',
  'neon-vice': 'linear-gradient(135deg,#ff2e9a,#7b2fff)',
  'neon-night': 'linear-gradient(135deg,#2b3bff,#0b1030)',
  'tropic-teal': 'linear-gradient(135deg,#00c8b0,#0e7490)',
  ultraviolet: 'linear-gradient(135deg,#7b2fff,#ff2e9a)',
  'retro-print': 'linear-gradient(135deg,#c98a3c,#5c3a1a)',
  mono: 'linear-gradient(135deg,#ffffff,#555555)',
};

export async function bootEditor() {
  const canvas = $('previewCanvas');
  const statusLine = $('statusLine');
  const faceBadge = $('faceBadge');
  const photos = await loadPhotos();
  await Promise.all([
    document.fonts.load('16px Anton'),
    document.fonts.load('16px Yellowtail'),
    document.fonts.ready,
  ]);
  const state = defaultState();

  let history = [JSON.stringify(state)];
  let historyIndex = 0;
  let faceSafe = [];

  function redraw() {
    faceSafe = drawInto(canvas, photos, state);
    const bad = faceSafe.filter((ok) => !ok).length;
    if (bad > 0) {
      faceBadge.textContent = `Face at edge (${bad}) — tap Auto-fill`;
      faceBadge.classList.add('warn');
    } else {
      faceBadge.textContent = 'Face-safe ✓';
      faceBadge.classList.remove('warn');
    }
    syncPanelBar();
  }
  function commit() {
    history = history.slice(0, historyIndex + 1);
    history.push(JSON.stringify(state));
    historyIndex = history.length - 1;
    syncUndoRedo();
  }
  function restore(snapshot) {
    const parsed = JSON.parse(snapshot);
    Object.assign(state, parsed);
    syncCaptionInputs();
    buildPhotoStrip();
    buildLayoutGrid();
    buildGradeGrid();
    syncAspectButtons();
    redraw();
  }
  function syncUndoRedo() {
    $('undoBtn').disabled = historyIndex <= 0;
    $('redoBtn').disabled = historyIndex >= history.length - 1;
  }
  $('undoBtn').addEventListener('click', () => {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    restore(history[historyIndex]);
    syncUndoRedo();
  });
  $('redoBtn').addEventListener('click', () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    restore(history[historyIndex]);
    syncUndoRedo();
  });

  // Photo strip: click a photo to place it in the selected frame.
  function buildPhotoStrip() {
    const strip = $('photoStrip');
    strip.innerHTML = '';
    const inUse = new Set(state.slots.map((s) => s.photo));
    photos.forEach((photo, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'photo-thumb' + (inUse.has(i) ? ' in-use' : '') + (state.slots[state.selectedSlot].photo === i ? ' selected' : '');
      btn.title = `${photo.name}${photo.role ? ` — ${photo.role}` : ''}`;
      const img = document.createElement('img');
      img.src = photo.file;
      img.alt = photo.name;
      const label = document.createElement('span');
      label.textContent = photo.name + (photo.role ? ` · ${photo.role}` : '');
      btn.append(img, label);
      btn.addEventListener('click', () => {
        state.slots[state.selectedSlot].photo = i;
        commit();
        buildPhotoStrip();
        redraw();
      });
      strip.appendChild(btn);
    });
  }

  function buildLayoutGrid() {
    const grid = $('layoutGrid');
    grid.innerHTML = '';
    for (const [id, def] of Object.entries(LAYOUTS)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'layout-btn' + (state.layout === id ? ' active' : '');
      btn.textContent = def.label;
      btn.addEventListener('click', () => {
        state.layout = id;
        commit();
        buildLayoutGrid();
        redraw();
      });
      grid.appendChild(btn);
    }
  }

  function buildGradeGrid() {
    const grid = $('gradeGrid');
    grid.innerHTML = '';
    for (const [id, def] of Object.entries(GRADES)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grade-btn' + (state.grade === id ? ' active' : '');
      const chip = document.createElement('i');
      chip.style.setProperty('--chip', GRADE_CHIPS[id] || '#888');
      const label = document.createElement('span');
      label.textContent = def.label;
      btn.append(chip, label);
      btn.addEventListener('click', () => {
        state.grade = id;
        commit();
        buildGradeGrid();
        redraw();
      });
      grid.appendChild(btn);
    }
  }

  // Panel bar: which frame is selected, and its crop tools.
  function syncPanelBar() {
    const bar = $('panelBar');
    bar.innerHTML = '';
    const layout = LAYOUTS[state.layout];
    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = `Frame ${state.selectedSlot + 1} · ${photos[state.slots[state.selectedSlot].photo]?.name || ''}`;
    bar.appendChild(label);
    layout.panels().forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `Frame ${p.slot + 1}`;
      if (state.selectedSlot === p.slot) btn.classList.add('active');
      btn.addEventListener('click', () => {
        state.selectedSlot = p.slot;
        buildPhotoStrip();
        redraw();
      });
      bar.appendChild(btn);
    });
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.textContent = '◀ Photo';
    prev.addEventListener('click', () => cyclePhoto(-1));
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Photo ▶';
    next.addEventListener('click', () => cyclePhoto(1));
    bar.append(prev, next);
    const flip = document.createElement('button');
    flip.type = 'button';
    flip.textContent = '⇄ Flip';
    flip.addEventListener('click', () => {
      const slot = state.slots[state.selectedSlot];
      slot.flip = !slot.flip;
      commit();
      redraw();
    });
    bar.appendChild(flip);
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.05';
    zoom.value = String(state.slots[state.selectedSlot].zoom);
    zoom.setAttribute('aria-label', 'Zoom the selected frame');
    const zoomVal = document.createElement('span');
    zoomVal.className = 'zoom-val';
    zoomVal.textContent = `${state.slots[state.selectedSlot].zoom.toFixed(2)}×`;
    zoom.addEventListener('input', () => {
      state.slots[state.selectedSlot].zoom = Number(zoom.value);
      zoomVal.textContent = `${state.slots[state.selectedSlot].zoom.toFixed(2)}×`;
      redraw();
    });
    zoom.addEventListener('change', commit);
    bar.append(zoom, zoomVal);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset crop';
    reset.addEventListener('click', () => {
      state.slots[state.selectedSlot] = { ...state.slots[state.selectedSlot], zoom: 1, dx: 0, dy: 0, flip: false };
      commit();
      redraw();
    });
    bar.appendChild(reset);
  }
  function cyclePhoto(dir) {
    const slot = state.slots[state.selectedSlot];
    slot.photo = (slot.photo + dir + photos.length) % photos.length;
    commit();
    buildPhotoStrip();
    redraw();
  }

  // Upload: photos added to the strip, first one fills the selected frame.
  $('uploadBtn').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      if (photos.length >= 12) break;
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      photos.push({ file: url, name: file.name.replace(/\.[^.]+$/, '').slice(0, 14), role: '', focus: { x: 0.5, y: 0.42 }, img });
    }
    if (files.length) {
      state.slots[state.selectedSlot].photo = photos.length - 1;
      commit();
      buildPhotoStrip();
      redraw();
      statusLine.textContent = `Added ${files.length} photo${files.length > 1 ? 's' : ''} — click one to place it in a frame.`;
    }
    e.target.value = '';
  });
  $('fillBtn').addEventListener('click', () => {
    state.slots = PHOTO_DEFS.map((_, i) => ({ photo: i, zoom: 1, dx: 0, dy: 0, flip: false }));
    commit();
    buildPhotoStrip();
    redraw();
    statusLine.textContent = 'Auto-filled — every face centred and safe.';
  });

  // Caption fields.
  const captionBindings = [
    ['titleInput', 'title'],
    ['titleFontInput', 'titleFont'],
    ['subtitleInput', 'subtitle'],
    ['scriptFontInput', 'scriptFont'],
    ['ribbonInput', 'ribbon'],
    ['quoteInput', 'quote'],
    ['quoteSourceInput', 'quoteSource'],
    ['billingInput', 'billing'],
    ['sealRingInput', 'sealRing'],
    ['releaseInput', 'release'],
    ['editionInput', 'edition'],
  ];
  let captionTimer = null;
  for (const [id, key] of captionBindings) {
    const el = $(id);
    el.addEventListener('input', () => {
      state[key] = el.value;
      redraw();
      clearTimeout(captionTimer);
      captionTimer = setTimeout(commit, 600);
    });
  }
  const toggleBindings = [
    ['showQuote', 'showQuote'],
    ['showSeal', 'showSeal'],
    ['showBarcode', 'showBarcode'],
    ['showBilling', 'showBilling'],
  ];
  for (const [id, key] of toggleBindings) {
    $(id).addEventListener('change', (e) => {
      state[key] = e.target.checked;
      commit();
      redraw();
    });
  }
  function syncCaptionInputs() {
    for (const [id, key] of captionBindings) $(id).value = state[key];
    for (const [id, key] of toggleBindings) $(id).checked = state[key];
  }

  // Aspect buttons.
  function syncAspectButtons() {
    document.querySelectorAll('[data-aspect]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.aspect === state.aspect);
    });
  }
  document.querySelectorAll('[data-aspect]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.aspect = btn.dataset.aspect;
      commit();
      syncAspectButtons();
      redraw();
    });
  });

  // Canvas: click a frame to select it, drag to pan, wheel to zoom.
  let drag = null;
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }
  function pickSlot(point) {
    const panels = LAYOUTS[state.layout].panels();
    for (const p of panels) {
      if (point.x >= p.x && point.x <= p.x + p.w && point.y >= p.y && point.y <= p.y + p.h) return p.slot;
    }
    return null;
  }
  canvas.addEventListener('pointerdown', (e) => {
    const point = canvasPoint(e);
    const slot = pickSlot(point);
    if (slot === null) return;
    state.selectedSlot = slot;
    buildPhotoStrip();
    drag = { start: point, slot, dx0: state.slots[slot].dx, dy0: state.slots[slot].dy, moved: false };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const point = canvasPoint(e);
    const slot = state.slots[drag.slot];
    slot.dx = Math.max(-1, Math.min(1, drag.dx0 + (point.x - drag.start.x) * 2.5));
    slot.dy = Math.max(-1, Math.min(1, drag.dy0 + (point.y - drag.start.y) * 2.5));
    drag.moved = true;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag?.moved) commit();
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.slots[state.selectedSlot];
    slot.zoom = Math.max(1, Math.min(2.5, slot.zoom - e.deltaY * 0.001));
    redraw();
    clearTimeout(captionTimer);
    captionTimer = setTimeout(commit, 600);
  }, { passive: false });

  // Export.
  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function exportSize(sizeId) {
    const off = document.createElement('canvas');
    const savedAspect = state.aspect;
    state.aspect = sizeId;
    drawInto(off, photos, state);
    state.aspect = savedAspect;
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    downloadBlob(blob, `solmar-nights-${ASPECTS[sizeId].w}x${ASPECTS[sizeId].h}.png`);
    statusLine.textContent = `Saved solmar-nights-${ASPECTS[sizeId].w}x${ASPECTS[sizeId].h}.png`;
  }
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => exportSize(btn.dataset.export));
  });
  $('exportAllBtn').addEventListener('click', async () => {
    for (const sizeId of ['square', 'tall', 'wide']) {
      await exportSize(sizeId);
      await new Promise((r) => setTimeout(r, 250));
    }
    statusLine.textContent = 'Saved all 3 PNGs — 1:1, 4:5 and 16:9.';
  });

  buildPhotoStrip();
  buildLayoutGrid();
  buildGradeGrid();
  syncAspectButtons();
  syncUndoRedo();
  redraw();
  window.__shotReady = true;
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot).catch((err) => {
    console.error(err);
    document.body.textContent = `Shot failed: ${err.message}`;
  });
} else {
  bootEditor().catch((err) => {
    console.error(err);
    document.getElementById('statusLine').textContent = `Could not start the studio: ${err.message}`;
  });
}
