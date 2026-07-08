// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════

const MEMBERS = [
  { name: "naura.isitah",   role: "Annotator", color: "#4A90D9" },
  { name: "rayyan.gibran",  role: "Reviewer",  color: "#27AE60" },
  { name: "athaya.misykah", role: "Manager",   color: "#ff7557" },
];

const IMAGE_DB = [
  { file: "img 1.jpeg", src: "img 1.jpeg", cam: "CAM-01 · Dermaga Timur" },
  { file: "img 2.jpeg", src: "img 2.jpeg", cam: "CAM-02 · Dermaga Tengah" },
  { file: "img 3.jpeg", src: "img 3.jpeg", cam: "CAM-03 · Dermaga Barat" },
  { file: "img 4.jpeg", src: "img 4.jpeg", cam: "CAM-01 · Dermaga Timur" },
    { file: "img 1.jpeg", src: "img 1.jpeg", cam: "CAM-01 · Dermaga Timur" },
  { file: "img 2.jpeg", src: "img 2.jpeg", cam: "CAM-02 · Dermaga Tengah" },
  { file: "img 3.jpeg", src: "img 3.jpeg", cam: "CAM-03 · Dermaga Barat" },
  { file: "img 4.jpeg", src: "img 4.jpeg", cam: "CAM-01 · Dermaga Timur" },
      { file: "img 1.jpeg", src: "img 1.jpeg", cam: "CAM-01 · Dermaga Timur" },
  { file: "img 2.jpeg", src: "img 2.jpeg", cam: "CAM-02 · Dermaga Tengah" },
  { file: "img 3.jpeg", src: "img 3.jpeg", cam: "CAM-03 · Dermaga Barat" },
  { file: "img 4.jpeg", src: "img 4.jpeg", cam: "CAM-01 · Dermaga Timur" },
];

const FILE_NAMES_DUMMY = [
  "frame_CAM02_160925_0915.jpg","frame_CAM03_160925_0930.jpg",
  "frame_CAM01_160925_1000.jpg","frame_CAM02_160925_1015.jpg",
  "frame_CAM03_160925_1030.jpg","frame_CAM01_160925_1100.jpg",
  "frame_CAM02_160925_1115.jpg","frame_CAM03_160925_1130.jpg",
];

const CAM_LABELS = ["CAM-01 · Dermaga Timur","CAM-02 · Dermaga Tengah","CAM-03 · Dermaga Barat"];

// Each task stores its own annotations array (user-drawn bboxes)
const tasks = Array.from({ length: 12 }, (_, i) => {
  const hasImage = i < IMAGE_DB.length;
  const db       = hasImage ? IMAGE_DB[i] : null;
  const memIdx   = i % MEMBERS.length;
  return {
    id        : 8327 + i,
    file      : hasImage ? db.file : FILE_NAMES_DUMMY[i - IMAGE_DB.length],
    src       : hasImage ? db.src  : null,
    camLabel  : (hasImage ? db.cam : CAM_LABELS[i % 3]) + " · 16-Sep-2025",
    annotator : MEMBERS[memIdx].name,
    role      : MEMBERS[memIdx].role,
    color     : MEMBERS[memIdx].color,
    status    : (i % 4 === 0) ? "pending" : "ready",
    time      : `16-Sep-25 ${String(8 + Math.floor(i/2)).padStart(2,'0')}:${i%2===0?'00':'30'}`,
    annotations: [],          // will be populated by interactive drawing
    _imported : false,
  };
});

// Seed a few pre-existing annotations on the first 4 tasks
function seedRegions(n, hasImage) {
  const types = ["person","vest-on","vest-off"];
  const max   = hasImage ? 3 : 4;
  return Array.from({ length: Math.min(n, max) }, (_, i) => ({
    id   : genId(),
    type : types[i % types.length],
    xPct : 8  + (i * 18) % 55,
    yPct : 10 + (i * 16) % 55,
    wPct : 16 + (i % 3) * 5,
    hPct : 24 + (i % 2) * 8,
  }));
}
tasks.forEach((t, i) => { t.annotations = seedRegions(3 + (i % 3), t.src !== null); });

// ── Label meta ──
const TYPE_LABEL = { person: "Person", "vest-on": "Life Vest: On", "vest-off": "Life Vest: Off" };
const TYPE_CLASS = { person: "person", "vest-on": "on", "vest-off": "off" };
const TYPE_COLOR = { person: "#4A90D9", "vest-on": "#27AE60", "vest-off": "#E74C3C" };

let   activeLabel = "person";
let   annotationsVisible = true;
let   currentIdx  = 0;
let   activeFilter = "all";
let   pendingImports = [];   // blobs for Import modal

