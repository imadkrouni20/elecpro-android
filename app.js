import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ========== الحالة ========== */
const state = {
  W:10, L:12, F:2, R:4, H:2.8,
  rooms: [],          // {id,floor,x,y,w,h,name}
  walls: [],          // {id,floor,x1,z1,x2,z2,components:[]}
  ceilings: [],       // {id,floor,roomId,x,z,w,d,components:[]}
  currentFloor: 1,
  currentWall: null,
  currentCeil: null,
  wiresOn: false,
};
let selType = null;

/* ========== التنقل بين الشاشات ========== */
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
document.querySelectorAll('[data-back]').forEach(b=>{
  b.onclick = ()=>show(b.dataset.back);
});

/* ========== توليد البناية ========== */
function generateBuilding(){
  state.rooms=[];state.walls=[];state.ceilings=[];
  const{W,L,F,R,H}=state;
  // توزيع الغرف على شكل شبكة داخل الطابق
  const cols=Math.ceil(Math.sqrt(R)), rows=Math.ceil(R/cols);
  const rw=L/cols, rh=W/rows;
  let roomIdx=0;
  for(let f=1;f<=F;f++){
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(roomIdx>=R)break;
        const x=-L/2+c*rw, z=-W/2+r*rh;
        const room={
          id:`R${f}_${roomIdx}`,floor:f,x,z,w:rw,d:rh,
          name:`غرفة ${roomIdx+1}`
        };
        state.rooms.push(room);
        state.ceilings.push({id:`C${f}_${roomIdx}`,floor:f,roomId:room.id,x,z,w:rw,d:rh,components:[]});
        roomIdx++;
      }
    }
    roomIdx=0;
  }
  // توليد الجدران: كل غرفة لها 4 جدران، نمنع التكرار
  const seen=new Set();
  for(const r of state.rooms){
    const edges=[
      [r.x,r.z,r.x+r.w,r.z],           // شمال
      [r.x+r.w,r.z,r.x+r.w,r.z+r.d],   // شرق
      [r.x,r.z+r.d,r.x+r.w,r.z+r.d],   // جنوب
      [r.x,r.z,r.x,r.z+r.d],           // غرب
    ];
    for(const e of edges){
      const key=`${r.floor}_${e.map(n=>n.toFixed(2)).join('_')}`;
      const key2=`${r.floor}_${[e[2],e[3],e[0],e[1]].map(n=>n.toFixed(2)).join('_')}`;
      if(seen.has(key)||seen.has(key2))continue;
      seen.add(key);
      state.walls.push({
        id:`W${r.floor}_${state.walls.length}`,
        floor:r.floor,
        x1:e[0],z1:e[1],x2:e[2],z2:e[3],
        components:[]
      });
    }
  }
}

/* ========== أدوات ========== */
const ICONS={
  breaker:'⚡',socket:'🔌',wallLamp:'💡',switch:'🔘',tableau:'🗄',
  ceiling:'🔆',chandelier:'✴',spot:'⭕'
};
const NAMES={
  breaker:'قاطع MCB',socket:'مقبس',wallLamp:'مصباح حائطي',switch:'مفتاح',tableau:'لوحة توزيع',
  ceiling:'مصباح سقف',chandelier:'ثريا',spot:'سبوت'
};

/* ========== شاشة الإعداد ========== */
document.getElementById('btnConfirm').onclick = ()=>{
  state.W=parseFloat(document.getElementById('iW').value)||10;
  state.L=parseFloat(document.getElementById('iL').value)||12;
  state.F=parseInt(document.getElementById('iF').value)||2;
  state.R=parseInt(document.getElementById('iR').value)||4;
  state.H=parseFloat(document.getElementById('iH').value)||2.8;
  state.currentFloor=1;
  generateBuilding();
  buildFloorTabs();
  drawPlan();
  show('s-plan');
};

document.getElementById('btnPlan3D').onclick = ()=>{
  show('s-3d');
  init3D();
  build3DScene();
};

