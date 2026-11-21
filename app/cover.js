// cover.js — Coral Dusk Cover Studio: poster rendering engine.
// Pure Canvas 2D, no dependencies. Draws a finished cover poster from
// sample photos (or user uploads) plus title text, in one of 6 layouts
// and one of 7 colour grades. The grade pipeline quantises luminance
// BEFORE the grade lookup, so smooth skies grade into clean steps
// instead of muddy green-brown blotches, and a seeded grain pass
// breaks up any remaining banding.

(function (global) {
  'use strict';

  // ---------------------------------------------------------------- grades
  // Each grade tints the image: shadow colour at luminance 0, highlight
  // colour at luminance 1. `mix` is how much of the tint replaces the
  // original pixel; `sat` scales saturation first; `grain` is the peak
  // noise added per channel (0..255) to break banding.
  var GRADES = [
    { id: 'neon',   name: 'Neon Vice',  swatch: '#ff2e63', shadow: [58, 16, 78],  high: [255, 122, 88],  mix: 0.38, sat: 1.15, grain: 5 },
    { id: 'coral',  name: 'Coral Dusk', swatch: '#ff7a59', shadow: [70, 20, 40],  high: [255, 140, 100], mix: 0.42, sat: 1.10, grain: 4 },
    { id: 'dusk',   name: 'Dusk',       swatch: '#7a5cff', shadow: [18, 22, 64],  high: [255, 166, 88],  mix: 0.40, sat: 1.05, grain: 4 },
    { id: 'vice',   name: 'Vice',       swatch: '#00e5c7', shadow: [8, 60, 66],   high: [255, 110, 150], mix: 0.38, sat: 1.20, grain: 5 },
    { id: 'mono',   name: 'Mono',       swatch: '#e8e2d6', shadow: [20, 20, 24],  high: [235, 225, 210], mix: 0.30, sat: 0.15, grain: 6 },
    { id: 'gold',   name: 'Gold Hour',  swatch: '#ffc45e', shadow: [52, 30, 10],  high: [255, 196, 90],  mix: 0.40, sat: 1.10, grain: 4 },
    { id: 'teal',   name: 'Teal Night', swatch: '#3fd8c8', shadow: [6, 40, 52],   high: [140, 220, 200], mix: 0.36, sat: 1.10, grain: 4 }
  ];

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) {
      if (GRADES[i].id === id) return GRADES[i];
    }
    return GRADES[0];
  }

  // ---------------------------------------------------------------- layouts
  var LAYOUTS = [
    { id: 'magazine',   name: 'Magazine',    desc: 'Full-bleed hero, title low' },
    { id: 'hero-stack', name: 'Hero Stack',  desc: 'Hero over two panels' },
    { id: 'triptych',   name: 'Triptych',    desc: 'Three vertical panels' },
    { id: 'duo-split',  name: 'Duo Split',   desc: 'Hero left, panels right' },
    { id: 'grid-four',  name: 'Grid Four',   desc: 'Two-by-two photo grid' },
    { id: 'strip-story', name: 'Strip Story', desc: 'Strips with title band' }
  ];

  // ---------------------------------------------------------------- helpers
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Deterministic PRNG (mulberry32) so grain is identical every render.
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fit a font size so `text` fits inside maxWidth. Returns the size.
  function fitSize(ctx, text, font, start, maxWidth) {
    var size = start;
    ctx.font = font(size);
    var w = ctx.measureText(text).width;
    while (w > maxWidth && size > 10) {
      size -= 2;
      ctx.font = font(size);
      w = ctx.measureText(text).width;
    }
    return size;
  }

  // ---------------------------------------------------------------- grading
  // Grade an ImageData in place. Luminance is quantised to 48 levels
  // first, so the tint lookup cannot amplify sensor noise into blotches.
  function gradeImageData(data, grade, seed) {
    var LEVELS = 48;
    var rnd = rng(seed || 7);
    var mix = grade.mix;
    var sat = grade.sat;
    var grain = grade.grain;
    var sh = grade.shadow;
    var hi = grade.high;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      var q = Math.round((lum / 255) * (LEVELS - 1)) / (LEVELS - 1);
      var tr = lerp(sh[0], hi[0], q);
      var tg = lerp(sh[1], hi[1], q);
      var tb = lerp(sh[2], hi[2], q);
      // Saturation around the quantised grey point keeps tones clean.
      var grey = q * 255;
      var sr = lerp(grey, r, sat);
      var sg = lerp(grey, g, sat);
      var sb = lerp(grey, b, sat);
      var n = (rnd() - 0.5) * 2 * grain;
      data[i] = clamp(lerp(sr, tr, mix) + n, 0, 255);
      data[i + 1] = clamp(lerp(sg, tg, mix) + n, 0, 255);
      data[i + 2] = clamp(lerp(sb, tb, mix) + n, 0, 255);
    }
  }

  // Clamp an image position so the panel stays covered and the
  // protected fraction [keepStart, keepEnd] of the image stays visible
  // when it fits. When the protected span is taller/wider than the
  // panel it cannot all fit: `anchor` picks which end to keep
  // ('start', 'end', or 'center' to keep the focus point).
  function clampAxis(p, imgSize, panelStart, panelSize, keepStart, keepEnd, anchor) {
    var panelEnd = panelStart + panelSize;
    var lo = panelEnd - imgSize; // image end flush with panel end
    var hi = panelStart;         // image start flush with panel start
    var fitLo = panelStart - keepStart * imgSize;
    var fitHi = panelEnd - keepEnd * imgSize;
    if (fitLo <= fitHi) {
      lo = Math.max(lo, fitLo);
      hi = Math.min(hi, fitHi);
    } else if (anchor === 'end') {
      p = fitHi;
    } else if (anchor === 'start') {
      p = fitLo;
    }
    return clamp(p, lo, hi);
  }

  // Draw an image into a rect, cover-fit, with zoom around a focus point.
  // keep* fractions of the image are protected from being cropped by
  // the zoom whenever they fit; anchor decides which end wins when
  // they cannot all fit (heads for wide panels, feet for tall ones).
  function drawCoverImage(ctx, img, x, y, w, h, o) {
    o = o || {};
    var zoom = o.zoom || 1;
    var fx = o.focusX == null ? 0.5 : o.focusX;
    var fy = o.focusY == null ? 0.5 : o.focusY;
    var keepTop = o.keepTop == null ? 0 : o.keepTop;
    var keepBottom = o.keepBottom == null ? 1 : o.keepBottom;
    var keepLeft = o.keepLeft == null ? 0 : o.keepLeft;
    var keepRight = o.keepRight == null ? 1 : o.keepRight;
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var base = Math.max(w / iw, h / ih) * zoom;
    var dw = iw * base;
    var dh = ih * base;
    var dx = x + w * fx - dw * fx;
    var dy = y + h * fy - dh * fy;
    dx = clampAxis(dx, dw, x, w, keepLeft, keepRight, o.anchorX || 'center');
    dy = clampAxis(dy, dh, y, h, keepTop, keepBottom, o.anchorY || 'center');

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (o.grade) {
      // Grade on an offscreen canvas at panel resolution (capped).
      var scale = Math.min(1, 1080 / Math.max(dw, dh));
      var ow = Math.max(2, Math.round(dw * scale));
      var oh = Math.max(2, Math.round(dh * scale));
      var off = document.createElement('canvas');
      off.width = ow;
      off.height = oh;
      var octx = off.getContext('2d');
      octx.drawImage(img, 0, 0, ow, oh);
      var id = octx.getImageData(0, 0, ow, oh);
      gradeImageData(id.data, o.grade, o.seed || 7);
      octx.putImageData(id, 0, 0);
      ctx.drawImage(off, dx, dy, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- text
  function drawRibbon(ctx, W, H, text) {
    ctx.save();
    ctx.translate(W - 150, 30);
    ctx.rotate(Math.PI / 4.6);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(-140, -20, 280, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = '3px'; } catch (e) { /* older canvas */ }
    ctx.fillText(text, 0, 1);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
    ctx.restore();
  }

  // Title block: big Anton title, Pacifico subtitle with neon glow,
  // and a credits line fitted so it never gets cut off. `scale`
  // shrinks the whole block (used where the band is short).
  function drawTitleBlock(ctx, W, x, y, width, opts) {
    var title = opts.title || 'CORAL COAST';
    var subtitle = opts.subtitle || 'Coral Dusk';
    var credits = opts.credits || 'MARA \u2022 DANTE \u2022 SOFIA';
    var scale = opts.scale || 1;
    var margin = 46;
    var inner = width - margin * 2;

    var titleSize = Math.round(fitSize(ctx, title, function (s) {
      return '400 ' + s + 'px Anton, "Arial Narrow", sans-serif';
    }, Math.round(width * 0.115), inner) * scale);
    ctx.font = '400 ' + titleSize + 'px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillText(title, x + margin, y + titleSize);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    var subSize = Math.max(20, Math.round(titleSize * 0.42));
    ctx.font = subSize + 'px Pacifico, cursive';
    ctx.fillStyle = '#ffd9e8';
    ctx.shadowColor = '#ff2e9a';
    ctx.shadowBlur = 18;
    ctx.fillText(subtitle, x + margin + 4, y + titleSize + subSize + 14);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    var credSize = Math.max(14, Math.round(fitSize(ctx, credits, function (s) {
      return '700 ' + s + 'px "Arial Narrow", Arial, sans-serif';
    }, 30, inner) * scale));
    ctx.font = '700 ' + credSize + 'px "Arial Narrow", Arial, sans-serif';
    try { ctx.letterSpacing = '4px'; } catch (e) { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(credits, x + margin, y + titleSize + subSize + 14 + credSize + 26);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
    return y + titleSize + subSize + credSize + 40;
  }

  // Legibility scrim under a title: dark gradient, lighter than before
  // so bottom panels never go muddy-dark.
  function drawScrim(ctx, x, y, w, h, strength) {
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(10,4,14,0)');
    g.addColorStop(1, 'rgba(10,4,14,' + (strength == null ? 0.42 : strength) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  function drawVignette(ctx, W, H) {
    var g = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.42,
      W / 2, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(8,2,10,0)');
    g.addColorStop(1, 'rgba(8,2,10,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------------------------------------------------------------- layouts
  // photos: { hero, plaza, mara, dante } — Image elements (or null).
  // Portrait panels pop out at 1.08; the wide hero stays at 1.0 so no
  // feet or limbs are ever cropped by the zoom. The narrow triptych
  // panels are the exception: they render at 1.0 with the focus
  // centred on the subject, so a whole face and a whole body fit
  // inside the thin slice.
  function renderPoster(canvas, opts) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var grade = gradeById(opts.grade || 'neon');
    var photos = opts.photos || {};
    var text = {
      title: opts.title || 'CORAL COAST',
      subtitle: opts.subtitle || 'Coral Dusk',
      credits: opts.credits || 'MARA \u2022 DANTE \u2022 SOFIA'
    };
    var seed = opts.seed || 7;
    var P = { hero: photos.hero || null, plaza: photos.plaza || null, mara: photos.mara || null, dante: photos.dante || null };
    var layout = opts.layout || 'magazine';
    var gap = Math.round(W * 0.012);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#160a12';
    ctx.fillRect(0, 0, W, H);

    function photo(img, x, y, w, h, kind, extra) {
      if (!img) {
        ctx.fillStyle = '#2a1420';
        ctx.fillRect(x, y, w, h);
        return;
      }
      var o = { grade: grade, seed: seed };
      if (kind === 'portrait') {
        o.zoom = 1.08;
        o.focusX = 0.5;
        o.focusY = 0.5;
        o.keepTop = 0.02;
        o.keepBottom = 0.99;
        o.keepLeft = 0.05;
        o.keepRight = 0.95;
        o.anchorX = 'center';
        // Tall panel: keep the feet (full body). Wide panel: keep the
        // head — the whole body cannot fit anyway.
        o.anchorY = h >= w * 1.2 ? 'end' : 'start';
      } else if (kind === 'hero') {
        o.zoom = 1.0;
        o.focusX = 0.5;
        o.focusY = 0.45;
        o.keepTop = 0.0;
        o.keepBottom = 0.99;
        o.anchorX = 'center';
        o.anchorY = 'center';
      } else {
        o.zoom = 1.0;
        o.focusX = 0.5;
        o.focusY = 0.5;
        o.keepTop = 0.0;
        o.keepBottom = 1.0;
        o.anchorX = 'center';
        o.anchorY = 'center';
      }
      // Layout-specific overrides (triptych focus/zoom): applied last
      // so they win over the kind defaults above.
      if (extra) {
        for (var k in extra) { o[k] = extra[k]; }
      }
      drawCoverImage(ctx, img, x, y, w, h, o);
    }

    var titleY;
    if (layout === 'magazine') {
      photo(P.hero, 0, 0, W, H, 'hero');
      drawScrim(ctx, 0, H * 0.60, W, H * 0.40, 0.42);
      drawRibbon(ctx, W, H, 'DUSK');
      titleY = H * 0.66;
      drawTitleBlock(ctx, W, 0, titleY, W, text);
    } else if (layout === 'hero-stack') {
      var heroH = Math.round(H * 0.60);
      photo(P.hero, 0, 0, W, heroH, 'hero');
      var rowY = heroH + gap;
      var rowH = H - rowY;
      var half = Math.floor((W - gap) / 2);
      photo(P.plaza, 0, rowY, half, rowH, 'wide');
      photo(P.mara, half + gap, rowY, W - half - gap, rowH, 'portrait');
      drawScrim(ctx, 0, heroH - Math.round(H * 0.24), W, Math.round(H * 0.24), 0.42);
      drawRibbon(ctx, W, H, 'DUSK');
      drawTitleBlock(ctx, W, 0, heroH - Math.round(H * 0.22), W, text);
    } else if (layout === 'triptych') {
      var third = Math.floor((W - gap * 2) / 3);
      // Triptych panels are very narrow: at the 1.08x portrait pop-out
      // the visible window is narrower than Mara's face and Dante's
      // body, so both render at 1.0x with the focus centred on the
      // subject — Mara's face (focusX 0.35) and Dante's body
      // (focusX 0.84, head kept by anchorY 'start').
      photo(P.mara, 0, 0, third, H, 'portrait', { zoom: 1.0, focusX: 0.35 });
      photo(P.hero, third + gap, 0, third, H, 'hero');
      photo(P.dante, third * 2 + gap * 2, 0, W - third * 2 - gap * 2, H, 'portrait', { zoom: 1.0, focusX: 0.84, anchorY: 'start' });
      drawScrim(ctx, 0, H * 0.62, W, H * 0.38, 0.42);
      drawRibbon(ctx, W, H, 'DUSK');
      drawTitleBlock(ctx, W, 0, H * 0.68, W, text);
    } else if (layout === 'duo-split') {
      var leftW = Math.round(W * 0.58);
      photo(P.hero, 0, 0, leftW, H, 'hero');
      var rightX = leftW + gap;
      var rightW = W - rightX;
      var halfH = Math.floor((H - gap) / 2);
      photo(P.plaza, rightX, 0, rightW, halfH, 'wide');
      photo(P.mara, rightX, halfH + gap, rightW, H - halfH - gap, 'portrait');
      drawScrim(ctx, 0, H * 0.74, W, H * 0.26, 0.42);
      drawRibbon(ctx, W, H, 'DUSK');
      drawTitleBlock(ctx, W, 0, H * 0.76, W, text);
    } else if (layout === 'grid-four') {
      var gridH = Math.round(H * 0.76);
      var cellW = Math.floor((W - gap) / 2);
      var cellH = Math.floor((gridH - gap) / 2);
      photo(P.hero, 0, 0, cellW, cellH, 'hero');
      photo(P.plaza, cellW + gap, 0, W - cellW - gap, cellH, 'wide');
      photo(P.mara, 0, cellH + gap, cellW, gridH - cellH - gap, 'portrait');
      photo(P.dante, cellW + gap, cellH + gap, W - cellW - gap, gridH - cellH - gap, 'portrait');
      ctx.fillStyle = '#1d0b16';
      ctx.fillRect(0, gridH + gap, W, H - gridH - gap);
      ctx.fillStyle = '#ff2e63';
      ctx.fillRect(0, gridH + gap, W, 6);
      drawTitleBlock(ctx, W, 0, gridH + gap + 12, W, {
        title: text.title, subtitle: text.subtitle, credits: text.credits, scale: 0.75
      });
      drawRibbon(ctx, W, H, 'DUSK');
    } else { // strip-story
      var stripH = Math.round(H * 0.32);
      photo(P.hero, 0, 0, W, stripH, 'hero');
      var bandY = stripH + gap;
      var bandH = Math.round(H * 0.30);
      ctx.fillStyle = '#1d0b16';
      ctx.fillRect(0, bandY, W, bandH);
      drawTitleBlock(ctx, W, 0, bandY + 16, W, text);
      var botY = bandY + bandH + gap;
      var botH = H - botY;
      var bHalf = Math.floor((W - gap) / 2);
      photo(P.mara, 0, botY, bHalf, botH, 'portrait');
      photo(P.dante, bHalf + gap, botY, W - bHalf - gap, botH, 'portrait');
      drawRibbon(ctx, W, H, 'DUSK');
    }
    drawVignette(ctx, W, H);
    return canvas;
  }

  global.CoverStudio = {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    gradeById: gradeById,
    renderPoster: renderPoster,
    drawCoverImage: drawCoverImage,
    gradeImageData: gradeImageData
  };
})(typeof window !== 'undefined' ? window : globalThis);
