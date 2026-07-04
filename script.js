// ═══════════════════════════════════════
// DATA
// ═══════════════════════════════════════

const MEMBERS = [
  { name: "naura.isitah",   role: "Annotator", color: "#4A90D9" },
  { name: "rayyan.gibran",  role: "Reviewer",  color: "#27AE60" },
  { name: "athaya.misykah", role: "Manager",   color: "#ff7557" },
];

// ═══════════════════════════════════════
// DATABASE GAMBAR
// Path relatif — letakkan img 1.jpg s/d img 4.jpg
// di folder yang sama dengan file HTML ini.
// ═══════════════════════════════════════
const IMAGE_DB = [
  { file: "img 1.jpg", src: "img 1.jpeg", cam: "CAM-01 · Dermaga Timur" },
  { file: "img 2.jpg", src: "img 2.jpeg", cam: "CAM-02 · Dermaga Tengah" },
  { file: "img 3.jpg", src: "img 3.jpeg", cam: "CAM-03 · Dermaga Barat" },
  { file: "img 4.jpg", src: "img 4.jpeg", cam: "CAM-01 · Dermaga Timur" },
    { file: "img 1.jpg", src: "img 1.jpeg", cam: "CAM-01 · Dermaga Timur" },
  { file: "img 2.jpg", src: "img 2.jpeg", cam: "CAM-02 · Dermaga Tengah" },
  { file: "img 3.jpg", src: "img 3.jpeg", cam: "CAM-03 · Dermaga Barat" },
  { file: "img 4.jpg", src: "img 4.jpeg", cam: "CAM-01 · Dermaga Timur" },
    { file: "img 1.jpg", src: "img 1.jpeg", cam: "CAM-01 · Dermaga Timur" },
  { file: "img 2.jpg", src: "img 2.jpeg", cam: "CAM-02 · Dermaga Tengah" },
  { file: "img 3.jpg", src: "img 3.jpeg", cam: "CAM-03 · Dermaga Barat" },
  { file: "img 4.jpg", src: "img 4.jpeg", cam: "CAM-01 · Dermaga Timur" },
];


const CAM_LABELS = [
  "CAM-01 · Dermaga Timur",
  "CAM-02 · Dermaga Tengah",
  "CAM-03 · Dermaga Barat",
];

// Buat 12 tasks: 4 pertama pakai gambar nyata dari IMAGE_DB
const tasks = Array.from({ length: 12 }, (_, i) => {
  const memberIdx = i % MEMBERS.length;
  const isPending = (i % 4 === 0);
  const objCount  = 3 + (i % 5);

  // Task 1–4: gunakan gambar dari IMAGE_DB
  const hasImage = i < IMAGE_DB.length;
  const dbEntry  = hasImage ? IMAGE_DB[i] : null;

  return {
    id        : 8327 + i,
    file      : hasImage ? dbEntry.file : FILE_NAMES_DUMMY[i - IMAGE_DB.length],
    src       : hasImage ? dbEntry.src  : null,   // path gambar (null = placeholder)
    camLabel  : (hasImage ? dbEntry.cam : CAM_LABELS[i % 3]) + " · 16-Sep-2025",
    annotator : MEMBERS[memberIdx].name,
    role      : MEMBERS[memberIdx].role,
    color     : MEMBERS[memberIdx].color,
    status    : isPending ? "pending" : "ready",
    objects   : objCount,
    time      : `16-Sep-25 ${String(8 + Math.floor(i/2)).padStart(2,'0')}:${i%2===0?'00':'30'}`,
    regions   : buildRegions(objCount),
  };
});

function buildRegions(n) {
  const types = ["person", "vest-on", "vest-off"];
  return Array.from({ length: n }, (_, i) => ({
    type : types[i % types.length],
    x    : 10 + (i * 68) % 460,
    y    : 25 + (i * 50) % 250,
    w    : 85 + (i % 3) * 22,
    h    : 105 + (i % 2) * 35,
  }));
}

const TYPE_LABEL = { person: "Person", "vest-on": "Life Vest: On", "vest-off": "Life Vest: Off" };
const TYPE_CLASS = { person: "person", "vest-on": "on",  "vest-off": "off" };

function initials(name) { return name.slice(0, 2).toUpperCase(); }

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ═══════════════════════════════════════
// DATA MANAGER — render table
// ═══════════════════════════════════════
let activeFilter = "all";

function renderTable(filter) {
  const tbody = document.getElementById('dataRows');
  const q     = document.getElementById('dmSearch').value.toLowerCase();
  const rows  = tasks.filter(t => {
    const matchFilter = filter === "all" || t.status === filter;
    const matchSearch = !q || t.annotator.includes(q) || String(t.id).includes(q) || t.file.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  tbody.innerHTML = rows.map((t, idx) => `
    <tr data-idx="${tasks.indexOf(t)}">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td style="font-variant-numeric:tabular-nums;color:var(--text-dim);">${t.id}</td>
      <td style="font-size:12px;color:var(--text-dim);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.file}">${t.file}</td>
      <td>
        <div class="row-flex">
          <span class="avatar" style="background:${t.color};">${initials(t.annotator)}</span>
          <span style="font-size:12px;">${t.annotator}<br><span style="color:var(--text-dim);font-size:11px;">${t.role}</span></span>
        </div>
      </td>
      <td>${t.src
        ? `<div class="thumb-cell" style="padding:0;overflow:hidden;"><img src="${t.src}" style="width:100%;height:100%;object-fit:cover;border-radius:5px;" /></div>`
        : `<div class="thumb-cell">🖼</div>`
      }</td>
      <td><span class="status-chip ${t.status}">${t.status === 'ready' ? '✓ Ready' : '⏳ Pending'}</span></td>
      <td style="text-align:center;font-size:12px;">${t.objects}</td>
      <td style="color:var(--text-dim);font-size:12px;">${t.time}</td>
    </tr>
  `).join('');

  document.getElementById('paginationInfo').textContent =
    `Menampilkan ${rows.length} dari ${tasks.length} tasks`;

  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => openLabeling(parseInt(row.dataset.idx)));
  });
}