/* ========== تبويبات الطوابق ========== */
function buildFloorTabs(){
  const el=document.getElementById('planFloors');
  el.innerHTML='';
  for(let f=1;f<=state.F;f++){
    const b=document.createElement('button');
    b.textContent=`الطابق ${f}`;
    if(f===state.currentFloor)b.classList.add('active');
    b.onclick=()=>{state.currentFloor=f;buildFloorTabs();drawPlan();};
    el.appendChild(b);
  }
  document.getElementById('planFloor').textContent=state.currentFloor;
}

/* ========== رسم مخطط 2D ========== */
function drawPlan(){
  const c=document.getElementById('planCanvas');
  const r=c.getBoundingClientRect();
  const dpr=Math.min(devicePixelRatio,2);
  c.width=r.width*dpr;c.height=r.height*dpr;
  const g=c.getContext('2d');
  g.scale(dpr,dpr);
  const W=r.width, Hh=r.height;
  g.fillStyle='#0e141c';g.fillRect(0,0,W,Hh);

  const pad=20;
  const sx=(W-pad*2)/state.L, sz=(Hh-pad*2)/state.W;
  const s=Math.min(sx,sz);
  const ox=(W-state.L*s)/2, oy=(Hh-state.W*s)/2;

  // جدران هذا الطابق
  const walls=state.walls.filter(w=>w.floor===state.currentFloor);
  g.strokeStyle='#4a9eff';g.lineWidth=3;g.lineCap='round';
  for(const w of walls){
    g.beginPath();
    g.moveTo(ox+(w.x1+state.L/2)*s, oy+(w.z1+state.W/2)*s);
    g.lineTo(ox+(w.x2+state.L/2)*s, oy+(w.z2+state.W/2)*s);
    g.stroke();
  }

  // تسميات الغرف
  const rooms=state.rooms.filter(r=>r.floor===state.currentFloor);
  g.font='bold 11px system-ui';g.fillStyle='#cfe0f5';g.textAlign='center';
  for(const r of rooms){
    const cx=ox+(r.x+r.w/2+state.L/2)*s;
    const cy=oy+(r.z+r.d/2+state.W/2)*s;
    const area=(r.w*r.d).toFixed(1);
    g.fillText(r.name,cx,cy-6);
    g.fillStyle='#7f8ea3';g.font='10px system-ui';
    g.fillText(`${area} م²`,cx,cy+8);
    g.fillStyle='#cfe0f5';g.font='bold 11px system-ui';
  }

  // عنوان الطابق
  g.fillStyle='#2f81f7';g.font='bold 13px system-ui';g.textAlign='right';
  g.fillText(`الطابق ${state.currentFloor} — ${rooms.length} غرف`,W-12,20);
}
window.addEventListener('resize',()=>{
  if(document.getElementById('s-plan').classList.contains('active'))drawPlan();
});

/* ========== مشهد 3D ========== */
let renderer,scene,camera,controls3d,raycaster,pointer;
let wallMeshes=[],ceilMeshes=[],wireGroup,allWires=[];
let inited=false;

function init3D(){
  if(inited)return;
  const canvas=document.getElementById('c3d');
  const viewer=document.getElementById('viewer3d');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0a0e13);
  camera=new THREE.PerspectiveCamera(45,1,0.1,300);
  camera.position.set(18,14,18);
  controls3d=new OrbitControls(camera,canvas);
  controls3d.enableDamping=true;controls3d.dampingFactor=0.08;
  controls3d.minDistance=6;controls3d.maxDistance=80;
  controls3d.minPolarAngle=0.15;controls3d.maxPolarAngle=Math.PI*0.48;
  controls3d.target.set(0,2,0);
  scene.add(new THREE.AmbientLight(0xffffff,0.55));
  scene.add(new THREE.HemisphereLight(0xd4e4f4,0x1a2230,0.6));
  const key=new THREE.DirectionalLight(0xffffff,1.6);
  key.position.set(15,25,15);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-30;key.shadow.camera.right=30;
  key.shadow.camera.top=30;key.shadow.camera.bottom=-30;
  scene.add(key);
  const fill=new THREE.DirectionalLight(0x88bbff,0.4);
  fill.position.set(-15,10,-15);scene.add(fill);
  raycaster=new THREE.Raycaster();
  pointer=new THREE.Vector2();
  canvas.addEventListener('pointerdown',onPointer3D);
  const resize=()=>{
    const r=viewer.getBoundingClientRect();
    if(r.width<1)return;
    renderer.setSize(r.width,r.height,false);
    camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(viewer);
  resize();
  (function loop(){
    requestAnimationFrame(loop);
    controls3d.update();
    renderer.render(scene,camera);
  })();
  inited=true;
}

