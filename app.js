import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.getElementById('c'),viewer=document.getElementById('viewer');
const tabsEl=document.getElementById('tabs'),infoEl=document.getElementById('info'),controlsEl=document.getElementById('controls');

const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0a0e13);

const camera=new THREE.PerspectiveCamera(45,1,0.1,200);
camera.position.set(0,4,14);

const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=0.08;
controls.minDistance=5;controls.maxDistance=32;
controls.minPolarAngle=0.15;controls.maxPolarAngle=Math.PI*0.6;
controls.autoRotate=true;controls.autoRotateSpeed=0.3;
controls.target.set(0,2,0);

scene.add(new THREE.AmbientLight(0xffffff,0.5));
scene.add(new THREE.HemisphereLight(0xd4e4f4,0x1a2230,0.6));
const key=new THREE.DirectionalLight(0xffffff,2.0);
key.position.set(7,12,6);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-16;key.shadow.camera.right=16;
key.shadow.camera.top=16;key.shadow.camera.bottom=-16;
scene.add(key);
const rim=new THREE.DirectionalLight(0x88bbff,0.5);rim.position.set(-8,5,-8);scene.add(rim);

const M={
  wall:new THREE.MeshStandardMaterial({color:0xdde3e8,roughness:0.95}),
  plate:new THREE.MeshStandardMaterial({color:0xfafbfc,roughness:0.35,metalness:0.08}),
  chrome:new THREE.MeshStandardMaterial({color:0xe8ecf0,roughness:0.15,metalness:1.0}),
  brass:new THREE.MeshStandardMaterial({color:0xd4a340,roughness:0.25,metalness:1.0}),
  copper:new THREE.MeshStandardMaterial({color:0xc47830,roughness:0.3,metalness:1.0}),
  steel:new THREE.MeshStandardMaterial({color:0xc0c6cc,roughness:0.25,metalness:1.0}),
  dark:new THREE.MeshStandardMaterial({color:0x14171c,roughness:0.65}),
  grey:new THREE.MeshStandardMaterial({color:0x6a7078,roughness:0.7}),
  iRed:new THREE.MeshStandardMaterial({color:0xb82222,roughness:0.55}),
  iBlue:new THREE.MeshStandardMaterial({color:0x1a5ac0,roughness:0.55}),
  iGreen:new THREE.MeshStandardMaterial({color:0x188a4a,roughness:0.55}),
  iYellow:new THREE.MeshStandardMaterial({color:0xd8b010,roughness:0.55}),
  glass:new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.35,roughness:0.1,metalness:0}),
  filament:new THREE.MeshStandardMaterial({color:0xffcc33,emissive:0xffaa22,emissiveIntensity:0.1,roughness:0.3}),
  bulbOn:new THREE.MeshStandardMaterial({color:0xfff5d0,emissive:0xffcc55,emissiveIntensity:0.05,roughness:0.3,transparent:true,opacity:0.85}),
};

