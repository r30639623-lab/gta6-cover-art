// Coral Dusk Cover Studio — cover engine.
// Draws GTA-style multi-panel cover art on a 2D canvas: panels with per-panel
// crop/focus, posterized neon grades, bold lettering, ribbon and grain.
// Written from scratch for the gta6-cover-art-01 bounty. No Rockstar assets.

(function (global) {
  'use strict';

  // ------------------------------------------------------------------ grades
  // Each grade maps quantized luminance through a colour ramp, then mixes the
  // mapped colour back over the photo. Luminance is quantized first so smooth
  // skies posterize into clean bands instead of muddy blotches.
  var GRADES = {
    neon: {
      label: 'Neon Vice', strength: 0.55,
      stops: [[0, 16, 8, 38], [0.35, 122, 20, 90], [0.65, 255, 46, 99], [1, 190, 250, 255]]
    },
    coral: {
      label: 'Coral Dusk', strength: 0.5,
      stops: [[0, 24, 10, 16], [0.4, 120, 50, 40], [0.7, 255, 110, 70], [1, 255, 220, 170]]
    },
    dusk: {
      label: 'Dusk', strength: 0.5,
      stops: [[0, 10, 8, 28], [0.45, 70, 30, 90], [0.75, 190, 80, 140], [1, 255, 200, 220]]
    },
    vice: {
      label: 'Vice', strength: 0.5,
      stops: [[0, 6, 30, 40], [0.5, 20, 120, 130], [1, 255, 180, 200]]
    },
    mono: {
      label: 'Mono', strength: 0.7,
      stops: [[0, 0, 0, 0], [1, 255, 255, 255]]
    },
    gold: {
      label: 'Gold Hour', strength: 0.5,
      stops: [[0, 20, 12, 6], [0.45, 120, 70, 20], [0.75, 240, 160, 60], [1, 255, 235, 190]]
    },
    teal: {
      label: 'Teal Night', strength: 0.55,
      stops: [[0, 4, 16, 22], [0.5, 10, 80, 95], [1, 180, 230, 220]]
    }
  };

  // ----------------------------------------------------------------- layouts
  // A layout is a function of (W, H) returning panels and a title zone.
  // Panels: {x, y, w, h, photo, fx, fy, zoom}. fx/fy in [0,1] anchor the crop
  // window; zoom > 1 pops a panel out. Wide heroes stay at zoom 1.0 so no
  // feet or limbs are cut; only narrow portrait panels pop to 1.08.
  var LAYOUTS = {
    magazine: {
      label: 'Magazine', aspect: 'portrait',
      panels: function (W, H) {
        return [{ x: 0, y: 0, w: W, h: H, photo: 0, fx: 0.5, fy: 0.5, zoom: 1.0 }];
      }
    },
    'hero-stack': {
      label: 'Hero Stack', aspect: 'portrait',
      panels: function (W, H) {
        return [
          { x: 0, y: 0, w: W, h: H * 0.62, photo: 0, fx: 0.5, fy: 0.45, zoom: 1.0 },
          { x: 0, y: H * 0.62, w: W * 0.5, h: H * 0.38, photo: 1, fx: 0.5, fy: 0.5, zoom: 1.0 },
          { x: W * 0.5, y: H * 0.62, w: W * 0.5, h: H * 0.38, photo: 2, fx: 0.5, fy: 0.3, zoom: 1.08 }
        ];
      }
    },
    triptych: {
      label: 'Triptych', aspect: 'portrait',
      panels: function (W, H) {
        var third = W / 3;
        return [
          { x: 0, y: 0, w: third, h: H, photo: 2, fx: 0.5, fy: 0.3, zoom: 1.0 },
          { x: third, y: 0, w: third, h: H, photo: 0, fx: 0.5, fy: 0.5, zoom: 1.0 },
          { x: third * 2, y: 0, w: third, h: H, photo: 3, fx: 0.84, fy: 0.5, zoom: 1.0 }
        ];
      }
    },
    'duo-split': {
      label: 'Duo Split', aspect: 'portrait',
      panels: function (W, H) {
        return [
          { x: 0, y: 0, w: W * 0.5, h: H, photo: 2, fx: 0.5, fy: 0.3, zoom: 1.0 },
          { x: W * 0.5, y: 0, w: W * 0.5, h: H, photo: 3, fx: 0.84, fy: 0.5, zoom: 1.0 }
        ];
      }
    },
    'grid-four': {
      label: 'Grid Four', aspect: 'square',
      panels: function (W, H) {
        var gh = H * 0.72, half = W / 2;
        return [
          { x: 0, y: 0, w: half, h: gh / 2, photo: 0, fx: 0.5, fy: 0.45, zoom: 1.0 },
          { x: half, y: 0, w: half, h: gh / 2, photo: 1, fx: 0.5, fy: 0.5, zoom: 1.0 },
          { x: 0, y: gh / 2, w: half, h: gh / 2, photo: 2, fx: 0.5, fy: 0.3, zoom: 1.08 },
          { x: half, y: gh / 2, w: half, h: gh / 2, photo: 3, fx: 0.84, fy: 0.5, zoom: 1.0 }
        ];
      }
    },
    'strip-story': {
      label: 'Strip Story', aspect: 'portrait',
      panels: function (W, H) {
        return [
          { x: 0, y: 0, w: W * 0.55, h: H, photo: 0, fx: 0.5, fy: 0.5, zoom: 1.0 },
          { x: W * 0.55, y: 0, w: W * 0.45, h: H * 0.5, photo: 2, fx: 0.5, fy: 0.3, zoom: 1.08 },
          { x: W * 0.55, y: H * 0.5, w: W * 0.45, h: H * 0.5, photo: 3, fx: 0.84, fy: 0.5, zoom: 1.0 }
        ];
      }
    }
  };

  // ------------------------------------------------------------- seeded random
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rampColor(stops, t) {
    var i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    var a = stops[i], b = stops[i + 1];
    var f = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
    f = Math.max(0, Math.min(1, f));
    return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
  }

  // ------------------------------------------------------------------- photos
  // Cover-fit draw with a focus anchor: the crop window is anchored by fx/fy
  // (0 = left/top, 1 = right/bottom) and clamped so no edge shows through.
  function drawPhoto(ctx, img, x, y, w, h, fx, fy, zoom) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(w / iw, h / ih) * zoom;
    var dw = iw * scale, dh = ih * scale;
    var dx = x + (w - dw) * fx;
    var dy = y + (h - dh) * fy;
    if (dx > x) dx = x;
    if (dx < x + w - dw) dx = x + w - dw;
    if (dy > y) dy = y;
    if (dy < y + h - dh) dy = y + h - dh;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // -------------------------------------------------------------------- grade
  function applyGrade(canvas, grade) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var image = ctx.getImageData(0, 0, W, H);
    var d = image.data;
    var levels = 10;
    var s = grade.strength;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      var lq = Math.round(lum * (levels - 1)) / (levels - 1);
      var m = rampColor(grade.stops, lq);
      d[i] = r + (m[0] - r) * s;
      d[i + 1] = g + (m[1] - g) * s;
      d[i + 2] = b + (m[2] - b) * s;
    }
    ctx.putImageData(image, 0, 0);
  }

  function addVignette(ctx, W, H) {
    var cx = W / 2, cy = H / 2;
    var rad = Math.max(W, H) * 0.75;
    var g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, rad);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function addGrain(ctx, W, H, seed) {
    var rnd = mulberry32(seed);
    var n = Math.floor((W * H) / 520);
    for (var i = 0; i < n; i++) {
      var a = 0.02 + rnd() * 0.06;
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')';
      ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
    }
  }

  // ----------------------------------------------------------------- lettering
  function fitFont(ctx, text, maxWidth, px, family, weight) {
    var size = px;
    ctx.font = weight + ' ' + size + 'px ' + family;
    while (size > 12 && ctx.measureText(text).width > maxWidth) {
      size -= 2;
      ctx.font = weight + ' ' + size + 'px ' + family;
    }
    return size;
  }

  function drawTitleBlock(ctx, W, H, opts) {
    var layout = LAYOUTS[opts.layout] || LAYOUTS.magazine;
    var bandH = layout.aspect === 'square' ? H * 0.28 : H * 0.26;
    var y0 = H - bandH;
    var margin = W * 0.055;
    if (layout.aspect === 'square') {
      ctx.fillStyle = '#14060f';
      ctx.fillRect(0, y0, W, bandH);
      ctx.fillStyle = '#ff2e63';
      ctx.fillRect(0, y0, W, Math.max(3, H * 0.006));
    } else {
      var scrim = ctx.createLinearGradient(0, y0 - H * 0.1, 0, H);
      scrim.addColorStop(0, 'rgba(10,4,12,0)');
      scrim.addColorStop(0.45, 'rgba(10,4,12,0.42)');
      scrim.addColorStop(1, 'rgba(10,4,12,0.62)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, y0 - H * 0.1, W, bandH + H * 0.1);
    }
    var title = (opts.title || 'CORAL COAST').toUpperCase();
    var sub = opts.subtitle || 'Coral Dusk';
    var credit = opts.credit || 'MARA • DANTE • SOFIA';
    var titlePx = Math.round(W * 0.115);
    var size = fitFont(ctx, title, W - margin * 2, titlePx, 'Anton, sans-serif', '900');
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = Math.round(W * 0.012);
    ctx.shadowOffsetY = Math.round(W * 0.004);
    var titleY = y0 + bandH * 0.42;
    ctx.fillText(title, margin, titleY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    var subPx = Math.max(18, Math.round(size * 0.42));
    ctx.font = subPx + 'px Pacifico, cursive';
    ctx.fillStyle = '#ff9ecf';
    ctx.shadowColor = '#ff2e9a';
    ctx.shadowBlur = Math.round(W * 0.018);
    ctx.fillText(sub, margin, titleY + subPx * 1.25);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    var credPx = Math.max(13, Math.round(size * 0.17));
    ctx.font = '400 ' + credPx + 'px Anton, sans-serif';
    try { ctx.letterSpacing = Math.round(credPx * 0.32) + 'px'; } catch (e) { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(credit, margin, titleY + subPx * 1.25 + credPx * 1.9);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  }

  function drawRibbon(ctx, W, H) {
    var text = 'DUSK';
    ctx.save();
    // Ribbon centre pulled well inside the corner (0.90W, 0.05H) so the
    // whole word stays on canvas: at 0.98W the last letter was clipped
    // off the right edge. Band still bleeds off the corner, classic look.
    ctx.translate(W * 0.90, H * 0.05);
    ctx.rotate(Math.PI / 4);
    var bw = W * 0.30, bh = Math.max(26, H * 0.038);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 ' + Math.round(bh * 0.52) + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = '2px'; } catch (e) { /* older canvas */ }
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  // -------------------------------------------------------------------- render
  // Renders a cover onto `canvas` (its width/height are the output size).
  // opts: {layout, grade, title, subtitle, credit, photos:[HTMLImageElement],
  //        seed, panelPhotos:[index...], focus:{panelIndex:{fx,fy,zoom}}}
  function renderCover(canvas, opts) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var layout = LAYOUTS[opts.layout] || LAYOUTS.magazine;
    var grade = GRADES[opts.grade] || GRADES.neon;
    var panels = layout.panels(W, H);
    var line = Math.max(2, Math.round(W * 0.006));
    ctx.fillStyle = '#0a0408';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var focus = (opts.focus && opts.focus[i]) || {};
      var photoIdx = focus.photo !== undefined ? focus.photo : p.photo;
      var img = opts.photos[photoIdx];
      if (!img) continue;
      var fx = focus.fx !== undefined ? focus.fx : p.fx;
      var fy = focus.fy !== undefined ? focus.fy : p.fy;
      var zoom = focus.zoom !== undefined ? focus.zoom : p.zoom;
      drawPhoto(ctx, img, p.x, p.y, p.w, p.h, fx, fy, zoom);
    }
    // Thin dark seams between panels, poster style.
    ctx.fillStyle = '#0a0408';
    for (var j = 1; j < panels.length; j++) {
      var q = panels[j];
      if (q.x > 0) ctx.fillRect(q.x - line / 2, q.y, line, q.h);
      if (q.y > 0 && q.x === 0) ctx.fillRect(q.x, q.y - line / 2, q.w, line);
    }
    applyGrade(canvas, grade);
    addVignette(ctx, W, H);
    drawTitleBlock(ctx, W, H, opts);
    drawRibbon(ctx, W, H);
    addGrain(ctx, W, H, opts.seed || 8);
  }

  global.CoverEngine = {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    renderCover: renderCover,
    mulberry32: mulberry32
  };
})(typeof window !== 'undefined' ? window : globalThis);