/* ========== بناء المشهد ========== */
function build3DScene(){
  // مسح
  while(scene.children.length>0){
    const c=scene.children[0];
    scene.remove(c);
  }
  scene.add(new THREE.AmbientLight(0xffffff,0.55));
  scene.add(new THREE.HemisphereLight(0xd4e4f4,0x1a2230,0.6));
  const key=new THREE.DirectionalLight(0xffffff,1.6);
  key.position.set(15,25,15);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-30;key.shadow.camera.right=30;
  key.shadow.camera.top=30;key.shadow.camera.bottom=-30;
  scene.add(key);
  const fill=new THREE.DirectionalLight(0x88bbff,0.4);
  fill.position.set(-15,10,-15);scene.add(fill);

  wallMeshes=[];ceilMeshes=[];
  const wallMat=new THREE.MeshStandardMaterial({color:0xdde3e8,roughness:0.9,side:THREE.DoubleSide,transparent:true,opacity:0.65});
  const wallHi=new THREE.MeshStandardMaterial({color:0x4a9eff,roughness:0.7,side:THREE.DoubleSide,transparent:true,opacity:0.75});
  const ceilMat=new THREE.MeshStandardMaterial({color:0xc4d0da,roughness:0.9,side:THREE.DoubleSide,transparent:true,opacity:0.55});
  const ceilHi=new THREE.MeshStandardMaterial({color:0xffcc55,roughness:0.7,side:THREE.DoubleSide,transparent:true,opacity:0.75});
  const floorMat=new THREE.MeshStandardMaterial({color:0x2a3440,roughness:0.8});

  // أرضية كل طابق + أسقف
  for(let f=1;f<=state.F;f++){
    const yBase=(f-1)*state.H;
    // أرضية
    const fl=new THREE.Mesh(new THREE.BoxGeometry(state.L+0.3,0.15,state.W+0.3),floorMat);
    fl.position.set(0,yBase-0.08,0);fl.receiveShadow=true;scene.add(fl);
  }
  // سقف أعلى البناية
  const top=new THREE.Mesh(new THREE.BoxGeometry(state.L+0.4,0.2,state.W+0.4),
    new THREE.MeshStandardMaterial({color:0x1a2432,roughness:0.9}));
  top.position.set(0,state.F*state.H+0.1,0);scene.add(top);

  // الجدران
  for(const w of state.walls){
    const yBase=(w.floor-1)*state.H;
    const dx=w.x2-w.x1, dz=w.z2-w.z1;
    const len=Math.hypot(dx,dz);
    if(len<0.01)continue;
    const geo=new THREE.BoxGeometry(len,state.H,0.15);
    const mesh=new THREE.Mesh(geo,wallMat.clone());
    mesh.position.set((w.x1+w.x2)/2, yBase+state.H/2, (w.z1+w.z2)/2);
    mesh.rotation.y=-Math.atan2(dz,dx);
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={kind:'wall',wallId:w.id};
    scene.add(mesh);
    wallMeshes.push(mesh);
    w._mesh=mesh;
  }

  // الأسقف (سطح كل غرفة)
  for(const c of state.ceilings){
    const yBase=c.floor*state.H;
    const geo=new THREE.BoxGeometry(c.w-0.05,0.08,c.d-0.05);
    const mesh=new THREE.Mesh(geo,ceilMat.clone());
    mesh.position.set(c.x+c.w/2,yBase-0.04,c.z+c.d/2);
    mesh.userData={kind:'ceil',ceilId:c.id};
    scene.add(mesh);
    ceilMeshes.push(mesh);
    c._mesh=mesh;
  }

  // إطار خارجي شفاف
  const shellMat=new THREE.MeshStandardMaterial({color:0x4a9eff,transparent:true,opacity:0.05,side:THREE.DoubleSide});
  const shell=new THREE.Mesh(new THREE.BoxGeometry(state.L,state.F*state.H,state.W),shellMat);
  shell.position.set(0,state.F*state.H/2,0);scene.add(shell);

  document.getElementById('info3d').textContent='👆 اضغط على حائط (رمادي) أو سقف (أزرق فاتح) لتعديله';

  // ضبط الكاميرا
  const D=Math.max(state.L,state.W)*1.6;
  camera.position.set(D,D*0.8,D);
  controls3d.target.set(0,state.F*state.H/2,0);
  controls3d.update();
}

