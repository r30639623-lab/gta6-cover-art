// Coral Dusk Cover Studio — editor.
// State, panel picking + dragging, uploads, undo/redo, export, and the
// ?mode=cover URL form used for clean poster screenshots.
import { GRADES, GRADE_ORDER, LAYOUTS, LAYOUT_ORDER, renderPoster, panelAt } from "./cover.js";

const SAMPLES = [
  { src: "photos/1-pier.jpg", name: "Pier jump" },
  { src: "photos/2-boulevard.jpg", name: "Boulevard night" },
  { src: "photos/3-convertible.jpg", name: "Convertible" },
  { src: "photos/4-palms.jpg", name: "Palm sunset" },
];

const params = new URLSearchParams(location.search);
const coverMode = params.get("mode") === "cover";

const canvas = document.getElementById("poster");
const statusLine = document.getElementById("statusLine");

const state = {
  layout: "hero3",
  grade: "neon",
  title: "CORAL DUSK",
  subtitle: "Sunset Coast Nights",
  tagline: "NEON NIGHTS",
  cast: [
    { name: "Mara", role: "Driver" },
    { name: "Dante", role: "The Fixer" },
    { name: "Sofia", role: "The Boss" },
  ],
  photos: [], // HTMLImageElement list
  photoNames: [],
  assign: [],
  offsets: [],
  selectedPanel: 0,
  selectedPhoto: 0,
  heat: 4,
};

let history = [];
let future = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    cast: state.cast,
    assign: state.assign,
    offsets: state.offsets,
    selectedPanel: state.selectedPanel,
    selectedPhoto: state.selectedPhoto,
  });
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 40) history.shift();
  future = [];
  syncButtons();
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncInputs();
  render();
}

function syncButtons() {
  const u = document.getElementById("undoBtn");
  const r = document.getElementById("redoBtn");
  if (u) u.disabled = history.length === 0;
  if (r) r.disabled = future.length === 0;
}

function defaultAssign() {
  const n = LAYOUTS[state.layout].panels.length;
  const m = state.photos.length || 1;
  state.assign = Array.from({ length: n }, (_, i) =>
    LAYOUTS[state.layout].panels[i].hero ? 0 : i % m
  );
  state.offsets = Array.from({ length: n }, () => ({ dx: 0, dy: 0 }));
  state.selectedPanel = 0;
}

function render() {
  if (!state.photos.length) return;
  renderPoster(canvas, state, canvas.width, canvas.height);
  markSelectedThumb();
}

function setStatus(text) {
  if (statusLine) statusLine.textContent = text;
}

// ------------------------------------------------------------ thumbnails
function buildThumbs() {
  const box = document.getElementById("thumbs");
  box.innerHTML = "";
  state.photos.forEach((img, i) => {
    const t = document.createElement("img");
    t.src = img.src;
    t.alt = state.photoNames[i] || `Photo ${i + 1}`;
    t.title = state.photoNames[i] || `Photo ${i + 1}`;
    t.dataset.i = i;
    t.addEventListener("click", () => {
      pushHistory();
      state.selectedPhoto = i;
      state.assign[state.selectedPanel] = i;
      state.offsets[state.selectedPanel] = { dx: 0, dy: 0 };
      render();
      setStatus(`Panel ${state.selectedPanel + 1} now shows “${state.photoNames[i]}”.`);
    });
    box.appendChild(t);
  });
  markSelectedThumb();
}

function markSelectedThumb() {
  document.querySelectorAll("#thumbs img").forEach((t) => {
    t.classList.toggle("selected", Number(t.dataset.i) === state.selectedPhoto);
  });
}

