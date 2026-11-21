// Coral Dusk Cover Studio — poster renderer.
// Draws the whole poster on a <canvas>: photo panels per layout, a
// posterize-then-grade colour pass, halftone print texture, and the
// title / subtitle / cast / ribbon / credits layer.
// All colours are original; the city and cast are fictional.
"use strict";

// ---------------------------------------------------------------- grades
// Each grade maps luminance (0..1) through three colour stops:
// shadow -> mid -> highlight. The neon grade is the default.
export const GRADES = {
  neon: {
    label: "Neon Vice",
    stops: [[22, 8, 46], [255, 46, 154], [125, 249, 255]],
  },
  sunset: {
    label: "Sunset",
    stops: [[42, 14, 18], [255, 122, 24], [255, 209, 102]],
  },
  gold: {
    label: "Gold",
    stops: [[43, 28, 5], [201, 138, 27], [255, 233, 168]],
  },
  teal: {
    label: "Teal Pink",
    stops: [[6, 42, 46], [46, 196, 182], [255, 158, 187]],
  },
  dusk: {
    label: "Dusk",
    stops: [[27, 16, 53], [123, 92, 255], [255, 179, 217]],
  },
  coral: {
    label: "Coral",
    stops: [[51, 16, 15], [255, 107, 94], [255, 227, 194]],
  },
  noir: {
    label: "Noir",
    stops: [[10, 10, 10], [107, 107, 107], [245, 245, 245]],
  },
};
export const GRADE_ORDER = ["neon", "sunset", "gold", "teal", "dusk", "coral", "noir"];

// ---------------------------------------------------------------- layouts
// Every panel is a fraction of the poster (x, y, w, h in 0..1).
// `rot` is a tilt in degrees. `hero` marks the pop-out panel.
export const LAYOUTS = {
  grid9: {
    label: "9-Panel Grid",
    titleY: 0.7,
    panels: [
      { x: 0.008, y: 0.006, w: 0.322, h: 0.224 },
      { x: 0.339, y: 0.006, w: 0.322, h: 0.224 },
      { x: 0.67, y: 0.006, w: 0.322, h: 0.224 },
      { x: 0.008, y: 0.238, w: 0.322, h: 0.224 },
      { x: 0.339, y: 0.238, w: 0.322, h: 0.224 },
      { x: 0.67, y: 0.238, w: 0.322, h: 0.224 },
      { x: 0.008, y: 0.47, w: 0.322, h: 0.224 },
      { x: 0.339, y: 0.47, w: 0.322, h: 0.224 },
      { x: 0.67, y: 0.47, w: 0.322, h: 0.224 },
    ],
  },
  hero3: {
    label: "Hero + 3",
    titleY: 0.58,
    panels: [
      { x: 0.008, y: 0.006, w: 0.984, h: 0.545, hero: true },
      { x: 0.008, y: 0.56, w: 0.322, h: 0.24 },
      { x: 0.339, y: 0.56, w: 0.322, h: 0.24 },
      { x: 0.67, y: 0.56, w: 0.322, h: 0.24 },
    ],
  },
  hero5: {
    label: "Hero + 5",
    titleY: 0.74,
    panels: [
      { x: 0.008, y: 0.006, w: 0.575, h: 0.715, hero: true },
      { x: 0.592, y: 0.006, w: 0.196, h: 0.235 },
      { x: 0.796, y: 0.006, w: 0.196, h: 0.235 },
      { x: 0.592, y: 0.249, w: 0.196, h: 0.235 },
      { x: 0.796, y: 0.249, w: 0.196, h: 0.235 },
      { x: 0.592, y: 0.492, w: 0.4, h: 0.229 },
    ],
  },
  tilted: {
    label: "Tilted Snapshots",
    titleY: 0.8,
    panels: [
      { x: 0.03, y: 0.02, w: 0.55, h: 0.5, rot: -3, hero: true },
      { x: 0.56, y: 0.02, w: 0.41, h: 0.32, rot: 4 },
      { x: 0.6, y: 0.38, w: 0.36, h: 0.3, rot: -2 },
      { x: 0.03, y: 0.54, w: 0.44, h: 0.4, rot: 2 },
      { x: 0.5, y: 0.68, w: 0.47, h: 0.26, rot: -4 },
    ],
  },
  slanted: {
    label: "Slanted Panels",
    titleY: 0.78,
    panels: [
      { x: 0, y: 0.0, w: 1, h: 0.24, slant: 0.09 },
      { x: 0, y: 0.24, w: 1, h: 0.24, slant: -0.09 },
      { x: 0, y: 0.48, w: 1, h: 0.24, slant: 0.09 },
      { x: 0, y: 0.72, w: 1, h: 0.24, slant: -0.09 },
    ],
  },
  fullbleed: {
    label: "Full-Bleed Hero",
    titleY: 0.72,
    panels: [{ x: 0, y: 0, w: 1, h: 1, hero: true }],
  },
};
export const LAYOUT_ORDER = ["grid9", "hero3", "hero5", "tilted", "slanted", "fullbleed"];