function genId() { return '_' + Math.random().toString(36).slice(2, 9); }
function initials(name) { return name.slice(0,2).toUpperCase(); }

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR STATS helpers
// ═══════════════════════════════════════════════════════════
function updateStats() {
  const total   = tasks.length;
  const ready   = tasks.filter(t => t.status === 'ready').length;
  const pending = total - ready;
  const pct     = Math.round((ready / total) * 100);

  document.getElementById('sidebarMeta').innerHTML =
    `${total} tasks total<br>${ready} Ready · ${pending} Pending<br>Dermaga · Sep–Okt 2025`;

  const fill = document.getElementById('projProgFill');
  if (fill) fill.style.width = pct + '%';
  const lbl = document.getElementById('projProgLabel');
  if (lbl) lbl.textContent = `${ready} / ${total} tasks selesai (${pct}%)`;

  // DM subtitle
  const sub = document.getElementById('dmSub');
  if (sub) sub.innerHTML =
    `${total} tasks &nbsp;·&nbsp; <b style="color:var(--green)">${ready} Ready</b> &nbsp;·&nbsp; <b style="color:var(--yellow)">${pending} Pending</b> &nbsp;·&nbsp; /data/cctv-dermaga/`;
}

// ═══════════════════════════════════════════════════════════
// DATA MANAGER
// ═══════════════════════════════════════════════════════════
const PAGE_SIZE = 12;
let dmPage = 1;

function renderTable() {
  const tbody = document.getElementById('dataRows');
  const q     = document.getElementById('dmSearch').value.toLowerCase();
  const rows  = tasks.filter(t => {
    const mf = activeFilter === "all" || t.status === activeFilter;
    const ms = !q || String(t.id).includes(q) || t.annotator.includes(q) || t.file.toLowerCase().includes(q);
    return mf && ms;
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  dmPage = Math.min(dmPage, totalPages);
  const slice = rows.slice((dmPage - 1) * PAGE_SIZE, dmPage * PAGE_SIZE);

  tbody.innerHTML = slice.map(t => {
    const thumb = t.src
      ? `<div class="thumb-cell" style="padding:0;overflow:hidden;"><img src="${t.src}" style="width:100%;height:100%;object-fit:cover;" /></div>`
      : (t._imported && t._blobUrl
          ? `<div class="thumb-cell" style="padding:0;overflow:hidden;"><img src="${t._blobUrl}" style="width:100%;height:100%;object-fit:cover;" /></div>`
          : `<div class="thumb-cell">🖼</div>`);
    return `
    <tr data-idx="${tasks.indexOf(t)}">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td style="color:var(--text-dim);font-variant-numeric:tabular-nums;">${t.id}</td>
      <td style="font-size:11px;color:var(--text-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.file}">${t.file}</td>
      <td>
        <div class="row-flex">
          <span class="avatar" style="background:${t.color};">${initials(t.annotator)}</span>
          <span style="font-size:11px;">${t.annotator}<br><span style="color:var(--text-dim);font-size:10px;">${t.role}</span></span>
        </div>
      </td>
      <td>${thumb}</td>
      <td><span class="status-chip ${t.status}">${t.status === 'ready' ? '✓ Ready' : '⏳ Pending'}</span></td>
      <td style="text-align:center;font-size:11px;">${t.annotations.length}</td>
      <td style="color:var(--text-dim);font-size:11px;">${t.time}</td>
    </tr>`;
  }).join('');

  document.getElementById('paginationInfo').textContent =
    `Menampilkan ${slice.length} dari ${rows.length} tasks`;
  document.getElementById('pgLabel').textContent = `${dmPage}/${totalPages}`;

  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => openLabeling(parseInt(row.dataset.idx)));
  });
}

document.querySelectorAll('[data-filter]').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    activeFilter = pill.dataset.filter;
    dmPage = 1;
    renderTable();
  });
});
document.getElementById('dmSearch').addEventListener('input', () => { dmPage = 1; renderTable(); });
document.getElementById('checkAll').addEventListener('change', function () {
  document.querySelectorAll('#dataRows input[type=checkbox]').forEach(cb => cb.checked = this.checked);
});
document.getElementById('pgPrev').addEventListener('click', () => { dmPage = Math.max(1, dmPage - 1); renderTable(); });
document.getElementById('pgNext').addEventListener('click', () => { dmPage++; renderTable(); });

