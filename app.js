import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const viewer = document.getElementById('viewer');
const tabsEl = document.getElementById('tabs');
const infoEl = document.getElementById('info');
const controlsEl = document.getElementById('controls');

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);
scene.fog = new THREE.Fog(0x0b0f14, 22, 50);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, 3, 13);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 30;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0, 1, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;

scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x1a2230, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(6, 10, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-16; key.shadow.camera.right=16;
key.shadow.camera.top=16; key.shadow.camera.bottom=-16;
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.6);
fill.position.set(-8, 6, -6); scene.add(fill);

const MAT = {
  plastic:  new THREE.MeshStandardMaterial({color:0xeef0f3, roughness:0.5, metalness:0.05}),
  dark:     new THREE.MeshStandardMaterial({color:0x1c2026, roughness:0.65}),
  grey:     new THREE.MeshStandardMaterial({color:0x8a9099, roughness:0.6}),
  metal:    new THREE.MeshStandardMaterial({color:0xcfd5dd, roughness:0.22, metalness:0.95}),
  brass:    new THREE.MeshStandardMaterial({color:0xd8b452, roughness:0.28, metalness:0.95}),
  red:      new THREE.MeshStandardMaterial({color:0xd0433b, roughness:0.5}),
  green:    new THREE.MeshStandardMaterial({color:0x2eb872, roughness:0.5}),
  blue:     new THREE.MeshStandardMaterial({color:0x3a82d6, roughness:0.5}),
  yellow:   new THREE.MeshStandardMaterial({color:0xf1c40f, roughness:0.5}),
};

const box = (w,h,d,mat,x=0,y=0,z=0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; return m;
};
const cyl = (rt,rb,h,mat,x=0,y=0,z=0,seg=24) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
  m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; return m;
};
const sph = (r,mat,x=0,y=0,z=0) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r,24,18), mat);
  m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; return m;
};

const eGeo = new THREE.SphereGeometry(0.10, 10, 8);

function makeWire(points, opts={}){
  const { color = 0x8b1a1a, radius = 0.075, closed = false, count = 16, electronColor = 0xffd060 } = opts;
  const curve = new THREE.CatmullRomCurve3(
    points.map(p=>new THREE.Vector3(p[0],p[1],p[2])), closed, 'catmullrom', 0.4);
  const geo = new THREE.TubeGeometry(curve, Math.max(60, points.length*24), radius, 10, closed);
  const mat = new THREE.MeshStandardMaterial({color, roughness:0.55, metalness:0.35});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const eMat = new THREE.MeshStandardMaterial({color:electronColor, emissive:electronColor, emissiveIntensity:2.4});
  const electrons = [];
  for (let i=0;i<count;i++){
    const e = new THREE.Mesh(eGeo, eMat);
    e.userData.offset = i/count;
    e.visible = false;
    electrons.push(e);
  }
  return {mesh, curve, electrons};
}

function newCtx(){
  return { group: new THREE.Group(), wires: [], lamps: [], switches: [], closed: true,
    target:[0,1.2,0], camPos:[0,3.5,12], buttons: [], update: null };
}
function addWire(ctx, points, opts){
  const w = makeWire(points, opts);
  ctx.group.add(w.mesh);
  for (const e of w.electrons) ctx.group.add(e);
  ctx.wires.push(w); return w;
}
function addLamp(ctx, pos, size=0.5, branch=-1){
  const mat = new THREE.MeshStandardMaterial({color:0xfff0cf, emissive:0xffcc33, emissiveIntensity:0, roughness:0.3});
  const bulb = sph(size, mat, pos[0], pos[1], pos[2]);
  ctx.group.add(bulb);
  const light = new THREE.PointLight(0xffe09a, 0, size*16);
  light.position.set(pos[0], pos[1], pos[2]);
  ctx.group.add(light);
  const entry = {mesh: bulb, mat, light, size, base: 4.0, branch};
  ctx.lamps.push(entry); return entry;
}
function addSwitchVisual(ctx, pos, width=1.2){
  const g = new THREE.Group();
  g.position.set(pos[0], pos[1], pos[2]);
  g.add(box(width+0.5, 0.28, 0.6, MAT.dark, 0, 0, 0));
  g.add(sph(0.11, MAT.brass, -width/2, 0.16, 0));
  g.add(sph(0.11, MAT.brass,  width/2, 0.16, 0));
  const pivot = new THREE.Group();
  pivot.position.set(-width/2, 0.16, 0);
  const bar = cyl(0.07, 0.07, width, MAT.metal, width/2, 0, 0, 12);
  bar.rotation.z = Math.PI/2;
  pivot.add(bar); g.add(pivot); ctx.group.add(g);
  ctx.switches.push({pivot, rot: 0});
}

