import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function create3DViewer(canvas, opts){
  opts = opts || {};
  const onPick = opts.onPick || function(){};
  const getData = opts.getData || function(){ return { walls: [], rooms: [], openings: [] }; };

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.antialias = true;
  renderer.powerPreference = 'high-performance';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  camera.position.set(12, 10, 12);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = 2;
  controls.maxDistance = 100;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 1.4, 0);
  controls.zoomSpeed = 1.2;

  // الإضاءة
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  scene.add(new THREE.HemisphereLight(0xddeeff, 0x2a3545, 0.85));
  const warm = new THREE.PointLight(0xffddaa, 0.5, 15);
  warm.position.set(0, 2.5, 0);
  scene.add(warm);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(15, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(768, 768);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  // (rim light removed for perf)

  // المواد
  const MAT = {
    wallSide: new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.92, metalness: 0.01 }),
    wallFaceA: new THREE.MeshStandardMaterial({ color: 0xfaf3e0, roughness: 0.9, side: THREE.DoubleSide }),
    wallFaceB: new THREE.MeshStandardMaterial({ color: 0xe0d8c5, roughness: 0.9, side: THREE.DoubleSide }),
    wallTop: new THREE.MeshStandardMaterial({ color: 0xc8c4b8, roughness: 0.82 }),
    baseboard: new THREE.MeshStandardMaterial({ color: 0xf5f0e5, roughness: 0.7 }),
    crown: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x33404e, roughness: 0.8 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x2a2a2a, emissiveIntensity: 0.15 }),
    door: new THREE.MeshStandardMaterial({ color: 0xc98b3a, roughness: 0.55 }),
    window: new THREE.MeshPhysicalMaterial({ color: 0xaaddff, transmission: 0.85, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, ior: 1.45, thickness: 0.3 }),
    highlight: new THREE.MeshStandardMaterial({ color: 0x7c5cff, emissive: 0x7c5cff, emissiveIntensity: 0.4, roughness: 0.5, transparent: true, opacity: 0.7 })
  };

  // مجموعات المشهد
  const buildingGroup = new THREE.Group();
  scene.add(buildingGroup);
  const highlights = [];

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pickables = [];

  canvas.addEventListener('pointerdown', onDown);

  let downPos = null;
  function onDown(e){
    downPos = { x: e.clientX, y: e.clientY };
  }
  canvas.addEventListener('pointerup', onUp);
  function onUp(e){
    if(!downPos) return;
    const d = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if(d > 8) return; // drag → ignore
    // raycast
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if(hits.length === 0) return;
    const obj = hits[0].object;
    if(obj.userData && obj.userData.kind){
      onPick(obj.userData);
    }
  }

  function resize(){
    const r = canvas.getBoundingClientRect();
    if(r.width < 1 || r.height < 1) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);

  function animate(){
    requestAnimationFrame(animate);
    try {
      controls.update();
      renderer.render(scene, camera);
    } catch(e) { console.error(e); }
  }
  setTimeout(function(){ resize(); animate(); }, 50);

  function clearBuilding(){
    while(buildingGroup.children.length > 0){
      const c = buildingGroup.children[0];
      buildingGroup.remove(c);
      if(c.geometry) c.geometry.dispose();
    }
    pickables = [];
    highlights.length = 0;
  }

  function buildFromData(){
    clearBuilding();
    const data = getData();
    const walls = data.walls || [];
    const rooms = data.rooms || [];
    const openings = data.openings || [];

    if(walls.length === 0 && rooms.length === 0){
      return;
    }

    // حساب bounding box
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for(const w of walls){
      minX = Math.min(minX, w.x1, w.x2);
      maxX = Math.max(maxX, w.x1, w.x2);
      minZ = Math.min(minZ, w.z1, w.z2);
      maxZ = Math.max(maxZ, w.z1, w.z2);
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    // أرضية البناية
    const W = (maxX - minX) + 2;
    const D = (maxZ - minZ) + 2;
    const floorGeo = new THREE.BoxGeometry(W, 0.2, D);
    const floorMesh = new THREE.Mesh(floorGeo, MAT.floor);
    floorMesh.position.set(cx, -0.1, cz);
    floorMesh.receiveShadow = true;
    buildingGroup.add(floorMesh);

    // الشبكة الأرضية
    const grid = new THREE.GridHelper(Math.max(W, D) * 1.5, Math.max(W, D) * 2, 0x2a3646, 0x1a2432);
    grid.position.set(cx, 0, cz);
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    buildingGroup.add(grid);

    // الجدران
    for(const w of walls){
      const dx = w.x2 - w.x1;
      const dz = w.z2 - w.z1;
      const len = Math.hypot(dx, dz);
      if(len < 0.01) continue;
      const t = w.t || 0.2;
      const h = w.h || 2.8;

      // الجسم
      const geo = new THREE.BoxGeometry(len, h, t);
      const mats = [MAT.wallSide, MAT.wallSide, MAT.wallTop, MAT.wallTop, MAT.wallFaceB, MAT.wallFaceA];
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set((w.x1 + w.x2) / 2, h / 2, (w.z1 + w.z2) / 2);
      mesh.rotation.y = -Math.atan2(dz, dx);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { kind: 'wall', wallId: w.id };
      buildingGroup.add(mesh);
      pickables.push(mesh);

      // قاعدة الجدار (Baseboard) — شريط رقيق في الأسفل
      const bbGeo = new THREE.BoxGeometry(len, 0.08, t + 0.04);
      const bbMesh = new THREE.Mesh(bbGeo, MAT.baseboard);
      bbMesh.position.set((w.x1+w.x2)/2, 0.04, (w.z1+w.z2)/2);
      bbMesh.rotation.y = -Math.atan2(dz, dx);
      bbMesh.castShadow = true;
      bbMesh.receiveShadow = true;
      bbMesh.raycast = function(){};
      buildingGroup.add(bbMesh);

      // تاج الجدار (Crown molding) — شريط في الأعلى
      const crGeo = new THREE.BoxGeometry(len, 0.06, t + 0.05);
      const crMesh = new THREE.Mesh(crGeo, MAT.crown);
      crMesh.position.set((w.x1+w.x2)/2, h - 0.03, (w.z1+w.z2)/2);
      crMesh.rotation.y = -Math.atan2(dz, dx);
      crMesh.castShadow = true;
      crMesh.raycast = function(){};
      buildingGroup.add(crMesh);

    }
    // الأسقف
    for(const r of rooms){
      if(!r.points || r.points.length < 3) continue;
      const shape = new THREE.Shape();
      shape.moveTo(r.points[0].x - cx, -(r.points[0].z - cz));
      for(let i = 1; i < r.points.length; i++){
        shape.lineTo(r.points[i].x - cx, -(r.points[i].z - cz));
      }
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geo, MAT.ceiling);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(cx, 2.8 - 0.02, cz);
      mesh.userData = { kind: 'ceil', roomId: r.id };
      buildingGroup.add(mesh);
      pickables.push(mesh);
    }

    // ===== أبواب ونوافذ واقعية =====
    for(const op of openings){
      const w = walls.find(x => x.id === op.wallId);
      if(!w) continue;
      const dx = w.x2 - w.x1;
      const dz = w.z2 - w.z1;
      const len = Math.hypot(dx, dz);
      if(len < 0.01) continue;
      const t = w.t || 0.2;
      const h = w.h || 2.8;
      const px = w.x1 + dx * op.t;
      const pz = w.z1 + dz * op.t;
      const ww = op.w || (op.kind === 'door' ? 0.9 : 1.2);
      const wh = op.h || (op.kind === 'door' ? 2.1 : 1.4);
      const baseY = op.kind === 'door' ? 0 : 0.9;
      const angle = -Math.atan2(dz, dx);

      const group = new THREE.Group();
      group.position.set(px, baseY, pz);
      group.rotation.y = angle;
      buildingGroup.add(group);

      if(op.kind === 'door'){
        buildDoor(group, ww, wh, t);
      } else {
        buildWindow(group, ww, wh, t);
      }
    }

    function buildDoor(g, ww, wh, t){
      const frameW = 0.10;
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.55, metalness: 0.05 });
      const panelMat = new THREE.MeshStandardMaterial({ color: 0xa67142, roughness: 0.6 });
      const knobMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.25, metalness: 0.9 });
      const depth = t * 1.08;

      // إطار علوي
      const top = new THREE.Mesh(new THREE.BoxGeometry(ww, frameW, depth), frameMat);
      top.position.set(0, wh - frameW/2, 0);
      top.castShadow = true; g.add(top);

      // جانبان
      for(const sx of [-1, 1]){
        const side = new THREE.Mesh(new THREE.BoxGeometry(frameW, wh, depth), frameMat);
        side.position.set(sx * (ww/2 - frameW/2), wh/2, 0);
        side.castShadow = true; g.add(side);
      }

      // جسم الباب (مع تبويب داخلي)
      const panelW = ww - frameW * 2;
      const panelH = wh - frameW;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, t * 0.5), panelMat);
      panel.position.set(0, panelH/2, 0);
      panel.castShadow = true;
      g.add(panel);

      // تجاويف داخلية (نقش)
      const recessMat = new THREE.MeshStandardMaterial({ color: 0x7d5124, roughness: 0.7 });
      for(const box of [
        { w: panelW * 0.7, h: panelH * 0.35, y: panelH * 0.72 },
        { w: panelW * 0.7, h: panelH * 0.35, y: panelH * 0.28 }
      ]){
        const r = new THREE.Mesh(new THREE.BoxGeometry(box.w, box.h, 0.03), recessMat);
        r.position.set(0, box.y, t * 0.25);
        g.add(r);
      }

      // مقبض الباب
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 16), knobMat);
      knob.position.set(panelW/2 - 0.13, wh * 0.45, t * 0.4);
      knob.castShadow = true;
      g.add(knob);
      // ذراع المقبض
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 12), knobMat);
      stem.rotation.z = Math.PI/2;
      stem.position.set(panelW/2 - 0.18, wh * 0.45, t * 0.4);
      g.add(stem);

      // مفصلات (3 على الجانب)
      const hingeMat = new THREE.MeshStandardMaterial({ color: 0xb88a3a, roughness: 0.3, metalness: 0.9 });
      for(const y of [wh * 0.15, wh * 0.5, wh * 0.85]){
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), hingeMat);
        hinge.position.set(-panelW/2 - 0.02, y, 0);
        g.add(hinge);
      }

      // عتبة سفلية
      const sill = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.04, depth), frameMat);
      sill.position.set(0, 0.02, 0);
      g.add(sill);
    }

    function buildWindow(g, ww, wh, t){
      const frameW = 0.09;
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05 });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xcfe8ff,
        transmission: 0.92,
        roughness: 0.03,
        metalness: 0.0,
        transparent: true,
        opacity: 0.35,
        ior: 1.5,
        thickness: 0.05
      });
      const depth = t * 1.08;

      // إطار (4 قطع)
      const top = new THREE.Mesh(new THREE.BoxGeometry(ww, frameW, depth), frameMat);
      top.position.set(0, wh - frameW/2, 0);
      top.castShadow = true; g.add(top);

      const bottom = new THREE.Mesh(new THREE.BoxGeometry(ww, frameW, depth), frameMat);
      bottom.position.set(0, frameW/2, 0);
      bottom.castShadow = true; g.add(bottom);

      for(const sx of [-1, 1]){
        const side = new THREE.Mesh(new THREE.BoxGeometry(frameW, wh, depth), frameMat);
        side.position.set(sx * (ww/2 - frameW/2), wh/2, 0);
        side.castShadow = true; g.add(side);
      }

      // زجاج
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(ww - frameW*2, wh - frameW*2, 0.02),
        glassMat
      );
      glass.position.set(0, wh/2, 0);
      g.add(glass);

      // عارضة عمودية + أفقية (Mullions)
      const mV = new THREE.Mesh(new THREE.BoxGeometry(0.04, wh - frameW*2, depth * 0.7), frameMat);
      mV.position.set(0, wh/2, 0);
      g.add(mV);
      const mH = new THREE.Mesh(new THREE.BoxGeometry(ww - frameW*2, 0.04, depth * 0.7), frameMat);
      mH.position.set(0, wh/2, 0);
      g.add(mH);

      // حافة سفلية ممتدة (Sill)
      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(ww + 0.12, 0.05, depth + 0.1),
        frameMat
      );
      sill.position.set(0, -0.025, 0);
      sill.castShadow = true;
      g.add(sill);

      // مقبض النافذة
      const hMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.3, metalness: 0.85 });
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), hMat);
      handle.position.set(0, wh * 0.5, t * 0.6);
      g.add(handle);
    }

    // ضبط الكاميرا
    const size = Math.max(maxX - minX, maxZ - minZ, 8);
    camera.position.set(cx + size * 1.1, size * 1.0, cz + size * 1.1);
    controls.target.set(cx, 1.4, cz);
    controls.update();
  }

  function fitView(){
    const data = getData();
    const walls = data.walls || [];
    if(!walls.length) return;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for(const w of walls){
      minX = Math.min(minX, w.x1, w.x2);
      maxX = Math.max(maxX, w.x1, w.x2);
      minZ = Math.min(minZ, w.z1, w.z2);
      maxZ = Math.max(maxZ, w.z1, w.z2);
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxZ - minZ, 6);
    camera.position.set(cx + size * 1.1, size * 0.9, cz + size * 1.1);
    controls.target.set(cx, 1.4, cz);
    controls.update();
  }

  return {
    scene, camera, controls, renderer,
    buildFromData, fitView,
    resize: function(){ resize(); },
    MAT
  };
}
