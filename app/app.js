// app.js — Coral Dusk Cover Studio: studio UI logic.
// Wires the toolbar (layouts, grades, text, photos, export) to the
// CoverStudio rendering engine in cover.js. Also supports screenshot
// mode through URL params (?shot=cover1|editor|cover3|square) so the
// poster can be captured headlessly at a fixed size.

(function () {
  'use strict';

  var SAMPLES = [
    { key: 'hero',  src: 'photos/1-skyline.jpg', label: 'Skyline — hero',  credit: 'Joseph Barrientos (CC0)' },
    { key: 'plaza', src: 'photos/2-plaza.jpg',   label: 'Plaza — boulevard', credit: 'Edgardo W. Olivera (CC BY 2.0)' },
    { key: 'mara',  src: 'photos/3-mara.jpg',   label: 'Mara — portrait', credit: 'orange tuesday (CC BY 2.0)' },
    { key: 'dante', src: 'photos/4-dante.jpg',  label: 'Dante — portrait', credit: 'sidewalk flying (CC BY 2.0)' }
  ];

  var EXPORT_SIZES = [
    { id: 'poster', label: 'Poster 1080 \u00D7 1350', w: 1080, h: 1350 },
    { id: 'square', label: 'Square 1080 \u00D7 1080', w: 1080, h: 1080 },
    { id: 'wide',   label: 'Wide 1920 \u00D7 1080',   w: 1920, h: 1080 },
    { id: 'story',  label: 'Story 1080 \u00D7 1920',  w: 1080, h: 1920 }
  ];

  var state = {
    layout: 'magazine',
    grade: 'neon',
    title: 'CORAL COAST',
    subtitle: 'Coral Dusk',
    credits: 'MARA \u2022 DANTE \u2022 SOFIA',
    seed: 7,
    photos: { hero: null, plaza: null, mara: null, dante: null },
    uploads: [] // extra user photos, up to 9 total with the samples
  };

  var params = new URLSearchParams(window.location.search);
  var shotMode = params.get('shot') || '';
  // The screenshot runner passes ?seed=N (shots.json): use it for the
  // grain pass so a new seed really produces a new render.
  var seedParam = parseInt(params.get('seed'), 10);
  if (!isNaN(seedParam)) { state.seed = seedParam; }

  var canvas, ctx, statusEl;

  function $(sel) { return document.querySelector(sel); }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('cannot load ' + src)); };
      img.src = src;
    });
  }

  function loadFonts() {
    var loads = [];
    try {
      loads.push(document.fonts.load('400 100px Anton'));
      loads.push(document.fonts.load('400 60px Pacifico'));
    } catch (e) { /* FontFace API unavailable */ }
    return Promise.all(loads).catch(function () { /* keep going */ })
      .then(function () { return document.fonts.ready.catch(function () {}); });
  }

  function render() {
    if (!canvas) return;
    CoverStudio.renderPoster(canvas, {
      layout: state.layout,
      grade: state.grade,
      photos: state.photos,
      title: state.title,
      subtitle: state.subtitle,
      credits: state.credits,
      seed: state.seed
    });
  }

  function renderDebounced() {
    if (renderDebounced.t) clearTimeout(renderDebounced.t);
    renderDebounced.t = setTimeout(render, 60);
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function buildToolbar() {
    var layoutBox = $('#layouts');
    CoverStudio.LAYOUTS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (l.id === state.layout ? ' active' : '');
      b.textContent = l.name;
      b.title = l.desc;
      b.addEventListener('click', function () {
        state.layout = l.id;
        layoutBox.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        render();
      });
      layoutBox.appendChild(b);
    });

    var gradeBox = $('#grades');
    CoverStudio.GRADES.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (g.id === state.grade ? ' active' : '');
      b.style.background = g.swatch;
      b.textContent = g.name;
      b.addEventListener('click', function () {
        state.grade = g.id;
        gradeBox.querySelectorAll('.swatch').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        render();
      });
      gradeBox.appendChild(b);
    });

    var exportBox = $('#exports');
    EXPORT_SIZES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'export-btn';
      b.textContent = s.label;
      b.addEventListener('click', function () { exportPng(s); });
      exportBox.appendChild(b);
    });
  }

  function buildPhotoSlots() {
    var box = $('#photos');
    SAMPLES.forEach(function (s) {
      var d = document.createElement('div');
      d.className = 'photo-slot';
      var img = document.createElement('img');
      img.src = s.src;
      img.alt = s.label;
      var cap = document.createElement('span');
      cap.textContent = s.label;
      d.appendChild(img);
      d.appendChild(cap);
      box.appendChild(d);
    });
    var up = $('#upload');
    up.addEventListener('change', function () {
      var files = Array.prototype.slice.call(up.files || []);
      var room = 9 - 4 - state.uploads.length;
      files.slice(0, room).forEach(function (f) {
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            state.uploads.push({ name: f.name, img: img });
            var d = document.createElement('div');
            d.className = 'photo-slot uploaded';
            d.appendChild(img);
            var cap = document.createElement('span');
            cap.textContent = f.name;
            d.appendChild(cap);
            box.appendChild(d);
            setStatus(state.uploads.length + ' foto diunggah (maks 9 total).');
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(f);
      });
      up.value = '';
    });
  }

  function exportPng(size) {
    setStatus('Menyiapkan ' + size.label + '\u2026');
    var off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    CoverStudio.renderPoster(off, {
      layout: state.layout,
      grade: state.grade,
      photos: state.photos,
      title: state.title,
      subtitle: state.subtitle,
      credits: state.credits,
      seed: state.seed
    });
    off.toBlob(function (blob) {
      if (!blob) { setStatus('Export gagal.'); return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'coral-coast-' + state.layout + '-' + size.id + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      setStatus('Tersimpan: ' + a.download);
    }, 'image/png');
  }

  function applyShotMode() {
    if (shotMode === 'cover1') {
      state.layout = 'magazine';
      state.grade = 'neon';
      document.body.classList.add('poster-only');
      canvas.width = 1080;
      canvas.height = 1350;
    } else if (shotMode === 'cover3') {
      state.layout = 'triptych';
      state.grade = 'coral';
      document.body.classList.add('poster-only');
      canvas.width = 1080;
      canvas.height = 1350;
    } else if (shotMode === 'square') {
      state.layout = 'grid-four';
      state.grade = 'neon';
      document.body.classList.add('poster-only');
      canvas.width = 1080;
      canvas.height = 1080;
    } else if (shotMode === 'editor') {
      state.layout = 'hero-stack';
      state.grade = 'neon';
      canvas.width = 900;
      canvas.height = 1125;
    }
  }

  function bindTextInputs() {
    var t = $('#title-input');
    var s = $('#subtitle-input');
    var c = $('#credits-input');
    t.addEventListener('input', function () { state.title = t.value.toUpperCase() || 'CORAL COAST'; renderDebounced(); });
    s.addEventListener('input', function () { state.subtitle = s.value || 'Coral Dusk'; renderDebounced(); });
    c.addEventListener('input', function () { state.credits = c.value.toUpperCase() || 'MARA \u2022 DANTE \u2022 SOFIA'; renderDebounced(); });
  }

  function init() {
    canvas = $('#stage');
    statusEl = $('#status');
    buildToolbar();
    buildPhotoSlots();
    bindTextInputs();
    applyShotMode();
    Promise.all([loadFonts()].concat(SAMPLES.map(function (s) { return loadImage(s.src); })))
      .then(function (results) {
        var imgs = results.slice(1);
        SAMPLES.forEach(function (s, i) { state.photos[s.key] = imgs[i]; });
        render();
        setStatus('Siap \u2014 6 layout, 7 grade, 4 foto sampel.');
        document.body.classList.add('ready');
      })
      .catch(function (err) {
        setStatus('Sebagian foto gagal dimuat: ' + err.message);
        render();
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