// ------------------------------------------------------------ controls
function buildButtons() {
  const lg = document.getElementById("layouts");
  LAYOUT_ORDER.forEach((key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = LAYOUTS[key].label;
    b.dataset.key = key;
    b.addEventListener("click", () => {
      if (state.layout === key) return;
      pushHistory();
      state.layout = key;
      defaultAssign();
      render();
      syncActive();
      setStatus(`Layout: ${LAYOUTS[key].label}.`);
    });
    lg.appendChild(b);
  });

  const gg = document.getElementById("grades");
  GRADE_ORDER.forEach((key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = GRADES[key].label;
    b.dataset.key = key;
    b.addEventListener("click", () => {
      if (state.grade === key) return;
      pushHistory();
      state.grade = key;
      render();
      syncActive();
      setStatus(`Grade: ${GRADES[key].label}.`);
    });
    gg.appendChild(b);
  });
  syncActive();
}

function syncActive() {
  document.querySelectorAll("#layouts button").forEach((b) =>
    b.classList.toggle("active", b.dataset.key === state.layout)
  );
  document.querySelectorAll("#grades button").forEach((b) =>
    b.classList.toggle("active", b.dataset.key === state.grade)
  );
}

function syncInputs() {
  const t = document.getElementById("titleInput");
  const s = document.getElementById("subtitleInput");
  const g = document.getElementById("taglineInput");
  const c = document.getElementById("castInput");
  if (t) t.value = state.title;
  if (s) s.value = state.subtitle;
  if (g) g.value = state.tagline;
  if (c) c.value = state.cast.map((x) => `${x.name} — ${x.role}`).join("\n");
  syncActive();
}

function bindInputs() {
  const deb = (fn) => {
    let id = 0;
    return (...a) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...a), 180);
    };
  };
  const title = document.getElementById("titleInput");
  const subtitle = document.getElementById("subtitleInput");
  const tagline = document.getElementById("taglineInput");
  const cast = document.getElementById("castInput");

  title.addEventListener("input", deb(() => {
    pushHistory();
    state.title = title.value.trim().toUpperCase() || "CORAL DUSK";
    render();
  }));
  subtitle.addEventListener("input", deb(() => {
    pushHistory();
    state.subtitle = subtitle.value.trim() || "Sunset Coast Nights";
    render();
  }));
  tagline.addEventListener("input", deb(() => {
    pushHistory();
    state.tagline = tagline.value.trim().toUpperCase() || "NEON NIGHTS";
    render();
  }));
  cast.addEventListener("input", deb(() => {
    pushHistory();
    state.cast = cast.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((line) => {
        const parts = line.split(/—|-/).map((p) => p.trim());
        return { name: parts[0] || "Mara", role: parts[1] || "Driver" };
      });
    if (!state.cast.length) state.cast = [{ name: "Mara", role: "Driver" }];
    render();
  }));

  document.getElementById("undoBtn").addEventListener("click", () => {
    if (!history.length) return;
    future.push(snapshot());
    applySnapshot(history.pop());
    syncButtons();
  });
  document.getElementById("redoBtn").addEventListener("click", () => {
    if (!future.length) return;
    history.push(snapshot());
    applySnapshot(future.pop());
    syncButtons();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    pushHistory();
    state.layout = "hero3";
    state.grade = "neon";
    state.title = "CORAL DUSK";
    state.subtitle = "Sunset Coast Nights";
    state.tagline = "NEON NIGHTS";
    state.cast = [
      { name: "Mara", role: "Driver" },
      { name: "Dante", role: "The Fixer" },
      { name: "Sofia", role: "The Boss" },
    ];
    defaultAssign();
    syncInputs();
    render();
    setStatus("Reset to the Neon Vice default.");
  });

  document.getElementById("oneEverywhere").addEventListener("click", () => {
    pushHistory();
    state.assign = state.assign.map(() => state.selectedPhoto);
    render();
    setStatus("One photo everywhere.");
  });
  document.getElementById("dealPhotos").addEventListener("click", () => {
    pushHistory();
    const m = state.photos.length;
    state.assign = state.assign.map((_, i) => i % m);
    render();
    setStatus("Photos dealt across the panels.");
  });

  document.getElementById("fileInput").addEventListener("change", (e) => {
    const files = [...e.target.files].slice(0, 9 - state.photos.length);
    if (!files.length) {
      setStatus(state.photos.length >= 9 ? "Already 9 photos." : "No file picked.");
      return;
    }
    let loaded = 0;
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        state.photos.push(img);
        state.photoNames.push(f.name.replace(/\.[^.]+$/, ""));
        loaded++;
        if (loaded === files.length) {
          state.assign[state.selectedPanel] = state.photos.length - 1;
          state.selectedPhoto = state.photos.length - 1;
          buildThumbs();
          render();
          setStatus(`${files.length} photo(s) added.`);
        }
      };
      img.src = url;
    });
    e.target.value = "";
  });

  const exporters = [
    ["dlPoster", 1024, 1536, "coral-dusk-poster.png"],
    ["dlSquare", 1024, 1024, "coral-dusk-square.png"],
    ["dlWide", 1536, 864, "coral-dusk-wide.png"],
    ["dlStory", 1080, 1350, "coral-dusk-story.png"],
  ];
  exporters.forEach(([id, w, h, name]) => {
    document.getElementById(id).addEventListener("click", () => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      renderPoster(off, state, w, h);
      off.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        setStatus(`Exported ${name} (${w}×${h}).`);
      }, "image/png");
    });
  });
}

