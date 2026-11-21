// Duskline Cover Studio — poster renderer.
// Draws the whole cover on a canvas: photo panels with face-aware crops,
// a colour grade, a striped title, a script subtitle, a ribbon, and the
// poster furniture (quote bar, edition box, seal, barcode, billing, release).
// Everything is drawn locally with canvas 2D; no network, no outside files.

export const GRADES = {
  'sunset-gold': { label: 'Sunset Gold', filter: 'saturate(1.25) contrast(1.08)', tint: '#ff9a3c', tintAlpha: 0.16, blend: 'overlay' },
  'neon-vice': { label: 'Neon Vice', filter: 'saturate(1.45) contrast(1.1) hue-rotate(-12deg)', tint: '#ff2e88', tintAlpha: 0.15, blend: 'overlay' },
  'neon-night': { label: 'Neon Night', filter: 'saturate(1.2) brightness(0.92) hue-rotate(18deg)', tint: '#2b3bff', tintAlpha: 0.17, blend: 'overlay' },
  'tropic-teal': { label: 'Tropic Teal', filter: 'saturate(1.25) hue-rotate(18deg)', tint: '#00c8b0', tintAlpha: 0.1, blend: 'overlay' },
  ultraviolet: { label: 'Ultraviolet', filter: 'saturate(1.1) hue-rotate(48deg)', tint: '#7b2fff', tintAlpha: 0.19, blend: 'overlay' },
  'retro-print': { label: 'Retro Print', filter: 'sepia(0.45) contrast(1.05) saturate(0.9)', tint: '#c98a3c', tintAlpha: 0.12, blend: 'multiply' },
  mono: { label: 'Mono', filter: 'grayscale(1) contrast(1.15)', tint: '#000000', tintAlpha: 0, blend: 'overlay' },
};

// A layout maps the state's six photo slots to panel rectangles (fractions
// of the canvas). All panels live in the photo zone, the top 68% of the
// cover; the lower 32% is the dark title band, so no face ever sits behind
// the lettering. Slot 0..3 are cast portraits, 4..5 are the street photos.
export const LAYOUTS = {
  mosaic: {
    label: 'Cast Mosaic',
    panels() {
      return [
        { slot: 0, x: 0.008, y: 0.048, w: 0.232, h: 0.312 },
        { slot: 1, x: 0.246, y: 0.048, w: 0.304, h: 0.312 },
        { slot: 2, x: 0.556, y: 0.048, w: 0.204, h: 0.312 },
        { slot: 3, x: 0.766, y: 0.048, w: 0.226, h: 0.312 },
        { slot: 4, x: 0.008, y: 0.368, w: 0.488, h: 0.312 },
        { slot: 5, x: 0.504, y: 0.368, w: 0.488, h: 0.312 },
      ];
    },
  },
  'hero-side': {
    label: 'Hero Side',
    panels() {
      return [
        { slot: 1, x: 0.008, y: 0.048, w: 0.692, h: 0.632 },
        { slot: 0, x: 0.708, y: 0.048, w: 0.284, h: 0.308 },
        { slot: 2, x: 0.708, y: 0.364, w: 0.284, h: 0.316 },
      ];
    },
  },
  triptych: {
    label: 'Triptych',
    panels() {
      return [
        { slot: 0, x: 0.008, y: 0.048, w: 0.324, h: 0.632 },
        { slot: 1, x: 0.338, y: 0.048, w: 0.324, h: 0.632 },
        { slot: 2, x: 0.668, y: 0.048, w: 0.324, h: 0.632 },
      ];
    },
  },
  'duo-split': {
    label: 'Duo Split',
    panels() {
      return [
        { slot: 0, x: 0.008, y: 0.048, w: 0.488, h: 0.632 },
        { slot: 1, x: 0.504, y: 0.048, w: 0.488, h: 0.632 },
      ];
    },
  },
  'four-up': {
    label: 'Four Up',
    panels() {
      return [
        { slot: 0, x: 0.008, y: 0.048, w: 0.24, h: 0.632 },
        { slot: 1, x: 0.254, y: 0.048, w: 0.24, h: 0.632 },
        { slot: 2, x: 0.5, y: 0.048, w: 0.24, h: 0.632 },
        { slot: 3, x: 0.746, y: 0.048, w: 0.246, h: 0.632 },
      ];
    },
  },
  'full-bleed': {
    label: 'Full Bleed',
    panels() {
      return [{ slot: 4, x: 0.008, y: 0.048, w: 0.984, h: 0.632 }];
    },
  },
};