// Filter pills
document.querySelectorAll('[data-filter]').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    activeFilter = pill.dataset.filter;
    renderTable(activeFilter);
  });
});

document.getElementById('dmSearch').addEventListener('input', () => renderTable(activeFilter));
document.getElementById('checkAll').addEventListener('change', function () {
  document.querySelectorAll('#dataRows input[type=checkbox]').forEach(cb => cb.checked = this.checked);
});

renderTable("all");

// ═══════════════════════════════════════
// VIEW SWITCHING
// ═══════════════════════════════════════
const views = {
  projects : document.getElementById('view-projects'),
  dm       : document.getElementById('view-dm'),
  labeling : document.getElementById('view-labeling'),
  settings : document.getElementById('view-settings'),
  members  : document.getElementById('view-members'),
};

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('shown'));
  views[name].classList.add('shown');

  document.querySelectorAll('.nav-item[data-view]').forEach(n =>
    n.classList.toggle('active', n.dataset.view === name));
  document.querySelectorAll('.tab[data-view]').forEach(t =>
    t.classList.toggle('active', t.dataset.view === name));

  // Sembunyikan sidebar di labeling view (full-screen)
  document.getElementById('sidebar').style.display = name === 'labeling' ? 'none' : 'flex';
}

document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', () => showView(el.dataset.view));
});

document.querySelectorAll('[data-open]').forEach(el => {
  el.addEventListener('click', () => showView(el.dataset.open));
});

document.getElementById('labelAllBtn').addEventListener('click', () => openLabeling(0));
document.getElementById('backFromLabel').addEventListener('click', () => showView('dm'));

// ═══════════════════════════════════════
// SETTINGS — sub-pane switching
// ═══════════════════════════════════════
document.querySelectorAll('.s-item[data-pane]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.s-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');
    document.getElementById('pane-' + item.dataset.pane).style.display = 'block';
  });
});

// ═══════════════════════════════════════
// LABELING VIEW
// ═══════════════════════════════════════
let currentIdx = 0;

function openLabeling(idx) {
  currentIdx = idx;
  renderLabeling();
  showView('labeling');
}

function renderLabeling() {
  const t = tasks[currentIdx];

  // Update canvas label
  document.getElementById('camLabel').textContent = t.camLabel;

  // ── Tampilkan gambar atau placeholder ──
  const canvasImg   = document.getElementById('canvasImg');
  const placeholder = document.getElementById('canvasPlaceholder');
  if (t.src) {
    canvasImg.src              = t.src;
    canvasImg.style.display    = 'block';
    placeholder.style.display  = 'none';
  } else {
    canvasImg.style.display    = 'none';
    placeholder.style.display  = 'flex';
  }

  // Clear existing bboxes
  document.querySelectorAll('#canvasFrame .bbox').forEach(b => b.remove());

  // Draw bounding boxes
  t.regions.forEach((r, i) => {
    const box = document.createElement('div');
    box.className = `bbox ${r.type}`;
    box.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;`;

    const tag = document.createElement('div');
    tag.className = 'bbox-tag';
    tag.textContent = TYPE_LABEL[r.type];
    box.appendChild(tag);

    document.getElementById('canvasFrame').appendChild(box);
  });

  // Regions list
  document.getElementById('regionList').innerHTML = t.regions.map((r, i) => `
    <div class="region-card">
      <span class="rid" style="color:var(--text-dim);">#${i+1}</span>
      <span class="rtag ${TYPE_CLASS[r.type]}">${TYPE_LABEL[r.type]}</span>
      <span class="rmeta">${r.w}×${r.h}px</span>
    </div>
  `).join('');
  document.getElementById('regionCount').textContent = t.regions.length;

  // Task info
  document.getElementById('taskCount').textContent = `Task ${currentIdx + 1} / ${tasks.length}`;
  document.getElementById('infoId').textContent      = t.id;
  document.getElementById('infoFile').textContent    = t.file;
  document.getElementById('infoAnnotator').textContent = t.annotator;
  document.getElementById('infoRole').textContent    = t.role;
  document.getElementById('infoStatus').textContent  = t.status === 'ready' ? '✓ Ready' : '⏳ Pending';
  document.getElementById('infoTime').textContent    = t.time;
}

document.getElementById('prevTask').addEventListener('click', () => {
  currentIdx = (currentIdx - 1 + tasks.length) % tasks.length;
  renderLabeling();
});
document.getElementById('nextTask').addEventListener('click', () => {
  currentIdx = (currentIdx + 1) % tasks.length;
  renderLabeling();
});

document.getElementById('submitBtn').addEventListener('click', () => {
  tasks[currentIdx].status = 'ready';
  showToast('✓ Anotasi berhasil disubmit');
  renderTable(activeFilter);
  currentIdx = (currentIdx + 1) % tasks.length;
  renderLabeling();
});

document.getElementById('skipBtn').addEventListener('click', () => {
  currentIdx = (currentIdx + 1) % tasks.length;
  renderLabeling();
});

// Label set toggle
document.querySelectorAll('.label-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.label-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// Stage toolbar toggle
document.querySelectorAll('.stage-toolbar .ticon').forEach(icon => {
  icon.addEventListener('click', () => {
    document.querySelectorAll('.stage-toolbar .ticon').forEach(i => i.classList.remove('active'));
    icon.classList.add('active');
  });
});

// Init
showView('dm');