function updateSwitches(ctx, closed){
  for (const s of ctx.switches){
    const target = closed ? 0 : 0.6;
    s.rot += (target - s.rot) * 0.18;
    s.pivot.rotation.z = s.rot;
  }
}
function updateLamps(ctx, branchMask){
  for (const L of ctx.lamps){
    const on = branchMask === true || (Array.isArray(branchMask) && branchMask[L.branch]);
    const ti = on ? L.base : 0;
    L.light.intensity += (ti - L.light.intensity) * 0.14;
    L.mat.emissiveIntensity += ((on?2.5:0) - L.mat.emissiveIntensity) * 0.14;
  }
}

function buildSimple(){
  const ctx = newCtx();
  ctx.target = [0, 1, 0]; ctx.camPos = [0.5, 3.5, 12];
  const L = -4, R = 4, B = -1.2, T = 3.0, sw = 0.8;
  addWire(ctx, [[-sw,T,0],[L,T,0],[L,B,0],[R,B,0],[R,T,0],[sw,T,0]],
    {color:0x8b1a1a, radius:0.085, closed:true, count:26, electronColor:0xffd060});
  const bat = new THREE.Group();
  bat.add(box(2.4, 0.9, 0.7, MAT.dark, 0, 0, 0));
  bat.add(box(2.4, 0.5, 0.72, MAT.yellow, 0, 0.22, 0));
  bat.add(box(0.5, 0.6, 0.74, MAT.red, 1.2, 0.15, 0));
  bat.add(box(0.5, 0.6, 0.74, MAT.blue, -1.2, 0.15, 0));
  bat.position.set(0, B, 0); ctx.group.add(bat);
  addSwitchVisual(ctx, [0, T, 0], 1.6);
  addLamp(ctx, [R, 0.9, 0], 0.55);
  ctx.group.add(cyl(0.4, 0.5, 0.35, MAT.brass, R, 0.25, 0, 24));
  ctx.update = () => { updateSwitches(ctx, ctx.closed); updateLamps(ctx, ctx.closed); };
  ctx.buttons = [{getLabel:()=>ctx.closed?'🔒 اقفل الدارة':'🔓 شغّل الدارة',
    getActive:()=>ctx.closed, onClick:()=>{ctx.closed = !ctx.closed;}}];
  return ctx;
}