// ---------------------------------------------------------------- helpers
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerpStops(stops, t) {
  // t in 0..1 across shadow -> mid -> highlight
  const a = stops[0];
  const b = stops[1];
  const c = stops[2];
  let lo;
  let hi;
  let f;
  if (t < 0.5) {
    lo = a;
    hi = b;
    f = t * 2;
  } else {
    lo = b;
    hi = c;
    f = (t - 0.5) * 2;
  }
  return [
    Math.round(lo[0] + (hi[0] - lo[0]) * f),
    Math.round(lo[1] + (hi[1] - lo[1]) * f),
    Math.round(lo[2] + (hi[2] - lo[2]) * f),
  ];
}

// Quantize luminance FIRST (8 posterize levels), then map through the
// grade gradient. Quantizing before the LUT keeps smooth skies from
// breaking into muddy green-brown blotches.
function gradePixels(imageData, grade) {
  const data = imageData.data;
  const stops = grade.stops;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const q = Math.floor(lum / 32); // 0..7
    const t = (q * 32 + 16) / 255;
    const rgb = lerpStops(stops, t);
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }
  return imageData;
}

function makeHalftone() {
  const c = document.createElement("canvas");
  c.width = 7;
  c.height = 7;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0.5)";
  g.beginPath();
  g.arc(3.5, 3.5, 1.1, 0, Math.PI * 2);
  g.fill();
  return c;
}
let halftoneTile = null;