// ═══════════════════════════════════════════════════════════
// VIEW SWITCHING
// ═══════════════════════════════════════════════════════════
const views = {
  projects : document.getElementById('view-projects'),
  dm       : document.getElementById('view-dm'),
  labeling : document.getElementById('view-labeling'),
  settings : document.getElementById('view-settings'),
  members  : document.getElementById('view-members'),
};

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('shown'));
  if (views[name]) views[name].classList.add('shown');

  document.querySelectorAll('.nav-item[data-view]').forEach(n =>
    n.classList.toggle('active', n.dataset.view === name));
  document.querySelectorAll('.tab[data-view]').forEach(t =>
    t.classList.toggle('active', t.dataset.view === name));

  const sidebar = document.getElementById('sidebar');
  sidebar.style.display = '';    // always show by CSS rules
  if (name === 'labeling') {
    // hide sidebar on all sizes in labeling
    sidebar.classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
  closeSidebar();
}

document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', () => showView(el.dataset.view));
});
document.querySelectorAll('[data-open]').forEach(el => {
  el.addEventListener('click', () => showView(el.dataset.open));
});

// ── Mobile sidebar ──
function openSidebarDrawer() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
document.getElementById('hamburger').addEventListener('click', openSidebarDrawer);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

// ── Settings sub-panes ──
document.querySelectorAll('.s-item[data-pane]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.s-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');
    document.getElementById('pane-' + item.dataset.pane).style.display = 'block';
  });
});

// ═══════════════════════════════════════════════════════════
// LABELING VIEW — INTERACTIVE CANVAS
// ═══════════════════════════════════════════════════════════
document.getElementById('labelAllBtn').addEventListener('click', () => openLabeling(0));
document.getElementById('backFromLabel').addEventListener('click', () => { showView('dm'); renderTable(); updateStats(); });

function openLabeling(idx) {
  currentIdx = Math.max(0, Math.min(idx, tasks.length - 1));
  showView('labeling');
  renderLabelingUI();
}

// ── Render full labeling UI for currentTask ──
function renderLabelingUI() {
  const t = tasks[currentIdx];

  // image / placeholder
  const img  = document.getElementById('canvasImg');
  const ph   = document.getElementById('canvasPlaceholder');
  const blobSrc = t._imported && t._blobUrl ? t._blobUrl : null;
  const imgSrc  = t.src || blobSrc;
  if (imgSrc) {
    img.src            = imgSrc;
    img.style.display  = 'block';
    ph.style.display   = 'none';
  } else {
    img.style.display  = 'none';
    ph.style.display   = 'flex';
  }

  document.getElementById('camLabel').textContent  = t.camLabel;
  document.getElementById('taskCount').textContent = `Task ${currentIdx + 1} / ${tasks.length}`;
  document.getElementById('infoId').textContent    = t.id;
  document.getElementById('infoFile').textContent  = t.file;
  document.getElementById('infoAnnotator').textContent = t.annotator;
  document.getElementById('infoStatus').textContent= t.status === 'ready' ? '✓ Ready' : '⏳ Pending';

  rebuildBboxes();
  rebuildRegionList();
}

// ── Build all bbox DOM elements from task.annotations ──
function rebuildBboxes() {
  const frame = document.getElementById('canvasFrame');
  frame.querySelectorAll('.bbox').forEach(b => b.remove());
  if (!annotationsVisible) return;

  const t = tasks[currentIdx];
  t.annotations.forEach(ann => { frame.appendChild(makeBboxEl(ann)); });
}

function makeBboxEl(ann) {
  const box = document.createElement('div');
  box.className = `bbox ${ann.type}`;
  box.dataset.id = ann.id;
  positionBbox(box, ann);

  const tag = document.createElement('div');
  tag.className = 'bbox-tag';
  tag.textContent = TYPE_LABEL[ann.type];

  const del = document.createElement('div');
  del.className = 'bbox-del';
  del.textContent = '✕';
  del.addEventListener('click', e => {
    e.stopPropagation();
    deleteAnnotation(ann.id);
  });

  box.appendChild(tag);
  box.appendChild(del);
  return box;
}

function positionBbox(el, ann) {
  el.style.left   = ann.xPct + '%';
  el.style.top    = ann.yPct + '%';
  el.style.width  = ann.wPct + '%';
  el.style.height = ann.hPct + '%';
}

function deleteAnnotation(id) {
  const t = tasks[currentIdx];
  t.annotations = t.annotations.filter(a => a.id !== id);
  rebuildBboxes();
  rebuildRegionList();
  showToast('🗑 Anotasi dihapus');
}