function buildSeries(){
  const ctx = newCtx();
  ctx.target = [0, 1, 0]; ctx.camPos = [0.5, 3.5, 13];
  const L = -4, R = 4, B = -1.5, T = 3.2, sw = 0.8;
  addWire(ctx, [[-sw,T,0],[L,T,0],[L,B,0],[R,B,0],[R,T,0],[sw,T,0]],
    {color:0x8b1a1a, radius:0.085, closed:true, count:28, electronColor:0xffd060});
  const bat = new THREE.Group();
  bat.add(box(2.4, 0.9, 0.7, MAT.dark, 0, 0, 0));
  bat.add(box(2.4, 0.5, 0.72, MAT.yellow, 0, 0.22, 0));
  bat.position.set(0, B, 0); ctx.group.add(bat);
  addSwitchVisual(ctx, [0, T, 0], 1.6);
  addLamp(ctx, [R, 2.0, 0], 0.45);
  addLamp(ctx, [R, -0.35, 0], 0.45);
  ctx.group.add(cyl(0.32, 0.42, 0.28, MAT.brass, R, 1.6, 0, 20));
  ctx.group.add(cyl(0.32, 0.42, 0.28, MAT.brass, R, -0.75, 0, 20));
  ctx.update = () => {
    updateSwitches(ctx, ctx.closed);
    for (const L2 of ctx.lamps){
      const on = ctx.closed;
      L2.light.intensity += ((on?2.2:0) - L2.light.intensity) * 0.14;
      L2.mat.emissiveIntensity += ((on?1.6:0) - L2.mat.emissiveIntensity) * 0.14;
    }
  };
  ctx.buttons = [{getLabel:()=>ctx.closed?'🔒 اقفل الدارة':'🔓 شغّل الدارة',
    getActive:()=>ctx.closed, onClick:()=>{ctx.closed = !ctx.closed;}}];
  return ctx;
}

function buildParallel(){
  const ctx = newCtx();
  ctx.target = [0, 1, 0]; ctx.camPos = [0.5, 3.5, 13];
  const L = -4.5, R = 3.5, B = -1.2, T = 3.2;
  addWire(ctx, [[L,-2.0,0],[L,T,0],[R,T,0],[R,B,0],[L,B,0],[L,-2.0,0]],
    {color:0x8b1a1a, radius:0.08, closed:true, count:30, electronColor:0xffd060});
  const bat = new THREE.Group();
  bat.add(box(0.9, 2.2, 0.7, MAT.dark, 0, 0, 0));
  bat.add(box(0.7, 1.0, 0.72, MAT.yellow, 0, 0.3, 0));
  bat.add(box(0.72, 0.4, 0.74, MAT.red, 0, 0.9, 0));
  bat.add(box(0.72, 0.4, 0.74, MAT.blue, 0, -0.3, 0));
  bat.position.set(L, -1.0, 0); ctx.group.add(bat);
  const swGroup = new THREE.Group();
  swGroup.position.set(L, 1.6, 0);
  swGroup.add(box(0.6, 1.6, 0.5, MAT.dark, 0, 0, 0));
  ctx.group.add(swGroup);
  const lever = box(0.35, 0.9, 0.55, MAT.metal, 0, 0.45, 0.05);
  ctx.group.add(lever);
  addWire(ctx, [[0,-1.2,0],[0,3.2,0]], {color:0x8b1a1a, radius:0.06, count:10, electronColor:0xffd060});
  addWire(ctx, [[R,-1.2,0],[R,3.2,0]], {color:0x8b1a1a, radius:0.06, count:10, electronColor:0xffd060});
  for (const x of [0, R]){
    ctx.group.add(sph(0.14, MAT.brass, x, T, 0));
    ctx.group.add(sph(0.14, MAT.brass, x, B, 0));
  }
  addLamp(ctx, [0, 1.0, 0], 0.55, 0);
  addLamp(ctx, [R, 1.0, 0], 0.55, 1);
  ctx.group.add(cyl(0.38, 0.48, 0.32, MAT.brass, 0, 0.35, 0, 24));
  ctx.group.add(cyl(0.38, 0.48, 0.32, MAT.brass, R, 0.35, 0, 24));
  ctx.update = () => {
    const on = ctx.closed;
    lever.position.y = on ? 0 : 0.9;
    lever.rotation.z = on ? 0 : -0.5;
    updateLamps(ctx, on);
  };
  ctx.buttons = [{getLabel:()=>ctx.closed?'🔒 اقفل الدارة':'🔓 شغّل الدارة',
    getActive:()=>ctx.closed, onClick:()=>{ctx.closed = !ctx.closed;}}];
  return ctx;
}