// Draw one photo into a panel rect, graded, with a cover crop.
// `off` is {dx, dy} in fractions of the panel size. `pop` scales the
// hero image a little past the panel edge (capped at 1.12).
function drawPanel(ctx, img, rect, off, grade, pop, W, H) {
  const px = Math.round(rect.x * W);
  const py = Math.round(rect.y * H);
  const pw = Math.round(rect.w * W);
  const ph = Math.round(rect.h * H);
  if (pw < 4 || ph < 4) return;

  const off2 = document.createElement("canvas");
  off2.width = pw;
  off2.height = ph;
  const g = off2.getContext("2d", { willReadFrequently: true });
  const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * pop;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxDx = Math.max(0, (dw - pw) / 2);
  const maxDy = Math.max(0, (dh - ph) / 2);
  const dx = (pw - dw) / 2 + clamp(off.dx, -1, 1) * maxDx;
  const dy = (ph - dh) / 2 + clamp(off.dy, -1, 1) * maxDy;
  g.drawImage(img, dx, dy, dw, dh);
  const id = g.getImageData(0, 0, pw, ph);
  gradePixels(id, grade);
  g.putImageData(id, 0, 0);

  ctx.save();
  if (rect.rot) {
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.translate(-pw / 2, -ph / 2);
    ctx.shadowColor = "rgba(5,2,12,0.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(off2, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, pw - 2, ph - 2);
  } else if (rect.slant) {
    const s = rect.slant * W;
    ctx.beginPath();
    ctx.moveTo(px + s, py);
    ctx.lineTo(px + pw, py);
    ctx.lineTo(px + pw - s, py + ph);
    ctx.lineTo(px, py + ph);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(off2, px, py);
    ctx.strokeStyle = "rgba(20,6,32,0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.shadowColor = rect.hero ? "rgba(5,2,12,0.6)" : "rgba(5,2,12,0.35)";
    ctx.shadowBlur = rect.hero ? 22 : 10;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(off2, px, py);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = rect.hero ? "rgba(255,255,255,0.35)" : "rgba(20,6,32,0.9)";
    ctx.lineWidth = rect.hero ? 3 : 3;
    ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
  }
  ctx.restore();
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

// ---------------------------------------------------------------- render
// state: { layout, grade, title, subtitle, tagline, cast[3], photos: [img],
//          assign: [photoIdx per panel], offsets: [{dx,dy} per panel],
//          heat: 4 }
// Renders the full poster onto `canvas` (sized W x H first by caller).
export function renderPoster(canvas, state, W, H) {
  const ctx = canvas.getContext("2d");
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero3;
  const grade = GRADES[state.grade] || GRADES.neon;
  const u = W / 1024; // scale unit: poster designed at 1024 wide

  // backdrop
  ctx.fillStyle = "#12081f";
  ctx.fillRect(0, 0, W, H);

  // panels
  layout.panels.forEach((rect, i) => {
    const img = state.photos[state.assign[i] ?? (i % state.photos.length)];
    if (!img) return;
    const off = state.offsets[i] || { dx: 0, dy: 0 };
    // Hero pop-out only on portrait-ish panels: on a wide hero the
    // zoom would crop the photo's edges and can cut a limb. Capped.
    const pop = rect.hero ? (rect.w / rect.h < 1 ? 1.08 : 1.0) : 1.0;
    drawPanel(ctx, img, rect, off, grade, pop, W, H);
  });

  // halftone print texture, kept faint
  if (!halftoneTile) halftoneTile = makeHalftone();
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ctx.createPattern(halftoneTile, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // soft bottom scrim for the title zone (light: 0.42 max)
  const ty = layout.titleY * H;
  const scrim = ctx.createLinearGradient(0, ty - 0.1 * H, 0, H);
  scrim.addColorStop(0, "rgba(8,2,16,0)");
  scrim.addColorStop(1, "rgba(8,2,16,0.42)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, ty - 0.1 * H, W, H - (ty - 0.1 * H));

  // gentle vignette
  const vg = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.72
  );
  vg.addColorStop(0, "rgba(8,2,16,0)");
  vg.addColorStop(1, "rgba(8,2,16,0.28)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // ---- ribbon: top-right diagonal, Coral Coast
  ctx.save();
  ctx.translate(W - 0.055 * W, 0.055 * W);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#ff2e63";
  ctx.fillRect(-0.16 * W, -0.02 * W, 0.32 * W, 0.04 * W);
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 ${Math.round(0.021 * W)}px Anton, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CORAL COAST", 0, 0);
  ctx.restore();

  // ---- title block
  // The block's gaps total 0.267H from the title zone down to the last
  // credit line; shrink the whole block (fonts and gaps together) when
  // the zone is short, so the credits never run off the bottom edge.
  const blockH = 0.267 * H;
  const avail = H - ty - 0.018 * H;
  const k = Math.min(1, avail / blockH);
  const cx = W / 2;
  const titleSize = Math.round(0.155 * W * k);
  const titleY = ty + 0.06 * H * k;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const tg = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY + titleSize * 0.12);
  tg.addColorStop(0, "#ffffff");
  tg.addColorStop(0.45, "#ffe3f6");
  tg.addColorStop(0.58, "#ff7ad9");
  tg.addColorStop(0.78, "#9be8ff");
  tg.addColorStop(1, "#e8fbff");
  ctx.font = `400 ${titleSize}px Anton, sans-serif`;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#160a2e";
  ctx.lineWidth = Math.max(6, 0.009 * W);
  ctx.shadowColor = "rgba(255,46,154,0.5)";
  ctx.shadowBlur = 18;
  ctx.strokeText(state.title, cx, titleY);
  ctx.fillStyle = tg;
  ctx.fillText(state.title, cx, titleY);
  ctx.restore();

  // ---- subtitle (script, pink glow)
  const subY = titleY + 0.055 * H * k;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `400 ${Math.round(0.058 * W * k)}px Pacifico, cursive`;
  ctx.shadowColor = "#ff2e9a";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(state.subtitle, cx, subY);
  ctx.restore();

  // ---- tagline
  const tagY = subY + 0.042 * H * k;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `400 ${Math.round(0.034 * W * k)}px Anton, sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(0.014 * W * k)}px`;
  } catch (e) {
    /* older canvas: no letter spacing */
  }
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.fillText(state.tagline, cx, tagY);
  ctx.restore();

  // ---- cast chips
  const chipY = tagY + 0.028 * H * k;
  const chipH = 0.032 * H * k;
  const chipFont = Math.round(0.02 * W * k);
  ctx.save();
  ctx.font = `400 ${chipFont}px Anton, sans-serif`;
  const labels = state.cast.map((c) => `${c.name} — ${c.role}`.toUpperCase());
  const widths = labels.map((t) => ctx.measureText(t).width + 0.036 * W);
  const gap = 0.014 * W;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
  let x = cx - total / 2;
  labels.forEach((t, i) => {
    ctx.fillStyle = "rgba(12,4,22,0.72)";
    roundRect(ctx, x, chipY, widths[i], chipH, chipH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffe9f4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, x + widths[i] / 2, chipY + chipH / 2 + 1);
    x += widths[i] + gap;
  });
  ctx.restore();

  // ---- credits
  const credY = chipY + chipH + 0.03 * H * k;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `400 ${Math.round(0.0145 * W * k)}px Anton, sans-serif`;
  try {
    ctx.letterSpacing = "2px";
  } catch (e) {}
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText("CORAL DUSK STUDIO PRESENTS A SUNSET COAST STORY", cx, credY);
  ctx.fillText("STARRING MARA VOSS • DANTE RUIZ • SOFIA LANE", cx, credY + 0.02 * H * k);
  ctx.restore();

  // ---- heat stars, bottom-left
  const heat = state.heat ?? 4;
  const hy = H - 0.022 * H;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `400 ${Math.round(0.02 * W)}px Anton, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("HEAT", 0.02 * W, hy);
  let sx = 0.075 * W;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < heat ? "#ffc93c" : "rgba(255,255,255,0.25)";
    ctx.strokeStyle = i < heat ? "#7a4d00" : "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    const r = 0.011 * W;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const ang = (Math.PI / 5) * k - Math.PI / 2;
      const rad = k % 2 === 0 ? r : r * 0.45;
      const px2 = sx + Math.cos(ang) * rad;
      const py2 = hy + Math.sin(ang) * rad;
      if (k === 0) ctx.moveTo(px2, py2);
      else ctx.lineTo(px2, py2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    sx += 0.028 * W;
  }
  ctx.restore();

  // outer frame
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
}

// Hit-test a poster point (fractions) against layout panels.
export function panelAt(state, fx, fy) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero3;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const r = layout.panels[i];
    if (fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h) return i;
  }
  return -1;
}