const mk=(g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;};
const bx=(w,h,d,m,x=0,y=0,z=0)=>mk(new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cy=(rt,rb,h,m,x=0,y=0,z=0,s=24)=>mk(new THREE.CylinderGeometry(rt,rb,h,s),m,x,y,z);
const sp=(r,m,x=0,y=0,z=0)=>{const o=mk(new THREE.SphereGeometry(r,20,14),m,x,y,z);return o;};

function screw(m,x,y,z,rotX=Math.PI/2){
  const g=new THREE.Group();g.position.set(x,y,z);
  const head=cy(0.075,0.075,0.04,m,0,0,0,20);head.rotation.x=rotX;g.add(head);
  g.add(bx(0.11,0.012,0.05,m,0,0.021,0));
  g.add(bx(0.012,0.11,0.05,m,0,0.021,0));
  return g;
}
function wall(w=12,h=7,x=0,y=0,z=-2){
  const m=mk(new THREE.BoxGeometry(w,h,0.3),M.wall,x,y,z);
  m.receiveShadow=true;return m;
}
function wallBox(w=1.4,h=1.4,d=0.9){
  const g=new THREE.Group();
  g.add(mk(new THREE.BoxGeometry(w,h,d),M.dark,0,0,0));
  g.add(mk(new THREE.BoxGeometry(w+0.12,h+0.12,0.15),M.dark,0,0,d/2-0.05));
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
    g.add(screw(M.brass,(-1+2*i)*(w/2-0.15),(-1+2*j)*(h/2-0.15),d/2+0.02,0));
  }
  return g;
}
function wallSwitch(){
  const g=new THREE.Group();
  const plateMat=new THREE.MeshStandardMaterial({color:0xf8f8f5,roughness:0.42,metalness:0.04});
  const frameMat=new THREE.MeshStandardMaterial({color:0xc4c8cc,roughness:0.18,metalness:0.9});
  const rockerMat=new THREE.MeshStandardMaterial({color:0xfbfbf8,roughness:0.38,metalness:0.04});
  const shadowMat=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.95});
  g.add(mk(new THREE.BoxGeometry(1.9,1.9,0.12),plateMat,0,0,0));
  g.add(mk(new THREE.BoxGeometry(1.78,1.78,0.02),plateMat,0,0,0.07));
  const fs=1.48,ft=0.08,fz=0.06;
  g.add(mk(new THREE.BoxGeometry(fs,ft,fz),frameMat,0, fs/2-ft/2,0.10));
  g.add(mk(new THREE.BoxGeometry(fs,ft,fz),frameMat,0,-fs/2+ft/2,0.10));
  g.add(mk(new THREE.BoxGeometry(ft,fs,fz),frameMat,-fs/2+ft/2,0,0.10));
  g.add(mk(new THREE.BoxGeometry(ft,fs,fz),frameMat, fs/2-ft/2,0,0.10));
  g.add(mk(new THREE.BoxGeometry(1.28,1.28,0.02),shadowMat,0,0,0.075));
  const pivot=new THREE.Group();
  pivot.position.set(0,0,0.11);
  pivot.add(mk(new THREE.BoxGeometry(1.22,1.22,0.12),rockerMat,0,0,0));
  pivot.add(mk(new THREE.BoxGeometry(1.14,1.14,0.02),rockerMat,0,0,0.08));
  g.add(pivot);
  g.userData.pivot=pivot;
  return g;
}
function wallOutlet(){
  const g=new THREE.Group();
  const plateMat=new THREE.MeshStandardMaterial({color:0xf8f8f5,roughness:0.42,metalness:0.04});
  const frameMat=new THREE.MeshStandardMaterial({color:0xc4c8cc,roughness:0.22,metalness:0.75});
  const socketMat=new THREE.MeshStandardMaterial({color:0xfbfbf8,roughness:0.35,metalness:0.03});
  const holeMat=new THREE.MeshStandardMaterial({color:0x050505,roughness:1});
  const brassMat=new THREE.MeshStandardMaterial({color:0xd4a340,roughness:0.25,metalness:1});
  g.add(mk(new THREE.BoxGeometry(1.9,1.9,0.12),plateMat,0,0,0));
  g.add(mk(new THREE.BoxGeometry(1.78,1.78,0.02),plateMat,0,0,0.07));
  const fs=1.42,ft=0.16,fz=0.07;
  g.add(mk(new THREE.BoxGeometry(fs,ft,fz),frameMat,0, fs/2-ft/2,0.10));
  g.add(mk(new THREE.BoxGeometry(fs,ft,fz),frameMat,0,-fs/2+ft/2,0.10));
  g.add(mk(new THREE.BoxGeometry(ft,fs,fz),frameMat,-fs/2+ft/2,0,0.10));
  g.add(mk(new THREE.BoxGeometry(ft,fs,fz),frameMat, fs/2-ft/2,0,0.10));
  const face=cy(0.52,0.52,0.08,socketMat,0,0.05,0.13,48);
  face.rotation.x=Math.PI/2;
  g.add(face);
  const ridge=mk(new THREE.TorusGeometry(0.52,0.03,10,40),socketMat,0,0.05,0.18);
  g.add(ridge);
  const h1=cy(0.1,0.1,0.22,holeMat,-0.22,0.18,0.16,20);h1.rotation.x=Math.PI/2;g.add(h1);
  const h2=cy(0.1,0.1,0.22,holeMat, 0.22,0.18,0.16,20);h2.rotation.x=Math.PI/2;g.add(h2);
  const pinG=new THREE.Group();
  pinG.position.set(0,-0.16,0.18);
  const pin=cy(0.055,0.055,0.28,brassMat,0,0,0.05,14);pin.rotation.x=Math.PI/2;
  pinG.add(pin);
  g.add(pinG);
  g.add(screw(M.steel,0,0.80,0.06,0));
  g.add(screw(M.steel,0,-0.80,0.06,0));
  return g;
}
function breaker(amp=16,color=0x2f81f7){
  const g=new THREE.Group();
  g.add(mk(new THREE.BoxGeometry(1.0,3.0,1.3),M.plate,0,0,0));
  g.add(mk(new THREE.BoxGeometry(0.9,0.55,0.3),M.grey,0,-0.4,-0.8));
  const lbl=mk(new THREE.BoxGeometry(0.75,0.55,0.02),new THREE.MeshStandardMaterial({color:color,roughness:0.5}),0,0.9,0.67);g.add(lbl);
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
    const t=mk(new THREE.CylinderGeometry(0.14,0.14,0.15,16),M.brass,(-1+2*i)*0.28,(-1+2*j)*1.2,0.72);
    t.rotation.x=Math.PI/2;g.add(t);
    g.add(screw(M.steel,(-1+2*i)*0.28,(-1+2*j)*1.2,0.82,0));
  }
  const lever=new THREE.Group();lever.position.set(0,0.3,0.72);
  lever.add(mk(new THREE.BoxGeometry(0.32,0.7,0.35),M.dark,0,0,0));
  g.add(lever);g.userData.lever=lever;return g;
}
function bulbE27(r=0.65){
  const g=new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(0.42,0.42,0.3,24),M.brass,0,0,0));
  for(let i=0;i<4;i++){
    const t=mk(new THREE.TorusGeometry(0.44,0.035,8,24),M.brass,0,-0.1+i*0.12,0);
    t.rotation.x=Math.PI/2;g.add(t);
  }
  const glass=new THREE.Mesh(new THREE.SphereGeometry(r,28,18,0,Math.PI*2,0,Math.PI*0.85),M.glass);
  glass.position.set(0,r+0.35,0);g.add(glass);
  const fila=mk(new THREE.TorusKnotGeometry(0.12,0.02,32,8,2,3),M.filament,0,r+0.35,0);g.add(fila);
  const glow=mk(new THREE.SphereGeometry(r*0.85,20,14),M.bulbOn,0,r+0.35,0);g.add(glow);
  const light=new THREE.PointLight(0xffcc88,0,r*8);
  light.position.set(0,r+0.35,0);g.add(light);
  g.userData={glow,filament:fila,light};
  return g;
}
function ceilingRose(){
  const g=new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(0.55,0.6,0.15,24),M.plate,0,0,0));
  for(let i=0;i<2;i++)g.add(screw(M.steel,(-1+2*i)*0.35,0.09,0,0));
  return g;
}
function cable(points,opts={}){
  const{insulation=M.iRed,exposeEnds=true,count=18,radius=0.075,closed=false}=opts;
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])),closed,'catmullrom',0.4);
  const geo=new THREE.TubeGeometry(curve,Math.max(48,points.length*20),radius,10,closed);
  const mesh=new THREE.Mesh(geo,insulation);mesh.castShadow=true;
  const group=new THREE.Group();group.add(mesh);
  if(exposeEnds&&!closed){
    for(const u of[0.01,0.99]){
      const p=curve.getPointAt(u);
      const cu=mk(new THREE.CylinderGeometry(radius*0.55,radius*0.55,0.22,10),M.copper,p.x,p.y,p.z);
      const tg=curve.getTangentAt(u);
      cu.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tg);
      group.add(cu);
    }
  }
  const eMat=new THREE.MeshStandardMaterial({color:0xffe070,emissive:0xffcc44,emissiveIntensity:2.5,roughness:0.3});
  const electrons=[];
  for(let i=0;i<count;i++){
    const e=new THREE.Mesh(new THREE.SphereGeometry(0.075,8,6),eMat);
    e.userData.offset=i/count;e.visible=false;
    electrons.push(e);group.add(e);
  }
  return{group,curve,electrons};
}