function buildVa(){
  const ctx = newCtx();
  ctx.target = [0, 1.2, 0]; ctx.camPos = [0.5, 4, 13];
  ctx.s1 = 0; ctx.s2 = 0;
  const computeClosed = () => ctx.s1 === ctx.s2;
  const L = -5;
  const bat = new THREE.Group();
  bat.add(box(0.7, 1.8, 0.7, MAT.dark, 0, 0, 0));
  bat.add(box(0.72, 0.5, 0.72, MAT.yellow, 0, 0, 0));
  bat.add(box(0.74, 0.3, 0.74, MAT.red, 0, 0.55, 0));
  bat.add(box(0.74, 0.3, 0.74, MAT.blue, 0, -0.55, 0));
  bat.position.set(L, 1.2, 0); ctx.group.add(bat);
  addWire(ctx, [[L+0.4,1.2,0],[-2.6,1.2,0],[-2.6,1.8,0]],
    {color:0x8b1a1a, radius:0.075, count:6, electronColor:0xffd060});
  const s1 = new THREE.Group();
  s1.position.set(-2.2, 1.8, 0);
  s1.add(box(1.4, 0.3, 0.7, MAT.dark, 0, 0, 0));
  s1.add(sph(0.11, MAT.brass, -0.55, 0.16, 0));
  s1.add(sph(0.11, MAT.brass,  0.45, 0.55, 0));
  s1.add(sph(0.11, MAT.brass,  0.45, -0.25, 0));
  const s1lever = new THREE.Group();
  s1lever.position.set(-0.55, 0.16, 0);
  const bar1 = cyl(0.06, 0.06, 1.1, MAT.metal, 0.55, 0, 0, 10);
  bar1.rotation.z = Math.PI/2;
  s1lever.add(bar1); s1.add(s1lever); ctx.group.add(s1);
  const s2 = new THREE.Group();
  s2.position.set(2.2, 1.8, 0);
  s2.add(box(1.4, 0.3, 0.7, MAT.dark, 0, 0, 0));
  s2.add(sph(0.11, MAT.brass,  0.55, 0.16, 0));
  s2.add(sph(0.11, MAT.brass, -0.45, 0.55, 0));
  s2.add(sph(0.11, MAT.brass, -0.45, -0.25, 0));
  const s2lever = new THREE.Group();
  s2lever.position.set(0.55, 0.16, 0);
  const bar2 = cyl(0.06, 0.06, 1.1, MAT.metal, -0.55, 0, 0, 10);
  bar2.rotation.z = Math.PI/2;
  s2lever.add(bar2); s2.add(s2lever); ctx.group.add(s2);
  addWire(ctx, [[-1.75,2.35,0],[-1.2,2.9,0],[1.2,2.9,0],[1.75,2.35,0]],
    {color:0xd0433b, radius:0.06, count:10, electronColor:0xff8866});
  addWire(ctx, [[-1.75,1.55,0],[-1.2,0.9,0],[1.2,0.9,0],[1.75,1.55,0]],
    {color:0x3a82d6, radius:0.06, count:10, electronColor:0x88bbff});
  addWire(ctx, [[2.75,1.8,0],[3.6,1.8,0]],
    {color:0x8b1a1a, radius:0.075, count:4, electronColor:0xffd060});
  addLamp(ctx, [4.2, 1.8, 0], 0.55);
  addWire(ctx, [[4.75,1.8,0],[5,1.8,0],[5,-0.5,0],[-5,-0.5,0],[-5,1.2,0]],
    {color:0x8b1a1a, radius:0.075, count:18, electronColor:0xffd060});
  ctx.update = () => {
    const closed = computeClosed();
    const t1 = ctx.s1 === 0 ? 0 : 0.55;
    const t2 = ctx.s2 === 0 ? 0 : 0.55;
    s1lever.rotation.z += (t1 - s1lever.rotation.z) * 0.2;
    s2lever.rotation.z += (t2 - s2lever.rotation.z) * 0.2;
    updateLamps(ctx, closed);
  };
  ctx.buttons = [
    {getLabel:()=>`مفتاح 1 : ${ctx.s1===0?'↑':'↓'}`, getActive:()=>true, onClick:()=>{ctx.s1 = 1-ctx.s1;}},
    {getLabel:()=>`مفتاح 2 : ${ctx.s2===0?'↑':'↓'}`, getActive:()=>true, onClick:()=>{ctx.s2 = 1-ctx.s2;}},
  ];
  return ctx;
}