/* ========== تفاعل 3D ========== */
function onPointer3D(e){
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-r.left)/r.width)*2-1;
  pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects([...wallMeshes,...ceilMeshes],false);
  if(!hits.length)return;
  const obj=hits[0].object;
  const d=obj.userData;
  // إزالة التمييز السابق
  wallMeshes.forEach(m=>{if(m.userData.kind==='wall')m.material.color.setHex(0xdde3e8);});
  ceilMeshes.forEach(m=>m.material.color.setHex(0xc4d0da));
  if(d.kind==='wall'){
    obj.material.color.setHex(0x4a9eff);
    state.currentWall=state.walls.find(w=>w.id===d.wallId);
    setTimeout(()=>openWall(),150);
  } else if(d.kind==='ceil'){
    obj.material.color.setHex(0xffcc55);
    state.currentCeil=state.ceilings.find(c=>c.id===d.ceilId);
    setTimeout(()=>openCeil(),150);
  }
}

/* ========== شاشة تعديل الحائط ========== */
function openWall(){
  const w=state.currentWall;if(!w)return;
  document.getElementById('wallTitle').textContent=`حائط ${w.id} — الطابق ${w.floor}`;
  buildWallPalette();
  drawWall();
  show('s-wall');
}
const WALL_TYPES=[
  {t:'breaker',icon:'⚡'},{t:'socket',icon:'🔌'},{t:'wallLamp',icon:'💡'},
  {t:'switch',icon:'🔘'},{t:'tableau',icon:'🗄'}
];
function buildWallPalette(){
  const p=document.getElementById('wallPalette');
  p.innerHTML='';
  for(const it of WALL_TYPES){
    const b=document.createElement('button');
    b.innerHTML=`<span class="icon">${it.icon}</span>${NAMES[it.t]}`;
    if(selType===it.t)b.classList.add('active');
    b.onclick=()=>{
      selType=selType===it.t?null:it.t;
      [...p.children].forEach(c=>c.classList.remove('active'));
      if(selType)b.classList.add('active');
      drawWall();
    };
    p.appendChild(b);
  }
  const clr=document.createElement('button');
  clr.innerHTML=`<span class="icon">🗑</span>مسح`;
  clr.onclick=()=>{state.currentWall.components=[];drawWall();};
  p.appendChild(clr);
}
function drawWall(){
  const c=document.getElementById('wallCanvas');
  const r=c.getBoundingClientRect();
  const dpr=Math.min(devicePixelRatio,2);
  c.width=r.width*dpr;c.height=r.height*dpr;
  const g=c.getContext('2d');
  g.scale(dpr,dpr);
  const W=r.width,Hh=r.height;
  g.fillStyle='#0e141c';g.fillRect(0,0,W,Hh);
  const w=state.currentWall;
  const dx=w.x2-w.x1,dz=w.z2-w.z1;
  const len=Math.hypot(dx,dz);
  const pad=30;
  const sx=(W-pad*2)/len, sy=(Hh-pad*2)/state.H;
  const s=Math.min(sx,sy);
  const wallW=len*s, wallH=state.H*s;
  const ox=(W-wallW)/2, oy=(Hh-wallH)/2;
  // جدار
  g.fillStyle='#1a2432';g.fillRect(ox,oy,wallW,wallH);
  g.strokeStyle='#4a9eff';g.lineWidth=2;g.strokeRect(ox,oy,wallW,wallH);
  // علامات الأمتار
  g.strokeStyle='#2a3646';g.lineWidth=1;
  g.fillStyle='#5f7a99';g.font='9px system-ui';g.textAlign='center';
  for(let m=0;m<=len;m++){
    const x=ox+m*s;
    g.beginPath();g.moveTo(x,oy);g.lineTo(x,oy+wallH);g.stroke();
    if(m>0)g.fillText(m+'م',x,Hh-8);
  }
  for(let m=0;m<=state.H;m+=0.5){
    const y=oy+(state.H-m)*s;
    g.beginPath();g.moveTo(ox,y);g.lineTo(ox+wallW,y);g.stroke();
  }
  // المكونات
  for(const comp of w.components){
    const px=ox+comp.px*wallW;
    const py=oy+(1-comp.py)*wallH;
    g.fillStyle='#2f81f7';
    g.beginPath();g.arc(px,py,14,0,Math.PI*2);g.fill();
    g.fillStyle='#fff';g.font='16px system-ui';g.textAlign='center';g.textBaseline='middle';
    g.fillText(ICONS[comp.type]||'●',px,py);
    g.textBaseline='alphabetic';
  }
  // تعليمات
  if(selType){
    g.fillStyle='#2eb872';g.font='bold 11px system-ui';g.textAlign='right';
    g.fillText(`👆 انقر لإضافة: ${NAMES[selType]}`,W-12,20);
  } else {
    g.fillStyle='#7f8ea3';g.font='11px system-ui';g.textAlign='right';
    g.fillText('اختر مكوّنًا من الأسفل ثم انقر على الحائط',W-12,20);
  }
  // استجابة النقر
  c.onclick=(e)=>{
    if(!selType)return;
    const r2=c.getBoundingClientRect();
    const x=e.clientX-r2.left, y=e.clientY-r2.top;
    if(x<ox||x>ox+wallW||y<oy||y>oy+wallH)return;
    const px=(x-ox)/wallW, py=1-(y-oy)/wallH;
    w.components.push({type:selType,px,py});
    drawWall();
  };
}

