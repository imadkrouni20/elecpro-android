import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.getElementById('c'),viewer=document.getElementById('viewer');
const tabsEl=document.getElementById('tabs'),infoEl=document.getElementById('info'),controlsEl=document.getElementById('controls');

const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0a0e13);
scene.fog=new THREE.Fog(0x0a0e13,28,60);

const pmrem=new THREE.PMREMGenerator(renderer);
const ec=document.createElement('canvas');ec.width=256;ec.height=128;
const ex=ec.getContext('2d');const gg=ex.createLinearGradient(0,0,0,128);
gg.addColorStop(0,'#d8e4f0');gg.addColorStop(0.45,'#7a8a9a');gg.addColorStop(1,'#202830');
ex.fillStyle=gg;ex.fillRect(0,0,256,128);
const et=new THREE.CanvasTexture(ec);
et.mapping=THREE.EquirectangularReflectionMapping;et.colorSpace=THREE.SRGBColorSpace;
scene.environment=pmrem.fromEquirectangular(et).texture;

const camera=new THREE.PerspectiveCamera(45,1,0.1,200);
camera.position.set(0,4,14);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=0.08;
controls.minDistance=5;controls.maxDistance=32;
controls.minPolarAngle=0.15;controls.maxPolarAngle=Math.PI*0.6;
controls.autoRotate=true;controls.autoRotateSpeed=0.3;
controls.target.set(0,1,0);

scene.add(new THREE.HemisphereLight(0xd4e4f4,0x1a2230,0.55));
const key=new THREE.DirectionalLight(0xffffff,2.5);
key.position.set(7,12,6);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-16;key.shadow.camera.right=16;
key.shadow.camera.top=16;key.shadow.camera.bottom=-16;
key.shadow.bias=-0.0003;key.shadow.normalBias=0.02;
scene.add(key);
const rim=new THREE.DirectionalLight(0x88bbff,0.4);rim.position.set(-8,5,-8);scene.add(rim);