function buildSocketCircuit(){
  const ctx = newCtx();
  ctx.target = [0, 1, 0]; ctx.camPos = [0.5, 3.5, 13];
  const panel = new THREE.Group();
  panel.add(box(2.2, 2.6, 0.8, MAT.plastic, 0, 0, 0));
  panel.add(box(1.4, 1.2, 0.4, MAT.grey, 0, 0, 0.5));
  panel.add(box(0.9, 0.55, 0.5, MAT.dark, 0, 0, 0.7));
  panel.add(box(0.55, 0.55, 0.55, MAT.red, 0, -0.7, 0.7));
  panel.position.set(-4, 1.4, 0); ctx.group.add(panel);
  const breakerLever = box(0.35, 0.35, 0.55, MAT.red, -4, 1.65, 0.95);
  ctx.group.add(breakerLever);
  addWire(ctx, [[-3,2.0,0],[-1,2.0,0],[1,2.0,0],[2.2,1.5,0]],
    {color:0xd0433b, radius:0.075, count:16, electronColor:0xff8866});
  addWire(ctx, [[-3,0.8,0],[-1,0.8,0],[1,0.8,0],[2.2,1.0,0]],
    {color:0x3a82d6, radius:0.075, count:16, electronColor:0x88bbff});
  addWire(ctx, [[-3,0.1,0],[-1,0.1,0],[1,0.1,0],[2.2,0.55,0]],
    {color:0x2eb872, radius:0.06, count:12, electronColor:0x88ffbb});
  const sock = new THREE.Group();
  sock.position.set(3, 1.4, 0);
  sock.add(box(1.6, 1.6, 0.6, MAT.plastic, 0, 0, 0));
  const disc = cyl(0.55, 0.55, 0.4, MAT.plastic, 0, 0, 0.4, 40);
  disc.rotation.x = Math.PI/2; sock.add(disc);
  const h1 = cyl(0.12, 0.12, 0.25, MAT.dark, -0.22, 0.05, 0.62, 16); h1.rotation.x = Math.PI/2; sock.add(h1);
  const h2 = cyl(0.12, 0.12, 0.25, MAT.dark,  0.22, 0.05, 0.62, 16); h2.rotation.x = Math.PI/2; sock.add(h2);
  sock.add(box(0.18, 0.32, 0.15, MAT.dark, 0, -0.4, 0.62));
  ctx.group.add(sock);
  addLamp(ctx, [3, 3.2, 0], 0.55);
  ctx.group.add(cyl(0.4, 0.5, 0.32, MAT.brass, 3, 2.6, 0, 24));
  addWire(ctx, [[3.3,1.9,0],[3.4,2.3,0],[3,2.6,0]],
    {color:0xd0433b, radius:0.06, count:5, electronColor:0xff8866});
  addWire(ctx, [[2.7,1.9,0],[2.6,2.3,0],[3,2.6,0]],
    {color:0x3a82d6, radius:0.06, count:5, electronColor:0x88bbff});
  ctx.update = () => {
    const on = ctx.closed;
    breakerLever.position.y = on ? 1.4 : 2.0;
    breakerLever.rotation.z = on ? 0 : 0.9;
    for (const L of ctx.lamps){
      L.light.intensity += ((on?4:0) - L.light.intensity) * 0.14;
      L.mat.emissiveIntensity += ((on?2.5:0) - L.mat.emissiveIntensity) * 0.14;
    }
  };
  ctx.buttons = [{getLabel:()=>ctx.closed?'🔒 افصل القاطع':'🔓 أغلق القاطع',
    getActive:()=>ctx.closed, onClick:()=>{ctx.closed = !ctx.closed;}}];
  return ctx;
}

