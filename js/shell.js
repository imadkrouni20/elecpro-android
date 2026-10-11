import { createCAD } from './cad.js';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const store = {
  projects: [],
  load(){
    try { const d = JSON.parse(localStorage.getItem('elecstudio') || '{}'); Object.assign(this, d); } catch(e){}
  },
  save(){
    try { localStorage.setItem('elecstudio', JSON.stringify({ projects: this.projects })); } catch(e){}
  }
};
store.load();

const PAGE_TITLES = {
  wizard: 'مشروع جديد', cad: 'المخطط 2D', view3d: 'المشهد 3D',
  wall: 'محرر الحائط', electrical: 'الحسابات الكهربائية',
  components: 'مكتبة المكونات', reports: 'التقارير',
  projects: 'المشاريع', settings: 'الإعدادات'
};

function navigate(to){
  if(!to) return;
  // إذا كانت هناك شاشة مخصصة بنفس الاسم، استخدمها
  const dedicated = document.getElementById('s-' + to);
  const dash = $('#s-dash');
  const page = $('#s-page');

  if(to === 'dash'){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    dash.classList.add('active');
    return;
  }
  if(dedicated && dedicated.id !== 's-page'){
    // شاشة مخصصة موجودة
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    dedicated.classList.add('active');
    if(to === 'cad') setTimeout(initCAD, 80);
    if(to === 'view3d') setTimeout(init3D, 80);
    return;
  }
  // fallback: الشاشة العامة
  $('#pageTitle').textContent = PAGE_TITLES[to] || 'صفحة';
  $('#pageBody').innerHTML = renderPlaceholder(to);
  dash.classList.remove('active');
  page.classList.add('active');
  $('#pageBody').scrollTop = 0;
}
window.navigate = navigate;

function renderPlaceholder(kind){
  const cards = {
    wizard: ['📐', 'إنشاء مشروع جديد', 'خطوات متتالية لبناء البناية'],
    cad: ['✏️', 'محرر المخطط', 'رسم الجدران، الأبواب، النوافذ، القياسات'],
    view3d: ['🏢', 'المشهد ثلاثي الأبعاد', 'عرض تفاعلي للبناية والمكونات'],
    wall: ['🧱', 'محرر الحائط', 'إضافة المكونات على الوجهين A/B'],
    electrical: ['⚡', 'الحسابات الكهربائية', 'الأحمال، التيار، المقطع، القواطع'],
    components: ['🔌', 'مكتبة المكونات', 'Ingelec، Schneider، Legrand'],
    reports: ['📊', 'التقارير', 'BOM، التكاليف، التصدير'],
    projects: ['📁', 'المشاريع', 'قائمة مشاريعك المحفوظة'],
    settings: ['⚙️', 'الإعدادات', 'الوحدات، اللغة، النسخ الاحتياطي']
  };
  const c = cards[kind] || ['📄', 'صفحة', ''];
  return '<div class="fade-in" style="text-align:center;padding:60px 20px;">' +
    '<div style="font-size:60px;margin-bottom:16px;opacity:.5">' + c[0] + '</div>' +
    '<h2 style="font-size:18px;font-weight:700;margin-bottom:8px">' + c[1] + '</h2>' +
    '<p style="font-size:13px;color:var(--text-dim);line-height:1.6">' + c[2] + '</p>' +
    '<p style="font-size:11px;color:var(--text-mute);margin-top:24px">هذه الشاشة ستُبنى في الجلسة القادمة</p>' +
    '</div>';
}

function toast(msg, kind){
  kind = kind || 'info';
  const host = $('#toastHost');
  if(!host) return;
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = '<div class="dot"></div><span>' + msg + '</span>';
  host.appendChild(el);
  setTimeout(function(){
    el.classList.add('out');
    setTimeout(function(){ el.remove(); }, 300);
  }, 2200);
}
window.toast = toast;

function openSheet(title, bodyHTML, onMount){
  const host = $('#sheetHost');
  if(!host) return function(){};
  host.innerHTML =
    '<div class="sheet-backdrop"></div>' +
    '<div class="sheet">' +
      '<div class="sheet-grab"></div>' +
      '<div class="sheet-head"><h3>' + title + '</h3><button data-close>✕</button></div>' +
      '<div class="sheet-body">' + bodyHTML + '</div>' +
    '</div>';
  requestAnimationFrame(function(){ host.classList.add('active'); });
  const close = function(){
    host.classList.remove('active');
    setTimeout(function(){ host.innerHTML = ''; }, 400);
  };
  host.querySelector('.sheet-backdrop').onclick = close;
  host.querySelector('[data-close]').onclick = close;
  if(onMount) onMount(host.querySelector('.sheet-body'), close);
  return close;
}
window.openSheet = openSheet;