function rebuildRegionList() {
  const t = tasks[currentIdx];
  document.getElementById('regionCount').textContent = t.annotations.length;
  document.getElementById('regionList').innerHTML = t.annotations.map((a, i) => `
    <div class="region-card">
      <span class="rid">#${i+1}</span>
      <span class="rtag ${TYPE_CLASS[a.type]}">${TYPE_LABEL[a.type]}</span>
      <span class="rmeta">${a.wPct.toFixed(0)}×${a.hPct.toFixed(0)}%</span>
      <button class="rdel" onclick="deleteAnnotation('${a.id}')">✕</button>
    </div>`).join('');
}

// ── DRAW interaction ──
let drawing = false;
let drawStart = null;
let drawGhost = null;
let currentTool = 'draw';  // 'draw' | 'pan'

const canvasFrame = document.getElementById('canvasFrame');

function getFramePos(e) {
  const rect = canvasFrame.getBoundingClientRect();
  const cx   = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const cy   = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x: cx / rect.width * 100, y: cy / rect.height * 100 };
}

canvasFrame.addEventListener('pointerdown', e => {
  if (currentTool !== 'draw') return;
  e.preventDefault();
  drawing   = true;
  drawStart = getFramePos(e);
  drawGhost = document.createElement('div');
  drawGhost.className = 'draw-ghost';
  drawGhost.style.borderColor = TYPE_COLOR[activeLabel];
  drawGhost.style.background  = TYPE_COLOR[activeLabel] + '22';
  canvasFrame.appendChild(drawGhost);
  canvasFrame.setPointerCapture(e.pointerId);
});

canvasFrame.addEventListener('pointermove', e => {
  if (!drawing || !drawGhost) return;
  const cur  = getFramePos(e);
  const x    = Math.min(drawStart.x, cur.x);
  const y    = Math.min(drawStart.y, cur.y);
  const w    = Math.abs(cur.x - drawStart.x);
  const h    = Math.abs(cur.y - drawStart.y);
  drawGhost.style.left   = x + '%';
  drawGhost.style.top    = y + '%';
  drawGhost.style.width  = w + '%';
  drawGhost.style.height = h + '%';
});

canvasFrame.addEventListener('pointerup', e => {
  if (!drawing) return;
  drawing = false;
  const cur  = getFramePos(e);
  const x    = Math.min(drawStart.x, cur.x);
  const y    = Math.min(drawStart.y, cur.y);
  const w    = Math.abs(cur.x - drawStart.x);
  const h    = Math.abs(cur.y - drawStart.y);
  if (drawGhost) { drawGhost.remove(); drawGhost = null; }

  if (w < 2 || h < 2) return;   // too small, ignore

  const ann = { id: genId(), type: activeLabel, xPct: x, yPct: y, wPct: w, hPct: h };
  tasks[currentIdx].annotations.push(ann);
  canvasFrame.appendChild(makeBboxEl(ann));
  rebuildRegionList();
  showToast(`✓ Bbox ditambahkan — ${TYPE_LABEL[activeLabel]}`);
});

// touch events fallback
canvasFrame.addEventListener('touchstart',  e => { if (currentTool === 'draw') e.preventDefault(); }, { passive: false });

// ── Tool buttons ──
function setTool(tool) {
  currentTool = tool;
  canvasFrame.style.cursor = tool === 'draw' ? 'crosshair' : 'grab';
  document.querySelectorAll('.stage-toolbar .ticon').forEach(i => i.classList.remove('active'));
  document.getElementById(tool === 'draw' ? 'toolDraw' : 'toolPan').classList.add('active');
}

document.getElementById('toolDraw').addEventListener('click', () => setTool('draw'));
document.getElementById('toolPan').addEventListener('click',  () => setTool('pan'));
document.getElementById('toolZoomIn').addEventListener('click',  () => showToast('Gunakan Ctrl+Scroll atau pinch untuk zoom'));
document.getElementById('toolZoomOut').addEventListener('click', () => showToast('Gunakan Ctrl+Scroll atau pinch untuk zoom'));
document.getElementById('toolReset').addEventListener('click',   () => showToast('Zoom di-reset'));
document.getElementById('toolToggle').addEventListener('click',  () => {
  annotationsVisible = !annotationsVisible;
  document.getElementById('toolToggle').classList.toggle('active', !annotationsVisible);
  rebuildBboxes();
  showToast(annotationsVisible ? '👁 Anotasi ditampilkan' : '🙈 Anotasi disembunyikan');
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'b' || e.key === 'B') setTool('draw');
  if (e.key === 'v' || e.key === 'V') setTool('pan');
  if (e.key === 'h' || e.key === 'H') document.getElementById('toolToggle').click();
  if (e.key === 'ArrowRight') nextTask();
  if (e.key === 'ArrowLeft')  prevTask();
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // delete last bbox
    const t = tasks[currentIdx];
    if (t.annotations.length) {
      deleteAnnotation(t.annotations[t.annotations.length - 1].id);
    }
  }
});