function newCtx(){return{group:new THREE.Group(),wires:[],lamps:[],closed:true,target:[0,2,0],camPos:[0,4,14],buttons:[],update:null};}
function addCable(ctx,points,opts={}){const c=cable(points,opts);ctx.group.add(c.group);ctx.wires.push(c);}
function addLampAt(ctx,pos,size=0.65,branch=-1){const b=bulbE27(size);b.position.set(pos[0],pos[1],pos[2]);ctx.group.add(b);ctx.lamps.push({obj:b,base:5,branch});}

function buildSimple(){
  const ctx=newCtx();ctx.target=[0,2,0];ctx.camPos=[0,4,14];
  ctx.group.add(wall(14,8,0,3.5,-2));
  const box=wallBox(1.4,1.4,0.9);box.position.set(0,5.5,-1.2);ctx.group.add(box);
  const sw=wallSwitch();sw.position.set(0,5.5,-0.65);ctx.group.add(sw);
  addCable(ctx,[[-5,1.2,-1.8],[-3.5,1.2,-1.8],[-2,3.5,-1.8],[-0.4,5.5,-1.8]],{insulation:M.iRed,count:20});
  addCable(ctx,[[0.4,5.5,-1.8],[2.5,6,-1.8],[3.5,6.5,-1.8]],{insulation:M.iRed,count:14});
  addCable(ctx,[[3.5,5.6,-1.8],[5,1.2,-1.8]],{insulation:M.iBlue,count:16});
  addCable(ctx,[[-5,0.6,-1.8],[-3.5,0.6,-1.8],[-2,2.5,-1.8],[0,5.5,-1.8],[3.5,5.6,-1.8],[5,0.6,-1.8]],{insulation:M.iGreen,count:18,radius:0.055,exposeEnds:false});
  const rose=ceilingRose();rose.position.set(3.5,7,-1.8);ctx.group.add(rose);
  addLampAt(ctx,[3.5,6.15,-1.8],0.7);
  ctx.update=()=>{
    const on=ctx.closed;
    if(sw.userData.pivot)sw.userData.pivot.rotation.x=on?-0.05:0.28;
    for(const L of ctx.lamps){
      const u=L.obj.userData;
      u.light.intensity+=((on?5:0)-u.light.intensity)*0.14;
      u.filament.material.emissiveIntensity+=((on?5:0.1)-u.filament.material.emissiveIntensity)*0.14;
      u.glow.material.emissiveIntensity+=((on?1.5:0.05)-u.glow.material.emissiveIntensity)*0.14;
    }
  };
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔓 افتح المفتاح':'🔒 أغلق المفتاح',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}
function buildSeries(){
  const ctx=newCtx();ctx.target=[-1.5,3,0];ctx.camPos=[0,5,15];
  ctx.group.add(wall(12,9,0,3.5,-2));
  addCable(ctx,[[-5,1.2,-1.8],[-3,1.2,-1.8],[-3,7,-1.8],[-1.5,7.5,-1.8],[-1.5,5.2,-1.8]],{insulation:M.iRed,count:22});
  addCable(ctx,[[-1.5,4.0,-1.8],[-1.5,2.6,-1.8]],{insulation:M.iRed,count:6});
  addCable(ctx,[[-1.5,1.4,-1.8],[-1.5,0.8,-1.8],[-5,0.8,-1.8]],{insulation:M.iBlue,count:16});
  const r1=ceilingRose();r1.position.set(-1.5,5.6,-1.8);ctx.group.add(r1);
  const r2=ceilingRose();r2.position.set(-1.5,2.9,-1.8);ctx.group.add(r2);
  addLampAt(ctx,[-1.5,4.75,-1.8],0.6,0);
  addLampAt(ctx,[-1.5,2.0,-1.8],0.6,1);
  ctx.update=()=>{const on=ctx.closed;for(const L of ctx.lamps){const u=L.obj.userData;u.light.intensity+=((on?2:0)-u.light.intensity)*0.14;u.filament.material.emissiveIntensity+=((on?2:0.1)-u.filament.material.emissiveIntensity)*0.14;u.glow.material.emissiveIntensity+=((on?0.8:0.05)-u.glow.material.emissiveIntensity)*0.14;}};
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔒 اقفل':'🔓 شغّل',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}
function buildParallel(){
  const ctx=newCtx();ctx.target=[0,3,0];ctx.camPos=[0,5,15];
  ctx.group.add(wall(14,9,0,3.5,-2));
  addCable(ctx,[[-6,1.2,-1.8],[-4.5,1.2,-1.8],[-4.5,7.5,-1.8],[4.5,7.5,-1.8]],{insulation:M.iRed,count:26});
  addCable(ctx,[[-1.8,7.5,-1.8],[-1.8,6,-1.8]],{insulation:M.iRed,count:5});
  addCable(ctx,[[-1.8,5,-1.8],[-1.8,1.2,-1.8],[-4.5,1.2,-1.8]],{insulation:M.iBlue,count:18});
  addCable(ctx,[[1.8,7.5,-1.8],[1.8,6,-1.8]],{insulation:M.iRed,count:5});
  addCable(ctx,[[1.8,5,-1.8],[1.8,1.2,-1.8],[-4.5,1.2,-1.8]],{insulation:M.iBlue,count:22});
  const r1=ceilingRose();r1.position.set(-1.8,5.5,-1.8);ctx.group.add(r1);
  const r2=ceilingRose();r2.position.set(1.8,5.5,-1.8);ctx.group.add(r2);
  addLampAt(ctx,[-1.8,4.65,-1.8],0.6,0);
  addLampAt(ctx,[ 1.8,4.65,-1.8],0.6,1);
  ctx.update=()=>{const on=ctx.closed;for(const L of ctx.lamps){const u=L.obj.userData;u.light.intensity+=((on?5:0)-u.light.intensity)*0.14;u.filament.material.emissiveIntensity+=((on?5:0.1)-u.filament.material.emissiveIntensity)*0.14;u.glow.material.emissiveIntensity+=((on?1.5:0.05)-u.glow.material.emissiveIntensity)*0.14;}};
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔒 اقفل':'🔓 شغّل',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}
function buildVa(){
  const ctx=newCtx();ctx.s1=0;ctx.s2=0;ctx.target=[0,3,0];ctx.camPos=[0,5,15];
  const isClosed=()=>ctx.s1===ctx.s2;
  ctx.group.add(wall(15,9,0,3.5,-2));
  const b1=wallBox();b1.position.set(-4.5,1.8,-1.2);ctx.group.add(b1);
  const sw1=wallSwitch();sw1.position.set(-4.5,1.8,-0.65);ctx.group.add(sw1);
  const b2=wallBox();b2.position.set(4.5,1.8,-1.2);ctx.group.add(b2);
  const sw2=wallSwitch();sw2.position.set(4.5,1.8,-0.65);ctx.group.add(sw2);
  const rose=ceilingRose();rose.position.set(0,7,-1.8);ctx.group.add(rose);
  addLampAt(ctx,[0,6.15,-1.8],0.7);
  addCable(ctx,[[-7,5,-1.8],[-4.5,5,-1.8],[-4.5,2.6,-1.8]],{insulation:M.iRed,count:12});
  addCable(ctx,[[-3.8,2.4,-1.8],[-2,5.5,-1.8],[2,5.5,-1.8],[3.8,2.4,-1.8]],{insulation:M.iRed,count:20});
  addCable(ctx,[[-3.8,1.2,-1.8],[-2,0.4,-1.8],[2,0.4,-1.8],[3.8,1.2,-1.8]],{insulation:M.iYellow,count:20});
  addCable(ctx,[[4.5,2.6,-1.8],[4.5,6.5,-1.8],[0.5,6.5,-1.8]],{insulation:M.iRed,count:16});
  addCable(ctx,[[0,6.5,-1.8],[-7,6.5,-1.8],[-7,5,-1.8]],{insulation:M.iBlue,count:20});
  ctx.update=()=>{
    const on=isClosed();
    sw1.userData.pivot.rotation.x=ctx.s1===0?-0.05:0.28;
    sw2.userData.pivot.rotation.x=ctx.s2===0?-0.05:0.28;
    for(const L of ctx.lamps){const u=L.obj.userData;u.light.intensity+=((on?5:0)-u.light.intensity)*0.14;u.filament.material.emissiveIntensity+=((on?5:0.1)-u.filament.material.emissiveIntensity)*0.14;u.glow.material.emissiveIntensity+=((on?1.5:0.05)-u.glow.material.emissiveIntensity)*0.14;}
  };
  ctx.buttons=[
    {getLabel:()=>`مفتاح 1: ${ctx.s1===0?'↑':'↓'}`,getActive:()=>true,onClick:()=>{ctx.s1=1-ctx.s1;}},
    {getLabel:()=>`مفتاح 2: ${ctx.s2===0?'↑':'↓'}`,getActive:()=>true,onClick:()=>{ctx.s2=1-ctx.s2;}}
  ];
  return ctx;
}
function buildSocket(){
  const ctx=newCtx();ctx.target=[0,3,0];ctx.camPos=[0,4,15];
  ctx.group.add(wall(14,9,0,3.5,-2));
  ctx.group.add(mk(new THREE.BoxGeometry(2.6,3.4,0.5),M.plate,-5,3,-1.75));
  ctx.group.add(mk(new THREE.BoxGeometry(2.2,1.2,0.05),M.dark,-5,3.5,-1.45));
  const mcb=breaker(16,0xd0433b);mcb.position.set(-5,3,-1.35);mcb.scale.setScalar(0.45);ctx.group.add(mcb);
  const ob=wallBox();ob.position.set(3.5,3,-1.2);ctx.group.add(ob);
  const out=wallOutlet();out.position.set(3.5,3,-0.65);ctx.group.add(out);
  addCable(ctx,[[-3.7,3.8,-1.5],[0,3.8,-1.5],[3.5,3.7,-1.5]],{insulation:M.iRed,count:20});
  addCable(ctx,[[-3.7,3.4,-1.5],[0,3.4,-1.5],[3.5,3.3,-1.5]],{insulation:M.iBlue,count:20});
  addCable(ctx,[[-3.7,3.0,-1.5],[0,3.0,-1.5],[3.5,2.9,-1.5]],{insulation:M.iGreen,count:20});
  const rose=ceilingRose();rose.position.set(3.5,6.5,-1.8);ctx.group.add(rose);
  addLampAt(ctx,[3.5,5.65,-1.8],0.7);
  addCable(ctx,[[3.5,3.7,-1.8],[3.5,6,-1.8]],{insulation:M.iRed,count:12});
  addCable(ctx,[[3.5,3.3,-1.8],[4.5,6,-1.8],[3.5,6,-1.8]],{insulation:M.iBlue,count:14});
  ctx.update=()=>{
    const on=ctx.closed;
    if(mcb.userData.lever)mcb.userData.lever.rotation.x=on?-0.15:0.35;
    for(const L of ctx.lamps){const u=L.obj.userData;u.light.intensity+=((on?5:0)-u.light.intensity)*0.14;u.filament.material.emissiveIntensity+=((on?5:0.1)-u.filament.material.emissiveIntensity)*0.14;u.glow.material.emissiveIntensity+=((on?1.5:0.05)-u.glow.material.emissiveIntensity)*0.14;}
  };
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔒 افصل القاطع':'🔓 أغلق القاطع',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}
function buildPanel(){
  const ctx=newCtx();ctx.target=[0,3,0];ctx.camPos=[0,4,17];ctx.branches=[true,true,true];
  ctx.group.add(wall(18,10,0,4,-2));
  ctx.group.add(mk(new THREE.BoxGeometry(4,5.5,0.5),M.plate,-6,3.5,-1.75));
  ctx.group.add(mk(new THREE.BoxGeometry(3.6,2,0.05),M.dark,-6,4.3,-1.45));
  const main=breaker(32,0x2f81f7);main.position.set(-6,4,-1.35);main.scale.setScalar(0.55);ctx.group.add(main);
  const subs=[];
  for(let i=0;i<3;i++){
    const y=2.6-i*1.1;
    const b=breaker(16,[0xd0433b,0x2f81f7,0x2eb872][i]);b.position.set(-6,y,-1.35);b.scale.setScalar(0.45);ctx.group.add(b);
    subs.push(b);
  }
  const ys=[5.5,3.5,1.5],cs=[M.iRed,M.iYellow,M.iGreen];
  for(let i=0;i<3;i++){
    const y=ys[i];
    addCable(ctx,[[-4,y,-1.7],[6.5,y,-1.7]],{insulation:cs[i],count:22});
    addCable(ctx,[[6.5,y,-1.75],[7.5,y-1,-1.75],[-4,y-1,-1.75],[-4,y,-1.75]],{insulation:M.iBlue,count:26,exposeEnds:false});
    const rose=ceilingRose();rose.position.set(5.5,y+0.6,-1.8);ctx.group.add(rose);
    addLampAt(ctx,[5.5,y-0.25,-1.8],0.55,i);
  }
  ctx.update=()=>{
    for(let i=0;i<3;i++)if(subs[i].userData.lever)subs[i].userData.lever.rotation.x=ctx.branches[i]?-0.15:0.35;
    for(const L of ctx.lamps){const on=ctx.branches[L.branch];const u=L.obj.userData;u.light.intensity+=((on?4:0)-u.light.intensity)*0.14;u.filament.material.emissiveIntensity+=((on?4:0.1)-u.filament.material.emissiveIntensity)*0.14;u.glow.material.emissiveIntensity+=((on?1.2:0.05)-u.glow.material.emissiveIntensity)*0.14;}
  };
  ctx.customFlow=()=>ctx.branches.slice();
  ctx.buttons=[
    {getLabel:()=>`فرع 1: ${ctx.branches[0]?'مض':'مطف'}`,getActive:()=>ctx.branches[0],onClick:()=>{ctx.branches[0]=!ctx.branches[0];}},
    {getLabel:()=>`فرع 2: ${ctx.branches[1]?'مض':'مطف'}`,getActive:()=>ctx.branches[1],onClick:()=>{ctx.branches[1]=!ctx.branches[1];}},
    {getLabel:()=>`فرع 3: ${ctx.branches[2]?'مض':'مطف'}`,getActive:()=>ctx.branches[2],onClick:()=>{ctx.branches[2]=!ctx.branches[2];}}
  ];
  return ctx;
}

const CIRCUITS={
  simple:{label:'دارة بسيطة',title:'دارة إنارة بسيطة',desc:'مفتاح جداري يتحكم بمصباح.',build:buildSimple},
  series:{label:'على التوالي',title:'دارة على التوالي',desc:'مصباحان على نفس المسار - إضاءة أضعف.',build:buildSeries},
  parallel:{label:'على التوازي',title:'دارة على التوازي',desc:'فرعان مستقلان.',build:buildParallel},
  va:{label:'دارة الدرج',title:'دارة الدرج',desc:'مفتاحان يتحكمان بمصباح واحد.',build:buildVa},
  socket:{label:'المقبس',title:'مقبس مع قاطع',desc:'قاطع 16A يحمي فرع المقبس.',build:buildSocket},
  panel:{label:'لوحة التوزيع',title:'لوحة توزيع',desc:'قاطع رئيسي + 3 فروع.',build:buildPanel}
};
let curGrp=null,actCtx=null;
function renderControls(){
  controlsEl.innerHTML='';if(!actCtx)return;
  for(const b of actCtx.buttons){
    const btn=document.createElement('button');btn.textContent=b.getLabel();
    if(!b.getActive())btn.classList.add('off');
    btn.onclick=()=>{b.onClick();renderControls();};
    controlsEl.appendChild(btn);
  }
}
function loadCircuit(k){
  if(curGrp)scene.remove(curGrp);
  const cfg=CIRCUITS[k];
  try{actCtx=cfg.build();}catch(e){infoEl.innerHTML='<h2>خطأ</h2><p>'+e.message+'</p>';console.error(e);return;}
  curGrp=actCtx.group;scene.add(curGrp);
  controls.target.set(actCtx.target[0],actCtx.target[1],actCtx.target[2]);
  camera.position.set(actCtx.camPos[0],actCtx.camPos[1],actCtx.camPos[2]);
  controls.update();
  infoEl.innerHTML='<h2>'+cfg.title+'</h2><p>'+cfg.desc+'</p>';
  [...tabsEl.children].forEach(b=>b.classList.toggle('active',b.dataset.k===k));
  renderControls();
}
function buildTabs(){
  for(const[k,v]of Object.entries(CIRCUITS)){
    const b=document.createElement('button');b.className='tab';b.dataset.k=k;
    b.textContent=v.label;b.onclick=()=>loadCircuit(k);tabsEl.appendChild(b);
  }
}
function resize(){
  const r=viewer.getBoundingClientRect();
  if(r.width<1||r.height<1)return;
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
window.addEventListener('resize',resize);
let lastT=performance.now();
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(),dt=Math.min(0.05,(now-lastT)/1000);lastT=now;
  if(actCtx){
    const mask=actCtx.customFlow?actCtx.customFlow():(actCtx.closed?true:false);
    for(let wi=0;wi<actCtx.wires.length;wi++){
      const w=actCtx.wires[wi];let flow=mask;
      if(Array.isArray(mask)){
        const wpc=Math.max(1,Math.floor(actCtx.wires.length/3));
        flow=mask[Math.min(2,Math.floor(wi/wpc))];
      }
      for(const e of w.electrons){
        if(flow){e.visible=true;e.userData.offset=(e.userData.offset+0.3*dt)%1;w.curve.getPointAt(e.userData.offset,e.position);}
        else e.visible=false;
      }
    }
    if(actCtx.update)actCtx.update();
  }
  controls.update();renderer.render(scene,camera);
}
buildTabs();loadCircuit('simple');
requestAnimationFrame(()=>{resize();animate();});