function buildDistribution(){
  const ctx = newCtx();
  ctx.target = [0, 1, 0]; ctx.camPos = [0.5, 4, 16];
  const panel = new THREE.Group();
  panel.add(box(3, 4.2, 0.8, MAT.plastic, 0, 0, 0));
  panel.position.set(-5, 1.2, 0); ctx.group.add(panel);
  ctx.group.add(box(1.6, 0.7, 0.55, MAT.dark, -5, 3.0, 0.55));
  const mainLever = box(0.5, 0.4, 0.6, MAT.red, -5, 3.2, 0.85);
  ctx.group.add(mainLever);
  const branchLevers = [];
  for (let i=0;i<3;i++){
    const y = 1.2 - i*1.2;
    ctx.group.add(box(1.2, 0.5, 0.5, MAT.grey, -5, y, 0.55));
    const lv = box(0.35, 0.3, 0.55, MAT.red, -5, y+0.15, 0.85);
    ctx.group.add(lv);
    branchLevers.push(lv);
  }
  const yH = [2.4, 1.2, 0.0];
  const colors = [0xd0433b, 0x2f81f7, 0x2eb872];
  const electronColors = [0xff8866, 0x88bbff, 0x88ffbb];
  for (let i=0;i<3;i++){
    const y = yH[i];
    addWire(ctx, [[-3.5,y,0],[2.2,y,0]],
      {color: colors[i], radius:0.075, count:16, electronColor: electronColors[i]});
    addWire(ctx, [[2.6,y,0],[5,y,0],[5,y-0.7,0],[-5,y-0.7,0],[-5,y,0]],
      {color: 0x3a82d6, radius:0.06, count:18, electronColor: 0x88bbff});
    ctx.group.add(sph(0.14, MAT.brass, 2.4, y, 0));
  }
  addLamp(ctx, [3.8, 2.4, 0], 0.5, 0);
  addLamp(ctx, [3.8, 1.2, 0], 0.5, 1);
  addLamp(ctx, [3.8, 0.0, 0], 0.5, 2);
  for (let i=0;i<3;i++){
    const c = cyl(0.35, 0.45, 0.28, MAT.brass, 3.5, yH[i], 0, 20);
    c.rotation.z = Math.PI/2; ctx.group.add(c);
  }
  ctx.branches = [true, true, true];
  ctx.customFlow = () => ctx.branches;
  ctx.update = () => {
    for (let i=0;i<3;i++){
      const on = ctx.branches[i];
      branchLevers[i].position.y = (1.2 - i*1.2) + (on?0.15:-0.05);
      branchLevers[i].rotation.z = on ? 0 : 0.7;
    }
    for (const L of ctx.lamps){
      const on = ctx.branches[L.branch];
      L.light.intensity += ((on?3.5:0) - L.light.intensity) * 0.14;
      L.mat.emissiveIntensity += ((on?2.3:0) - L.mat.emissiveIntensity) * 0.14;
    }
  };
  ctx.buttons = [
    {getLabel:()=>`غرفة 1 : ${ctx.branches[0]?'مضاءة':'مطفأة'}`, getActive:()=>ctx.branches[0], onClick:()=>{ctx.branches[0] = !ctx.branches[0];}},
    {getLabel:()=>`غرفة 2 : ${ctx.branches[1]?'مضاءة':'مطفأة'}`, getActive:()=>ctx.branches[1], onClick:()=>{ctx.branches[1] = !ctx.branches[1];}},
    {getLabel:()=>`غرفة 3 : ${ctx.branches[2]?'مضاءة':'مطفأة'}`, getActive:()=>ctx.branches[2], onClick:()=>{ctx.branches[2] = !ctx.branches[2];}},
  ];
  return ctx;
}