// ------------------------------------------------------------ canvas drag
function bindCanvas() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {
      fx: (e.clientX - r.left) / r.width,
      fy: (e.clientY - r.top) / r.height,
      px: e.clientX - r.left,
      py: e.clientY - r.top,
      w: r.width,
      h: r.height,
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    const p = point(e);
    const hit = panelAt(state, p.fx, p.fy);
    if (hit < 0) return;
    dragging = true;
    state.selectedPanel = hit;
    state.selectedPhoto = state.assign[hit];
    lastX = p.px;
    lastY = p.py;
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = point(e);
    const rect = LAYOUTS[state.layout].panels[state.selectedPanel];
    const off = state.offsets[state.selectedPanel];
    off.dx += (p.px - lastX) / (rect.w * p.w);
    off.dy += (p.py - lastY) / (rect.h * p.h);
    off.dx = Math.max(-1, Math.min(1, off.dx));
    off.dy = Math.max(-1, Math.min(1, off.dy));
    lastX = p.px;
    lastY = p.py;
    render();
  });
  const end = () => {
    if (dragging) {
      dragging = false;
      pushHistory();
    }
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

// ------------------------------------------------------------ boot
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function boot() {
  // URL overrides for clean poster screenshots:
  // ?mode=cover&layout=hero5&grade=neon&size=1024x1536
  if (params.get("layout") && LAYOUTS[params.get("layout")]) state.layout = params.get("layout");
  if (params.get("grade") && GRADES[params.get("grade")]) state.grade = params.get("grade");
  if (params.get("title")) state.title = params.get("title").toUpperCase();
  if (params.get("subtitle")) state.subtitle = params.get("subtitle");
  if (params.get("tagline")) state.tagline = params.get("tagline").toUpperCase();

  if (coverMode) {
    const size = (params.get("size") || "1024x1536").split("x");
    canvas.width = Number(size[0]) || 1024;
    canvas.height = Number(size[1]) || 1536;
    document.body.classList.add("cover-only");
  }

  const imgs = await Promise.all(SAMPLES.map((s) => loadImage(s.src)));
  state.photos = imgs;
  state.photoNames = SAMPLES.map((s) => s.name);
  defaultAssign();

  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('60px Pacifico'),
      document.fonts.ready,
    ]);
  } catch (e) {
    /* fonts fall back to system sans */
  }

  if (!coverMode) {
    buildThumbs();
    buildButtons();
    bindInputs();
    bindCanvas();
    syncInputs();
    syncButtons();
  }
  render();
  setStatus(coverMode ? "Poster render." : "Ready. Pick a panel, then a photo.");
  window.__studioReady = true;
}

boot().catch((err) => {
  setStatus(`Could not start: ${err.message}`);
  console.error(err);
});
