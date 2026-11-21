// Coral Dusk Cover Studio — editor.
// Loads the sample photos, wires the layout/grade/text controls, renders the
// live preview, exports PNGs in the four post sizes, and supports a
// screenshot mode (?shot=cover|editor) used by shots.js. Runs fully offline:
// every script, font and photo is a file under app/.

(function () {
  'use strict';

  var SAMPLES = [
    { src: 'photos/1-skyline.jpg', label: 'Skyline — hero', credit: 'New York Skyline Sunset 2 — thenails, CC BY 2.0' },
    { src: 'photos/2-plaza.jpg', label: 'Plaza — boulevard', credit: 'Plaza de Cibeles — Jorge Lascar, CC BY 2.0' },
    { src: 'photos/3-mara.jpg', label: 'Mara — portrait', credit: 'Tribe woman, India — orange tuesday, CC BY 2.0' },
    { src: 'photos/4-dante.jpg', label: 'Dante — portrait', credit: 'Awesome dude, Rome — sidewalk flying, CC BY 2.0' }
  ];

  var EXPORT_SIZES = [
    { label: '1080 × 1080', w: 1080, h: 1080 },
    { label: '1080 × 1350', w: 1080, h: 1350 },
    { label: '1920 × 1080', w: 1920, h: 1080 },
    { label: '1080 × 1920', w: 1080, h: 1920 }
  ];

  var state = {
    layout: 'magazine',
    grade: 'neon',
    title: 'CORAL COAST',
    subtitle: 'Coral Dusk',
    credit: 'MARA • DANTE • SOFIA',
    seed: 8,
    focus: {},
    photos: []
  };

  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('seed')) state.seed = parseInt(params.get('seed'), 10) || 8;
  if (params.get('title')) state.title = params.get('title');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('cannot load ' + src)); };
      img.src = src;
    });
  }

  function loadPhotos(list) {
    return Promise.all(list.map(function (p) {
      return loadImage(p.src).then(function (img) {
        return { img: img, label: p.label, credit: p.credit, src: p.src };
      });
    }));
  }

  function statePhotos() {
    return state.photos.map(function (p) { return p.img; });
  }

  function renderInto(canvas) {
    CoverEngine.renderCover(canvas, {
      layout: state.layout,
      grade: state.grade,
      title: state.title,
      subtitle: state.subtitle,
      credit: state.credit,
      photos: statePhotos(),
      seed: state.seed,
      focus: state.focus
    });
  }

  function previewSize() {
    var layout = CoverEngine.LAYOUTS[state.layout] || CoverEngine.LAYOUTS.magazine;
    return layout.aspect === 'square' ? { w: 520, h: 520 } : { w: 520, h: 650 };
  }

  function renderPreview() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    var size = previewSize();
    stage.width = size.w;
    stage.height = size.h;
    renderInto(stage);
  }

  function renderShot() {
    var w = parseInt(params.get('w') || '1024', 10);
    var h = parseInt(params.get('h') || '1280', 10);
    var canvas = document.getElementById('stage');
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    document.body.style.margin = '0';
    document.body.style.background = '#0a0408';
    renderInto(canvas);
    document.title = 'shot-ready';
  }

  function exportPNG(w, h) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    renderInto(canvas);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'coral-dusk-' + w + 'x' + h + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    }, 'image/png');
  }

  function buildLayoutButtons() {
    var box = document.getElementById('layoutBtns');
    if (!box) return;
    Object.keys(CoverEngine.LAYOUTS).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = CoverEngine.LAYOUTS[key].label;
      b.dataset.layout = key;
      if (key === state.layout) b.classList.add('active');
      b.addEventListener('click', function () {
        state.layout = key;
        box.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderPreview();
      });
      box.appendChild(b);
    });
  }

  function buildGradeSwatches() {
    var box = document.getElementById('gradeSwatches');
    if (!box) return;
    Object.keys(CoverEngine.GRADES).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = CoverEngine.GRADES[key].label;
      b.dataset.grade = key;
      if (key === state.grade) b.classList.add('active');
      b.addEventListener('click', function () {
        state.grade = key;
        box.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderPreview();
      });
      box.appendChild(b);
    });
  }

  function buildPhotoList() {
    var box = document.getElementById('photoList');
    if (!box) return;
    box.innerHTML = '';
    state.photos.forEach(function (p, i) {
      var fig = document.createElement('figure');
      var im = document.createElement('img');
      im.src = p.src;
      im.alt = p.label;
      var cap = document.createElement('figcaption');
      cap.textContent = p.label;
      fig.appendChild(im);
      fig.appendChild(cap);
      fig.addEventListener('click', function () {
        var sel = document.getElementById('panelSelect');
        if (sel) {
          var panel = parseInt(sel.value, 10) || 0;
          state.focus[panel] = state.focus[panel] || {};
          state.focus[panel].photo = i;
          renderPreview();
        }
      });
      box.appendChild(fig);
    });
  }

  function buildPanelControls() {
    var sel = document.getElementById('panelSelect');
    if (!sel) return;
    for (var i = 0; i < 4; i++) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = 'Panel ' + (i + 1);
      sel.appendChild(o);
    }
    var fx = document.getElementById('focusX');
    var fy = document.getElementById('focusY');
    var zoom = document.getElementById('zoomRange');
    function read() {
      var panel = parseInt(sel.value, 10) || 0;
      state.focus[panel] = state.focus[panel] || {};
      state.focus[panel].fx = parseFloat(fx.value);
      state.focus[panel].fy = parseFloat(fy.value);
      state.focus[panel].zoom = parseFloat(zoom.value);
      renderPreview();
    }
    [fx, fy, zoom].forEach(function (el) {
      if (el) el.addEventListener('input', read);
    });
  }

  function buildExportButtons() {
    var box = document.getElementById('exportBtns');
    if (!box) return;
    EXPORT_SIZES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'PNG ' + s.label;
      b.addEventListener('click', function () { exportPNG(s.w, s.h); });
      box.appendChild(b);
    });
  }

  function bindTextInputs() {
    var map = [['titleInput', 'title'], ['subtitleInput', 'subtitle'], ['creditInput', 'credit']];
    map.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (!el) return;
      el.value = state[pair[1]];
      el.addEventListener('input', function () {
        state[pair[1]] = el.value;
        renderPreview();
      });
    });
  }

  function bindUpload() {
    var input = document.getElementById('uploadInput');
    if (!input) return;
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      var room = 9 - state.photos.length;
      files.slice(0, Math.max(0, room)).forEach(function (file, k) {
        var url = URL.createObjectURL(file);
        loadImage(url).then(function (img) {
          state.photos.push({ img: img, label: 'Upload ' + (state.photos.length + 1), credit: 'Foto pengguna', src: url });
          buildPhotoList();
          renderPreview();
        });
      });
    });
  }

  function boot() {
    if (shot === 'cover') {
      // Hide the editor chrome but keep the stage visible: the stage lives
      // inside .editor-ui, so hiding that div would hide the canvas too.
      document.body.classList.add('shot-mode');
    }
    loadPhotos(SAMPLES).then(function (photos) {
      state.photos = photos;
      if (shot === 'cover') {
        document.fonts.ready.then(function () { renderShot(); });
        setTimeout(renderShot, 1200);
      } else {
        buildLayoutButtons();
        buildGradeSwatches();
        buildPhotoList();
        buildPanelControls();
        buildExportButtons();
        bindTextInputs();
        bindUpload();
        document.fonts.ready.then(renderPreview);
        renderPreview();
      }
    }).catch(function (err) {
      var hint = document.getElementById('hint');
      if (hint) hint.textContent = 'Foto sampel gagal dimuat: ' + err.message;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