// ── Label selection ──
document.querySelectorAll('#labelset .label-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#labelset .label-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    activeLabel = btn.dataset.type;
    setTool('draw');  // auto-switch to draw mode
  });
});

// ── Navigation ──
function nextTask() {
  currentIdx = (currentIdx + 1) % tasks.length;
  renderLabelingUI();
}
function prevTask() {
  currentIdx = (currentIdx - 1 + tasks.length) % tasks.length;
  renderLabelingUI();
}
document.getElementById('prevTask').addEventListener('click', prevTask);
document.getElementById('nextTask').addEventListener('click', nextTask);

// ── Submit / Skip ──
document.getElementById('submitBtn').addEventListener('click', () => {
  tasks[currentIdx].status = 'ready';
  tasks[currentIdx].time   = new Date().toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' });
  showToast('✓ Anotasi berhasil disubmit');
  updateStats();
  nextTask();
});
document.getElementById('skipBtn').addEventListener('click', () => {
  showToast('⏭ Task dilewati');
  nextTask();
});

// ═══════════════════════════════════════════════════════════
// IMPORT — real file upload via <input type=file>
// ═══════════════════════════════════════════════════════════
const importModal   = document.getElementById('importModal');
const fileInput     = document.getElementById('fileInput');
const dropZone      = document.getElementById('dropZone');
const importPreview = document.getElementById('importPreview');

document.getElementById('importBtn').addEventListener('click', () => {
  pendingImports = [];
  importPreview.innerHTML = '';
  document.getElementById('dropText').textContent = '📂 Drag & drop gambar di sini, atau klik untuk memilih file';
  importModal.classList.remove('hidden');
});
document.getElementById('importCancel').addEventListener('click', () => importModal.classList.add('hidden'));
importModal.addEventListener('click', e => { if (e.target === importModal) importModal.classList.add('hidden'); });

fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
});

function handleFiles(files) {
  if (!files.length) return;
  pendingImports = files;
  importPreview.innerHTML = '';
  document.getElementById('dropText').textContent = `${files.length} file dipilih`;
  files.slice(0, 8).forEach(f => {
    const url = URL.createObjectURL(f);
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'width:70px;height:50px;object-fit:cover;border-radius:5px;border:1px solid var(--border);';
    importPreview.appendChild(img);
  });
  if (files.length > 8) {
    const more = document.createElement('div');
    more.style.cssText = 'display:flex;align-items:center;font-size:11px;color:var(--text-dim);';
    more.textContent = `+${files.length - 8} lainnya`;
    importPreview.appendChild(more);
  }
}

document.getElementById('importConfirm').addEventListener('click', () => {
  if (!pendingImports.length) { showToast('⚠ Pilih file terlebih dahulu'); return; }
  const added = [];
  pendingImports.forEach((f, i) => {
    const blobUrl = URL.createObjectURL(f);
    const newTask = {
      id       : 8339 + tasks.length + i,
      file     : f.name,
      src      : null,
      _imported: true,
      _blobUrl : blobUrl,
      camLabel : "Imported · " + f.name,
      annotator: MEMBERS[0].name,
      role     : MEMBERS[0].role,
      color    : MEMBERS[0].color,
      status   : "pending",
      time     : new Date().toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' }),
      annotations: [],
    };
    tasks.push(newTask);
    added.push(newTask);
  });
  importModal.classList.add('hidden');
  pendingImports = [];
  renderTable();
  updateStats();
  showToast(`✓ ${added.length} task berhasil diimport`);
});

// ═══════════════════════════════════════════════════════════
// EXPORT — download annotations as JSON
// ═══════════════════════════════════════════════════════════
document.getElementById('exportBtn').addEventListener('click', () => {
  const exportData = tasks.map(t => ({
    id         : t.id,
    file       : t.file,
    status     : t.status,
    annotator  : t.annotator,
    annotations: t.annotations.map(a => ({
      id    : a.id,
      label : TYPE_LABEL[a.type],
      type  : a.type,
      bbox  : {
        x_pct : +a.xPct.toFixed(4),
        y_pct : +a.yPct.toFixed(4),
        w_pct : +a.wPct.toFixed(4),
        h_pct : +a.hPct.toFixed(4),
      },
    })),
  }));

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `annotations_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  showToast('⬇ Export berhasil — annotations.json');
});

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
renderTable();
updateStats();
showView('dm');