/* ========== شاشة تعديل السقف ========== */
function openCeil(){
  const c=state.currentCeil;if(!c)return;
  document.getElementById('ceilTitle').textContent=`سقف ${c.id}`;
  buildCeilPalette();
  drawCeil();
  show('s-ceil');
}
const CEIL_TYPES=[
  {t:'ceiling',icon:'🔆'},{t:'chandelier',icon:'✴'},{t:'spot',icon:'⭕'}
];
function buildCeilPalette(){
  const p=document.getElementById('ceilPalette');
  p.innerHTML='';
  for(const it of CEIL_TYPES){
    const b=document.createElement('button');
    b.innerHTML=`<span class="icon">${it.icon}</span>${NAMES[it.t]}`;
    if(selType===it.t)b.classList.add('active');
    b.onclick=()=>{
      selType=selType===it.t?null:it.t;
      [...p.children].forEach(c=>c.classList.remove('active'));
      if(selType)b.classList.add('active');
      drawCeil();
    };
    p.appendChild(b);
  }
  const clr=document.createElement('button');
  clr.innerHTML=`<span class="icon">🗑</span>مسح`;
  clr.onclick=()=>{state.currentCeil.components=[];drawCeil();};
  p.appendChild(clr);
}
function drawCeil(){
  const c=document.getElementById('ceilCanvas');
  const r=c.getBoundingClientRect();
  const dpr=Math.min(devicePixelRatio,2);
  c.width=r.width*dpr;c.height=r.height*dpr;
  const g=c.getContext('2d');g.scale(dpr,dpr);
  const W=r.width,Hh=r.height;
  g.fillStyle='#0e141c';g.fillRect(0,0,W,Hh);
  const ceil=state.currentCeil;
  const pad=30;
  const sx=(W-pad*2)/ceil.w, sy=(Hh-pad*2)/ceil.d;
  const s=Math.min(sx,sy);
  const cw=ceil.w*s, ch=ceil.d*s;
  const ox=(W-cw)/2, oy=(Hh-ch)/2;
  g.fillStyle='#1a2432';g.fillRect(ox,oy,cw,ch);
  g.strokeStyle='#ffcc55';g.lineWidth=2;g.strokeRect(ox,oy,cw,ch);
  // شبكة 1م
  g.strokeStyle='#2a3646';g.lineWidth=1;
  for(let m=0;m<=ceil.w;m++){
    const x=ox+m*s;
    g.beginPath();g.moveTo(x,oy);g.lineTo(x,oy+ch);g.stroke();
  }
  for(let m=0;m<=ceil.d;m++){
    const y=oy+m*s;
    g.beginPath();g.moveTo(ox,y);g.lineTo(ox+cw,y);g.stroke();
  }
  // المكونات
  for(const comp of ceil.components){
    const px=ox+comp.px*cw, py=oy+comp.py*ch;
    g.fillStyle='#ffcc55';
    g.beginPath();g.arc(px,py,14,0,Math.PI*2);g.fill();
    g.fillStyle='#000';g.font='16px system-ui';g.textAlign='center';g.textBaseline='middle';
    g.fillText(ICONS[comp.type]||'●',px,py);
    g.textBaseline='alphabetic';
  }
  if(selType){
    g.fillStyle='#2eb872';g.font='bold 11px system-ui';g.textAlign='right';
    g.fillText(`👆 انقر لإضافة: ${NAMES[selType]}`,W-12,20);
  }
  c.onclick=(e)=>{
    if(!selType)return;
    const r2=c.getBoundingClientRect();
    const x=e.clientX-r2.left, y=e.clientY-r2.top;
    if(x<ox||x>ox+cw||y<oy||y>oy+ch)return;
    const px=(x-ox)/cw, py=(y-oy)/ch;
    ceil.components.push({type:selType,px,py});
    drawCeil();
  };
}