const CIRCUITS = {
  simple:   {label:'دارة بسيطة',   title:'دارة كهربائية بسيطة',     desc:'بطارية + مفتاح + مصباح: عند غلق المفتاح يمر التيار ويعمل المصباح.', build: buildSimple},
  series:   {label:'على التوالي',  title:'دارة على التوالي',         desc:'المصابيح متصلة بالتتابع — كلما زاد العدد قلّت الإضاءة.',           build: buildSeries},
  parallel: {label:'على التوازي',  title:'دارة على التوازي',         desc:'كل مصباح في فرع مستقل — فتح أحد الفروع لا يؤثر على الآخر.',        build: buildParallel},
  va:       {label:'دارة الدرج',   title:'دارة الدرج (Va-et-vient)', desc:'مفتاحان يتحكمان بمصباح واحد: يُشغّل من الأسفل ويُطفأ من الأعلى.',  build: buildVa},
  socket:   {label:'المقبس',       title:'دارة المقبس مع القاطع',   desc:'القاطع يحمي فرع المقبس — عند فصله يتوقف التيار عن الحمل.',        build: buildSocketCircuit},
  panel:    {label:'لوحة التوزيع', title:'لوحة توزيع منزلية',         desc:'قاطع رئيسي + 3 قواطع فرعية تغذي غرفًا مختلفة بشكل مستقل.',        build: buildDistribution},
};

let currentGroup = null;
let activeCtx = null;

function renderControls(){
  controlsEl.innerHTML = '';
  if (!activeCtx || !activeCtx.buttons) return;
  for (const b of activeCtx.buttons){
    const btn = document.createElement('button');
    btn.textContent = b.getLabel();
    if (!b.getActive()) btn.classList.add('off');
    btn.onclick = () => { b.onClick(); renderControls(); };
    controlsEl.appendChild(btn);
  }
}

function loadCircuit(key){
  if (currentGroup) scene.remove(currentGroup);
  const cfg = CIRCUITS[key];
  activeCtx = cfg.build();
  currentGroup = activeCtx.group;
  scene.add(currentGroup);
  controls.target.set(activeCtx.target[0], activeCtx.target[1], activeCtx.target[2]);
  camera.position.set(activeCtx.camPos[0], activeCtx.camPos[1], activeCtx.camPos[2]);
  controls.update();
  infoEl.innerHTML = `<h2>${cfg.title}</h2><p>${cfg.desc}</p>`;
  [...tabsEl.children].forEach(b => b.classList.toggle('active', b.dataset.k === key));
  renderControls();
}

function buildTabs(){
  for (const [k,v] of Object.entries(CIRCUITS)){
    const b = document.createElement('button');
    b.className = 'tab';
    b.dataset.k = k;
    b.textContent = v.label;
    b.onclick = () => loadCircuit(k);
    tabsEl.appendChild(b);
  }
}

function resize(){
  const r = viewer.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return;
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
window.addEventListener('resize', resize);

let lastT = performance.now();
function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (activeCtx){
    const branchMask = activeCtx.customFlow ? activeCtx.customFlow() : (activeCtx.closed ? true : false);
    for (let wi=0; wi<activeCtx.wires.length; wi++){
      const w = activeCtx.wires[wi];
      let flow = false;
      if (Array.isArray(branchMask)){
        const branchIdx = Math.min(2, Math.floor(wi / 2));
        flow = branchMask[branchIdx];
      } else {
        flow = branchMask;
      }
      const speed = flow ? 0.32 : 0;
      for (const e of w.electrons){
        if (speed > 0){
          e.visible = true;
          e.userData.offset = (e.userData.offset + speed * dt) % 1;
          w.curve.getPointAt(e.userData.offset, e.position);
        } else {
          e.visible = false;
        }
      }
    }
    if (activeCtx.update) activeCtx.update();
  }

  controls.update();
  renderer.render(scene, camera);
}

buildTabs();
loadCircuit('simple');
requestAnimationFrame(() => { resize(); animate(); });