const M={
  wall:new THREE.MeshStandardMaterial({color:0xdde3e8,roughness:0.95}),
  plate:new THREE.MeshPhysicalMaterial({color:0xfafbfc,roughness:0.3,metalness:0.05,clearcoat:0.7,clearcoatRoughness:0.25}),
  plateDark:new THREE.MeshPhysicalMaterial({color:0x1a1d21,roughness:0.35,metalness:0.1,clearcoat:0.6}),
  chrome:new THREE.MeshPhysicalMaterial({color:0xe8ecf0,roughness:0.12,metalness:1.0}),
  brass:new THREE.MeshPhysicalMaterial({color:0xd4a340,roughness:0.22,metalness:1.0}),
  copper:new THREE.MeshPhysicalMaterial({color:0xc47830,roughness:0.25,metalness:1.0}),
  steel:new THREE.MeshPhysicalMaterial({color:0xc0c6cc,roughness:0.22,metalness:1.0}),
  dark:new THREE.MeshStandardMaterial({color:0x14171c,roughness:0.6}),
  grey:new THREE.MeshStandardMaterial({color:0x6a7078,roughness:0.65}),
  iRed:new THREE.MeshPhysicalMaterial({color:0xb82222,roughness:0.5,sheen:1,sheenRoughness:0.6,sheenColor:0xff7777}),
  iBlue:new THREE.MeshPhysicalMaterial({color:0x1a5ac0,roughness:0.5,sheen:1,sheenRoughness:0.6,sheenColor:0x6699ee}),
  iGreen:new THREE.MeshPhysicalMaterial({color:0x188a4a,roughness:0.5,sheen:1,sheenRoughness:0.6,sheenColor:0x66ffaa}),
  iYellow:new THREE.MeshPhysicalMaterial({color:0xd8b010,roughness:0.5,sheen:1,sheenRoughness:0.6,sheenColor:0xffee88}),
  glass:new THREE.MeshPhysicalMaterial({color:0xffffff,transmission:0.95,roughness:0.05,ior:1.5,thickness:0.5,transparent:true,opacity:0.6}),
  filament:new THREE.MeshStandardMaterial({color:0xffcc33,emissive:0xffaa22,emissiveIntensity:0,roughness:0.3}),
  bulbOn:new THREE.MeshStandardMaterial({color:0xfff5d0,emissive:0xffcc55,emissiveIntensity:0,roughness:0.3,transparent:true,opacity:0.85}),
};
const SG={s:new THREE.SphereGeometry(1,20,14),sHi:new THREE.SphereGeometry(1,28,20)};
const mk=(g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;};
const bx=(w,h,d,m,x=0,y=0,z=0)=>mk(new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cy=(rt,rb,h,m,x=0,y=0,z=0,s=24)=>mk(new THREE.CylinderGeometry(rt,rb,h,s),m,x,y,z);
const sp=(r,m,x=0,y=0,z=0,hi=false)=>{const o=new THREE.Mesh(hi?SG.sHi:SG.s,m);o.scale.setScalar(r);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;};
const tr=(R,r,m,x=0,y=0,z=0)=>mk(new THREE.TorusGeometry(R,r,12,32),m,x,y,z);

function newCtx(){
  return{group:new THREE.Group(),wires:[],lamps:[],switches:[],closed:true,
    target:[0,1.5,0],camPos:[0,4,14],buttons:[],update:null,flowAll:true};
}
function addCable(ctx,points,opts={}){
  const c=cable(points,opts);ctx.group.add(c.group);ctx.wires.push(c);return c;
}
function addLampAt(ctx,pos,size=0.65,branch=-1){
  const b=bulbE27(size);b.position.set(...pos);ctx.group.add(b);
  const e={obj:b,base:4.5,branch};ctx.lamps.push(e);return e;
}

/* دارة 1: دارة بسيطة بمفتاح جداري */
function buildSimple(){
  const ctx=newCtx();ctx.target=[0,2,0];ctx.camPos=[0,4,14];
  ctx.group.add(wall(14,8,0.4,0,3.5,-2.2));
  const box=wallBox(1.4,1.4,0.9);box.position.set(0,5.5,-1.2);ctx.group.add(box);
  const sw=wallSwitch();sw.position.set(0,5.5,-0.65);ctx.group.add(sw);

  // كابل من صندوق التوزيع (الأسفل الأيسر) إلى المفتاح
  addCable(ctx,[[-5,1.2,-1.8],[-3.5,1.2,-1.8],[-2,3.5,-1.8],[-0.4,5.5,-1.8]],
    {insulation:M.iRed,count:20,radius:0.075});
  // كابل من المفتاح إلى المصباح (الأعلى)
  addCable(ctx,[[0.4,5.5,-1.8],[2.5,6,-1.8],[3.5,6.5,-1.8]],
    {insulation:M.iRed,count:14,radius:0.075});
  // كابل العودة من المصباح إلى اللوحة (محايد أزرق)
  addCable(ctx,[[3.5,5.6,-1.8],[5,1.2,-1.8]],
    {insulation:M.iBlue,count:16,radius:0.075});
  // أرضي أخضر/أصفر
  addCable(ctx,[[-5,0.6,-1.8],[-3.5,0.6,-1.8],[-2,2.5,-1.8],[0,5.5,-1.8],[3.5,5.6,-1.8],[5,0.6,-1.8]],
    {insulation:M.iGreen,count:18,radius:0.055,exposeEnds:false});

  const rose=ceilingRose();rose.position.set(3.5,7,-1.8);ctx.group.add(rose);
  addLampAt(ctx,[3.5,6.15,-1.8],0.7);

  ctx.update=()=>{
    const on=ctx.closed;
    sw.userData.pivot.rotation.x=on?-0.05:0.28;
    for(const L of ctx.lamps){
      const g=L.obj.userData;
      g.light.intensity+=( (on?5:0) - g.light.intensity )*0.14;
      g.filament.material.emissiveIntensity+=( (on?6:0) - g.filament.material.emissiveIntensity )*0.14;
      M.bulbOn.emissiveIntensity+=( (on?1.6:0) - M.bulbOn.emissiveIntensity )*0.14;
    }
  };
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔒 فتح المفتاح':'🔓 غلق المفتاح',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}

/* دارة 2: التوالي - مصباحان */
function buildSeries(){
  const ctx=newCtx();ctx.target=[0,3,0];ctx.camPos=[0,5,16];
  ctx.group.add(wall(14,9,0.4,0,3.5,-2.2));

  // كابل ذهاب
  addCable(ctx,[[-5,1.2,-1.8],[-3,1.2,-1.8],[-3,7,-1.8],[-1.5,7.5,-1.8],[-1.5,7.5,-1.5]],
    {insulation:M.iRed,count:20});
  addCable(ctx,[[-1.5,7.5,-1.8],[-1.5,5.2,-1.8]],
    {insulation:M.iRed,count:8});
  addCable(ctx,[[-1.5,4.0,-1.8],[-1.5,2.5,-1.8]],
    {insulation:M.iRed,count:8});
  addCable(ctx,[[-1.5,1.3,-1.8],[-1.5,0.8,-1.8],[-5,0.8,-1.8]],
    {insulation:M.iBlue,count:16});

  addLampAt(ctx,[-1.5,4.6,-1.8],0.7,0);
  addLampAt(ctx,[-1.5,1.85,-1.8],0.7,1);
  const r1=ceilingRose();r1.position.set(-1.5,5.5,-1.8);ctx.group.add(r1);
  const r2=ceilingRose();r2.position.set(-1.5,2.75,-1.8);ctx.group.add(r2);

  // إعادة توزيع الإلكترونات لكل أسلاك هذه الدارة
  // دارة التوالي: نفس التيار يجري في كل الأسلاك

  ctx.update=()=>{
    const on=ctx.closed;
    for(const L of ctx.lamps){
      const g=L.obj.userData;
      g.light.intensity+=((on?2.2:0)-g.light.intensity)*0.14;
      g.filament.material.emissiveIntensity+=((on?2.5:0)-g.filament.material.emissiveIntensity)*0.14;
    }
  };
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔒 اقفل الدارة':'🔓 شغّل الدارة',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}

/* دارة 3: التوازي - مصباحان مستقلان */
function buildParallel(){
  const ctx=newCtx();ctx.target=[0,3,0];ctx.camPos=[0,5,16];
  ctx.group.add(wall(14,9,0.4,0,3.5,-2.2));

  // تغذية عامة
  addCable(ctx,[[-6,1.2,-1.8],[-4.5,1.2,-1.8],[-4.5,7.5,-1.8],[4.5,7.5,-1.8]],
    {insulation:M.iRed,count:26});
  // فرع 1
  addCable(ctx,[[-1.8,7.5,-1.8],[-1.8,6,-1.8]],
    {insulation:M.iRed,count:6});
  addCable(ctx,[[-1.8,5,-1.8],[-1.8,4.2,-1.8],[-1.8,1.2,-1.8],[-4.5,1.2,-1.8]],
    {insulation:M.iBlue,count:18});
  // فرع 2
  addCable(ctx,[[1.8,7.5,-1.8],[1.8,6,-1.8]],
    {insulation:M.iRed,count:6});
  addCable(ctx,[[1.8,5,-1.8],[1.8,4.2,-1.8],[1.8,1.2,-1.8],[-4.5,1.2,-1.8]],
    {insulation:M.iBlue,count:22});

  const r1=ceilingRose();r1.position.set(-1.8,5.5,-1.8);ctx.group.add(r1);
  const r2=ceilingRose();r2.position.set(1.8,5.5,-1.8);ctx.group.add(r2);
  addLampAt(ctx,[-1.8,4.55,-1.8],0.7,0);
  addLampAt(ctx,[ 1.8,4.55,-1.8],0.7,1);

  ctx.update=()=>{
    const on=ctx.closed;
    for(const L of ctx.lamps){
      const g=L.obj.userData;
      g.light.intensity+=((on?5:0)-g.light.intensity)*0.14;
      g.filament.material.emissiveIntensity+=((on?6:0)-g.filament.material.emissiveIntensity)*0.14;
    }
  };
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔒 اقفل الدارة':'🔓 شغّل الدارة',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}

/* دارة 4: الدرج - مفتاحان ومصباح واحد */
function buildVa(){
  const ctx=newCtx();ctx.s1=0;ctx.s2=0;ctx.target=[0,3,0];ctx.camPos=[0,5,16];
  const isClosed=()=>ctx.s1===ctx.s2;
  ctx.group.add(wall(15,9,0.4,0,3.5,-2.2));

  // لوحة الأسفل (يسار) والمفتاحان
  const b1=wallBox();b1.position.set(-4.5,1.8,-1.2);ctx.group.add(b1);
  const sw1=wallSwitch();sw1.position.set(-4.5,1.8,-0.65);ctx.group.add(sw1);
  const b2=wallBox();b2.position.set(4.5,1.8,-1.2);ctx.group.add(b2);
  const sw2=wallSwitch();sw2.position.set(4.5,1.8,-0.65);ctx.group.add(sw2);

  // مصباح في الوسط الأعلى
  const rose=ceilingRose();rose.position.set(0,7,-1.8);ctx.group.add(rose);
  addLampAt(ctx,[0,6.15,-1.8],0.7);

  // تغذية إلى المفتاح 1
  addCable(ctx,[[-7,5,-1.8],[-4.5,5,-1.8],[-4.5,2.6,-1.8]],
    {insulation:M.iRed,count:12});
  // كابلان بين المفتاحين (نافيت)
  addCable(ctx,[[-3.8,2.4,-1.8],[-2,5.5,-1.8],[2,5.5,-1.8],[3.8,2.4,-1.8]],
    {insulation:M.iRed,count:20});
  addCable(ctx,[[-3.8,1.2,-1.8],[-2,0.4,-1.8],[2,0.4,-1.8],[3.8,1.2,-1.8]],
    {insulation:M.iYellow,count:20});
  // من المفتاح 2 إلى المصباح
  addCable(ctx,[[4.5,2.6,-1.8],[4.5,6.5,-1.8],[0.5,6.5,-1.8]],
    {insulation:M.iRed,count:16});
  // عودة المصباح (محايد)
  addCable(ctx,[[0,6.5,-1.8],[-7,6.5,-1.8],[-7,5,-1.8]],
    {insulation:M.iBlue,count:20});

  ctx.update=()=>{
    const on=isClosed();
    sw1.userData.pivot.rotation.x=ctx.s1===0?-0.05:0.28;
    sw2.userData.pivot.rotation.x=ctx.s2===0?-0.05:0.28;
    for(const L of ctx.lamps){
      const g=L.obj.userData;
      g.light.intensity+=((on?5:0)-g.light.intensity)*0.14;
      g.filament.material.emissiveIntensity+=((on?6:0)-g.filament.material.emissiveIntensity)*0.14;
    }
  };
  ctx.buttons=[
    {getLabel:()=>`مفتاح 1: ${ctx.s1===0?'↑ علوي':'↓ سفلي'}`,getActive:()=>true,onClick:()=>{ctx.s1=1-ctx.s1;}},
    {getLabel:()=>`مفتاح 2: ${ctx.s2===0?'↑ علوي':'↓ سفلي'}`,getActive:()=>true,onClick:()=>{ctx.s2=1-ctx.s2;}}
  ];
  return ctx;
}

/* دارة 5: مقبس مع قاطع MCB */
function buildSocket(){
  const ctx=newCtx();ctx.target=[0,3,0];ctx.camPos=[0,4,15];
  ctx.group.add(wall(14,9,0.4,0,3.5,-2.2));

  // لوحة توزيع يسار
  const pan=mk(new THREE.BoxGeometry(2.6,3.4,0.5),M.plate,-5,3,-1.95);ctx.group.add(pan);
  ctx.group.add(mk(new THREE.BoxGeometry(2.2,1.2,0.05),M.dark,-5,3.5,-1.65));
  const mcb=breaker(16,0xd0433b);mcb.position.set(-5,3,-1.55);mcb.scale.setScalar(0.45);ctx.group.add(mcb);

  // مقبس جداري يمين
  const ob=wallBox();ob.position.set(3.5,3,-1.2);ctx.group.add(ob);
  const out=wallOutlet();out.position.set(3.5,3,-0.65);ctx.group.add(out);

  // ثلاث كابلات بين اللوحة والمقبس
  addCable(ctx,[[-3.7,3.8,-1.7],[0,3.8,-1.7],[3.5,3.7,-1.7]],
    {insulation:M.iRed,count:20});
  addCable(ctx,[[-3.7,3.4,-1.7],[0,3.4,-1.7],[3.5,3.3,-1.7]],
    {insulation:M.iBlue,count:20});
  addCable(ctx,[[-3.7,3.0,-1.7],[0,3.0,-1.7],[3.5,2.9,-1.7]],
    {insulation:M.iGreen,count:20});

  // مصباح موصول للمقبس (كأنه حمل)
  const rose=ceilingRose();rose.position.set(3.5,6.5,-1.8);ctx.group.add(rose);
  addLampAt(ctx,[3.5,5.65,-1.8],0.7);
  addCable(ctx,[[3.5,3.7,-1.8],[3.5,6,-1.8]],
    {insulation:M.iRed,count:12});
  addCable(ctx,[[3.5,3.3,-1.8],[4.5,6,-1.8],[3.5,6,-1.8]],
    {insulation:M.iBlue,count:14});

  ctx.update=()=>{
    const on=ctx.closed;
    mcb.userData.lever.rotation.x=on?-0.15:0.35;
    for(const L of ctx.lamps){
      const g=L.obj.userData;
      g.light.intensity+=((on?5:0)-g.light.intensity)*0.14;
      g.filament.material.emissiveIntensity+=((on?6:0)-g.filament.material.emissiveIntensity)*0.14;
    }
  };
  ctx.buttons=[{getLabel:()=>ctx.closed?'🔒 افصل القاطع':'🔓 أغلق القاطع',getActive:()=>ctx.closed,onClick:()=>{ctx.closed=!ctx.closed;}}];
  return ctx;
}

/* دارة 6: لوحة توزيع - 3 فروع مستقلة */
function buildPanel(){
  const ctx=newCtx();ctx.target=[0,3,0];ctx.camPos=[0,4,17];
  ctx.branches=[true,true,true];
  ctx.group.add(wall(18,10,0.4,0,4,-2.2));

  // لوحة رئيسية
  ctx.group.add(mk(new THREE.BoxGeometry(4,5.5,0.5),M.plate,-6,3.5,-1.95));
  ctx.group.add(mk(new THREE.BoxGeometry(3.6,2,0.05),M.dark,-6,4.3,-1.65));
  const main=breaker(32,0x2f81f7);main.position.set(-6,4,-1.5);main.scale.setScalar(0.55);ctx.group.add(main);
  const subs=[];
  for(let i=0;i<3;i++){
    const y=2.6-i*1.1;
    const b=breaker(16,[0xd0433b,0x2f81f7,0x2eb872][i]);b.position.set(-6,y,-1.5);b.scale.setScalar(0.45);ctx.group.add(b);
    subs.push(b);
  }

  // الفروع الثلاثة
  const ys=[5.5,3.5,1.5];
  const colors=[M.iRed,M.iYellow,M.iGreen];
  for(let i=0;i<3;i++){
    const y=ys[i];
    addCable(ctx,[[-4, y,-1.7],[6.5, y,-1.7]],
      {insulation:colors[i],count:24});
    addCable(ctx,[[6.5, y,-1.75],[7.5, y,-1.75],[7.5, y-1,-1.75],[-4, y-1,-1.75],[-4, y,-1.75]],
      {insulation:M.iBlue,count:26,exposeEnds:false});
    const rose=ceilingRose();rose.position.set(5.5, y+0.6,-1.8);ctx.group.add(rose);
    addLampAt(ctx,[5.5, y-0.25,-1.8],0.55,i);
  }

  ctx.update=()=>{
    for(let i=0;i<3;i++){
      const on=ctx.branches[i];
      subs[i].userData.lever.rotation.x=on?-0.15:0.35;
    }
    for(const L of ctx.lamps){
      const on=ctx.branches[L.branch];
      const g=L.obj.userData;
      g.light.intensity+=((on?4:0)-g.light.intensity)*0.14;
      g.filament.material.emissiveIntensity+=((on?5:0)-g.filament.material.emissiveIntensity)*0.14;
    }
  };
  ctx.customFlow=()=>ctx.branches.map(b=>b);
  ctx.buttons=[
    {getLabel:()=>`فرع 1: ${ctx.branches[0]?'مض':'مطف'}`,getActive:()=>ctx.branches[0],onClick:()=>{ctx.branches[0]=!ctx.branches[0];}},
    {getLabel:()=>`فرع 2: ${ctx.branches[1]?'مض':'مطف'}`,getActive:()=>ctx.branches[1],onClick:()=>{ctx.branches[1]=!ctx.branches[1];}},
    {getLabel:()=>`فرع 3: ${ctx.branches[2]?'مض':'مطف'}`,getActive:()=>ctx.branches[2],onClick:()=>{ctx.branches[2]=!ctx.branches[2];}}
  ];
  return ctx;
}

const CIRCUITS={
  simple:{label:'دارة بسيطة',title:'دارة إنارة بسيطة',desc:'مفتاح جداري يتحكم بمصباح - عند غلقه يمر التيار.',build:buildSimple},
  series:{label:'على التوالي',title:'دارة على التوالي',desc:'مصباحان على نفس المسار - إضاءة أضعف ونصف الجهد.',build:buildSeries},
  parallel:{label:'على التوازي',title:'دارة على التوازي',desc:'فرعان مستقلان - عطل أحدهما لا يوقف الآخر.',build:buildParallel},
  va:{label:'دارة الدرج',title:'دارة الدرج (Va-et-vient)',desc:'مفتاحان يتحكمان بمصباح واحد من مكانين.',build:buildVa},
  socket:{label:'المقبس',title:'مقبس مع قاطع MCB',desc:'قاطع 16A يحمي فرع المقبس من الأحمال الزائدة.',build:buildSocket},
  panel:{label:'لوحة التوزيع',title:'لوحة توزيع منزلية',desc:'قاطع رئيسي + 3 فروع مستقلة لغرف مختلفة.',build:buildPanel}
};

let curGrp=null,actCtx=null;
function renderControls(){
  controlsEl.innerHTML='';
  if(!actCtx)return;
  for(const b of actCtx.buttons){
    const btn=document.createElement('button');
    btn.textContent=b.getLabel();
    if(!b.getActive())btn.classList.add('off');
    btn.onclick=()=>{b.onClick();renderControls();};
    controlsEl.appendChild(btn);
  }
}
function loadCircuit(k){
  if(curGrp)scene.remove(curGrp);
  const cfg=CIRCUITS[k];actCtx=cfg.build();curGrp=actCtx.group;
  scene.add(curGrp);
  controls.target.set(...actCtx.target);
  camera.position.set(...actCtx.camPos);
  controls.update();
  infoEl.innerHTML=`<h2>${cfg.title}</h2><p>${cfg.desc}</p>`;
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
      const w=actCtx.wires[wi];
      let flow=mask;
      if(Array.isArray(mask)){
        // نحسب رقم الفرع بناءً على عدد الأسلاك
        const wpc=Math.floor(actCtx.wires.length/3);
        const bi=Math.min(2,Math.floor(wi/wpc));
        flow=mask[bi];
      }
      for(const e of w.electrons){
        if(flow){
          e.visible=true;
          e.userData.offset=(e.userData.offset+0.3*dt)%1;
          w.curve.getPointAt(e.userData.offset,e.position);
        } else e.visible=false;
      }
    }
    if(actCtx.update)actCtx.update();
  }
  controls.update();
  renderer.render(scene,camera);
}
buildTabs();loadCircuit('simple');
requestAnimationFrame(()=>{resize();animate();});