/* ========== الأسلاك الكهربائية ========== */
document.getElementById('btnRunWires').onclick = ()=>{
  drawWires();
  document.getElementById('info3d').textContent='⚡ تم رسم الأسلاك — اضغط تقرير المواد (📋) لرؤية الكميات';
};
document.getElementById('btnClearWires').onclick = ()=>{
  if(wireGroup)scene.remove(wireGroup);
  wireGroup=null;
  document.getElementById('info3d').textContent='تم مسح الأسلاك';
};

function nearestTableau(floor){
  let best=null,bd=1e9;
  for(const w of state.walls){
    if(w.floor!==floor)continue;
    for(const c of w.components){
      if(c.type==='tableau'){
        const cx=w.x1+(w.x2-w.x1)*c.px;
        const cz=w.z1+(w.z2-w.z1)*c.px;
        return {x:cx,y:0,z:cz,wall:w,comp:c};
      }
    }
  }
  // لم يوجد tableau → نقطة مرجعية: زاوية البناية
  return {x:-state.L/2,y:0,z:-state.W/2,wall:null};
}
function compWorldPos(comp,wall){
  const dx=wall.x2-wall.x1, dz=wall.z2-wall.z1;
  const px=wall.x1+dx*comp.px;
  const pz=wall.z1+dz*comp.px;
  const y=(wall.floor-1)*state.H+comp.py*state.H;
  return new THREE.Vector3(px,y+state.H*0.15,pz);
}
function drawWires(){
  if(wireGroup)scene.remove(wireGroup);
  wireGroup=new THREE.Group();
  allWires=[];
  const wireMat=new THREE.MeshStandardMaterial({color:0xb82222,roughness:0.5});
  const wireMat2=new THREE.MeshStandardMaterial({color:0x1a5ac0,roughness:0.5});
  const wireMat3=new THREE.MeshStandardMaterial({color:0x188a4a,roughness:0.5});

  for(const floor of new Set(state.walls.map(w=>w.floor))){
    const src=nearestTableau(floor);
    const ySrc=(floor-1)*state.H+state.H*0.7;
    const srcP=new THREE.Vector3(src.x,ySrc,src.z);

    for(const wall of state.walls){
      if(wall.floor!==floor)continue;
      for(const comp of wall.components){
        if(comp.type==='tableau')continue;
        const p=compWorldPos(comp,wall);
        // ثلاث أسلاك: أحمر (فاز)، أزرق (محايد)، أخضر (أرضي)
        for(const[m,off]of[[wireMat,0.02],[wireMat2,-0.02],[wireMat3,0.06]]){
          const mid=new THREE.Vector3((srcP.x+p.x)/2,
            Math.max(srcP.y,p.y)+state.H*0.15+off,
            (srcP.z+p.z)/2);
          const curve=new THREE.CatmullRomCurve3([srcP.clone().add(new THREE.Vector3(off,0,0)),mid,p.clone().add(new THREE.Vector3(off,0,0))]);
          const geo=new THREE.TubeGeometry(curve,24,0.025,8,false);
          const mesh=new THREE.Mesh(geo,m);
          wireGroup.add(mesh);
          // طول
          allWires.push({floor,from:srcP.distanceTo(mid)+mid.distanceTo(p)});
        }
      }
    }
  }
  scene.add(wireGroup);
}