document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-nav]');
  if(!btn) return;
  e.preventDefault();
  const to = btn.dataset.nav;
  if(btn.classList.contains('nav-btn')){
    $$('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
    if(!btn.classList.contains('fab')) btn.classList.add('active');
  }
  navigate(to);
});

function animateNumber(el, target){
  if(!el) return;
  let cur = 0;
  const dur = 900, start = performance.now();
  function step(t){
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    cur = Math.round(target * eased);
    el.textContent = cur;
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

let cad = null;

function initCAD(){
  if(cad) return;
  const canvas = document.getElementById('cadCanvas');
  if(!canvas) return;
  cad = createCAD(canvas, {
    onStatus: function(p){
      const el = document.getElementById('cadCoord');
      if(el) el.textContent = 'X: ' + p.x.toFixed(2) + ' | Z: ' + p.z.toFixed(2);
    },
    onSelect: function(){ refreshCADProps(); updateCADCount(); },
    onChange: function(){ updateCADCount(); saveCAD(); }
  });
  document.getElementById('cadTools').addEventListener('click', function(e){
    const btn = e.target.closest('button[data-tool]');
    if(!btn) return;
    if(cad.S.draft.length) cad.commitDraft();
    document.querySelectorAll('#cadTools button').forEach(function(x){ x.classList.remove('active'); });
    btn.classList.add('active');
    cad.S.tool = btn.dataset.tool;
    cad.S.sel = null;
    refreshCADProps();
    const hints = {
      select: 'انقر على عنصر لاختياره',
      wall: 'ارسم الجدران — 90° تلقائيًا — ✓ إنهاء',
      room: 'انقر الرؤوس — ✓ إنهاء',
      door: 'انقر على جدار لإضافة باب',
      window: 'انقر على جدار لإضافة نافذة',
      dim: 'نقطتان لقياس المسافة',
      del: 'انقر لحذف عنصر'
    };
    document.getElementById('cadHint').textContent = hints[btn.dataset.tool] || '';
    cad.render();
  });
  document.getElementById('cadOptions').addEventListener('click', function(e){
    const btn = e.target.closest('button[data-opt]');
    if(!btn) return;
    const k = btn.dataset.opt;
    cad.S.opt[k] = !cad.S.opt[k];
    btn.classList.toggle('active', cad.S.opt[k]);
    cad.render();
  });
  document.getElementById('cadUndo').onclick = function(){ cad.undo(); };
  document.getElementById('cadRedo').onclick = function(){ cad.redo(); };
  document.getElementById('cadFit').onclick = function(){ cad.fit(); };
  document.getElementById('cadZoomIn').onclick = function(){ cad.zoom(1.25); };
  document.getElementById('cadZoomOut').onclick = function(){ cad.zoom(0.8); };
  addExtraCADButtons();
  setTimeout(function(){ cad.resize(); cad.render(); }, 30);
}

function addExtraCADButtons(){
  const bar = document.getElementById('cadOptions');
  if(!bar) return;
  if(!document.getElementById('cadDetect')){
    const b = document.createElement('button');
    b.id = 'cadDetect';
    b.textContent = '🔍 كشف';
    b.style.color = 'var(--green)';
    b.onclick = function(){ if(cad) cad.detectRooms(); };
    bar.appendChild(b);
  }
  if(!document.getElementById('cadFinish')){
    const b = document.createElement('button');
    b.id = 'cadFinish';
    b.textContent = '✓ إنهاء';
    b.style.cssText = 'background:var(--green);color:#fff;border-color:transparent';
    b.onclick = function(){ if(cad) cad.commitDraft(); };
    bar.appendChild(b);
  }
  if(!document.getElementById('cadClear')){
    const b = document.createElement('button');
    b.id = 'cadClear';
    b.textContent = '🗑 مسح';
    b.style.color = 'var(--red)';
    b.onclick = function(){
      if(!cad) return;
      if(confirm('حذف كل العناصر؟')) cad.clearAll();
    };
    bar.appendChild(b);
  }
}

function refreshCADProps(){
  const panel = document.getElementById('cadProps');
  if(!panel || !cad) return;
  const o = cad.getSel();
  const sel = cad.S.sel;
  if(!o || !sel){ panel.classList.remove('active'); panel.innerHTML = ''; return; }
  panel.classList.add('active');
  if(sel.kind === 'wall'){
    panel.innerHTML =
      '<div class="ptitle">🧱 جدار <button id="cadDel">✖</button></div>' +
      '<label>سماكة <input type="number" id="cadWT" value="' + (o.t || 0.2).toFixed(2) + '" step="0.05" min="0.05" max="0.6"></label>' +
      '<label>ارتفاع <input type="number" id="cadWH" value="' + (o.h || 2.8).toFixed(2) + '" step="0.1" min="2" max="5"></label>' +
      '<label>طول <input value="' + Math.hypot(o.x2-o.x1, o.z2-o.z1).toFixed(2) + '" readonly></label>';
    document.getElementById('cadWT').oninput = function(e){ cad.updateSel('t', parseFloat(e.target.value) || 0.2); };
    document.getElementById('cadWH').oninput = function(e){ cad.updateSel('h', parseFloat(e.target.value) || 2.8); };
    document.getElementById('cadDel').onclick = function(){ cad.deleteSel(); };
  } else if(sel.kind === 'opening'){
    const kindName = o.kind === 'door' ? '🚪 باب' : '🪟 نافذة';
    panel.innerHTML =
      '<div class="ptitle">' + kindName + ' <button id="cadDel">✖</button></div>' +
      '<label>عرض <input type="number" id="cadOW" value="' + (o.w || 0.9).toFixed(2) + '" step="0.1" min="0.4" max="3"></label>' +
      '<label>ارتفاع <input type="number" id="cadOH" value="' + (o.h || 2.1).toFixed(2) + '" step="0.1" min="0.6" max="2.5"></label>';
    document.getElementById('cadOW').oninput = function(e){ cad.updateSel('w', parseFloat(e.target.value) || 0.9); };
    document.getElementById('cadOH').oninput = function(e){ cad.updateSel('h', parseFloat(e.target.value) || 2.1); };
    document.getElementById('cadDel').onclick = function(){ cad.deleteSel(); };
  } else if(sel.kind === 'room'){
    const area = polyArea(o.points);
    panel.innerHTML =
      '<div class="ptitle">▢ غرفة <button id="cadDel">✖</button></div>' +
      '<label>الاسم <input type="text" id="cadRN" value="' + (o.name || '') + '"></label>' +
      '<label>مساحة <input value="' + area.toFixed(2) + ' م²" readonly></label>';
    document.getElementById('cadRN').oninput = function(e){ o.name = e.target.value; cad.render(); };
    document.getElementById('cadDel').onclick = function(){ cad.deleteSel(); };
  }
}

function polyArea(pts){
  let a = 0;
  for(let i = 0; i < pts.length; i++){
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].z - pts[j].x * pts[i].z;
  }
  return Math.abs(a) / 2;
}

function updateCADCount(){
  if(!cad) return;
  const total = cad.data.walls.length + cad.data.rooms.length + cad.data.openings.length + cad.data.dims.length;
  const el = document.getElementById('cadCount');
  if(el) el.textContent = total + ' عنصر';
}

function saveCAD(){
  if(!cad) return;
  try { localStorage.setItem('elecstudio-cad', JSON.stringify(cad.data)); } catch(e){}
}

window.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    const splash = document.getElementById('splash');
    const dash = document.getElementById('s-dash');
    if(splash) splash.classList.add('hide');
    if(dash) dash.classList.add('active');
    animateNumber(document.getElementById('statProjects'), store.projects.length);
    animateNumber(document.getElementById('statCircuits'), 0);
    animateNumber(document.getElementById('statKw'), 0);
  }, 1600);
});


