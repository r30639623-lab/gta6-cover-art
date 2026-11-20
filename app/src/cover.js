// Coral Dusk Cover Studio — the canvas cover engine.
//
// Turns photos + a caption into GTA-poster-style multi-panel cover art:
// graded panels, poster ink, halftone dots, chrome lettering, cast tags,
// a billing block, a heat meter and a ribbon badge. Everything is drawn
// on plain 2D canvases, offline, with no library and no network request.

export const APP_NAME = 'Coral Dusk Cover Studio';

// ---------------------------------------------------------------- grades
// Each grade is a duotone gradient map (shadow -> highlight) plus the
// sky colours behind the panels and a faint wash tint over the cover.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    stops: [[0, '#160a2e'], [0.3, '#7b2d8b'], [0.55, '#e84a7f'], [0.8, '#ff9a3d'], [1, '#ffd76a']],
    sky: ['#2b1055', '#ff7e5f', '#feb47b'],
    wash: 'rgba(255, 110, 60, 0.08)',
  },
  neon: {
    label: 'Neon Vice',
    stops: [[0, '#05021a'], [0.3, '#1b0a6e'], [0.55, '#c026d3'], [0.8, '#22d3ee'], [1, '#f5d0fe']],
    sky: ['#0b0221', '#7c3aed', '#ec4899'],
    wash: 'rgba(190, 40, 220, 0.08)',
  },
  dusk: {
    label: 'Dusk',
    stops: [[0, '#0a0a24'], [0.35, '#3730a3'], [0.6, '#7c6bb3'], [0.85, '#e8b4d9'], [1, '#fdf2f8']],
    sky: ['#1e1b4b', '#6d28d9', '#c084fc'],
    wash: 'rgba(120, 90, 220, 0.08)',
  },
  teal: {
    label: 'Teal Pink',
    stops: [[0, '#04202b'], [0.3, '#0e7490'], [0.55, '#2dd4bf'], [0.8, '#f472b6'], [1, '#fdf2f8']],
    sky: ['#042f2e', '#0d9488', '#f9a8d4'],
    wash: 'rgba(45, 212, 191, 0.07)',
  },
  gold: {
    label: 'Gold',
    stops: [[0, '#1c1005'], [0.3, '#7c4a12'], [0.55, '#d97706'], [0.8, '#fbbf24'], [1, '#fef3c7']],
    sky: ['#451a03', '#b45309', '#fcd34d'],
    wash: 'rgba(251, 191, 36, 0.08)',
  },
  noir: {
    label: 'Noir',
    stops: [[0, '#000000'], [0.3, '#1f2937'], [0.55, '#6b7280'], [0.8, '#d1d5db'], [1, '#ffffff']],
    sky: ['#111827', '#374151', '#9ca3af'],
    wash: 'rgba(255, 255, 255, 0.05)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

// --------------------------------------------------------------- layouts
// A layout is a function of the cover aspect (w / h) returning panels in
// unit space: x, y, w, h are fractions of the cover, rot is degrees, skew
// is a horizontal shear factor, hero marks the star panel, frame can be
// 'polaroid' for a white snapshot border.

const GUT = 0.012;

function gridCells(cols, rows, x0, y0, w0, h0) {
  const cells = [];
  const cw = (w0 - GUT * (cols - 1)) / cols;
  const ch = (h0 - GUT * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: x0 + c * (cw + GUT), y: y0 + r * (ch + GUT), w: cw, h: ch, rot: 0, skew: 0, hero: false, frame: 'plain' });
    }
  }
  return cells;
}