export const ASPECTS = {
  wide: { label: '16:9', w: 1920, h: 1080 },
  square: { label: '1:1', w: 1080, h: 1080 },
  tall: { label: '4:5', w: 1080, h: 1350 },
};

// Draws one photo into a panel rect, keeping its crop focus (the face, in
// 0..1 photo coordinates) visible and centred. `cropFocus` is where the
// crop is centred; `faceFocus` is where the face really is (they differ when
// a panel deliberately shows a faceless part of a photo). Returns true when
// the face is safe: fully inside the panel, or fully outside it (not shown
// at all). A face cut halfway by a panel edge is unsafe.
function drawPanelPhoto(ctx, img, rect, slot, cropFocus, faceFocus) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (slot.zoom || 1);
  const fx = cropFocus.x * iw;
  const fy = cropFocus.y * ih;
  // Aim the focus at the panel centre, shifted by the pan (0..1 of panel).
  let cx = rect.x + rect.w / 2 + (slot.dx || 0) * rect.w * 0.4;
  let cy = rect.y + rect.h / 2 + (slot.dy || 0) * rect.h * 0.4;
  let ox = cx - fx * scale;
  let oy = cy - fy * scale;
  // Clamp so the photo still covers the whole panel.
  const dw = iw * scale;
  const dh = ih * scale;
  ox = Math.max(rect.x + rect.w - dw, Math.min(rect.x, ox));
  oy = Math.max(rect.y + rect.h - dh, Math.min(rect.y, oy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (slot.flip) {
    ctx.translate(rect.x * 2 + rect.w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, ox, oy, dw, dh);
  ctx.restore();
  // Face-safe check: the face circle (radius 12% of photo height) is safe
  // when it sits fully inside the panel, or fully outside it (the panel
  // shows a faceless part of the photo). Half in, half out means the crop
  // cuts the face.
  const faceX = ox + faceFocus.x * iw * scale;
  const faceY = oy + faceFocus.y * ih * scale;
  const r = 0.12 * ih * scale;
  const inside =
    faceX - r >= rect.x + 2 &&
    faceX + r <= rect.x + rect.w - 2 &&
    faceY - r >= rect.y + 2 &&
    faceY + r <= rect.y + rect.h - 2;
  const outside =
    faceX + r < rect.x ||
    faceX - r > rect.x + rect.w ||
    faceY + r < rect.y ||
    faceY - r > rect.y + rect.h;
  return inside || outside;
}

function fitFont(ctx, text, family, maxWidth, startSize, minSize) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawRoleTag(ctx, rect, tag, h) {
  if (!tag) return;
  ctx.save();
  ctx.font = `700 ${Math.max(11, h * 0.016)}px "Anton", sans-serif`;
  const tw = ctx.measureText(tag).width;
  const pad = h * 0.012;
  const bw = tw + pad * 2.4;
  const bh = h * 0.032;
  const bx = rect.x + rect.w * 0.03;
  const by = rect.y + rect.h - bh - rect.h * 0.03;
  ctx.fillStyle = 'rgba(8, 6, 14, 0.88)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(bx, by, h * 0.006, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, bx + pad * 1.4, by + bh / 2 + 1);
  ctx.restore();
}

function drawStripedTitle(ctx, text, cx, baselineY, maxWidth, h, family) {
  const start = h * 0.115;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const size = fitFont(ctx, text, family, maxWidth, start, 20);
  // Horizontal sunset stripes inside the letters.
  const grad = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.34, '#ffffff');
  grad.addColorStop(0.35, '#ffd166');
  grad.addColorStop(0.5, '#ff5e7a');
  grad.addColorStop(0.66, '#ff8a3c');
  grad.addColorStop(0.82, '#ffe08a');
  grad.addColorStop(1, '#ffffff');
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = 'rgba(20, 0, 30, 0.75)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(text, cx, baselineY);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, baselineY);
  ctx.restore();
  return size;
}

function drawRibbon(ctx, text, cx, y, h) {
  if (!text) return;
  ctx.save();
  const size = Math.max(11, h * 0.02);
  ctx.font = `700 ${size}px "Anton", sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const pad = h * 0.02;
  const bw = Math.min(tw + pad * 2, h * 0.92);
  const bh = h * 0.034;
  const bx = cx - bw / 2;
  ctx.fillStyle = '#0e7490';
  // Folded ribbon ends.
  ctx.beginPath();
  ctx.moveTo(bx - bh * 0.5, y + bh * 0.18);
  ctx.lineTo(bx, y);
  ctx.lineTo(bx + bw, y);
  ctx.lineTo(bx + bw + bh * 0.5, y + bh * 0.18);
  ctx.lineTo(bx + bw, y + bh * 0.36);
  ctx.lineTo(bx + bw, y + bh);
  ctx.lineTo(bx, y + bh);
  ctx.lineTo(bx, y + bh * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), cx, y + bh * 0.52);
  ctx.restore();
}

function drawSeal(ctx, cx, cy, r, ringText, centerText, h) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#e8b64c';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5b12';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b64c';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Ring text along the top arc.
  ctx.fillStyle = '#3d2c05';
  ctx.font = `700 ${Math.max(6, r * 0.13)}px "Anton", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = ringText.split('');
  const span = Math.PI * 1.3;
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 - span / 2 + (span * (i + 0.5)) / chars.length;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.78);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.fillStyle = '#3d2c05';
  ctx.font = `700 ${Math.max(8, r * 0.2)}px "Anton", sans-serif`;
  ctx.fillText('★', 0, -r * 0.3);
  ctx.font = `700 ${Math.max(8, r * 0.22)}px "Anton", sans-serif`;
  ctx.fillText(centerText, 0, r * 0.14);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, code) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#111111';
  let seed = 7;
  let bx = x + w * 0.04;
  while (bx < x + w * 0.94) {
    seed = (seed * 16807) % 2147483647;
    const bw = (seed % 3) + 1;
    const gap = (seed % 4) + 1;
    ctx.fillRect(bx, y + h * 0.06, bw * (w / 90), h * 0.62);
    bx += (bw + gap) * (w / 90);
  }
  ctx.font = `${Math.max(7, w * 0.11)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, x + w / 2, y + h * 0.84);
  ctx.restore();
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draws the full poster into `canvas` at its own pixel size.
// `photos` is an array of {img, name, role, focus:{x,y}}; `state` carries
// layout, grade, texts and per-slot crop settings. Returns an array of
// booleans, one per drawn panel, saying whether its face stayed safe.
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES['sunset-gold'];
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  const layout = LAYOUTS[state.layout] || LAYOUTS.mosaic;
  const panels = layout.panels();
  const faceSafe = [];
  for (const p of panels) {
    const slot = state.slots[p.slot];
    if (!slot) continue;
    const photo = photos[slot.photo];
    if (!photo || !photo.img) continue;
    const rect = { x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h };
    ctx.save();
    ctx.filter = grade.filter;
    const safe = drawPanelPhoto(ctx, photo.img, rect, slot, p.focus || photo.focus, photo.focus);
    ctx.restore();
    faceSafe.push(safe);
    // Frame.
    ctx.save();
    ctx.strokeStyle = '#0d0a14';
    ctx.lineWidth = Math.max(2, h * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    drawRoleTag(ctx, rect, photo.role, h);
  }

  // Colour grade tint over everything.
  if (grade.tintAlpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = grade.blend;
    ctx.globalAlpha = grade.tintAlpha;
    ctx.fillStyle = grade.tint;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Title band: the lower third of the cover is a dark band that carries
  // the title and the poster furniture, so no face ever sits behind the
  // lettering. A gold rule separates it from the photos, and the photos
  // blend into it at the seam.
  ctx.fillStyle = '#0d0714';
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  ctx.fillStyle = '#e8b64c';
  ctx.fillRect(0, h * 0.68, w, Math.max(2, h * 0.002));
  const blend = ctx.createLinearGradient(0, h * 0.6, 0, h * 0.68);
  blend.addColorStop(0, 'rgba(13, 7, 20, 0)');
  blend.addColorStop(1, 'rgba(13, 7, 20, 0.85)');
  ctx.fillStyle = blend;
  ctx.fillRect(0, h * 0.6, w, h * 0.08);

  // Quote bar at the top.
  if (state.showQuote && state.quote) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 5, 16, 0.72)';
    ctx.fillRect(0, 0, w, h * 0.042);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const qSize = Math.max(11, h * 0.017);
    ctx.font = `700 ${qSize}px "Anton", sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.fillText('★★★★★', w * 0.02, h * 0.021);
    const starsW = ctx.measureText('★★★★★').width;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`"${state.quote.toUpperCase()}"`, w * 0.02 + starsW + w * 0.012, h * 0.021);
    if (state.quoteSource) {
      ctx.fillStyle = '#9fd8e8';
      ctx.fillText(`— ${state.quoteSource.toUpperCase()}`, w * 0.02 + starsW + w * 0.012 + ctx.measureText(`"${state.quote.toUpperCase()}"`).width + w * 0.01, h * 0.021);
    }
    // Edition box, top right.
    if (state.edition) {
      ctx.font = `700 ${qSize}px "Anton", sans-serif`;
      const ew = ctx.measureText(state.edition).width + w * 0.02;
      ctx.strokeStyle = '#9fd8e8';
      ctx.lineWidth = Math.max(1.5, h * 0.002);
      ctx.strokeRect(w - w * 0.02 - ew, h * 0.007, ew, h * 0.028);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(state.edition, w - w * 0.02 - ew / 2, h * 0.021);
    }
    ctx.restore();
  }

  // Title block, bottom-anchored: release line, billing, ribbon, subtitle, title.
  const cx = w / 2;
  let cursor = h * 0.978;
  ctx.save();
  ctx.textAlign = 'center';
  if (state.release) {
    ctx.font = `700 ${Math.max(10, h * 0.016)}px "Anton", sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`— ${state.release.toUpperCase()} —`, cx, cursor);
    cursor -= h * 0.026;
  }
  if (state.showBilling && state.billing) {
    ctx.font = `${Math.max(8, h * 0.011)}px sans-serif`;
    ctx.fillStyle = '#e8e2d8';
    const lines = wrapLines(ctx, state.billing.toUpperCase(), w * 0.66);
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], cx, cursor);
      cursor -= h * 0.014;
    }
    cursor -= h * 0.006;
  }
  if (state.ribbon) {
    drawRibbon(ctx, state.ribbon, cx, cursor - h * 0.034, h);
    cursor -= h * 0.048;
  }
  if (state.subtitle) {
    ctx.save();
    ctx.translate(cx, cursor - h * 0.008);
    ctx.rotate(-0.02);
    const scriptFamily = state.scriptFont === 'cursive' ? 'cursive' : '"Yellowtail", cursive';
    ctx.font = `${Math.max(16, h * 0.045)}px ${scriptFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2e9a';
    ctx.shadowBlur = h * 0.02;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.subtitle, 0, 0);
    ctx.restore();
    cursor -= h * 0.062;
  }
  if (state.title) {
    const titleFamily = state.titleFont === 'system'
      ? '"Arial Narrow", "Liberation Sans Narrow", sans-serif'
      : '"Anton", sans-serif';
    drawStripedTitle(ctx, state.title.toUpperCase(), cx, cursor, w * 0.66, h, titleFamily);
  }
  ctx.restore();

  // Seal, right of the title block.
  if (state.showSeal) {
    drawSeal(ctx, w * 0.9, h * 0.74, h * 0.052, state.sealRing || 'SOLMAR FILM FESTIVAL', state.seal || 'BEST CAST', h);
  }
  // Barcode, bottom right.
  if (state.showBarcode) {
    drawBarcode(ctx, w * 0.9, h * 0.9, w * 0.085, h * 0.062, '0 18472 85991 8');
  }
  return faceSafe;
}