/* ============ 3D Viewer (dynamic import) ============ */
let v3d = null;
let v3dLoading = false;

async function init3D(){
  if(v3d){ 
    setTimeout(function(){ v3d.resize(); v3d.buildFromData(); }, 60);
    return;
  }
  if(v3dLoading) return;
  v3dLoading = true;
  const sub = document.getElementById('v3dSub');
  if(sub) sub.textContent = 'جارٍ تحميل محرك 3D...';
  try {
    const mod = await import('./view3d.js');
    const canvas = document.getElementById('v3dCanvas');
    if(!canvas) { v3dLoading = false; return; }
    v3d = mod.create3DViewer(canvas, {
      getData: function(){
        return cad && cad.data ? cad.data : { walls: [], rooms: [], openings: [] };
      },
      onPick: function(pick){
        if(pick.kind === 'wall' || pick.kind === 'wallFace'){
          toast('جدار مُحدد — افتح محرر الحائط', 'info');
        } else if(pick.kind === 'ceil'){
          toast('سقف مُحدد — افتح محرر السقف', 'info');
        }
      }
    });
    const f = document.getElementById('v3dFit');
    if(f) f.onclick = function(){ if(v3d) v3d.fitView(); };
    const r = document.getElementById('v3dRebuild');
    if(r) r.onclick = function(){ if(v3d){ v3d.buildFromData(); toast('تم إعادة البناء', 'success'); } };
    setTimeout(function(){ v3d.resize(); v3d.buildFromData(); }, 100);
    if(sub) sub.textContent = 'انقر على جدار أو سقف';
  } catch(err){
    console.error('3D load failed:', err);
    if(sub) sub.textContent = 'فشل تحميل 3D — تحقق من الاتصال';
    toast('تعذّر تحميل محرك 3D', 'error');
  }
  v3dLoading = false;
}

console.log('✔ ElecStudio shell ready');
