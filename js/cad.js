/* ============ ElecStudio — CAD Engine ============ */
export function createCAD(canvas, opts = {}){
  const ctx = canvas.getContext('2d');
  const onStatus = opts.onStatus || (() => {});
  const onSelect = opts.onSelect || (() => {});
  const onChange = opts.onChange || (() => {});

  /* ============ الحالة ============ */
  const S = {
    scale: 45, panX: 0, panY: 0,
    tool: 'select',
    draft: [],
    cursor: { x: 0, z: 0, snap: null },
    sel: null,
    opt: { grid: true, snap: true, ortho: false, dims: true, labels: true },
    gridStep: 0.5
  };
  const data = { walls: [], rooms: [], openings: [], dims: [] };
  const history = { stack: [], idx: -1 };
  let panning = false, panStart = null;
  let pinch = null, touches = 0;
  let downPos = null, moved = false;

  /* ============ Resize ============ */
  function resize(){
    const r = canvas.getBoundingClientRect();
    if(r.width < 1 || r.height < 1) return;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }
  new ResizeObserver(resize).observe(canvas);

  /* ============ إحداثيات ============ */
  function toScreen(mx, mz){
    const r = canvas.getBoundingClientRect();
    return {
      x: r.width/2 + (mx - S.panX) * S.scale,
      y: r.height/2 + (mz - S.panY) * S.scale
    };
  }
  function toWorld(sx, sy){
    const r = canvas.getBoundingClientRect();
    return {
      x: (sx - r.width/2) / S.scale + S.panX,
      z: (sy - r.height/2) / S.scale + S.panY
    };
  }

  /* ============ Snapping ============ */
  function snapPoint(p){
    if(!S.opt.snap) return { x: p.x, z: p.z, snap: null };
    const tol = 14 / S.scale;
    // endpoints
    for(const w of data.walls){
      for(const e of [[w.x1,w.z1],[w.x2,w.z2]]){
        if(Math.hypot(p.x-e[0], p.z-e[1]) < tol)
          return { x: e[0], z: e[1], snap: 'end' };
      }
    }
    // midpoints
    for(const w of data.walls){
      const mx = (w.x1+w.x2)/2, mz = (w.z1+w.z2)/2;
      if(Math.hypot(p.x-mx, p.z-mz) < tol)
        return { x: mx, z: mz, snap: 'mid' };
    }
    // grid
    if(S.opt.grid){
      const g = S.gridStep;
      return { x: Math.round(p.x/g)*g, z: Math.round(p.z/g)*g, snap: 'grid' };
    }
    return { x: p.x, z: p.z, snap: null };
  }
  function constrain90(from, to){
    if(!S.opt.ortho && S.tool === 'wall'){ /* still constrain walls */
      const dx = Math.abs(to.x - from.x), dz = Math.abs(to.z - from.z);
      if(dx >= dz) return { x: to.x, z: from.z, snap: '90H' };
      return { x: from.x, z: to.z, snap: '90V' };
    }
    if(!S.opt.ortho) return to;
    const dx = Math.abs(to.x - from.x), dz = Math.abs(to.z - from.z);
    if(dx >= dz) return { x: to.x, z: from.z, snap: '90H' };
    return { x: from.x, z: to.z, snap: '90V' };
  }

  /* ============ Render ============ */
  function render(){
    const r = canvas.getBoundingClientRect();
    const W = r.width, H = r.height;
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, W, H);
    if(S.opt.grid) drawGrid(W, H);
    drawRooms();
    drawWalls();
    drawOpenings();
    if(S.opt.dims) drawDims();
    if(S.draft.length) drawDraft();
    drawSelection();
    drawCursor();
  }

  function drawGrid(W, H){
    const s = S.scale, g = S.gridStep, step = g * s;
    if(step < 5) return;
    const x0 = ((W/2 - S.panX * s) % step + step) % step;
    const y0 = ((H/2 - S.panY * s) % step + step) % step;

    // minor grid
    ctx.strokeStyle = '#0f1622';
    ctx.lineWidth = 1;
    for(let x = x0; x < W; x += step){
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for(let y = y0; y < H; y += step){
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // major grid every 1m
    const big = s * 1;
    if(big > 15){
      const bx0 = ((W/2 - S.panX * s) % big + big) % big;
      const by0 = ((H/2 - S.panY * s) % big + big) % big;
      ctx.strokeStyle = '#1a2436';
      for(let x = bx0; x < W; x += big){
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for(let y = by0; y < H; y += big){
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }
    // axes
    ctx.strokeStyle = 'rgba(0,212,255,.25)';
    ctx.lineWidth = 1;
    const o = toScreen(0, 0);
    ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();

    // rulers
    drawRulerX(W, s);
    drawRulerY(H, s);
  }
  function drawRulerX(W, s){
    ctx.fillStyle = '#3a4a5e';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const start = Math.ceil(S.panX - (W/2)/s);
    const end = Math.floor(S.panX + (W/2)/s);
    for(let m = start; m <= end; m++){
      const p = toScreen(m, 0);
      ctx.fillText(m + 'م', p.x, 12);
    }
  }
  function drawRulerY(H, s){
    ctx.fillStyle = '#3a4a5e';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    const start = Math.ceil(S.panY - (H/2)/s);
    const end = Math.floor(S.panY + (H/2)/s);
    for(let m = start; m <= end; m++){
      const p = toScreen(0, m);
      ctx.fillText(m + 'م', 26, p.y + 3);
    }
  }

  function drawWalls(){
    for(const w of data.walls){
      const a = toScreen(w.x1, w.z1), b = toScreen(w.x2, w.z2);
      const isSel = S.sel && S.sel.kind === 'wall' && S.sel.id === w.id;
      const th = (w.t || 0.2) * S.scale;
      // shadow / body
      ctx.strokeStyle = isSel ? '#7c5cff' : '#c8d2de';
      ctx.lineWidth = th;
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // centerline
      ctx.strokeStyle = isSel ? 'rgba(124,92,255,.5)' : 'rgba(200,210,222,.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // endpoints
      ctx.fillStyle = isSel ? '#7c5cff' : '#00d4ff';
      for(const p of [a, b]){
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0e1a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isSel ? '#7c5cff' : '#00d4ff';
      }
    }
  }
  function drawRooms(){
    for(const rm of data.rooms){
      if(rm.points.length < 3) continue;
      const isSel = S.sel && S.sel.kind === 'room' && S.sel.id === rm.id;
      ctx.beginPath();
      const p0 = toScreen(rm.points[0].x, rm.points[0].z);
      ctx.moveTo(p0.x, p0.y);
      for(let i = 1; i < rm.points.length; i++){
        const p = toScreen(rm.points[i].x, rm.points[i].z);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if(isSel){
        grad.addColorStop(0, 'rgba(124,92,255,.15)');
        grad.addColorStop(1, 'rgba(0,212,255,.08)');
      } else {
        grad.addColorStop(0, 'rgba(16,217,128,.08)');
        grad.addColorStop(1, 'rgba(0,212,255,.04)');
      }
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = isSel ? '#7c5cff' : 'rgba(16,217,128,.4)';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      if(S.opt.labels){
        const cx = rm.points.reduce((s, p) => s + p.x, 0) / rm.points.length;
        const cz = rm.points.reduce((s, p) => s + p.z, 0) / rm.points.length;
        const area = polygonArea(rm.points);
        const p = toScreen(cx, cz);
        ctx.fillStyle = '#e8eef7';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(rm.name || 'غرفة', p.x, p.y - 6);
        ctx.fillStyle = '#8899ad';
        ctx.font = '10px system-ui';
        ctx.fillText(area.toFixed(1) + ' م²', p.x, p.y + 9);
      }
    }
  }
  function drawOpenings(){
    for(const op of data.openings){
      const w = data.walls.find(x => x.id === op.wallId);
      if(!w) continue;
      const cx = w.x1 + (w.x2 - w.x1) * op.t;
      const cz = w.z1 + (w.z2 - w.z1) * op.t;
      const p = toScreen(cx, cz);
      const ang = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);
      const isSel = S.sel && S.sel.kind === 'opening' && S.sel.id === op.id;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      const wpx = (op.w || 0.9) * S.scale;
      if(op.kind === 'door'){
        ctx.strokeStyle = isSel ? '#7c5cff' : '#ffb84d';
        ctx.lineWidth = isSel ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(-wpx/2, 0);
        ctx.lineTo(wpx/2, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-wpx/2, 0, wpx, -Math.PI/2, 0);
        ctx.stroke();
      } else {
        ctx.strokeStyle = isSel ? '#7c5cff' : '#00d4ff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-wpx/2, -4); ctx.lineTo(wpx/2, -4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-wpx/2, 4); ctx.lineTo(wpx/2, 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-wpx/2, -4); ctx.lineTo(-wpx/2, 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wpx/2, -4); ctx.lineTo(wpx/2, 4); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawDims(){
    for(const d of data.dims){
      const a = toScreen(d.x1, d.z1), b = toScreen(d.x2, d.z2);
      const len = Math.hypot(d.x2 - d.x1, d.z2 - d.z1);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const off = 24;
      const nx = Math.sin(ang) * off, ny = -Math.cos(ang) * off;
      ctx.strokeStyle = '#4a8fd9';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + nx * 1.4, a.y + ny * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + nx * 1.4, b.y + ny * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.x + nx, a.y + ny); ctx.lineTo(b.x + nx, b.y + ny); ctx.stroke();
      // ticks
      for(const [px, py] of [[a.x, a.y], [b.x, b.y]]){
        ctx.beginPath();
        ctx.moveTo(px + nx - 4, py + ny);
        ctx.lineTo(px + nx + 4, py + ny);
        ctx.stroke();
      }
      const mx = (a.x + b.x)/2 + nx, my = (a.y + b.y)/2 + ny;
      const txt = len.toFixed(2) + ' م';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(mx - tw/2 - 5, my - 8, tw + 10, 16);
      ctx.strokeStyle = '#4a8fd9';
      ctx.strokeRect(mx - tw/2 - 5, my - 8, tw + 10, 16);
      ctx.fillStyle = '#00d4ff';
      ctx.fillText(txt, mx, my + 3);
    }
    if(S.tempDim){
      const a = toScreen(S.tempDim.x1, S.tempDim.z1);
      const b = toScreen(S.cursor.x, S.cursor.z);
      ctx.strokeStyle = '#10d980';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
      const len = Math.hypot(S.cursor.x - S.tempDim.x1, S.cursor.z - S.tempDim.z1);
      ctx.fillStyle = '#10d980';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(len.toFixed(2) + ' م', b.x + 10, b.y - 10);
    }
  }
  function drawDraft(){
    const pts = S.draft;
    ctx.strokeStyle = '#10d980';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);
    for(let i = 0; i < pts.length - 1; i++){
      const a = toScreen(pts[i].x, pts[i].z), b = toScreen(pts[i+1].x, pts[i+1].z);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    const last = pts[pts.length - 1];
    const p = toScreen(last.x, last.z);
    const c = toScreen(S.cursor.x, S.cursor.z);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    ctx.setLineDash([]);
    // points
    for(const pt of pts){
      const sp = toScreen(pt.x, pt.z);
      ctx.fillStyle = '#10d980';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0e1a';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    // live length
    const d = Math.hypot(S.cursor.x - last.x, S.cursor.z - last.z);
    ctx.fillStyle = '#10d980';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(d.toFixed(2) + ' م', c.x + 12, c.y - 12);
  }
  function drawSelection(){
    if(!S.sel || S.sel.kind !== 'wall') return;
    const w = data.walls.find(x => x.id === S.sel.id);
    if(!w) return;
    const a = toScreen(w.x1, w.z1), b = toScreen(w.x2, w.z2);
    ctx.strokeStyle = 'rgba(124,92,255,.4)';
    ctx.lineWidth = (w.t || 0.2) * S.scale + 10;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function drawCursor(){
    const p = toScreen(S.cursor.x, S.cursor.z);
    const col = S.cursor.snap === 'end' ? '#ffb84d'
              : (S.cursor.snap === '90H' || S.cursor.snap === '90V') ? '#10d980'
              : '#00d4ff';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x - 12, p.y); ctx.lineTo(p.x + 12, p.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 12); ctx.lineTo(p.x, p.y + 12); ctx.stroke();
    if(S.cursor.snap === 'end'){
      ctx.strokeStyle = '#ffb84d';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 8, p.y - 8, 16, 16);
    }
  }

  /* ============ Helpers ============ */
  function polygonArea(pts){
    let a = 0;
    for(let i = 0; i < pts.length; i++){
      const j = (i + 1) % pts.length;
      a += pts[i].x * pts[j].z - pts[j].x * pts[i].z;
    }
    return Math.abs(a) / 2;
  }
  function distSeg(px, pz, x1, z1, x2, z2){
    const dx = x2 - x1, dz = z2 - z1;
    const L2 = dx*dx + dz*dz;
    if(L2 < 1e-9) return { d: Math.hypot(px-x1, pz-z1), t: 0 };
    let t = ((px-x1)*dx + (pz-z1)*dz) / L2;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t*dx, cz = z1 + t*dz;
    return { d: Math.hypot(px-cx, pz-cz), t };
  }
  function pickWall(x, z){
    const tol = 16 / S.scale;
    let best = null, bd = tol;
    for(const w of data.walls){
      const r = distSeg(x, z, w.x1, w.z1, w.x2, w.z2);
      if(r.d < bd){ bd = r.d; best = { wall: w, t: r.t }; }
    }
    return best;
  }
  function pickOpening(x, z){
    const tol = 16 / S.scale;
    for(const op of data.openings){
      const w = data.walls.find(x => x.id === op.wallId);
      if(!w) continue;
      const cx = w.x1 + (w.x2-w.x1)*op.t;
      const cz = w.z1 + (w.z2-w.z1)*op.t;
      if(Math.hypot(x-cx, z-cz) < tol) return op;
    }
    return null;
  }
  function pickRoom(x, z){
    for(const r of data.rooms) if(pointInPoly(x, z, r.points)) return r;
    return null;
  }
  function pointInPoly(x, z, pts){
    let inside = false;
    for(let i = 0, j = pts.length-1; i < pts.length; j = i++){
      const xi = pts[i].x, zi = pts[i].z;
      const xj = pts[j].x, zj = pts[j].z;
      const inter = ((zi > z) !== (zj > z)) && (x < (xj-xi)*(z-zi)/(zj-zi)+xi);
      if(inter) inside = !inside;
    }
    return inside;
  }

  /* ============ Events ============ */
  function updateCursor(e){
    const r = canvas.getBoundingClientRect();
    const p = toWorld(e.clientX - r.left, e.clientY - r.top);
    let snapped = snapPoint(p);
    if((S.tool === 'wall' || S.tool === 'dim') && S.draft.length > 0){
      snapped = constrain90(S.draft[S.draft.length-1], snapped);
    }
    S.cursor.x = snapped.x;
    S.cursor.z = snapped.z;
    S.cursor.snap = snapped.snap;
    onStatus(snapped);
  }
  function onDown(e){
    if(touches > 1) return;
    downPos = { x: e.clientX, y: e.clientY };
    moved = false;
    updateCursor(e);
    render();
  }
  function onMove(e){
    if(panning && panStart){
      S.panX = panStart.px - (e.clientX - panStart.x) / S.scale;
      S.panY = panStart.pz - (e.clientY - panStart.y) / S.scale;
      render();
      return;
    }
    if(downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) moved = true;
    updateCursor(e);
    render();
  }
  function onUp(e){
    if(panning){ panning = false; panStart = null; return; }
    if(!downPos) return;
    if(!moved) handleClick();
    downPos = null;
    moved = false;
  }
  function handleClick(){
    const cur = { x: S.cursor.x, z: S.cursor.z };
    switch(S.tool){
      case 'select': {
        const o = pickOpening(cur.x, cur.z);
        if(o){ S.sel = { kind: 'opening', id: o.id }; onSelect(S.sel); render(); return; }
        const w = pickWall(cur.x, cur.z);
        if(w){ S.sel = { kind: 'wall', id: w.wall.id }; onSelect(S.sel); render(); return; }
        const r = pickRoom(cur.x, cur.z);
        if(r){ S.sel = { kind: 'room', id: r.id }; onSelect(S.sel); render(); return; }
        S.sel = null; onSelect(null); render(); return;
      }
      case 'wall': {
        if(!S.draft.length) S.draft.push({ ...cur });
        else {
          const last = S.draft[S.draft.length-1];
          if(Math.hypot(cur.x - last.x, cur.z - last.z) < 0.1) return;
          S.draft.push({ ...cur });
        }
        render(); return;
      }
      case 'room': {
        S.draft.push({ ...cur });
        render(); return;
      }
      case 'door':
      case 'window': {
        const w = pickWall(cur.x, cur.z);
        if(w){
          data.openings.push({
            id: 'O' + Date.now() + Math.random().toString(36).slice(2, 5),
            wallId: w.wall.id,
            t: w.t,
            kind: S.tool,
            w: S.tool === 'door' ? 0.9 : 1.2,
            h: S.tool === 'door' ? 2.1 : 1.4,
            flip: false
          });
          commit();
        }
        render(); return;
      }
      case 'dim': {
        if(!S.tempDim) S.tempDim = { x1: cur.x, z1: cur.z };
        else {
          S.tempDim.x2 = cur.x;
          S.tempDim.z2 = cur.z;
          data.dims.push({ id: 'D' + Date.now(), ...S.tempDim });
          S.tempDim = null;
          commit();
        }
        render(); return;
      }
      case 'del': {
        const o = pickOpening(cur.x, cur.z);
        if(o){ data.openings = data.openings.filter(x => x.id !== o.id); commit(); render(); return; }
        const w = pickWall(cur.x, cur.z);
        if(w){
          data.walls = data.walls.filter(x => x.id !== w.wall.id);
          data.openings = data.openings.filter(op => op.wallId !== w.wall.id);
          commit(); render(); return;
        }
        const r = pickRoom(cur.x, cur.z);
        if(r){ data.rooms = data.rooms.filter(x => x.id !== r.id); commit(); render(); return; }
        return;
      }
    }
  }

  /* ============ Touch ============ */
  function onTouchStart(e){
    touches = e.touches.length;
    if(touches === 2){
      const [a, b] = e.touches;
      pinch = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        mid: { x: (a.clientX + b.clientX)/2, y: (a.clientY + b.clientY)/2 },
        scale: S.scale, panX: S.panX, panY: S.panY
      };
      S.draft = [];
      S.tempDim = null;
      render();
    }
  }
  function onTouchMove(e){
    if(e.touches.length === 2 && pinch){
      e.preventDefault();
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mid = { x: (a.clientX + b.clientX)/2, y: (a.clientY + b.clientY)/2 };
      const f = d / pinch.dist;
      S.scale = Math.max(8, Math.min(220, pinch.scale * f));
      S.panX = pinch.panX - (mid.x - pinch.mid.x) / S.scale;
      S.panY = pinch.panY - (mid.y - pinch.mid.y) / S.scale;
      render();
    }
  }
  function onTouchEnd(e){
    touches = e.touches.length;
    if(touches < 2) pinch = null;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /* ============ Public actions ============ */
  function commit(){
    history.stack = history.stack.slice(0, history.idx + 1);
    history.stack.push(JSON.stringify(data));
    history.idx = history.stack.length - 1;
    onChange(data);
  }
  function undo(){
    if(history.idx <= 0) return;
    history.idx--;
    Object.assign(data, JSON.parse(history.stack[history.idx]));
    S.sel = null; onSelect(null); render();
  }
  function redo(){
    if(history.idx >= history.stack.length - 1) return;
    history.idx++;
    Object.assign(data, JSON.parse(history.stack[history.idx]));
    S.sel = null; onSelect(null); render();
  }
  function commitDraft(){
    if(S.tool === 'wall' && S.draft.length >= 2){
      for(let i = 0; i < S.draft.length - 1; i++){
        const a = S.draft[i], b = S.draft[i+1];
        const dup = data.walls.some(w =>
          (Math.abs(w.x1 - a.x) < 0.01 && Math.abs(w.z1 - a.z) < 0.01 &&
           Math.abs(w.x2 - b.x) < 0.01 && Math.abs(w.z2 - b.z) < 0.01) ||
          (Math.abs(w.x2 - a.x) < 0.01 && Math.abs(w.z2 - a.z) < 0.01 &&
           Math.abs(w.x1 - b.x) < 0.01 && Math.abs(w.z1 - b.z) < 0.01)
        );
        if(!dup) data.walls.push({
          id: 'W' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 5),
          x1: a.x, z1: a.z, x2: b.x, z2: b.z,
          t: 0.2, h: 2.8,
          compA: [], compB: []
        });
      }
      commit();
    } else if(S.tool === 'room' && S.draft.length >= 3){
      data.rooms.push({
        id: 'R' + Date.now() + Math.random().toString(36).slice(2, 5),
        points: S.draft.slice(),
        name: 'غرفة ' + (data.rooms.length + 1)
      });
      commit();
    }
    S.draft = [];
    S.tempDim = null;
    render();
  }
  function cancelDraft(){
    S.draft = [];
    S.tempDim = null;
    render();
  }
  function getSel(){
    if(!S.sel) return null;
    if(S.sel.kind === 'wall') return data.walls.find(w => w.id === S.sel.id);
    if(S.sel.kind === 'opening') return data.openings.find(o => o.id === S.sel.id);
    if(S.sel.kind === 'room') return data.rooms.find(r => r.id === S.sel.id);
    return null;
  }
  function updateSel(key, val){
    const o = getSel();
    if(!o) return;
    o[key] = val;
    render();
  }
  function deleteSel(){
    if(!S.sel) return;
    if(S.sel.kind === 'wall'){
      data.walls = data.walls.filter(w => w.id !== S.sel.id);
      data.openings = data.openings.filter(o => o.wallId !== S.sel.id);
    } else if(S.sel.kind === 'opening'){
      data.openings = data.openings.filter(o => o.id !== S.sel.id);
    } else if(S.sel.kind === 'room'){
      data.rooms = data.rooms.filter(r => r.id !== S.sel.id);
    }
    S.sel = null;
    commit();
    onSelect(null);
    render();
  }
  function fit(){
    let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9, any = false;
    for(const w of data.walls){
      minX = Math.min(minX, w.x1, w.x2); maxX = Math.max(maxX, w.x1, w.x2);
      minZ = Math.min(minZ, w.z1, w.z2); maxZ = Math.max(maxZ, w.z1, w.z2);
      any = true;
    }
    for(const r of data.rooms){
      for(const p of r.points){
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
        any = true;
      }
    }
    if(!any){
      S.panX = 0; S.panY = 0; S.scale = 45;
      render();
      return;
    }
    const r = canvas.getBoundingClientRect();
    const pad = 80;
    const s = Math.min(
      (r.width - pad*2) / Math.max(1, maxX - minX),
      (r.height - pad*2) / Math.max(1, maxZ - minZ)
    );
    S.scale = Math.max(8, Math.min(220, s));
    S.panX = (minX + maxX) / 2;
    S.panY = (minZ + maxZ) / 2;
    render();
  }
  function zoom(f){
    S.scale = Math.max(8, Math.min(220, S.scale * f));
    render();
  }
  function load(d){
    Object.assign(data, JSON.parse(JSON.stringify(d)));
    history.stack = [JSON.stringify(data)];
    history.idx = 0;
    fit();
  }
  function clearAll(){
    data.walls = []; data.rooms = []; data.openings = []; data.dims = [];
    S.sel = null;
    commit();
    onSelect(null);
    render();
  }
  function detectRooms(){
    if(data.walls.length < 3) return;
    const tol = 0.05;
    const nodes = [];
    function getNode(x, z){
      for(const n of nodes) if(Math.hypot(n.x - x, n.z - z) < tol) return n;
      const n = { id: nodes.length, x, z, edges: [] };
      nodes.push(n);
      return n;
    }
    for(const w of data.walls){
      const a = getNode(w.x1, w.z1);
      const b = getNode(w.x2, w.z2);
      a.edges.push({ to: b, wall: w });
      b.edges.push({ to: a, wall: w });
    }
    const found = [];
    const seenKeys = new Set();
    const key = cyc => cyc.map(n => n.id).sort((a,b) => a-b).join(',');
    for(const start of nodes){
      const stack = [{ node: start, path: [start], walls: [] }];
      let iter = 0;
      while(stack.length && iter++ < 5000){
        const { node, path, walls } = stack.pop();
        for(const e of node.edges){
          if(walls.includes(e.wall)) continue;
          if(e.to === start && path.length >= 3){
            const k = key(path);
            if(!seenKeys.has(k)){
              seenKeys.add(k);
              if(path.length <= 12){
                found.push({ pts: path.map(n => ({ x: n.x, z: n.z })) });
              }
            }
          } else if(!path.includes(e.to) && path.length < 12){
            stack.push({ node: e.to, path: [...path, e.to], walls: [...walls, e.wall] });
          }
        }
      }
    }
    // keep smallest cycles
    const kept = [];
    for(const c of found){
      if(Math.abs(polygonArea(c.pts)) < 0.5) continue;
      const contains = found.some(o =>
        o !== c && o.pts.length < c.pts.length &&
        pointInPoly(o.pts[0].x, o.pts[0].z, c.pts)
      );
      if(!contains) kept.push(c);
    }
    // dedupe
    const unique = [];
    for(const c of kept){
      const cx = c.pts.reduce((s, p) => s + p.x, 0) / c.pts.length;
      const cz = c.pts.reduce((s, p) => s + p.z, 0) / c.pts.length;
      if(!unique.some(u => {
        const ux = u.pts.reduce((s, p) => s + p.x, 0) / u.pts.length;
        const uz = u.pts.reduce((s, p) => s + p.z, 0) / u.pts.length;
        return Math.hypot(ux - cx, uz - cz) < 0.3;
      })) unique.push(c);
    }
    data.rooms = unique.map((c, i) => ({
      id: 'R' + Date.now() + '_' + i,
      points: c.pts,
      name: 'غرفة ' + (i + 1)
    }));
    commit();
    render();
  }

  /* ============ Init ============ */
  setTimeout(() => { resize(); fit(); }, 100);

  return {
    S, data, history,
    render, resize, fit, zoom,
    commit, undo, redo,
    commitDraft, cancelDraft,
    getSel, updateSel, deleteSel,
    load, clearAll, detectRooms
  };
}