/* ========== تقرير المواد ========== */
document.getElementById('btnReport').onclick=()=>{buildReport();show('s-report');};

function buildReport(){
  const all=[];
  for(const w of state.walls){
    for(const c of w.components)all.push({...c,floor:w.floor,where:`${w.id}`});
  }
  for(const c of state.ceilings){
    for(const comp of c.components)all.push({...comp,floor:c.floor,where:`${c.id}`});
  }
  const counts={};
  for(const c of all)counts[c.type]=(counts[c.type]||0)+1;

  let totalWire=0;
  if(allWires.length)for(const w of allWires)totalWire+=w.length;

  const html=`
    <h3>🏗 ملخص البناية</h3>
    <table>
      <tr><td>الأبعاد</td><td>${state.L} × ${state.W} م</td></tr>
      <tr><td>الطوابق</td><td>${state.F}</td></tr>
      <tr><td>غرف/طابق</td><td>${state.R}</td></tr>
      <tr><td>ارتفاع الطابق</td><td>${state.H} م</td></tr>
      <tr><td>عدد الحوائط</td><td>${state.walls.length}</td></tr>
    </table>
    <h3>⚡ المكونات المثبتة</h3>
    <table>
      ${Object.keys(counts).length===0?'<tr><td colspan="2">لم تُضف أي مكونات بعد</td></tr>':''}
      ${Object.entries(counts).map(([t,n])=>`<tr><td>${ICONS[t]||'●'} ${NAMES[t]||t}</td><td>${n} قطعة</td></tr>`).join('')}
    </table>
    <h3>🔌 الأسلاك</h3>
    <table>
      <tr><td>الحالة</td><td>${allWires.length?'مرسومة':'لم تُنفّذ'}</td></tr>
      <tr><td>عدد المسارات</td><td>${allWires.length}</td></tr>
      <tr class="total"><td>الطول الإجمالي</td><td>${totalWire.toFixed(1)} متر</td></tr>
    </table>
    <h3>📦 قائمة الشراء المقترحة</h3>
    <table>
      ${Object.entries(counts).map(([t,n])=>{
        let extra='';
        if(t==='socket')extra=`+ ${n*5} م سلك 2.5مم²`;
        if(t==='ceiling'||t==='chandelier'||t==='wallLamp')extra=`+ ${n*4} م سلك 1.5مم²`;
        return `<tr><td>${NAMES[t]||t}</td><td>${n} قطعة ${extra}</td></tr>`;
      }).join('')}
      ${allWires.length?`<tr class="total"><td>سلك 1.5مم² (تقديري)</td><td>${(totalWire*0.5).toFixed(0)} م</td></tr>
      <tr class="total"><td>سلك 2.5مم² (تقديري)</td><td>${(totalWire*0.5).toFixed(0)} م</td></tr>`:''}
    </table>
    <p style="margin-top:20px;font-size:11px;color:#5f7a99;text-align:center">
      القيم تقديرية — يُنصح بمراجعة مهندس كهرباء معتمد.
    </p>
  `;
  document.getElementById('reportBody').innerHTML=html;
}