export const LAYOUTS = {
  grid9: {
    label: '9-Panel Grid',
    panels() {
      return gridCells(3, 3, 0, 0, 1, 1).map((p, i) => ({ ...p, hero: i === 4 }));
    },
  },
  hero3: {
    label: 'Hero + 3',
    panels() {
      const hero = { x: 0, y: 0, w: 1, h: 0.62, rot: 0, skew: 0, hero: true, frame: 'plain' };
      const bottom = gridCells(3, 1, 0, 0.62 + GUT, 1, 1 - 0.62 - GUT);
      return [hero, ...bottom];
    },
  },
  hero5: {
    label: 'Hero + 5',
    panels() {
      const hero = { x: 0, y: 0, w: 0.55, h: 1, rot: 0, skew: 0, hero: true, frame: 'plain' };
      const x0 = 0.55 + GUT;
      const w0 = 1 - x0;
      const top = gridCells(2, 1, x0, 0, w0, 0.325);
      const mid = gridCells(2, 1, x0, 0.325 + GUT, w0, 0.325);
      const low = [{ x: x0, y: 0.65 + 2 * GUT, w: w0, h: 1 - 0.65 - 2 * GUT, rot: 0, skew: 0, hero: false, frame: 'plain' }];
      return [hero, ...top, ...mid, ...low];
    },
  },
  tilted: {
    label: 'Tilted Snapshots',
    panels() {
      const defs = [
        [0.04, 0.05, 0.43, 0.42, -4],
        [0.53, 0.03, 0.44, 0.44, 3],
        [0.06, 0.53, 0.44, 0.43, -2.5],
        [0.54, 0.51, 0.43, 0.45, 5],
      ];
      return defs.map(([x, y, w, h, rot], i) => ({ x, y, w, h, rot, skew: 0, hero: i === 0, frame: 'polaroid' }));
    },
  },
  slanted: {
    label: 'Slanted Panels',
    panels() {
      const defs = [0, 0.245, 0.49, 0.735];
      return defs.map((x, i) => ({
        x, y: 0, w: 0.28, h: 1, rot: 0, skew: -0.16, hero: i === 1, frame: 'plain',
      }));
    },
  },
  fullbleed: {
    label: 'Full-Bleed Hero',
    panels() {
      const hero = { x: 0, y: 0, w: 1, h: 1, rot: 0, skew: 0, hero: true, frame: 'plain' };
      const minis = gridCells(3, 1, 0.04, 0.79, 0.92, 0.17);
      return [hero, ...minis];
    },
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

// ------------------------------------------------------------ colour help
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const lutCache = new Map();

/** Builds (and caches) the 256-step gradient-map lookup table of a grade. */
export function gradeLookup(gradeId) {
  if (lutCache.has(gradeId)) return lutCache.get(gradeId);
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  const stops = grade.stops.map(([t, c]) => [t, hexToRgb(c)]);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = Math.max(1e-6, b[0] - a[0]);
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let k = 0; k < 3; k++) lut[i * 3 + k] = Math.round(a[1][k] + (b[1][k] - a[1][k]) * f);
  }
  lutCache.set(gradeId, lut);
  return lut;
}

/** Maps every pixel through the grade's gradient map, then posterizes it. */
export function gradeAndPosterize(imageData, gradeId, levels = 6) {
  const lut = gradeLookup(gradeId);
  const d = imageData.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    d[i] = Math.round(lut[lum * 3] / step) * step;
    d[i + 1] = Math.round(lut[lum * 3 + 1] / step) * step;
    d[i + 2] = Math.round(lut[lum * 3 + 2] / step) * step;
  }
  return imageData;
}

// Deterministic grain tile (a tiny seeded generator, so exports match).
const grainTile = (() => {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  let seed = 20261120;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
})();

// Halftone dot tile: a grid of dark dots, tiled over a panel.
const halftoneTile = (() => {
  const c = document.createElement('canvas');
  c.width = 9; c.height = 9;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 9, 9);
  g.fillStyle = '#000000';
  g.beginPath(); g.arc(4.5, 4.5, 1.7, 0, Math.PI * 2); g.fill();
  return c;
})();

// ------------------------------------------------------------------ crop
function clampCrop(crop, panelW, panelH, imgW, imgH) {
  const base = Math.max(panelW / imgW, panelH / imgH) * crop.zoom;
  const dispW = imgW * base;
  const dispH = imgH * base;
  const fx = Math.min(0.5, panelW / dispW / 2);
  const fy = Math.min(0.5, panelH / dispH / 2);
  return {
    cx: Math.min(1 - fx, Math.max(fx, crop.cx)),
    cy: Math.min(1 - fy, Math.max(fy, crop.cy)),
    zoom: crop.zoom,
  };
}

