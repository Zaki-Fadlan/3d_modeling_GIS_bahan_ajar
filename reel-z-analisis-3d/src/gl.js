/* ---------------- WebGL renderer (three.js r149) ----------------
   The scene functions still decide WHAT is on screen and where the camera is;
   this module turns that into lit, shadowed, fogged geometry. Overlays stay on the 2D canvas. */
let GL = null;
function initGL() { GL = (function () {
  THREE.ColorManagement.legacyMode = false;
  const lin = v => Math.pow(v / 255, 2.2);
  const setLin = (arr, i, c) => { arr[i] = lin(c[0]); arr[i + 1] = lin(c[1]); arr[i + 2] = lin(c[2]); };
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const R = new THREE.WebGLRenderer({ canvas: glc, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.setSize(W, H, false);
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.5, 4000);

  /* ---- sky dome + fog (atmospheric perspective) ---- */
  const HOR = new THREE.Color('#8ea8c4'), TOP = new THREE.Color('#1d4688'), BOT = new THREE.Color('#5d7590');
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: new THREE.Vector3(0, 1, 0) }, top: { value: TOP }, hor: { value: HOR }, bot: { value: BOT } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 sunDir, top, hor, bot; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.5)); c = mix(c, bot, clamp(-h * 3.0, 0.0, 1.0));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += vec3(1.0, 0.86, 0.62) * (pow(s, 900.0) * 14.0 + pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.08);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);
  scene.fog = new THREE.FogExp2(new THREE.Color('#8ea8c4'), 0.0014);

  /* ---- light: sun with soft shadows, sky/ground bounce ---- */
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xc9dcff, 0x5a4a35, 0.55); scene.add(hemi);
  // environment map from the sky itself (gives water and glass their reflections)
  { const pm = new THREE.PMREMGenerator(R); const es = new THREE.Scene(); const s2 = sky.clone(); s2.material = skyMat.clone(); s2.material.uniforms.sunDir.value = new THREE.Vector3(-0.5, 0.7, -0.5); es.add(s2);
    scene.environment = pm.fromScene(es, 0.02).texture; scene.environment.encoding = THREE.LinearEncoding; }

  /* ---- procedural textures ---- */
  function noiseTex(size, lo, hi, seed, blur) {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const id = g.createImageData(size, size); const r = rng(seed);
    // two-octave value noise, tileable
    const N = 32, grid = []; for (let i = 0; i < N * N; i++) grid.push(r());
    const vn = (x, y, n) => { const xi = Math.floor(x) % n, yi = Math.floor(y) % n, xf = x - Math.floor(x), yf = y - Math.floor(y); const s = t => t * t * (3 - 2 * t);
      const a = grid[(yi % N) * N + xi % N], b = grid[(yi % N) * N + (xi + 1) % n % N], c2 = grid[((yi + 1) % n % N) * N + xi % N], d = grid[((yi + 1) % n % N) * N + (xi + 1) % n % N];
      return lerp(lerp(a, b, s(xf)), lerp(c2, d, s(xf)), s(yf)); };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = 0.5 * vn(x / size * 8, y / size * 8, 8) + 0.3 * vn(x / size * 32, y / size * 32, 32) + 0.2 * r();
      const k = Math.round((lo + (hi - lo) * v) * 255), i = (y * size + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = k; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t;
  }
  const groundDetail = noiseTex(256, 0.72, 1.0, 9); groundDetail.repeat.set(18, 18);
  const waterNormal = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const id = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const a = x / 256 * Math.PI * 2, b = y / 256 * Math.PI * 2;
      const nx = 0.5 * Math.sin(a * 3 + Math.sin(b * 2)) + 0.3 * Math.sin(a * 7 + b * 5), ny = 0.5 * Math.cos(b * 4 + Math.sin(a * 3)) + 0.3 * Math.cos(b * 9 - a * 2);
      const i = (y * 256 + x) * 4; id.data[i] = 128 + nx * 50; id.data[i + 1] = 128 + ny * 50; id.data[i + 2] = 255; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t; })();

  const all = [];
  const reg = o => { all.push(o); scene.add(o); o.visible = false; return o; };

  /* ---- heightfield mesh helper ---- */
  function heightMesh(n, ext, hfun, recFn, mat) {
    const g = new THREE.PlaneGeometry(2 * ext, 2 * ext, n, n); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, recs = [];
    for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), z = pos.getZ(k); pos.setY(k, hfun(x, z)); recs.push(recFn(x, z)); }
    g.computeVertexNormals();
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));
    const m = reg(new THREE.Mesh(g, mat)); m.receiveShadow = true; m.castShadow = true; m.userData.recs = recs; return m;
  }
  const terrMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: groundDetail, roughness: 0.96, metalness: 0, envMapIntensity: 0.35 });
  // main terrain: lake beds go below the water plane
  const terrain = heightMesh(160, EXT, (x, z) => Math.max(hRaw(x, z), LAKE - 1.4), (x, z) => {
    const lake = hRaw(x, z) <= LAKE + 0.03, g = lake ? [0, 0] : grad(x, z);
    let aspect = Math.atan2(-g[0], g[1]) * 180 / Math.PI; if (aspect < 0) aspect += 360;
    const h = hT(x, z);
    return { cx: x, cz: z, h, lake, g, slope: Math.atan(Math.hypot(g[0], g[1])) * 180 / Math.PI, aspect, oaz: (Math.atan2(x - O[0], -(z - O[2])) + 2 * Math.PI) % (2 * Math.PI), vis: true, rough: hash2(x, z) };
  }, terrMat);
  for (const c of terrain.userData.recs) c.vis = sightClear(OE, [c.cx, c.h + 0.15, c.cz], 56);

  const waterMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#25506b'), roughness: 0.06, metalness: 0.15, normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.92, envMapIntensity: 1.2 });
  const water = reg(new THREE.Mesh(new THREE.PlaneGeometry(2 * EXT, 2 * EXT).rotateX(-Math.PI / 2), waterMat)); water.receiveShadow = true;

  /* ---- trees (instanced) ---- */
  function treeSet(list, hfun) {
    const n = list.length;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.13, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 1 }), n);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), n);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    list.forEach(([x, y, z, s, v], k) => {
      m4.makeScale(s, s * 1.15, s).setPosition(x, y - 0.05, z); trunk.setMatrixAt(k, m4);
      m4.makeScale(0.95 * s, 0.85 * s, 0.95 * s).setPosition(x, y + 1.55 * s, z); crown.setMatrixAt(k, m4);
      col.setRGB(lin(46 + v * 30), lin(82 + v * 40), lin(40 + v * 18)); crown.setColorAt(k, col);
    });
    for (const o of [trunk, crown]) { o.castShadow = true; o.receiveShadow = true; }
    const grp = new THREE.Group(); grp.add(trunk, crown); return reg(grp);
  }
  const trees = treeSet(TREES);

  /* ---- contour lines ---- */
  const contour = (() => { const p = []; for (const [a, b, lv] of CONTOURS) p.push(a[0], lv + 0.07, a[1], b[0], lv + 0.07, b[1]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return reg(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#2a1f12', transparent: true, opacity: 0.7 }))); })();

  /* ---- LiDAR point clouds (sorted by x so a draw range reveals the sweep) ---- */
  function cloud(list, size) {
    const s = list.slice().sort((a, b) => a[0] - b[0]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.flatMap(p => [p[0], p[1] + 0.05, p[2]]), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(s.length * 3), 3));
    const o = reg(new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true, transparent: true, fog: true })));
    o.userData.pts = s; o.userData.xs = s.map(p => p[0]); return o;
  }
  const ground = cloud(PTS.filter(p => !p[3]), 0.85), canopy = cloud(PTS.filter(p => p[3]), 0.85);

  /* ---- TIN: flat-shaded facets + edges + vertices, triangles ordered for growth ---- */
  const tin = (() => {
    const order = TIN.map((tri, k) => [k, Math.hypot((tri[0][0] + tri[1][0] + tri[2][0]) / 3 - O[0], (tri[0][2] + tri[1][2] + tri[2][2]) / 3 - O[2])]).sort((a, b) => a[1] - b[1]).map(v => v[0]);
    const P = [], E = [], Cc = [];
    for (const k of order) { const t = TIN[k];
      for (const v of t) P.push(v[0], v[1], v[2]);
      E.push(t[0][0], t[0][1] + 0.04, t[0][2], t[1][0], t[1][1] + 0.04, t[1][2], t[1][0], t[1][1] + 0.04, t[1][2], t[2][0], t[2][1] + 0.04, t[2][2], t[2][0], t[2][1] + 0.04, t[2][2], t[0][0], t[0][1] + 0.04, t[0][2]);
      const h = (t[0][1] + t[1][1] + t[2][1]) / 3, c = ramp(HYPSO, h); for (let q = 0; q < 3; q++) Cc.push(lin(c[0]), lin(c[1]), lin(c[2])); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    mesh.castShadow = mesh.receiveShadow = true;
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(E, 3));
    const edges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: '#7ff0ff', transparent: true, opacity: 0.85 }));
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(TIN_V.flatMap(v => [v[0], v[1] + 0.08, v[2]]), 3));
    const verts = new THREE.Points(vg, new THREE.PointsMaterial({ size: 0.75, color: '#47D7EA', sizeAttenuation: true, transparent: true }));
    const grp = new THREE.Group(); grp.add(mesh, edges, verts); grp.userData = { mesh, edges, verts, n: TIN.length }; return reg(grp);
  })();

  /* ---- DEM raster: one prism per cell ---- */
  const dem = (() => {
    const n = DEMN * DEMN, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), xs = [];
    for (let i = 0; i < DEMN; i++) for (let j = 0; j < DEMN; j++) { const k = i * DEMN + j, cx = -EXT + (i + .5) * DEMC, cz = -EXT + (j + .5) * DEMC, h = hT(cx, cz);
      m4.makeScale(DEMC * 0.9, h, DEMC * 0.9).setPosition(cx, 0, cz); im.setMatrixAt(k, m4);
      const c = h <= LAKE + 0.05 ? hex('#2a6aa8') : ramp(HYPSO, Math.round(h)); col.setRGB(lin(c[0]), lin(c[1]), lin(c[2])); im.setColorAt(k, col); xs.push(cx); }
    im.castShadow = im.receiveShadow = true; im.userData.xs = xs; return reg(im);
  })();

  /* ---- voxels ---- */
  const vox = (() => {
    const list = []; for (let i = 0; i < VXN; i++) for (let j = 0; j < VXN; j++) for (let l = 0; l < VXL[i][j]; l++) list.push([i, j, l]);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75 }), list.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    list.forEach(([i, j, l], k) => { m4.makeScale(VXC * 0.97, VXH * 0.97, VXC * 0.97).setPosition(-EXT + (i + .5) * VXC, (l + .5) * VXH, -EXT + (j + .5) * VXC); im.setMatrixAt(k, m4);
      const c = ramp(HYPSO, (l + 1) * VXH); col.setRGB(lin(c[0]), lin(c[1]), lin(c[2])); im.setColorAt(k, col); });
    im.castShadow = im.receiveShadow = true; return reg(im);
  })();

  /* ---- buildings: one instanced pool, windows drawn procedurally per floor in the shader ---- */
  const BOXN = 900;
  const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0, envMapIntensity: 0.6 });
  boxMat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec3 aWin; varying vec3 vWP; varying vec3 vWN; varying vec3 vWin;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 wp4 = modelMatrix * instanceMatrix * vec4(transformed, 1.0); vWP = wp4.xyz; vWN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal); vWin = aWin;`);
    sh.fragmentShader = 'varying vec3 vWP; varying vec3 vWN; varying vec3 vWin;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      if (vWin.x > 0.001 && abs(vWN.y) < 0.5) {
        float f = (vWP.y - vWin.z) / vWin.y;
        float u = (abs(vWN.x) > 0.5 ? vWP.z : vWP.x) / 0.62;
        float ff = fract(f), fu = fract(u);
        float win = step(0.3, ff) * step(ff, 0.82) * step(0.18, fu) * step(fu, 0.82) * step(0.6, f);
        float slab = 1.0 - smoothstep(0.0, 0.06, ff) * (1.0 - smoothstep(0.94, 1.0, ff));
        vec3 glass = vec3(0.10, 0.16, 0.24) + 0.06 * sin(floor(u) * 1.7 + floor(f) * 2.3);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.72, slab * vWin.x * step(0.6, f));
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * vWin.x);
        roughnessFactor = mix(roughnessFactor, 0.12, win * vWin.x);
      }`);
  };
  const boxes = (() => { const g = new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0.5); g.setAttribute('aWin', new THREE.InstancedBufferAttribute(new Float32Array(BOXN * 3), 3));
    const im = new THREE.InstancedMesh(g, boxMat, BOXN); im.castShadow = im.receiveShadow = true; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BOXN * 3), 3); im.frustumCulled = false; return reg(im); })();
  const boxesT = (() => { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, opacity: 0.5, depthWrite: false }), 600);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(600 * 3), 3); im.frustumCulled = false; return reg(im); })();
  let nBox = 0, nBoxT = 0; const M4 = new THREE.Matrix4(), CO = new THREE.Color();
  function box(x0, y0, z0, x1, y1, z1, col, o) {
    o = o || {};
    if (o.alpha != null && o.alpha < 0.99) { if (o.alpha <= 0.01 || nBoxT >= 600) return; M4.makeScale(x1 - x0, Math.max(1e-3, y1 - y0), z1 - z0).setPosition(x0, y0, z0); boxesT.setMatrixAt(nBoxT, M4);
      CO.setRGB(lin(col[0]), lin(col[1]), lin(col[2])); boxesT.setColorAt(nBoxT, CO); nBoxT++; boxesT.material.opacity = o.alpha; return; }
    if (nBox >= BOXN) return;
    M4.makeScale(x1 - x0, Math.max(1e-3, y1 - y0), z1 - z0).setPosition(x0, y0, z0); boxes.setMatrixAt(nBox, M4);
    CO.setRGB(lin(col[0]), lin(col[1]), lin(col[2])); boxes.setColorAt(nBox, CO);
    const a = boxes.geometry.attributes.aWin; a.setXYZ(nBox, o.win || 0, o.floor || 0.35, o.base != null ? o.base : y0); nBox++;
  }

  /* ---- studio plate for 2D / 2.5D / 3D ---- */
  const plate = heightMesh(48, PE, () => 0, () => ({}), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  plate.castShadow = false;
  const plateGrid = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((PN + 1) * 2 * 48 * 2 * 3), 3));
    return reg(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#47D7EA', transparent: true }))); })();
  const shadowCatcher = reg(new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.35 }))); shadowCatcher.receiveShadow = true;

  /* ---- city ground (asphalt, kerbs, lawns) + lake ---- */
  const cityGround = (() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#5f7a4a'; g.fillRect(0, 0, 1024, 1024);
    const r = rng(4); for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${40 + r() * 40},${70 + r() * 50},${30 + r() * 20},0.35)`; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
    const S = 1024 / 84; // world units → px (ground spans ±42)
    g.fillStyle = '#4a4e55'; for (let k = -40; k <= 40; k += 8) { g.fillRect((k + 4 - 0.9 + 42) * S, 0, 1.8 * S, 1024); g.fillRect(0, (k + 4 - 0.9 + 42) * S, 1024, 1.8 * S); }
    g.strokeStyle = 'rgba(235,225,180,0.6)'; g.setLineDash([10, 12]); g.lineWidth = 2;
    for (let k = -40; k <= 40; k += 8) { g.beginPath(); g.moveTo((k + 4 + 42) * S, 0); g.lineTo((k + 4 + 42) * S, 1024); g.stroke(); g.beginPath(); g.moveTo(0, (k + 4 + 42) * S); g.lineTo(1024, (k + 4 + 42) * S); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    const m = reg(new THREE.Mesh(new THREE.PlaneGeometry(84, 84).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }))); m.receiveShadow = true; return m; })();
  const cityLake = (() => { const sh = new THREE.Shape(); sh.absellipse(0, 0, 13, 7.5, 0, Math.PI * 2); const g = new THREE.ShapeGeometry(sh, 48).rotateX(-Math.PI / 2);
    const m = reg(new THREE.Mesh(g, waterMat)); m.position.set(-22, 0.03, 18); m.receiveShadow = true; return m; })();

  /* ---- REAL Kampus UI Depok (from the ui3d pipeline outputs, window.__UI) ---- */
  const UID = window.__UI;
  const uiGrp = reg(new THREE.Group());
  const UIW = (UID.dem.nx - 1) * UID.dem.dx, UIH = (UID.dem.nz - 1) * UID.dem.dx;
  const UIX0 = UID.dem.x0, UIZ0 = UID.dem.z0;
  // ground texture: OSM vegetation, roads and footprints painted onto the DEM extent
  const uiTex = (() => {
    const Wc = 1024, Hc = Math.round(1024 * UIH / UIW), c = document.createElement('canvas'); c.width = Wc; c.height = Hc; const g = c.getContext('2d');
    const X = x => (x - UIX0) / UIW * Wc, Z = z => (z - UIZ0) / UIH * Hc, S = Wc / UIW;
    g.fillStyle = '#7c9455'; g.fillRect(0, 0, Wc, Hc);
    const r = rng(17); for (let k = 0; k < 26000; k++) { g.fillStyle = `rgba(${60 + r() * 50},${85 + r() * 50},${40 + r() * 25},0.35)`; g.fillRect(r() * Wc, r() * Hc, 3, 3); }
    const fillRing = (ring, col) => { g.beginPath(); ring.forEach(([x, z], k) => k ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.closePath(); g.fillStyle = col; g.fill(); };
    for (const v of UID.veg) fillRing(v.r, v.k === 'wood' ? '#3f5f2f' : v.k === 'park' ? '#7da55a' : '#93ad66');
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const rd of UID.roads) { g.beginPath(); rd.p.forEach(([x, z], k) => k ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.strokeStyle = rd.w >= 0.5 ? '#8d8a84' : '#b3ab98'; g.lineWidth = Math.max(1, rd.w * S); g.stroke(); }
    for (const b of UID.buildings) for (const ring of b.rings) fillRing(ring, '#9c9a94');
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  })();
  const dlTex = (() => { const img = new Image(); img.src = UID.dl.png; const t = new THREE.Texture(img); img.onload = () => { t.needsUpdate = true; }; t.encoding = THREE.sRGBEncoding; t.magFilter = THREE.NearestFilter; return t; })();
  // terrain
  const uiTerrain = (() => {
    const g = new THREE.PlaneGeometry(UIW, UIH, UID.dem.nx - 1, UID.dem.nz - 1); g.rotateX(-Math.PI / 2); g.translate(UIX0 + UIW / 2, 0, UIZ0 + UIH / 2);
    const pos = g.attributes.position; for (let k = 0; k < pos.count; k++) pos.setY(k, UID.dem.h[k]);
    g.computeVertexNormals(); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: uiTex, roughness: 0.95, envMapIntensity: 0.3 })); m.receiveShadow = true; uiGrp.add(m); return m;
  })();
  const uiDem = (x, z) => { const fx = (x - UIX0) / UID.dem.dx, fz = (z - UIZ0) / UID.dem.dx, nx = UID.dem.nx, nz = UID.dem.nz;
    const i = clamp(Math.floor(fx), 0, nx - 2), j = clamp(Math.floor(fz), 0, nz - 2), a = clamp(fx - i, 0, 1), b = clamp(fz - j, 0, 1), H_ = UID.dem.h;
    return lerp(lerp(H_[j * nx + i], H_[j * nx + i + 1], a), lerp(H_[(j + 1) * nx + i], H_[(j + 1) * nx + i + 1], a), b); };
  const dlOverlay = (() => { const d = UID.dl, w = d.x1 - d.x0, h = d.z1 - d.z0;
    const g = new THREE.PlaneGeometry(w, h, 90, 180); g.rotateX(-Math.PI / 2); g.translate(d.x0 + w / 2, 0, d.z0 + h / 2);
    const pos = g.attributes.position; for (let k = 0; k < pos.count; k++) pos.setY(k, uiDem(pos.getX(k), pos.getZ(k)) + 0.08);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: dlTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); uiGrp.add(m); return m; })();
  // lakes at their hydro-flattened levels
  const uiLakes = new THREE.Group(); uiGrp.add(uiLakes);
  for (const l of UID.lakes) for (const ring of l.rings) { const sh = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, waterMat); m.position.y = l.y + 0.02; m.receiveShadow = true; uiLakes.add(m); }
  const uiFlood = (() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(UIW, UIH).rotateX(-Math.PI / 2), waterMat); m.position.set(UIX0 + UIW / 2, 0, UIZ0 + UIH / 2); m.receiveShadow = true; uiGrp.add(m); return m; })();
  const uiTrees = (() => { const grp = treeSet(UID.trees); all.splice(all.indexOf(grp), 1); scene.remove(grp); uiGrp.add(grp); grp.visible = true; return grp; })();

  // buildings: one merged extrusion; height growth, colour and hiding are per building
  const uiB = (() => {
    const P = [], Nn = [], A = [], Wn = [], Bi = [];
    UID.buildings.forEach((b, bi) => {
      const delay = Math.hypot(b.cx, b.cz) / 170;
      for (let ring of b.rings) {
        let area = 0; for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length]; area += p[0] * q[1] - q[0] * p[1]; }
        if (area > 0) ring = ring.slice().reverse(); // make it clockwise in (x,z) → outward wall normals
        for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length]; const ex = q[0] - p[0], ez = q[1] - p[1], L_ = Math.hypot(ex, ez) || 1;
          const n = [-ez / L_, 0, ex / L_];
          for (const [v, top] of [[p, 0], [q, 0], [q, 1], [p, 0], [q, 1], [p, 1]]) { P.push(v[0], 0, v[1]); Nn.push(n[0], n[1], n[2]); A.push(b.y0, b.hy, top, delay); Wn.push(1); Bi.push(bi); } }
        const tri = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
        for (const t of tri) for (const k of [t[0], t[2], t[1]]) { P.push(ring[k][0], 0, ring[k][1]); Nn.push(0, 1, 0); A.push(b.y0, b.hy, 1, delay); Wn.push(0); Bi.push(bi); }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    g.setAttribute('aB', new THREE.Float32BufferAttribute(A, 4)); g.setAttribute('aWall', new THREE.Float32BufferAttribute(Wn, 1));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(Bi.length * 3).fill(0.8), 3));
    g.setAttribute('aHide', new THREE.Float32BufferAttribute(new Float32Array(Bi.length), 1));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 });
    const U_ = { uT: { value: 99 }, uLod: { value: 0 }, uFl: { value: 3.5 / UID.U * UID.VE }, uGf: { value: 4.0 / UID.U * UID.VE } };
    mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, U_);
      sh.vertexShader = 'uniform float uT, uLod, uFl, uGf; attribute vec4 aB; attribute float aWall, aHide; varying vec3 vWP; varying float vWall, vY0, vLod;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        float gr = clamp((uT - aB.w) / 0.7, 0.0, 1.0); float c1 = 1.9, c3 = c1 + 1.0; float gm = gr - 1.0; gr = gr >= 1.0 ? 1.0 : 1.0 + c3 * gm * gm * gm + c1 * gm * gm;
        vec3 transformed = position; transformed.y = aB.z > 0.5 ? aB.x + aB.y * gr : aB.x - 0.4;
        if (aHide > 0.5) transformed.y = aB.x - 0.4;
        vWall = aWall; vY0 = aB.x; vLod = uLod * step(aB.y, 999.0);`).replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uLod, uFl, uGf; varying vec3 vWP; varying float vWall, vY0, vLod;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        if (vWall > 0.5 && uLod > 0.001) { float hy = vWP.y - vY0 - uGf; float f = hy / uFl; float u = (vWP.x + vWP.z) / 0.62;
          float ff = fract(f), fu = fract(u); float win = step(0.3, ff) * step(ff, 0.82) * step(0.2, fu) * step(fu, 0.8) * step(0.0, hy);
          float gwin = step(-uGf * 0.75, hy) * step(hy, -uGf * 0.2) * step(0.2, fu) * step(fu, 0.8);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.15, 0.22), (win + gwin) * uLod); roughnessFactor = mix(roughnessFactor, 0.15, (win + gwin) * uLod); }`); };
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; uiGrp.add(m);
    return { m, U: U_, bi: Bi, col: g.attributes.color, hide: g.attributes.aHide };
  })();
  // per-building extruded stacks (built on demand): floors for the height formula, rooms for indoor
  const extrudeRing = (ring, h, col, opacity) => { const sh = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(lin(col[0]), lin(col[1]), lin(col[2])), roughness: 0.75, transparent: opacity != null, opacity: opacity == null ? 1 : opacity }));
    m.castShadow = m.receiveShadow = true; return m; };
  const stacks = {};
  function stack(key, parts) { if (stacks[key]) return stacks[key]; const grp = new THREE.Group(); parts.forEach(p => { const m = extrudeRing(p.ring, p.h, p.col); m.userData = p; grp.add(m); }); uiGrp.add(grp); stacks[key] = grp; return grp; }
  const uiIsTop = (() => { const g = new THREE.BufferGeometry(); return g; })();


  /* ---- reference plane for cut & fill (water-like, with a survey grid) ---- */
  const fillPlane = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(20,40,80,0.35)'; g.lineWidth = 3; for (let k = 0; k <= 512; k += 512 / 14) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return reg(new THREE.Mesh(new THREE.PlaneGeometry(2 * EXT, 2 * EXT).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, color: '#4f8fe0', roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.72, depthWrite: false }))); })();

  /* ---- subsurface voxels: opaque + fading set ---- */
  const geoN = GN * GN * GLV;
  const geoA = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85 }), geoN);
  const geoB = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85, transparent: true }), geoN);
  geoA.castShadow = geoA.receiveShadow = true; geoB.receiveShadow = true;
  const geo = reg(new THREE.Group()); geo.add(geoA, geoB);

  /* ---- buffer sphere ---- */
  const sphere = reg(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({ color: '#ff6b57', transparent: true, opacity: 0.16, roughness: 0.3, depthWrite: false, side: THREE.DoubleSide })));

  /* ---- per-frame state ---- */
  let skyOn = true, exposure = 1.05, rendered = false, amb = 1, bigShadow = false;
  function frame() { if (bigShadow) { Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, far: 500 }); sun.shadow.camera.updateProjectionMatrix(); bigShadow = false; } for (const o of all) o.visible = false; nBox = 0; nBoxT = 0; skyOn = true; exposure = 1.05; rendered = false; amb = 1; }
  function clipPlanes(clip) { if (!clip) return []; return clip.side === 'gt' ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), -clip.sx)] : [new THREE.Plane(new THREE.Vector3(-1, 0, 0), clip.sx)]; }
  function paint(mesh, colorFn) {
    const recs = mesh.userData.recs, arr = mesh.geometry.attributes.color.array;
    for (let k = 0; k < recs.length; k++) setLin(arr, k * 3, colorFn(recs[k]));
    mesh.geometry.attributes.color.needsUpdate = true;
  }

  const api = {
    THREE, scene, R,
    frame,
    sky(on) { skyOn = on; },
    exposure(e) { exposure = e; },
    ambient(k) { amb = k; },
    terrain(opt) {
      terrain.visible = true; const hs = Math.max(0.002, opt.hs == null ? 1 : opt.hs); terrain.scale.y = hs;
      paint(terrain, opt.color || landCol);
      terrain.material.clippingPlanes = clipPlanes(opt.clip);
      if (opt.water !== false) { water.visible = true; water.position.y = (LAKE + 0.02) * hs; water.material.clippingPlanes = clipPlanes(opt.clip); }
      if (opt.trees) { trees.visible = true; trees.scale.y = hs; trees.children.forEach(c => c.material.clippingPlanes = clipPlanes(opt.clip)); }
    },
    contours(hs, a) { if (a <= 0.01) return; contour.visible = true; contour.scale.y = Math.max(0.002, hs); contour.material.opacity = 0.75 * a; },
    lidar(planeX, fresh, drop, tag, canopyOn) {
      for (const [o, isC] of [[ground, false], [canopy, true]]) {
        if (isC && !canopyOn) continue;
        o.visible = true; const xs = o.userData.xs, pts = o.userData.pts; let n = 0; while (n < xs.length && xs[n] <= planeX) n++;
        o.geometry.setDrawRange(0, n); const arr = o.geometry.attributes.color.array;
        for (let k = 0; k < n; k++) { const p = pts[k], f = clamp(1 - (planeX - p[0]) / 10) * fresh;
          let c = isC ? mixc(hex('#3fcb7a'), hex('#b5f5c4'), 0.3) : ramp(HYPSO, p[1]);
          c = mixc(c, C.cyan, f * 0.85); if (isC) c = mixc(c, C.coral, tag); setLin(arr, k * 3, c); }
        o.geometry.attributes.color.needsUpdate = true;
        if (isC) { o.position.y = drop * 6; o.material.opacity = 1 - drop; } else { o.position.y = 0; o.material.opacity = 1; }
      }
    },
    tin(opt) { tin.visible = true; const u = tin.userData, n = opt.count == null ? u.n : opt.count;
      u.mesh.geometry.setDrawRange(0, n * 3); u.edges.geometry.setDrawRange(0, n * 6);
      u.edges.material.opacity = 0.85 * (opt.edge == null ? 1 : opt.edge); u.verts.material.opacity = opt.verts == null ? 1 : opt.verts;
      u.mesh.material.color.setScalar(opt.dark ? 1 - 0.55 * opt.dark : 1);
      for (const o of [u.mesh, u.edges, u.verts]) o.material.clippingPlanes = clipPlanes(opt.clip); },
    dem(opt) { dem.visible = true; dem.count = opt.count == null ? DEMN * DEMN : opt.count; dem.material.clippingPlanes = clipPlanes(opt.clip); dem.position.y = opt.lift || 0; },
    voxels(opt) { vox.visible = true; vox.material.clippingPlanes = clipPlanes(opt.clip); vox.scale.y = opt.grow == null ? 1 : opt.grow; },
    box,
    plateSet(k, hpf, colFn, gridA) {
      plate.visible = true; shadowCatcher.visible = true; shadowCatcher.position.y = -0.4;
      const pos = plate.geometry.attributes.position, carr = plate.geometry.attributes.color.array;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = hpf(x, z, k); pos.setY(i, y); setLin(carr, i * 3, colFn(x, y, z)); }
      pos.needsUpdate = true; plate.geometry.attributes.color.needsUpdate = true; plate.geometry.computeVertexNormals();
      if (gridA > 0.01) { plateGrid.visible = true; plateGrid.material.opacity = gridA; const ga = plateGrid.geometry.attributes.position; let q = 0;
        for (let a = 0; a <= PN; a++) { const v = -PE + a * PC; for (let s = 0; s < 48; s++) { const z0 = -PE + s * 2 * PE / 48, z1 = z0 + 2 * PE / 48;
          ga.setXYZ(q++, v, hpf(v, z0, k) + 0.05, z0); ga.setXYZ(q++, v, hpf(v, z1, k) + 0.05, z1); ga.setXYZ(q++, z0, hpf(z0, v, k) + 0.05, v); ga.setXYZ(q++, z1, hpf(z1, v, k) + 0.05, v); } }
        ga.needsUpdate = true; }
    },
    city(lake) { cityGround.visible = true; cityLake.visible = lake !== false; },
    ui(opt) {
      uiGrp.visible = true; for (const k in stacks) stacks[k].visible = false;
      sun.shadow.camera.left = sun.shadow.camera.bottom = -200; sun.shadow.camera.right = sun.shadow.camera.top = 200; sun.shadow.camera.far = 900; sun.shadow.camera.updateProjectionMatrix(); bigShadow = true;
      uiB.U.uT.value = opt.grow; uiB.U.uLod.value = opt.lod || 0;
      uiLakes.visible = true; uiFlood.visible = opt.flood != null; if (opt.flood != null) uiFlood.position.y = opt.flood;
      dlOverlay.visible = !!opt.dl; if (opt.dl) { dlOverlay.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), opt.dl.z)]; dlOverlay.material.opacity = opt.dl.a; }
      uiTerrain.material.color.setScalar(1 - (opt.dim || 0)); uiTrees.children.forEach(c => c.material.color && c.material.color.setScalar(1 - (opt.dim || 0)));
      const col = uiB.col.array, hid = uiB.hide.array, B = UID.buildings, cache = [], hc = [];
      for (let i = 0; i < B.length; i++) { const c = opt.color(B[i], i); cache.push([lin(c[0]), lin(c[1]), lin(c[2])]); hc.push(opt.hide && opt.hide.has(i) ? 1 : 0); }
      for (let v = 0; v < uiB.bi.length; v++) { const c = cache[uiB.bi[v]]; col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2]; hid[v] = hc[uiB.bi[v]]; }
      uiB.col.needsUpdate = true; uiB.hide.needsUpdate = true;
    },
    uiStack(key, parts) { return stack(key, parts); },
    fill(z0, a) { if (a <= 0.01) return; fillPlane.visible = true; fillPlane.position.y = z0; fillPlane.material.opacity = 0.72 * a; },
    geoSet(sx, iso) {
      geo.visible = true; let a = 0, b = 0;
      for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) { const x = -GE + (i + .5) * GC, z = -GE + (j + .5) * GC; if (x > sx) continue;
        const col = GEO[i][j]; for (let l = 0; l < col.length; l++) { const k = col[l]; M4.makeScale(GC * 0.98, GV * 0.98, GC * 0.98).setPosition(x, (l + .5) * GV, z);
          const c = GEO_COL[k]; CO.setRGB(lin(c[0]), lin(c[1]), lin(c[2]));
          if (k === 2 || iso <= 0) { geoA.setMatrixAt(a, M4); geoA.setColorAt(a, CO); a++; } else { geoB.setMatrixAt(b, M4); geoB.setColorAt(b, CO); b++; } } }
      geoA.count = a; geoB.count = b; geoB.material.opacity = 1 - iso; geoB.visible = iso < 0.98;
      geoA.instanceMatrix.needsUpdate = true; geoB.instanceMatrix.needsUpdate = true; if (geoA.instanceColor) geoA.instanceColor.needsUpdate = true; if (geoB.instanceColor) geoB.instanceColor.needsUpdate = true;
      shadowCatcher.visible = true; shadowCatcher.position.y = -0.05;
    },
    sphere(c, r) { if (r <= 0.01) return; sphere.visible = true; sphere.position.set(c[0], c[1], c[2]); sphere.scale.setScalar(r); },
    render() {
      if (!CAM) return;
      boxes.count = nBox; boxes.visible = nBox > 0; boxes.instanceMatrix.needsUpdate = true; boxes.instanceColor.needsUpdate = true; boxes.geometry.attributes.aWin.needsUpdate = true;
      boxesT.count = nBoxT; boxesT.visible = nBoxT > 0; boxesT.instanceMatrix.needsUpdate = true; boxesT.instanceColor.needsUpdate = true;
      cam.position.set(CAM.P[0], CAM.P[1], CAM.P[2]); cam.up.set(0, 1, 0); cam.lookAt(CAM.t[0], CAM.t[1], CAM.t[2]); cam.fov = CAM.fov;
      cam.setViewOffset(W, H, -CAM.ox, -CAM.oy, W, H); cam.updateProjectionMatrix();
      sky.visible = skyOn; sky.position.copy(cam.position); skyMat.uniforms.sunDir.value.set(SUN[0], SUN[1], SUN[2]);
      scene.fog.density = skyOn ? 0.0014 : 0.0;
      sun.target.position.set(CAM.t[0], 0, CAM.t[2]); sun.position.set(CAM.t[0] + SUN[0] * 400, SUN[1] * 400, CAM.t[2] + SUN[2] * 400);
      sun.intensity = 2.7 * clamp(SUN[1] * 2.2, 0.25, 1);
      waterNormal.offset.set(RT * 0.02, RT * 0.013);
      R.toneMappingExposure = exposure; hemi.intensity = 0.55 * amb; terrMat.envMapIntensity = 0.35 * amb;
      R.setClearColor(0x000000, 0); R.render(scene, cam); rendered = true;
    },
    draw(ctx2) { if (rendered) ctx2.drawImage(glc, 0, 0); }
  };
  return api;
})(); }