/** Cover-fit source rectangle for a panel, from the panel's crop settings. */
export function coverFitRect(imgW, imgH, panelW, panelH, crop) {
  const c = clampCrop(crop, panelW, panelH, imgW, imgH);
  const base = Math.max(panelW / imgW, panelH / imgH) * c.zoom;
  const dw = imgW * base;
  const dh = imgH * base;
  return { dx: panelW / 2 - c.cx * dw, dy: panelH / 2 - c.cy * dh, dw, dh };
}

// ----------------------------------------------------------------- panels
function drawPanel(ctx, img, panelPx, crop, gradeId, opts) {
  const { x, y, w, h } = panelPx;
  const pad = panelPx.frame === 'polaroid' ? Math.max(6, w * 0.025) : 0;
  const innerW = Math.max(2, w - pad * 2);
  const innerH = Math.max(2, h - pad * 2 - (panelPx.frame === 'polaroid' ? pad * 2.2 : 0));
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(innerW));
  off.height = Math.max(2, Math.round(innerH));
  const octx = off.getContext('2d');
  if (img) {
    const fit = coverFitRect(img.naturalWidth, img.naturalHeight, off.width, off.height, crop);
    octx.drawImage(img, fit.dx, fit.dy, fit.dw, fit.dh);
    const data = octx.getImageData(0, 0, off.width, off.height);
    gradeAndPosterize(data, gradeId);
    octx.putImageData(data, 0, 0);
  } else {
    octx.fillStyle = '#3b2a4d';
    octx.fillRect(0, 0, off.width, off.height);
  }
  if (opts.halftone) {
    octx.globalAlpha = 0.16;
    octx.globalCompositeOperation = 'multiply';
    octx.fillStyle = octx.createPattern(halftoneTile, 'repeat');
    octx.fillRect(0, 0, off.width, off.height);
    octx.globalCompositeOperation = 'source-over';
    octx.globalAlpha = 1;
  }

  const pop = opts.popout && panelPx.hero ? 1.12 : 1;
  const drawW = innerW * pop;
  const drawH = innerH * pop;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (panelPx.rot) ctx.rotate((panelPx.rot * Math.PI) / 180);
  if (panelPx.skew) ctx.transform(1, 0, panelPx.skew, 1, 0, 0);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = Math.max(6, w * 0.02);
  ctx.shadowOffsetY = Math.max(4, h * 0.012);
  if (panelPx.frame === 'polaroid') {
    ctx.fillStyle = '#fdf6ec';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.drawImage(off, -w / 2 + pad, -h / 2 + pad, innerW, innerH);
  } else {
    ctx.drawImage(off, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (opts.ink) {
    const lw = Math.max(2, w * 0.006);
    ctx.lineWidth = lw;
    ctx.strokeStyle = '#0d0714';
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = Math.max(1, lw * 0.35);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.strokeRect(-w / 2 + lw, -h / 2 + lw, w - lw * 2, h - lw * 2);
  }
  ctx.restore();
}

// --------------------------------------------------------------- lettering
function fitFont(ctx, text, maxWidth, startSize, family, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws the big title with a 3D extrude, a striped chrome fill and a dark outline. */
export function drawChromeTitle(ctx, text, cx, cy, maxWidth, maxSize) {
  // The title is painted on its own tile first, so the shine stripes
  // (source-atop) only ever touch the letters, never the panels behind.
  const tile = document.createElement('canvas');
  const pad = Math.ceil(maxSize * 0.35);
  tile.width = Math.ceil(maxWidth) + pad * 2;
  tile.height = Math.ceil(maxSize * 1.9) + pad * 2;
  const t = tile.getContext('2d');
  t.textAlign = 'center';
  t.textBaseline = 'middle';
  t.lineJoin = 'round';
  const size = fitFont(t, text, maxWidth, maxSize, 'Anton, sans-serif');
  const tx = tile.width / 2;
  const ty = tile.height / 2;
  const extrude = Math.max(2, size * 0.055);
  // 3D extrude: dark copies stepping down-right.
  t.fillStyle = '#160a24';
  for (let i = 6; i >= 1; i--) {
    t.fillText(text, tx + (extrude * i) / 6, ty + (extrude * i) / 6);
  }
  // Striped chrome fill: hard-banded vertical gradient.
  const grad = t.createLinearGradient(0, ty - size / 2, 0, ty + size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.22, '#ffe9a8');
  grad.addColorStop(0.24, '#ff9a3d');
  grad.addColorStop(0.45, '#ff5e78');
  grad.addColorStop(0.47, '#ffffff');
  grad.addColorStop(0.62, '#7dd3fc');
  grad.addColorStop(0.64, '#f0abfc');
  grad.addColorStop(0.82, '#ffffff');
  grad.addColorStop(0.84, '#ffd76a');
  grad.addColorStop(1, '#ff7e5f');
  t.fillStyle = grad;
  t.fillText(text, tx, ty);
  // Diagonal shine stripes clipped to the letters.
  t.globalCompositeOperation = 'source-atop';
  t.globalAlpha = 0.22;
  t.fillStyle = '#ffffff';
  const stripeW = size * 0.16;
  for (let sx = tx - tile.width / 2 - size; sx < tx + tile.width / 2 + size; sx += stripeW * 2.4) {
    t.beginPath();
    t.moveTo(sx, ty - size);
    t.lineTo(sx + stripeW, ty - size);
    t.lineTo(sx + stripeW - size * 0.7, ty + size);
    t.lineTo(sx - size * 0.7, ty + size);
    t.closePath();
    t.fill();
  }
  t.globalCompositeOperation = 'source-over';
  t.globalAlpha = 1;
  // Crisp dark outline on top.
  t.lineWidth = Math.max(2, size * 0.045);
  t.strokeStyle = '#160a24';
  t.strokeText(text, tx, ty);
  ctx.drawImage(tile, cx - tile.width / 2, cy - tile.height / 2);
  return size;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = '#ffd76a'; ctx.fill(); }
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.strokeStyle = fill ? '#160a24' : 'rgba(255, 255, 255, 0.85)';
  ctx.stroke();
}

/** Draws the heat meter: five stars, `heat` of them filled gold. */
export function drawHeatMeter(ctx, x, y, size, heat) {
  ctx.save();
  ctx.font = `${Math.round(size * 0.62)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.2;
  ctx.fillText('HEAT', x, y);
  const labelW = ctx.measureText('HEAT').width + size * 0.35;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, x + labelW + i * size * 1.15 + size / 2, y, size / 2, i < heat);
  }
  ctx.restore();
}

/** Draws a diagonal ribbon badge across the top-right corner. */
export function drawRibbonBadge(ctx, text, w, size) {
  if (!text.trim()) return;
  const bandH = size * 1.7;
  const bandW = size * 9;
  // The band is drawn in a frame rotated 45° about the corner, offset
  // along the rotated y-axis so it crosses the top and right edges
  // instead of sitting off-canvas.
  const d = bandH * 1.1;
  ctx.save();
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ff2e63';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.25;
  ctx.fillRect(-bandW / 2, d, bandW, bandH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, d + bandH / 2 + size * 0.06);
  ctx.restore();
}

// ------------------------------------------------------------------ cover
/** Renders the whole cover onto `canvas` from `state` and a photo map. */
export function drawCover(canvas, state, photoMap) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;

  // Sunset sky behind the panels, with a soft sun disc.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W * 0.72, H * 0.24, 0, W * 0.72, H * 0.24, H * 0.42);
  sun.addColorStop(0, 'rgba(255, 240, 180, 0.55)');
  sun.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Panels.
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero3;
  const panels = layout.panels(W / H);
  panels.forEach((panel, i) => {
    const photoId = state.panelPhotos[i] ?? state.photos[i % Math.max(1, state.photos.length)]?.id;
    const img = photoId ? photoMap.get(photoId) : null;
    const crop = (photoId && state.crops[photoId]) || { cx: 0.5, cy: 0.45, zoom: 1 };
    drawPanel(ctx, img, {
      x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H,
      rot: panel.rot, skew: panel.skew, hero: panel.hero, frame: panel.frame,
    }, crop, state.grade, { halftone: state.halftone, ink: state.ink, popout: state.popout });
  });

  // Warm wash over everything.
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, W, H);

  // Title block: a legibility scrim, chrome title, neon script subtitle,
  // editable caption, cast tags and the film-style billing block. The
  // band is tall enough that the subtitle, caption, chips and billing
  // each get their own row and never sit on top of each other.
  const bandH = H * (state.titlePos === 'middle' ? 0.34 : 0.4);
  const bandY = state.titlePos === 'top' ? 0 : state.titlePos === 'middle' ? (H - bandH) / 2 : H - bandH;
  const scrim = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  scrim.addColorStop(0, 'rgba(12, 5, 24, 0)');
  scrim.addColorStop(0.35, 'rgba(12, 5, 24, 0.62)');
  scrim.addColorStop(0.65, 'rgba(12, 5, 24, 0.62)');
  scrim.addColorStop(1, 'rgba(12, 5, 24, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY, W, bandH);

  const title = (state.title || 'CORAL DUSK').toUpperCase();
  const titleSize = drawChromeTitle(ctx, title, W / 2, bandY + bandH * 0.28, W * 0.94, H * 0.15);

  if (state.subtitle.trim()) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subSize = fitFont(ctx, state.subtitle, W * 0.8, H * 0.052, 'Pacifico, cursive');
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff2e9a';
    ctx.shadowBlur = H * 0.02;
    ctx.fillText(state.subtitle, W / 2, bandY + bandH * 0.28 + titleSize * 0.55);
    ctx.fillText(state.subtitle, W / 2, bandY + bandH * 0.28 + titleSize * 0.55);
    ctx.restore();
  }

  if (state.caption.trim()) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${Math.max(2, H * 0.004)}px`; } catch { /* older canvas */ }
    const capSize = fitFont(ctx, state.caption.toUpperCase(), W * 0.86, H * 0.034, 'Anton, sans-serif');
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = capSize * 0.3;
    ctx.fillText(state.caption.toUpperCase(), W / 2, bandY + bandH * 0.66);
    ctx.restore();
  }

  // Cast tags: one chip per line of the roles box.
  const roles = state.roles.split('\n').map((s) => s.trim()).filter(Boolean);
  if (roles.length) {
    const chipH = H * 0.032;
    const chipY = H - H * 0.115;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = fitFont(ctx, roles.join('   '), W * 0.9, chipH * 0.52, 'Anton, sans-serif');
    let totalW = 0;
    const widths = roles.map((r) => {
      ctx.font = `${size}px Anton, sans-serif`;
      return ctx.measureText(r).width + chipH * 1.1;
    });
    totalW = widths.reduce((a, b) => a + b, 0) + (roles.length - 1) * W * 0.012;
    let cx = W / 2 - totalW / 2;
    roles.forEach((r, i) => {
      ctx.fillStyle = 'rgba(10, 4, 20, 0.72)';
      roundRect(ctx, cx, chipY, widths[i], chipH, chipH / 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = `${size}px Anton, sans-serif`;
      ctx.fillText(r.toUpperCase(), cx + widths[i] / 2, chipY + chipH / 2 + size * 0.05);
      cx += widths[i] + W * 0.012;
    });
    ctx.restore();
  }

  // Billing block, film-poster style, two tiny centred lines.
  if (state.billing.trim()) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    const lines = state.billing.split('\n').slice(0, 2);
    const size = Math.max(7, H * 0.0115);
    ctx.font = `${size}px system-ui, sans-serif`;
    lines.forEach((line, i) => {
      ctx.fillText(line.toUpperCase(), W / 2, H - H * 0.048 + i * size * 1.5);
    });
    ctx.restore();
  }

  // Heat meter, bottom-left; ribbon badge, top-right corner.
  drawHeatMeter(ctx, W * 0.035, H - H * 0.075, Math.max(14, H * 0.026), state.heat);
  drawRibbonBadge(ctx, state.badge, W, Math.max(11, H * 0.016));

  // Grain + vignette finish.
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Renders the cover at an export size and returns the fresh canvas. */
export function renderCover(state, photoMap, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, photoMap);
  return canvas;
}
