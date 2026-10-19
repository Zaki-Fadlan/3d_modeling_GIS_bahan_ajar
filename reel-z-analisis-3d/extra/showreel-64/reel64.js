/* Reel X — "Z": Konsep Analisis Data 3D.
   Deterministic motion piece: frameAt(t) draws one frame of a 64 s, 24 fps, 1920×1080 film.
   Own software 3D renderer (perspective camera + painter's algorithm) on Canvas2D. */
(function () {
'use strict';
const W = 1920, H = 1080, FPS = 24, DUR = 64;
const cv = document.getElementById('stage');
const ctx = cv.getContext('2d');
const AUD = window.__AUDIO || { bands: { low: [], high: [], rms: [] }, events: [] };

/* ---------------- math ---------------- */
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const ei = t => t * t * t;
const eexp = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const eback = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- colour ---------------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const sc = (c, k) => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
function ramp(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) return mixc(stops[i - 1][1], stops[i][1], (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
}
function hsl(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }

const C = {
  bg: hex('#050C19'), bg2: hex('#0B1931'), navy: hex('#0D2257'), ink: hex('#ECF2FF'), mute: hex('#8C9DBE'),
  gold: hex('#F4C542'), cyan: hex('#47D7EA'), coral: hex('#FF6B57'), green: hex('#5EDB8E'), blue: hex('#3D8BFF'), plate: hex('#13284A')
};
const HYPSO = [[1.2, hex('#2B6352')], [4, hex('#3F7F4E')], [8, hex('#86A055')], [12, hex('#C29A58')], [16, hex('#D8B488')], [21, hex('#F2EADB')]];
const SLOPE = [[0, hex('#2E7D5A')], [8, hex('#8FC25A')], [18, hex('#F2C94C')], [30, hex('#FF7A50')], [42, hex('#D23250')]];
const FONT_D = '"Unbounded", "Arial Black", sans-serif';
const FONT_B = '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';
const FONT_M = '"IBM Plex Mono", "DejaVu Sans Mono", monospace';

/* ---------------- terrain ---------------- */
const G = 56, EXT = 50, CS = 2 * EXT / G, LAKE = 1.2;
const gx = i => -EXT + i * CS;
const g2 = (x, z, cx, cz, s) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
function hRaw(x, z) {
  let h = 3.2 + 15 * g2(x, z, 14, -12, 12.5) + 10 * g2(x, z, -24, 16, 11) + 8 * g2(x, z, -4, -30, 9)
    + 6.5 * g2(x, z, 30, 24, 10) + 4 * g2(x, z, 2, 6, 6) - 7.5 * g2(x, z, -16, -6, 8.5);
  h += 1.1 * Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17 - 0.4) + 0.35 * Math.sin(x * 0.47 + z * 0.31) + 0.12 * Math.cos(x * 0.9 - z * 0.7);
  return h;
}
const hT = (x, z) => Math.max(hRaw(x, z), LAKE);
const HV = new Float32Array((G + 1) * (G + 1));
for (let i = 0; i <= G; i++) for (let j = 0; j <= G; j++) HV[i * (G + 1) + j] = hT(gx(i), gx(j));
const hAt = (i, j) => HV[i * (G + 1) + j];
function grad(x, z) { const e = 0.6; return [(hRaw(x + e, z) - hRaw(x - e, z)) / (2 * e), (hRaw(x, z + e) - hRaw(x, z - e)) / (2 * e)]; }

const O = [14, 0, -12]; O[1] = hT(O[0], O[2]); const EYE = 3.2;
const OE = [O[0], O[1] + EYE, O[2]];

const CELLS = [];
for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
  const cx = gx(i) + CS / 2, cz = gx(j) + CS / 2;
  const h = (hAt(i, j) + hAt(i + 1, j) + hAt(i, j + 1) + hAt(i + 1, j + 1)) / 4;
  const lake = hRaw(cx, cz) <= LAKE + 0.05;
  const g = lake ? [0, 0] : grad(cx, cz);
  const slope = Math.atan(Math.hypot(g[0], g[1])) * 180 / Math.PI;
  // aspect: compass bearing of downslope; north = -z, east = +x
  let aspect = Math.atan2(-g[0], g[1]) * 180 / Math.PI; if (aspect < 0) aspect += 360;
  const az = Math.atan2(cx - O[0], -(cz - O[2])); // bearing from observer
  CELLS.push({ i, j, cx, cz, h, lake, g, slope, aspect, oaz: (az + 2 * Math.PI) % (2 * Math.PI), vis: false });
}
// viewshed (computed for real against the terrain)
function sightClear(A, B, steps = 64) {
  for (let k = 1; k < steps; k++) { const s = k / steps; const x = lerp(A[0], B[0], s), z = lerp(A[2], B[2], s);
    if (hT(x, z) > lerp(A[1], B[1], s) + 0.02) return false; }
  return true;
}
let visCount = 0;
for (const c of CELLS) { c.vis = sightClear(OE, [c.cx, c.h + 0.15, c.cz]); if (c.vis) visCount++; }
const VIS_PCT = visCount / CELLS.length * 100;
// line of sight target: first candidate whose sight line is blocked around the middle
let LOS = null;
for (const cand of [[-30, 22], [-36, 30], [-24, 30], [-40, 10], [-34, -32], [36, 36], [-10, 40]]) {
  const T = [cand[0], hT(cand[0], cand[1]) + 1.8, cand[1]];
  const N = 220, prof = [];
  let first = -1;
  for (let k = 0; k <= N; k++) { const s = k / N; const x = lerp(OE[0], T[0], s), z = lerp(OE[2], T[2], s);
    const ht = hT(x, z), hl = lerp(OE[1], T[1], s); prof.push([s, ht, hl]); if (first < 0 && k > 2 && k < N - 2 && ht > hl) first = k; }
  if (first > N * 0.25 && first < N * 0.8) { LOS = { T, prof, first, N, dist: Math.hypot(T[0] - OE[0], T[2] - OE[2]) }; break; }
}
if (!LOS) { const T = [-30, hT(-30, 22) + 1.8, 22]; LOS = { T, prof: [], first: -1, N: 1, dist: 1 }; }

// cut & fill against reference plane z0
const Z0 = 6;
let CUT = 0, FILL = 0;
for (const c of CELLS) { const d = c.h - Z0; if (d > 0) CUT += d; else FILL -= d; }
const M = 10; // 1 world unit = 10 m
CUT *= CS * CS * M * M * M; FILL *= CS * CS * M * M * M;

// contour lines (marching squares), every 2 units = 20 m
const CONTOURS = [];
for (let lv = 2; lv <= 20; lv += 2) for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
  const a = hAt(i, j), b = hAt(i + 1, j), c = hAt(i + 1, j + 1), d = hAt(i, j + 1);
  const pts = [];
  const e = (p, q, x0, z0, x1, z1) => { if ((p - lv) * (q - lv) < 0) { const s = (lv - p) / (q - p); pts.push([lerp(x0, x1, s), lerp(z0, z1, s)]); } };
  const X0 = gx(i), X1 = gx(i + 1), Z0_ = gx(j), Z1 = gx(j + 1);
  e(a, b, X0, Z0_, X1, Z0_); e(b, c, X1, Z0_, X1, Z1); e(c, d, X1, Z1, X0, Z1); e(d, a, X0, Z1, X0, Z0_);
  if (pts.length >= 2) CONTOURS.push([pts[0], pts[1], lv, lv % 10 === 0]);
  if (pts.length === 4) CONTOURS.push([pts[2], pts[3], lv, lv % 10 === 0]);
}

/* LiDAR point cloud: ground returns + canopy (first-return) points */
const PTS = [];
{ const r = rng(11);
  for (let k = 0; k < 6200; k++) { const x = (r() * 2 - 1) * EXT, z = (r() * 2 - 1) * EXT; PTS.push([x, hT(x, z) + r() * 0.15, z, 0]); }
  const clusters = [[-30, -10], [24, 6], [-8, 22], [36, -30], [4, -16]];
  for (const [cx, cz] of clusters) for (let k = 0; k < 160; k++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 7; const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
    if (Math.abs(x) < EXT && Math.abs(z) < EXT) PTS.push([x, hT(x, z) + 1.2 + r() * 2.2 * (1 - rr / 8), z, 1]); }
}
/* TIN: jittered irregular samples, denser where the terrain is rough */
const TIN = [];
{ const r = rng(5), n = 15, V = [];
  for (let i = 0; i <= n; i++) { V.push([]); for (let j = 0; j <= n; j++) {
    let x = -EXT + 2 * EXT * i / n, z = -EXT + 2 * EXT * j / n;
    if (i > 0 && i < n) x += (r() - .5) * 4.6; if (j > 0 && j < n) z += (r() - .5) * 4.6;
    V[i].push([x, hT(x, z), z]); } }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = V[i][j], b = V[i + 1][j], c = V[i + 1][j + 1], d = V[i][j + 1];
    if ((i + j) % 2) { TIN.push([a, b, c]); TIN.push([a, c, d]); } else { TIN.push([a, b, d]); TIN.push([b, c, d]); }
  }
}

/* ---------------- camera & projection ---------------- */
let CAM = null;
function setCam(o) {
  const ce = Math.cos(o.el), se = Math.sin(o.el);
  const P = [o.t[0] + o.d * ce * Math.sin(o.az), o.t[1] + o.d * se, o.t[2] + o.d * ce * Math.cos(o.az)];
  const f = norm(sub(o.t, P)); let r = cross(f, [0, 1, 0]); if (len(r) < 1e-6) r = [1, 0, 0]; r = norm(r);
  const u = cross(r, f);
  CAM = { P, f, r, u, F: (H / 2) / Math.tan(o.fov * Math.PI / 360), ox: o.ox || 0, oy: o.oy || 0, roll: o.roll || 0, t: o.t, az: o.az };
}
function proj(p) {
  const dx = p[0] - CAM.P[0], dy = p[1] - CAM.P[1], dz = p[2] - CAM.P[2];
  const cz = dx * CAM.f[0] + dy * CAM.f[1] + dz * CAM.f[2]; if (cz < 0.5) return null;
  let x = (dx * CAM.r[0] + dy * CAM.r[1] + dz * CAM.r[2]) / cz * CAM.F, y = -(dx * CAM.u[0] + dy * CAM.u[1] + dz * CAM.u[2]) / cz * CAM.F;
  if (CAM.roll) { const c = Math.cos(CAM.roll), s = Math.sin(CAM.roll); const xx = x * c - y * s; y = x * s + y * c; x = xx; }
  return [W / 2 + x + CAM.ox, H / 2 + y + CAM.oy, cz];
}
const facing = (c, n) => dot3(sub(CAM.P, c), n) > 0;

/* ---------------- draw list (painter's algorithm) ---------------- */
let DL = [];
function poly(ps, fill, stroke, lw, a, zb) {
  const s = []; let z = 0;
  for (const p of ps) { const q = proj(p); if (!q) return; s.push(q); z += q[2]; }
  DL.push({ k: 0, s, z: z / ps.length + (zb || 0), f: fill, st: stroke, lw: lw || 1, a: a == null ? 1 : a });
}
function dot(p, r, fill, a, zb) { const q = proj(p); if (!q) return; DL.push({ k: 1, s: q, z: q[2] + (zb || 0), r: Math.max(0.9, r * CAM.F / q[2]), f: fill, a: a == null ? 1 : a }); }
function line(p, q, st, lw, a, zb) { const A = proj(p), B = proj(q); if (!A || !B) return; DL.push({ k: 2, s: [A, B], z: (A[2] + B[2]) / 2 + (zb || 0), st, lw: lw || 1, a: a == null ? 1 : a }); }
function flush() {
  DL.sort((a, b) => b.z - a.z);
  for (const d of DL) {
    ctx.globalAlpha = d.a;
    if (d.k === 0) {
      ctx.beginPath(); ctx.moveTo(d.s[0][0], d.s[0][1]); for (let i = 1; i < d.s.length; i++) ctx.lineTo(d.s[i][0], d.s[i][1]); ctx.closePath();
      if (d.f) { ctx.fillStyle = d.f; ctx.fill(); }
      if (d.st) { ctx.strokeStyle = d.st; ctx.lineWidth = d.lw; ctx.stroke(); }
    } else if (d.k === 1) {
      ctx.fillStyle = d.f; const r = d.r; ctx.fillRect(d.s[0] - r, d.s[1] - r, r * 2, r * 2);
    } else {
      ctx.strokeStyle = d.st; ctx.lineWidth = d.lw; ctx.beginPath(); ctx.moveTo(d.s[0][0], d.s[0][1]); ctx.lineTo(d.s[1][0], d.s[1][1]); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; DL = [];
  scrim();
}

/* ---------------- lighting ---------------- */
let SUN = norm([-0.5, 0.707, -0.5]); // azimuth 315°, altitude 45° (GIS hillshade default)
function sunFrom(azDeg, altDeg) { const a = azDeg * Math.PI / 180, b = altDeg * Math.PI / 180;
  return norm([Math.cos(b) * Math.sin(a), Math.sin(b), -Math.cos(b) * Math.cos(a)]); }
SUN = sunFrom(315, 45);
const lamb = n => 0.42 + 0.72 * Math.max(0, dot3(n, SUN));

/* ---------------- terrain representations ---------------- */
function cellQuad(c, hs) {
  const i = c.i, j = c.j;
  return [[gx(i), hAt(i, j) * hs, gx(j)], [gx(i + 1), hAt(i + 1, j) * hs, gx(j)], [gx(i + 1), hAt(i + 1, j + 1) * hs, gx(j + 1)], [gx(i), hAt(i, j + 1) * hs, gx(j + 1)]];
}
function cellNormal(c, hs) { return norm([-c.g[0] * hs, 1, -c.g[1] * hs]); }
function hypsoCol(c, t) {
  if (c.lake) { const w = 0.5 + 0.5 * Math.sin(c.cx * 0.6 + c.cz * 0.4 + t * 2.4); return mixc(hex('#1F5E9C'), hex('#2F7EC0'), w * 0.5); }
  return ramp(HYPSO, c.h);
}
function drawSurface(opt) {
  const hs = opt.hs == null ? 1 : opt.hs, t = opt.t || 0;
  for (const c of CELLS) {
    if (opt.clip && !opt.clip(c.cx)) continue;
    let col = opt.color ? opt.color(c) : hypsoCol(c, t);
    if (opt.light !== false) col = sc(col, opt.lightFn ? opt.lightFn(c) : lamb(cellNormal(c, hs)));
    if (opt.dim) col = mixc(col, C.bg, opt.dim);
    const f = css(col);
    poly(cellQuad(c, hs), f, opt.stroke || f, opt.lw || 1, 1);
  }
}
function drawContours(hs, a, clip) {
  for (const [p, q, lv, major] of CONTOURS) {
    if (clip && !clip(p[0])) continue;
    line([p[0], lv * hs + 0.06, p[1]], [q[0], lv * hs + 0.06, q[1]], major ? 'rgba(25,20,10,0.85)' : 'rgba(25,20,10,0.5)', major ? 2.2 : 1.1, a, -0.4);
  }
}
function drawPoints(clip, t, revealX) {
  for (const p of PTS) {
    if (clip && !clip(p[0])) continue;
    if (revealX != null && p[0] > revealX) continue;
    const fresh = revealX != null ? clamp(1 - (revealX - p[0]) / 10) : 0;
    const col = p[3] ? mixc(hex('#3FCB7A'), hex('#A6F0B4'), clamp((p[1] - hT(p[0], p[2])) / 3)) : ramp(HYPSO, p[1]);
    dot(p, 0.16 + fresh * 0.18, css(mixc(col, C.cyan, fresh * 0.8)));
  }
}
function drawTIN(clip) {
  for (const tri of TIN) {
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3; if (clip && !clip(cx)) continue;
    let n = norm(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]))); if (n[1] < 0) n = mul3(n, -1);
    const h = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const col = sc(mixc(ramp(HYPSO, h), C.bg2, 0.35), lamb(n));
    poly(tri, css(col), 'rgba(71,215,234,0.75)', 1.3, 1);
  }
  for (const tri of TIN) for (const v of tri) { if (clip && !clip(v[0])) continue; dot([v[0], v[1] + 0.05, v[2]], 0.28, css(C.cyan), 1, -0.3); }
}
const DEMN = 28, DEMC = 2 * EXT / DEMN;
function drawDEM(clip, t) {
  for (let i = 0; i < DEMN; i++) for (let j = 0; j < DEMN; j++) {
    const x0 = -EXT + i * DEMC, z0 = -EXT + j * DEMC, cx = x0 + DEMC / 2, cz = z0 + DEMC / 2;
    if (clip && !clip(cx)) continue;
    const h = hT(cx, cz), k = DEMC * 0.07;
    const col = sc(h <= LAKE + 0.05 ? hex('#2369A8') : ramp(HYPSO, Math.round(h)), 1.0);
    poly([[x0 + k, h, z0 + k], [x0 + DEMC - k, h, z0 + k], [x0 + DEMC - k, h, z0 + DEMC - k], [x0 + k, h, z0 + DEMC - k]], css(col), 'rgba(5,12,25,0.6)', 1, 1);
  }
}
const VXN = 14, VXC = 2 * EXT / VXN, VXH = 2.4;
const VXL = []; for (let i = 0; i < VXN; i++) { VXL.push([]); for (let j = 0; j < VXN; j++) VXL[i].push(Math.max(1, Math.round(hT(-EXT + (i + .5) * VXC, -EXT + (j + .5) * VXC) / VXH))); }
function drawVoxels(clip, grow) {
  const g = grow == null ? 1 : grow;
  for (let i = 0; i < VXN; i++) for (let j = 0; j < VXN; j++) {
    const x0 = -EXT + i * VXC, z0 = -EXT + j * VXC, x1 = x0 + VXC, z1 = z0 + VXC, cx = x0 + VXC / 2;
    if (clip && !clip(cx)) continue;
    const n = VXL[i][j], top = n * VXH * g;
    const colTop = ramp(HYPSO, n * VXH);
    const edge = 'rgba(5,12,25,0.7)';
    poly([[x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1]], css(sc(colTop, 1.05)), edge, 1.2, 1);
    const sides = [[1, 0, i + 1 < VXN ? VXL[i + 1][j] : 0, [[x1, 0, z0], [x1, 0, z1]]], [-1, 0, i > 0 ? VXL[i - 1][j] : 0, [[x0, 0, z1], [x0, 0, z0]]],
      [0, 1, j + 1 < VXN ? VXL[i][j + 1] : 0, [[x1, 0, z1], [x0, 0, z1]]], [0, -1, j > 0 ? VXL[i][j - 1] : 0, [[x0, 0, z0], [x1, 0, z0]]]];
    for (const [nx, nz, m, e] of sides) {
      const nrm = [nx, 0, nz]; const mid = [(e[0][0] + e[1][0]) / 2, top / 2, (e[0][2] + e[1][2]) / 2];
      if (!facing(mid, nrm)) continue;
      for (let lv = Math.min(m, n); lv < n; lv++) {
        const y0 = lv * VXH * g, y1 = (lv + 1) * VXH * g;
        const col = sc(ramp(HYPSO, (lv + 1) * VXH), nx ? 0.72 : 0.56);
        poly([[e[0][0], y0, e[0][2]], [e[1][0], y0, e[1][2]], [e[1][0], y1, e[1][2]], [e[0][0], y1, e[0][2]]], css(col), edge, 1, 1);
      }
    }
  }
}
function scanPlane(sx, a) {
  const yT = 28;
  poly([[sx, 0, -EXT], [sx, 0, EXT], [sx, yT, EXT], [sx, yT, -EXT]], css(C.cyan, 0.10), null, 1, a);
  line([sx, yT, -EXT], [sx, yT, EXT], css(C.cyan), 3, a, -1);
  line([sx, 0.3, -EXT], [sx, 0.3, EXT], css(C.cyan), 2, a, -1);
}
function wipe(t, a, b, oldFn, newFn) {
  if (t < a) { oldFn(null); return; }
  if (t >= b) { newFn(null); return; }
  const sx = lerp(-EXT - 3, EXT + 3, eio(seg(t, a, b)));
  oldFn(x => x > sx); newFn(x => x <= sx); scanPlane(sx, 1);
}

/* ---------------- timing helpers ---------------- */
const KICKS = AUD.events.filter(e => e[1] === 'kick').map(e => e[0]);
const IMPACTS = [4, 18, 44, 60];
function kickEnv(t) { let v = 0; for (const k of KICKS) { if (k > t) break; if (t - k < 0.5) v = Math.max(v, Math.exp(-(t - k) * 11)); } return v; }
function band(name, t) { const a = AUD.bands[name]; if (!a || !a.length) return 0; return a[Math.min(a.length - 1, Math.max(0, Math.floor(t * FPS)))]; }
function impactEnv(t) { let v = 0; for (const k of IMPACTS) if (t >= k && t - k < 1) v = Math.max(v, Math.exp(-(t - k) * 6)); return v; }
function shake(t) { const e = impactEnv(t) * 14 + kickEnv(t) * 1.5; return [Math.sin(t * 91.7) * e + Math.sin(t * 37.1) * e * 0.5, Math.cos(t * 83.3) * e * 0.7]; }
function hand(t, k = 1) { return [(Math.sin(t * 0.9) * 3 + Math.sin(t * 2.3 + 1) * 1.4) * k, (Math.cos(t * 0.7) * 2.4 + Math.sin(t * 1.9) * 1.2) * k]; }

/* ---------------- typography ---------------- */
function setFont(f, size, weight) { ctx.font = `${weight || 400} ${size}px ${f}`; }
function kinetic(text, x, y, opt) {
  // per-glyph reveal: rise + fade, staggered; exit drops and fades
  const { t, a, b, size, font = FONT_D, weight = 700, col = C.ink, track = 0, stag = 0.03, align = 'left', rise = 0.6 } = opt;
  if (t < a || t > b + 0.6) return;
  setFont(font, size, weight); ctx.textBaseline = 'alphabetic';
  const chars = [...text]; const ws = chars.map(ch => ctx.measureText(ch).width + track * size);
  const total = ws.reduce((s, v) => s + v, 0) - track * size;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  chars.forEach((ch, i) => {
    const pin = eexp(seg(t, a + i * stag, a + i * stag + 0.55));
    const pout = ei(seg(t, b + i * stag * 0.5, b + 0.35 + i * stag * 0.5));
    const al = pin * (1 - pout);
    if (al > 0.003) {
      ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = css(col);
      const dy = (1 - pin) * size * rise - pout * size * 0.25;
      ctx.beginPath(); ctx.rect(cx - 4, y - size * 1.1 + (opt.mask ? 0 : -999), ws[i] + 8, size * 1.45 + (opt.mask ? 0 : 1999)); ctx.clip();
      ctx.fillText(ch, cx, y + dy); ctx.restore();
    }
    cx += ws[i];
  });
}
function caption(t, a, b, main, subt, opt = {}) {
  if (t < a - 0.01 || t > b + 0.4) return;
  const pin = eexp(seg(t, a, a + 0.6)), pout = ei(seg(t, b, b + 0.35)), al = pin * (1 - pout);
  const x = opt.x || 120, y = opt.y || 930;
  ctx.save(); ctx.globalAlpha = al;
  ctx.fillStyle = css(C.gold); ctx.fillRect(x, y - 44, 6 * eo(pin) + 0.01, 74);
  ctx.translate((1 - pin) * 30, 0);
  setFont(FONT_B, 40, 600); ctx.fillStyle = css(C.ink); ctx.fillText(main, x + 28, y - 6);
  if (subt) { setFont(FONT_B, 26, 400); ctx.fillStyle = css(C.mute); ctx.fillText(subt, x + 28, y + 30); }
  ctx.restore();
}
function plate(x, y, w, h, al) { ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = 'rgba(5,12,25,0.72)'; roundRect(x, y, w, h, 14); ctx.fill(); ctx.strokeStyle = 'rgba(140,157,190,0.28)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const ACTS = [
  [4, 10, '01', 'Sumbu Z'], [10, 18, '02', '2D · 2.5D · 3D'], [18, 28, '03', 'Model data 3D'], [28, 36, '04', 'Analisis permukaan'],
  [36, 44, '05', 'Viewshed & line of sight'], [44, 50, '06', 'Cut & fill'], [50, 56, '07', 'Model kota 3D'], [56, 60, '08', 'Alur kerja']
];
function actLabel(t) {
  for (const [a, b, n, name] of ACTS) {
    if (t < a || t >= b) continue;
    const pin = eexp(seg(t, a + 0.15, a + 0.8)), pout = ei(seg(t, b - 0.3, b));
    const al = pin * (1 - pout);
    ctx.save(); ctx.globalAlpha = al;
    setFont(FONT_M, 20, 500); ctx.fillStyle = css(C.mute); ctx.fillText('ANALISIS DATA 3D  ·  PEKAN 9', 120, 96);
    setFont(FONT_D, 30, 700); ctx.fillStyle = css(C.gold); ctx.fillText(n, 120, 146);
    ctx.fillStyle = css(C.ink); ctx.fillText(name, 186, 146);
    ctx.fillStyle = css(C.gold); ctx.fillRect(120, 166, 220 * pin, 3);
    ctx.restore();
  }
}
function hud(t, showScale) {
  const al = clamp(seg(t, 4.3, 5)) * (1 - seg(t, 55.7, 56.1));
  if (al <= 0) return;
  ctx.save(); ctx.globalAlpha = al * 0.95;
  // timecode
  const fr = Math.floor(t * FPS); const ss = Math.floor(fr / FPS), ff = fr % FPS;
  setFont(FONT_M, 20, 500); ctx.fillStyle = css(C.mute); ctx.textAlign = 'right';
  ctx.fillText(`00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}  ·  24 fps`, W - 120, 96);
  ctx.fillText('6°21′46″ LS  106°49′37″ BT', W - 120, 126);
  ctx.textAlign = 'left';
  // north arrow (real: projection of world north at the camera target)
  const A = proj(CAM.t), B = proj(add3(CAM.t, [0, 0, -6]));
  if (A && B && Math.hypot(B[0] - A[0], B[1] - A[1]) > 1) {
    const ang = Math.atan2(B[0] - A[0], -(B[1] - A[1]));
    const nx = W - 160, ny = 210;
    ctx.save(); ctx.translate(nx, ny);
    ctx.strokeStyle = 'rgba(140,157,190,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(ang);
    ctx.fillStyle = css(C.gold); ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(9, 4); ctx.lineTo(0, -2); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(C.mute); ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(9, 4); ctx.lineTo(0, 10); ctx.lineTo(-9, 4); ctx.closePath(); ctx.globalAlpha *= 0.6; ctx.fill();
    ctx.restore();
    setFont(FONT_M, 18, 600); ctx.fillStyle = css(C.ink); ctx.textAlign = 'center'; ctx.fillText('U', nx, ny + 62); ctx.textAlign = 'left';
  }
  // scale bar (real: 10 world units = 100 m projected at target depth)
  if (showScale) {
    const P1 = proj(CAM.t), P2 = proj(add3(CAM.t, mul3(CAM.r, 10)));
    if (P1 && P2) { const L = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
      const x0 = W - 120 - L, y0 = 1000;
      ctx.fillStyle = css(C.ink); ctx.fillRect(x0, y0, L, 4); ctx.fillRect(x0, y0 - 10, 3, 14); ctx.fillRect(x0 + L - 3, y0 - 10, 3, 14);
      ctx.fillStyle = css(C.gold); ctx.fillRect(x0, y0, L / 2, 4);
      setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.textAlign = 'right'; ctx.fillText('100 m', W - 120, y0 - 16); ctx.textAlign = 'left'; }
  }
  ctx.restore();
}
function legendBar(x, y, w, stops, lo, hi, label, ticks, al) {
  if (al <= 0) return;
  ctx.save(); ctx.globalAlpha = al;
  const gr = ctx.createLinearGradient(x, 0, x + w, 0);
  for (const [v, c] of stops) gr.addColorStop(clamp((v - lo) / (hi - lo)), css(c));
  ctx.fillStyle = gr; ctx.fillRect(x, y, w, 14);
  setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText(label, x, y - 14);
  ctx.fillStyle = css(C.ink);
  for (const [v, s] of ticks) { const px = x + (v - lo) / (hi - lo) * w; ctx.fillRect(px - 1, y + 14, 2, 8); ctx.textAlign = 'center'; ctx.fillText(s, px, y + 44); }
  ctx.textAlign = 'left'; ctx.restore();
}

/* ---------------- scenes ---------------- */
function bgFill(t, k) {
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.5, W * 0.75);
  g.addColorStop(0, css(mixc(C.bg2, C.navy, 0.35 * (k == null ? 1 : k)))); g.addColorStop(1, css(C.bg));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function goldPin(p, t, al, label) {
  const q = proj(p); if (!q || al <= 0) return;
  ctx.save(); ctx.globalAlpha = al;
  const pulse = (t * 1.2) % 1;
  ctx.strokeStyle = css(C.gold, 1 - pulse); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], 10 + pulse * 46, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = css(C.gold); ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css(C.bg); ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, Math.PI * 2); ctx.fill();
  if (label) { setFont(FONT_M, 24, 600); ctx.fillStyle = css(C.gold); ctx.fillText(label, q[0] + 22, q[1] - 16); }
  ctx.restore();
}

/* 00 — a point, a grid, a question (0–4) */
function sIntro(t) {
  bgFill(t, 0.4);
  setCam({ t: [O[0] * 0.5, 0, O[2] * 0.5], az: 0, el: 1.535, d: lerp(172, 158, eo(seg(t, 0, 4))), fov: 40 });
  const R = eo(seg(t, 0.9, 3.4)) * 95;
  ctx.save();
  // grid grows outward from the point, like coordinates being laid down
  for (let k = 0; k <= G; k += 2) {
    const v = gx(k);
    for (const [a, b] of [[[v, 0, -EXT], [v, 0, EXT]], [[-EXT, 0, v], [EXT, 0, v]]]) {
      const A = proj(a), B = proj(b); if (!A || !B) continue;
      const dd = Math.min(Math.abs(v - (a[0] === v ? O[0] : O[2])), 999);
      if (dd > R) continue;
      const fa = (1 - dd / 95) * 0.55 * clamp(seg(t, 0.9, 1.6));
      ctx.strokeStyle = css(k % 10 === 0 ? C.cyan : C.mute, fa * (k % 10 === 0 ? 0.9 : 0.45)); ctx.lineWidth = k % 10 === 0 ? 1.6 : 1;
      // clip line to radius around point
      const ax = a[0] === v ? [v, 0, Math.max(-EXT, O[2] - R)] : [Math.max(-EXT, O[0] - R), 0, v];
      const bx = a[0] === v ? [v, 0, Math.min(EXT, O[2] + R)] : [Math.min(EXT, O[0] + R), 0, v];
      const P = proj(ax), Q = proj(bx); if (!P || !Q) continue;
      ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke();
    }
  }
  ctx.restore();
  // axis ticks x / y
  const ap = clamp(seg(t, 1.5, 2.3));
  if (ap > 0) {
    const q = proj([O[0], 0, O[2]]);
    ctx.save(); ctx.globalAlpha = ap; ctx.strokeStyle = css(C.ink); ctx.lineWidth = 2.5;
    const lx = 260 * eo(ap);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + lx, q[1]); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0], q[1] - lx); ctx.stroke();
    setFont(FONT_M, 26, 600); ctx.fillStyle = css(C.ink); ctx.fillText('x', q[0] + lx + 12, q[1] + 8); ctx.fillText('y', q[0] - 7, q[1] - lx - 14);
    ctx.restore();
  }
  goldPin([O[0], 0, O[2]], t, clamp(seg(t, 0.25, 0.5)), t > 1.5 ? '(x, y)' : null);
  // the z question: a line shoots up out of the screen (we draw it towards the viewer as a growing glow)
  const zp = clamp(seg(t, 3.0, 3.9));
  if (zp > 0) {
    const q = proj([O[0], 0, O[2]]);
    ctx.save(); const r = 12 + ei(zp) * 260;
    const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); g.addColorStop(0, css(C.gold, 0.9 * zp)); g.addColorStop(1, css(C.gold, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill();
    setFont(FONT_D, 64, 700); ctx.fillStyle = css(C.gold, eo(zp)); ctx.fillText('z ?', q[0] + 30, q[1] - 40 - zp * 30);
    ctx.restore();
  }
  kinetic('Semua data spasial berawal dari sebuah titik.', 120, 960, { t, a: 0.6, b: 3.0, size: 40, font: FONT_B, weight: 500, stag: 0.012 });
}

/* 01 — rise into Z (4–10) */
function sRise(t) {
  bgFill(t);
  const p = eio(seg(t, 4.15, 7.4));
  const hs = eback(seg(t, 4.4, 6.6));
  const az = lerp(0, -0.62, p) - 0.02 * (t - 7.4) * (t > 7.4);
  const [hx, hy] = hand(t, 0.8);
  setCam({ t: [lerp(O[0] * 0.5, 0, p), lerp(0, 5, p), lerp(O[2] * 0.5, 0, p)], az, el: lerp(1.535, 0.56, p), d: lerp(158, 128, p) * (1 - 0.01 * kickEnv(t)), fov: 40, ox: hx + 330 * eio(seg(t, 6.2, 7.4)) * (1 - eio(seg(t, 9.3, 10))), oy: hy });
  drawSurface({ hs, t });
  drawContours(hs, clamp(1 - seg(t, 7.2, 8.6)) * 0.9);
  flush();
  goldPin([OE[0], (O[1]) * hs + 0.4, OE[2]], t, 1 - seg(t, 8.8, 9.6), null);
  caption(t, 4.3, 6.2, 'Peta 2D hanya menyimpan posisi (x, y).', 'Garis kontur adalah cara 2D “menceritakan” ketinggian.');
  // title
  kinetic('ANALISIS', 120, 430, { t, a: 6.7, b: 9.5, size: 120, weight: 800, track: 0.02, stag: 0.04, mask: true });
  kinetic('DATA 3D', 120, 560, { t, a: 6.85, b: 9.55, size: 120, weight: 800, track: 0.02, stag: 0.04, col: C.gold, mask: true });
  kinetic('Tambahkan satu sumbu — z — dan permukaan bumi bisa diukur, bukan cuma dilihat.', 124, 630, { t, a: 7.3, b: 9.5, size: 30, font: FONT_B, weight: 500, stag: 0.008 });
}

/* 02 — 2D / 2.5D / 3D (10–18) */
const PN = 12, PE = 24, PC = 2 * PE / PN;
const hp = (x, z, k) => k * (2 + 6 * Math.exp(-((x - 5) ** 2 + (z - 3) ** 2) / 110) + 1.6 * Math.sin(x * 0.22) * Math.cos(z * 0.26));
const BX = -11, BZ = -9;
function box(x0, y0, z0, x1, y1, z1, col, edge, zb) {
  const faces = [
    [[0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 1.08],
    [[0, -1, 0], [[x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0]], 0.4],
    [[1, 0, 0], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], 0.78],
    [[-1, 0, 0], [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], 0.62],
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.7],
    [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], 0.55]];
  for (const [n, ps, k] of faces) {
    const c = [(ps[0][0] + ps[2][0]) / 2, (ps[0][1] + ps[2][1]) / 2, (ps[0][2] + ps[2][2]) / 2];
    if (!facing(c, n)) continue;
    const lit = n[1] > 0 ? k : k * (0.8 + 0.35 * Math.max(0, dot3(n, SUN)));
    poly(ps, css(sc(col, lit)), edge, 1.2, 1, zb);
  }
}
function sDims(t) {
  bgFill(t, 0.6);
  const p = seg(t, 10, 18);
  const [hx, hy] = hand(t, 0.6);
  const pb = eio(seg(t, 15.0, 16.4)), bb = hp(BX, BZ, 1);
  setCam({ t: [lerp(-2, BX + 2, pb), lerp(4, bb + 6, pb), lerp(-2, BZ + 2, pb)], az: lerp(0.72, 1.12, eio(p)), el: lerp(0.66, 0.4, eio(p)), d: lerp(lerp(104, 92, eio(seg(t, 10, 15))), 50, pb) * (1 - 0.01 * kickEnv(t)), fov: 38, ox: hx + 160, oy: hy });
  const k = eio(seg(t, 12.4, 13.5));
  const base = hp(BX, BZ, k);
  for (let i = 0; i < PN; i++) for (let j = 0; j < PN; j++) {
    const x0 = -PE + i * PC, z0 = -PE + j * PC, x1 = x0 + PC, z1 = z0 + PC;
    const ps = [[x0, hp(x0, z0, k), z0], [x1, hp(x1, z0, k), z0], [x1, hp(x1, z1, k), z1], [x0, hp(x0, z1, k), z1]];
    const h = (ps[0][1] + ps[2][1]) / 2;
    const n = norm(cross(sub(ps[2], ps[0]), sub(ps[1], ps[3])));
    const flat = C.plate, colr = sc(ramp(HYPSO, 2 + h * 1.2), lamb(n[1] < 0 ? mul3(n, -1) : n));
    const col = mixc(flat, colr, k);
    poly(ps, css(col), css(C.cyan, 0.55 * (1 - k) + 0.18), 1.2, 1);
  }
  // 2D sample points on the plate
  const dp = clamp(seg(t, 10.2, 11.2)) * (1 - seg(t, 12.4, 12.9));
  if (dp > 0) for (let i = 0; i <= PN; i += 2) for (let j = 0; j <= PN; j += 2) dot([-PE + i * PC, 0.05, -PE + j * PC], 0.42, css(C.cyan), dp * clamp((t - 10.2 - (i + j) * 0.02) * 3), -0.2);
  // building with floors — true 3D (several z for one x,y)
  const bg = eback(seg(t, 14.9, 15.9));
  if (bg > 0) {
    const s = 5, Hs = [0, 6, 12];
    const sl = hex('#DCE5F4'), pil = hex('#9FB3D3'), edge = 'rgba(5,12,25,0.55)';
    for (const [k2, y] of Hs.entries()) box(BX - s - (k2 === 2 ? 1.5 : 0), base + y * bg, BZ - s - (k2 === 2 ? 1.5 : 0), BX + s + (k2 === 2 ? 1.5 : 0), base + (y + 0.7) * bg, BZ + s + (k2 === 2 ? 1.5 : 0), k2 === 2 ? hex('#F4D77A') : sl, edge);
    for (const [px, pz] of [[-s + .4, -s + .4], [s - 1.2, -s + .4], [s - 1.2, s - 1.2], [-s + .4, s - 1.2]]) box(BX + px, base, BZ + pz, BX + px + 0.8, base + 12 * bg, BZ + pz + 0.8, pil, edge);
  }
  flush();
  // probes (drawn as x-ray overlays)
  const probe = (x, z, y0, yEnd, pr, hits) => {
    const top = proj([x, y0, z]), bot = proj([x, lerp(y0, yEnd, pr), z]); if (!top || !bot) return;
    ctx.save(); ctx.strokeStyle = css(C.cyan); ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 60;
    ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css(C.cyan); ctx.beginPath(); ctx.moveTo(bot[0], bot[1] + 10); ctx.lineTo(bot[0] - 9, bot[1] - 6); ctx.lineTo(bot[0] + 9, bot[1] - 6); ctx.fill();
    hits.forEach(([hy, lbl], idx) => {
      const cur = lerp(y0, yEnd, pr); if (cur > hy + 0.01) return;
      const q = proj([x, hy, z]); if (!q) return;
      const age = clamp((y0 - hy) / (y0 - yEnd + 0.001));
      ctx.strokeStyle = css(C.gold); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q[0], q[1], 22, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = css(C.gold); ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, Math.PI * 2); ctx.fill();
      setFont(FONT_M, 24, 600); ctx.fillText(lbl, q[0] + 32, q[1] + 8);
    });
    ctx.restore();
  };
  const pA = eo(seg(t, 13.2, 14.0)), y1 = hp(6, 6, k);
  if (t > 13.1 && t < 15.6) { ctx.save(); ctx.globalAlpha = 1 - seg(t, 15.2, 15.6); probe(6, 6, y1 + 22, y1, pA, [[y1, 'z = 1 nilai']]); ctx.restore(); }
  if (t > 15.7) {
    const ys = [base + 12.7, base + 6.7, base + 0.7];
    const pB = eio(seg(t, 16.0, 17.1));
    probe(BX, BZ, base + 26, base + 0.7, pB, [[ys[0], 'z₃'], [ys[1], 'z₂'], [ys[2], 'z₁']]);
  }
  // big dimension label (rolls 2D → 2.5D → 3D)
  const labels = [[10.15, 12.35, '2D'], [12.45, 14.8, '2.5D'], [14.9, 17.75, '3D']];
  for (const [a, b, s] of labels) kinetic(s, 120, 400, { t, a, b, size: 150, weight: 800, stag: 0.05, col: s === '3D' ? C.gold : C.ink, mask: true });
  caption(t, 10.3, 12.3, 'Hanya posisi (x, y).', 'Ketinggian belum tersimpan sebagai data.');
  caption(t, 12.6, 14.75, 'Satu nilai z untuk setiap (x, y).', 'Hasilnya permukaan: DEM, TIN. Ini yang disebut 2.5D.');
  caption(t, 15.0, 17.8, 'Banyak nilai z di satu (x, y).', 'Lantai, kolong, terowongan: volume dan ruang di dalamnya. Ini 3D sejati.');
}

/* camera for the terrain acts 18–36: one continuous orbit */
function orbitCam(t, extra) {
  const [hx, hy] = hand(t, 0.7);
  const e = Object.assign({ t: [0, 4, 0], az: 0.55 + 0.105 * (t - 18), el: 0.6, d: 140, fov: 40, ox: hx, oy: hy }, extra || {});
  e.d *= (1 - 0.01 * kickEnv(t));
  setCam(e);
}

/* 03 — data models (18–28) */
function sModels(t) {
  bgFill(t);
  orbitCam(t, { el: lerp(0.62, 0.56, seg(t, 18, 28)), d: lerp(150, 136, eio(seg(t, 18, 28))) });
  const planeX = lerp(-62, 62, seg(t, 18.1, 20.9));
  const pointsFn = clip => drawPoints(clip, t, t < 21 ? planeX : null);
  const tinFn = clip => drawTIN(clip);
  const demFn = clip => drawDEM(clip, t);
  const voxFn = clip => drawVoxels(clip, 1);
  if (t < 24) wipe(t, 21.0, 21.85, pointsFn, tinFn);
  else if (t < 26) wipe(t, 24.0, 24.8, tinFn, demFn);
  else if (t < 27.55) wipe(t, 26.0, 26.8, demFn, voxFn);
  else wipe(t, 27.55, 28.35, voxFn, clip => drawSurface({ clip, t, color: c => ramp(SLOPE, c.slope) }));
  // LiDAR aircraft + scan fan
  if (t < 21.05) {
    const py = 42, pz = 6 * Math.sin(t * 0.9);
    const nose = [planeX + 3, py, pz], l = [planeX - 2, py, pz - 2.2], r = [planeX - 2, py, pz + 2.2];
    poly([nose, l, r], css(C.ink), null, 1, 1, -200);
    const sw = Math.sin(t * 26);
    for (let k = -4; k <= 4; k++) {
      const zz = pz + k * 8 + sw * 4, xx = planeX - 1;
      line([planeX, py - 0.5, pz], [xx, hT(xx, zz), zz], css(C.cyan, 0.5), 1.4, 1, -150);
    }
  }
  flush();
  if (t < 21.2) {
    const shown = PTS.filter(p => p[0] <= planeX).length;
    plate(W - 470, 860, 350, 96, clamp(seg(t, 18.4, 18.8)) * (1 - seg(t, 20.9, 21.2)));
    ctx.save(); ctx.globalAlpha = clamp(seg(t, 18.4, 18.8)) * (1 - seg(t, 20.9, 21.2));
    setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('TITIK TERCATAT', W - 446, 896);
    setFont(FONT_D, 34, 700); ctx.fillStyle = css(C.cyan); ctx.fillText(shown.toLocaleString('id-ID'), W - 446, 938);
    ctx.restore();
  }
  caption(t, 18.3, 20.9, 'Point cloud (LiDAR)', 'Pulsa laser dari pesawat → titik (x, y, z). Pantulan pertama menangkap kanopi pohon.');
  caption(t, 21.3, 23.9, 'TIN · Triangulated Irregular Network', 'Titik sampel dihubungkan jadi segitiga tak beraturan; rapat di medan kasar.');
  caption(t, 24.2, 25.9, 'DEM · raster elevasi', 'Grid sel berukuran tetap; tiap sel menyimpan satu nilai z.');
  caption(t, 26.2, 27.6, 'Voxel · piksel bervolume', 'Untuk data yang punya isi: lapisan tanah, atmosfer, ruang gedung.');
}

/* 04 — surface analysis (28–36) */
function sSurface(t) {
  bgFill(t);
  orbitCam(t, { el: lerp(0.56, 0.7, eio(seg(t, 28, 30))), d: lerp(136, 126, eio(seg(t, 28, 36))), oy: -20 });
  const toAspect = eio(seg(t, 30.9, 31.5)), toShade = eio(seg(t, 33.4, 34.0));
  const sunAz = lerp(250, 400, seg(t, 33.6, 36)), sunAlt = 35 + 15 * Math.sin(seg(t, 33.6, 36) * Math.PI);
  const shadeSun = sunFrom(sunAz, sunAlt);
  drawSurface({
    t,
    color: c => {
      const s = ramp(SLOPE, c.slope);
      const a = c.lake ? hex('#4C5A78') : hsl(c.aspect, 0.5, 0.56);
      const hsv = Math.max(0, dot3(cellNormal(c, 1), shadeSun)), g = 28 + 192 * hsv;
      return mixc(mixc(s, a, toAspect), [g, g, g * 1.02], toShade);
    },
    lightFn: c => lerp(lamb(cellNormal(c, 1)), 1, toShade)
  });
  // aspect arrows: downslope direction on the surface
  const ar = clamp(seg(t, 31.2, 31.8)) * (1 - seg(t, 33.4, 33.9));
  if (ar > 0) for (const c of CELLS) {
    if (c.i % 4 !== 2 || c.j % 4 !== 2 || c.lake || c.slope < 3) continue;
    const dl = Math.hypot(c.g[0], c.g[1]) || 1, dx = -c.g[0] / dl * 2.4, dz = -c.g[1] / dl * 2.4;
    const a = [c.cx - dx * .5, hT(c.cx - dx * .5, c.cz - dz * .5) + 0.5, c.cz - dz * .5], b = [c.cx + dx * .5, hT(c.cx + dx * .5, c.cz + dz * .5) + 0.5, c.cz + dz * .5];
    line(a, b, css(C.bg), 3, ar, -0.6);
    dot(b, 0.32, css(C.bg), ar, -0.7);
  }
  flush();
  // sun marker during hillshade
  if (toShade > 0) {
    const sp = proj(add3([0, 0, 0], mul3(shadeSun, 90)));
    if (sp) { ctx.save(); ctx.globalAlpha = toShade; const g = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 90);
      g.addColorStop(0, 'rgba(255,230,150,0.95)'); g.addColorStop(0.25, 'rgba(244,197,66,0.6)'); g.addColorStop(1, 'rgba(244,197,66,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp[0], sp[1], 90, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    plate(W - 470, 840, 350, 116, toShade * (1 - seg(t, 35.7, 36)));
    ctx.save(); ctx.globalAlpha = toShade * (1 - seg(t, 35.7, 36));
    setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('MATAHARI', W - 446, 876);
    setFont(FONT_M, 26, 600); ctx.fillStyle = css(C.ink);
    ctx.fillText(`azimut   ${String(Math.round(sunAz % 360)).padStart(3, ' ')}°`, W - 446, 912);
    ctx.fillText(`altitude  ${Math.round(sunAlt)}°`, W - 446, 944); ctx.restore();
  }
  legendBar(W - 470, 900, 350, SLOPE, 0, 42, 'KEMIRINGAN', [[0, '0°'], [18, '18°'], [42, '42°+']], clamp(seg(t, 28.3, 28.8)) * (1 - seg(t, 30.8, 31.2)));
  // aspect compass legend
  const al = clamp(seg(t, 31.2, 31.7)) * (1 - seg(t, 33.3, 33.7));
  if (al > 0) { ctx.save(); ctx.globalAlpha = al; const cx = W - 220, cy = 880;
    for (let a = 0; a < 360; a += 4) { ctx.fillStyle = css(hsl(a, 0.5, 0.56)); ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 62, (a - 92) * Math.PI / 180, (a - 86) * Math.PI / 180); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = css(C.bg); ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
    setFont(FONT_M, 20, 600); ctx.fillStyle = css(C.ink); ctx.textAlign = 'center';
    ctx.fillText('U', cx, cy - 74); ctx.fillText('S', cx, cy + 90); ctx.fillText('T', cx + 86, cy + 7); ctx.fillText('B', cx - 86, cy + 7); ctx.textAlign = 'left'; ctx.restore(); }
  caption(t, 28.4, 30.8, 'Slope · kemiringan lereng', 'slope = arctan √( (∂z/∂x)² + (∂z/∂y)² ) — laju perubahan z per jarak.');
  caption(t, 31.2, 33.3, 'Aspect · arah hadap lereng', 'Arah kompas turunan paling curam; panah menunjuk ke bawah lereng.');
  caption(t, 33.7, 35.8, 'Hillshade · iluminasi permukaan', 'Kecerahan = normal permukaan · arah matahari (azimut & altitude).');
}

/* 05 — viewshed & line of sight (36–44) */
function sView(t) {
  bgFill(t);
  const az0 = 0.55 + 0.105 * 18;
  let d, fov;
  const pz = seg(t, 36, 37.6);
  if (t < 37.6) { // dolly zoom (vertigo): distance falls while fov widens, subject width held constant
    d = lerp(126, 34, eio(pz)); const w = 126 * Math.tan(20 * Math.PI / 180); fov = 2 * Math.atan(w / d) * 180 / Math.PI;
  } else { const q = eio(seg(t, 37.6, 39.4)); d = lerp(34, 92, q); fov = lerp(2 * Math.atan(126 * Math.tan(20 * Math.PI / 180) / 34) * 180 / Math.PI, 46, q); }
  const tgt = [lerp(0, OE[0], eio(pz)), lerp(5, OE[1] - 2, eio(pz)), lerp(0, OE[2], eio(pz))];
  const [hx, hy] = hand(t, 0.6);
  setCam({ t: tgt, az: az0 + 0.09 * (t - 36), el: lerp(0.7, 0.5, eio(pz)), d: d * (1 - 0.008 * kickEnv(t)), fov, ox: hx, oy: hy });
  const sweep = eio(seg(t, 38.0, 41.0)) * Math.PI * 2;
  const losOn = seg(t, 41.0, 41.4);
  drawSurface({ t, color: c => {
    const base = mixc(hypsoCol(c, t), C.bg, 0.25);
    if (c.oaz > sweep) return base;
    return c.vis ? mixc(base, C.green, 0.58) : mixc(base, mixc(C.coral, hex('#2A0F1E'), 0.45), 0.8);
  } });
  // radar beam
  if (t > 37.9 && t < 41.1) {
    const R = 62, a0 = sweep - 0.35, a1 = sweep, steps = 8;
    for (let k = 0; k < steps; k++) { const b0 = lerp(a0, a1, k / steps), b1 = lerp(a0, a1, (k + 1) / steps);
      const p0 = [OE[0] + Math.sin(b0) * R, OE[1] - 1, OE[2] - Math.cos(b0) * R], p1 = [OE[0] + Math.sin(b1) * R, OE[1] - 1, OE[2] - Math.cos(b1) * R];
      poly([OE, p0, p1], css(C.green, 0.05 + 0.18 * k / steps), null, 1, 1, -60); }
  }
  // observer mast
  line([O[0], O[1], O[2]], OE, css(C.ink), 4, 1, -40);
  flush();
  goldPin(OE, t, 1, t > 37.4 ? 'pengamat' : null);
  // line of sight
  if (losOn > 0 && LOS.first > 0) {
    const s1 = LOS.first / LOS.N, A = proj(OE), M_ = proj([lerp(OE[0], LOS.T[0], s1), lerp(OE[1], LOS.T[1], s1), lerp(OE[2], LOS.T[2], s1)]), B = proj(LOS.T);
    const grow = eio(seg(t, 41.0, 41.9));
    if (A && M_ && B) {
      ctx.save(); ctx.lineWidth = 5; ctx.lineCap = 'round';
      const g1 = Math.min(1, grow / s1), g2_ = clamp((grow - s1) / (1 - s1));
      ctx.strokeStyle = css(C.green); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(lerp(A[0], M_[0], g1), lerp(A[1], M_[1], g1)); ctx.stroke();
      if (g2_ > 0) { ctx.strokeStyle = css(C.coral); ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(M_[0], M_[1]); ctx.lineTo(lerp(M_[0], B[0], g2_), lerp(M_[1], B[1], g2_)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = css(C.coral); ctx.beginPath(); ctx.arc(M_[0], M_[1], 10, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = css(C.ink); ctx.beginPath(); ctx.arc(B[0], B[1], 8, 0, Math.PI * 2); ctx.fill();
      setFont(FONT_M, 22, 600); ctx.fillText('target', B[0] + 16, B[1] - 12);
      ctx.restore();
    }
    // profile inset (computed along the actual sight line)
    const px = W - 720, py = 690, pw = 600, ph = 260, al = eo(seg(t, 41.4, 41.9)) * (1 - seg(t, 43.6, 44));
    plate(px, py, pw, ph, al);
    ctx.save(); ctx.globalAlpha = al;
    setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText(`PROFIL GARIS PANDANG · ${Math.round(LOS.dist * M)} m`, px + 24, py + 36);
    const ix = px + 30, iw = pw - 60, iy = py + 60, ih = ph - 90;
    let lo = 1e9, hi = -1e9; for (const [, a, b] of LOS.prof) { lo = Math.min(lo, a, b); hi = Math.max(hi, a, b); }
    lo -= 1; hi += 1;
    const X = s => ix + s * iw, Y = v => iy + ih - (v - lo) / (hi - lo) * ih;
    const shown = eio(seg(t, 41.5, 42.6));
    ctx.beginPath(); ctx.moveTo(X(0), iy + ih);
    for (const [s, a] of LOS.prof) { if (s > shown) break; ctx.lineTo(X(s), Y(a)); }
    ctx.lineTo(X(Math.min(shown, 1)), iy + ih); ctx.closePath(); ctx.fillStyle = 'rgba(134,160,85,0.55)'; ctx.fill();
    ctx.strokeStyle = css(C.ink, 0.8); ctx.lineWidth = 2; ctx.beginPath();
    LOS.prof.forEach(([s, a], k) => { if (s <= shown) (k ? ctx.lineTo(X(s), Y(a)) : ctx.moveTo(X(s), Y(a))); }); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = css(C.green); ctx.beginPath(); ctx.moveTo(X(0), Y(LOS.prof[0][2])); ctx.lineTo(X(Math.min(shown, s1)), Y(lerp(LOS.prof[0][2], LOS.prof[LOS.N][2], Math.min(shown, s1)))); ctx.stroke();
    if (shown > s1) { ctx.strokeStyle = css(C.coral); ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(X(s1), Y(LOS.prof[LOS.first][2])); ctx.lineTo(X(shown), Y(lerp(LOS.prof[0][2], LOS.prof[LOS.N][2], shown))); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = css(C.coral); ctx.beginPath(); ctx.arc(X(s1), Y(LOS.prof[LOS.first][1]), 7, 0, Math.PI * 2); ctx.fill();
      setFont(FONT_M, 18, 600); ctx.fillText('terhalang', X(s1) + 12, Y(LOS.prof[LOS.first][1]) - 12); }
    ctx.restore();
  }
  // visible share readout during sweep
  const ra = clamp(seg(t, 38.2, 38.6)) * (1 - seg(t, 40.9, 41.3));
  if (ra > 0) {
    let sw = 0, vv = 0; for (const c of CELLS) if (c.oaz <= sweep) { sw++; if (c.vis) vv++; }
    plate(W - 470, 860, 350, 96, ra);
    ctx.save(); ctx.globalAlpha = ra; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('SEL TERLIHAT', W - 446, 896);
    setFont(FONT_D, 34, 700); ctx.fillStyle = css(C.green); ctx.fillText(`${sw ? (vv / CELLS.length * 100).toFixed(1).replace('.', ',') : '0,0'} %`, W - 446, 938); ctx.restore();
  }
  caption(t, 38.1, 40.9, 'Viewshed · apa yang terlihat dari satu titik', 'Setiap sel diuji: apakah garis dari mata pengamat terpotong permukaan?');
  caption(t, 41.2, 43.8, 'Line of sight · satu garis, satu jawaban', 'Hijau = terlihat. Merah = terhalang punggungan bukit.');
}

/* 06 — cut & fill (44–50) */
function sCut(t) {
  bgFill(t);
  const [hx, hy] = hand(t, 0.6);
  const p = seg(t, 44, 50);
  setCam({ t: [0, 5, 0], az: 3.55 + 0.06 * (t - 44), el: lerp(0.22, 0.5, eio(p)), d: lerp(148, 128, eio(p)) * (1 - 0.01 * kickEnv(t)), fov: 40, ox: hx, oy: hy });
  const zr = eio(seg(t, 44.3, 45.5)) * Z0;
  const col = clamp(seg(t, 45.3, 45.9));
  drawSurface({ t, color: c => {
    const base = hypsoCol(c, t); const d = c.h - zr;
    if (d > 0) return mixc(base, mixc(hex('#E8823A'), hex('#FFB36B'), clamp(d / 8)), 0.75 * col);
    return mixc(base, C.bg, 0.3 * col);
  } });
  // reference plane: drawn over fill cells as translucent blue (what would be filled)
  for (const c of CELLS) {
    if (c.h >= zr) continue;
    const x0 = gx(c.i), z0 = gx(c.j);
    poly([[x0, zr, z0], [x0 + CS, zr, z0], [x0 + CS, zr, z0 + CS], [x0, zr, z0 + CS]], css(mixc(C.blue, hex('#7FB6FF'), 0.2)), null, 1, 0.55 + 0.2 * col);
  }
  for (let k = 0; k <= G; k += 4) {
    line([gx(k), zr + 0.02, -EXT], [gx(k), zr + 0.02, EXT], css(C.ink, 0.25), 1, 1, -0.2);
    line([-EXT, zr + 0.02, gx(k)], [EXT, zr + 0.02, gx(k)], css(C.ink, 0.25), 1, 1, -0.2);
  }
  flush();
  // z0 tag
  const q = proj([EXT, zr, EXT]); if (q) { ctx.save(); ctx.globalAlpha = clamp(seg(t, 44.4, 44.8)); setFont(FONT_M, 26, 600); ctx.fillStyle = css(C.ink); ctx.fillText(`z₀ = ${Math.round(zr * M)} m`, q[0] + 16, q[1]); ctx.restore(); }
  // counters (real sums over the 56×56 grid)
  const cnt = eo(seg(t, 45.5, 48.5));
  const al = clamp(seg(t, 45.3, 45.8)) * (1 - seg(t, 49.6, 50));
  if (al > 0) {
    plate(W - 560, 760, 440, 196, al);
    ctx.save(); ctx.globalAlpha = al;
    const fmt = v => Math.round(v * cnt).toLocaleString('id-ID');
    setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('GALIAN (CUT)', W - 532, 800); ctx.fillText('TIMBUNAN (FILL)', W - 532, 884);
    setFont(FONT_D, 36, 700); ctx.fillStyle = css(hex('#FFA35C')); ctx.fillText(`${fmt(CUT)} m³`, W - 532, 844);
    ctx.fillStyle = css(hex('#7FB6FF')); ctx.fillText(`${fmt(FILL)} m³`, W - 532, 928);
    ctx.restore();
  }
  caption(t, 44.6, 49.6, 'Cut & fill · volume terhadap bidang acuan z₀', 'V = Σ (z − z₀) · luas sel. Di atas z₀ digali, di bawahnya ditimbun.');
}

/* 07 — 3D city model (50–56): illustrative campus district, not survey data */
const BLD = [];
{ const r = rng(42);
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
    const cx = -36 + i * 8, cz = -36 + j * 8;
    if (((cx + 22) / 14) ** 2 + ((cz - 18) / 8.5) ** 2 < 1) continue; // lake
    if (Math.abs(cx) < 5 && Math.abs(cz) < 5) continue;
    if (r() < 0.24) continue;
    const w = 3.2 + r() * 3, d = 3.2 + r() * 3, tall = r() < 0.16;
    BLD.push({ x: cx + (r() - .5), z: cz + (r() - .5), w, d, h: tall ? 4.5 + r() * 2.5 : 1.2 + r() * 2.4, delay: Math.hypot(cx, cz) / 50 * 1.2 + r() * 0.15, gold: false });
  }
  BLD.push({ x: 0, z: 0, w: 6, d: 6, h: 8, delay: 0, gold: true });
}
function sCity(t) {
  bgFill(t, 0.5);
  const p = eio(seg(t, 50.8, 52.8));
  const [hx, hy] = hand(t, 0.6);
  setCam({ t: [0, lerp(0, 4, p), 0], az: lerp(0, 0.72, p) + 0.07 * Math.max(0, t - 52.8), el: lerp(1.535, 0.5, p), d: lerp(124, 92, p) - 3 * Math.max(0, t - 52.8), fov: 42, ox: hx, oy: hy });
  // ground pass (not sorted)
  const gp = (ps, fill, stroke, lw) => { const s = ps.map(proj); if (s.some(v => !v)) return; ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); for (const v of s.slice(1)) ctx.lineTo(v[0], v[1]); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } };
  gp([[-42, 0, -42], [42, 0, -42], [42, 0, 42], [-42, 0, 42]], css(hex('#16294A')), 'rgba(140,157,190,0.3)', 1.5);
  for (let k = -40; k <= 40; k += 8) { gp([[k - 0.7, 0, -42], [k + 0.7, 0, -42], [k + 0.7, 0, 42], [k - 0.7, 0, 42]].map(v => [v[0] + 4, 0, v[2]]), 'rgba(5,12,25,0.55)'); gp([[-42, 0, k - 0.7], [42, 0, k - 0.7], [42, 0, k + 0.7], [-42, 0, k + 0.7]].map(v => [v[0], 0, v[2] + 4]), 'rgba(5,12,25,0.55)'); }
  const lake = []; for (let a = 0; a < 40; a++) { const th = a / 40 * Math.PI * 2; lake.push([-22 + Math.cos(th) * 13, 0, 18 + Math.sin(th) * 7.5]); }
  gp(lake, css(hex('#235E9A')), 'rgba(127,182,255,0.6)', 2);
  // shadows
  const sp = seg(t, 53.4, 56);
  const sunAz = lerp(80, 250, sp), sun = sunFrom(sunAz, 38);
  const sa = clamp(seg(t, 53.3, 53.9));
  if (sa > 0) for (const b of BLD) {
    const hh = b.h * eback(seg(t, 51.0 + b.delay, 51.6 + b.delay)); if (hh <= 0.05) continue;
    const pts = []; for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = b.x + sx * b.w / 2, z = b.z + sz * b.d / 2; pts.push([x, z]); pts.push([x - sun[0] / sun[1] * hh, z - sun[2] / sun[1] * hh]); }
    const hull = convexHull(pts).map(([x, z]) => [x, 0.01, z]);
    gp(hull, `rgba(3,7,16,${0.5 * sa})`);
  }
  // footprints (2D stage)
  const fa = 1 - seg(t, 51.6, 52.4);
  if (fa > 0) for (const b of BLD) { ctx.save(); ctx.globalAlpha = fa * clamp(seg(t, 50.1 + b.delay * 0.4, 50.4 + b.delay * 0.4));
    gp([[b.x - b.w / 2, 0, b.z - b.d / 2], [b.x + b.w / 2, 0, b.z - b.d / 2], [b.x + b.w / 2, 0, b.z + b.d / 2], [b.x - b.w / 2, 0, b.z + b.d / 2]], css(b.gold ? C.gold : C.cyan, 0.18), css(b.gold ? C.gold : C.cyan), 2); ctx.restore(); }
  // buildings
  SUN = sun;
  for (const b of BLD) {
    const hh = b.h * eback(seg(t, 51.0 + b.delay, 51.6 + b.delay)); if (hh <= 0.02) continue;
    const col = b.gold ? C.gold : mixc(hex('#C7D4EA'), hex('#E9EEF7'), b.h / 7);
    box(b.x - b.w / 2, 0, b.z - b.d / 2, b.x + b.w / 2, hh, b.z + b.d / 2, col, 'rgba(5,12,25,0.45)');
    if (b.h > 4) for (let y = 0.8; y < hh - 0.3; y += 0.8) for (const [n, a, c] of [[[1, 0, 0], [b.x + b.w / 2 + .02, y, b.z - b.d / 2], [b.x + b.w / 2 + .02, y, b.z + b.d / 2]], [[0, 0, 1], [b.x - b.w / 2, y, b.z + b.d / 2 + .02], [b.x + b.w / 2, y, b.z + b.d / 2 + .02]], [[-1, 0, 0], [b.x - b.w / 2 - .02, y, b.z - b.d / 2], [b.x - b.w / 2 - .02, y, b.z + b.d / 2]], [[0, 0, -1], [b.x - b.w / 2, y, b.z - b.d / 2 - .02], [b.x + b.w / 2, y, b.z - b.d / 2 - .02]]]) {
      if (facing([(a[0] + c[0]) / 2, y, (a[2] + c[2]) / 2], n)) line(a, c, 'rgba(5,12,25,0.35)', 1.2, 1, -0.05);
    }
  }
  flush();
  SUN = sunFrom(315, 45);
  // landmark tag
  const tg = proj([0, 8 * eback(seg(t, 51.0, 51.6)) + 0.4, 0]);
  const ta = clamp(seg(t, 52.4, 52.9)) * (1 - seg(t, 55.6, 56));
  if (tg && ta > 0) { ctx.save(); ctx.globalAlpha = ta; ctx.strokeStyle = css(C.gold); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tg[0], tg[1]); ctx.lineTo(tg[0] + 60, tg[1] - 60); ctx.lineTo(tg[0] + 260, tg[1] - 60); ctx.stroke();
    setFont(FONT_M, 22, 600); ctx.fillStyle = css(C.gold); ctx.fillText('h = 80 m · LOD1', tg[0] + 68, tg[1] - 72); ctx.restore(); }
  if (sa > 0) { plate(W - 470, 860, 350, 96, sa * (1 - seg(t, 55.6, 56)));
    ctx.save(); ctx.globalAlpha = sa * (1 - seg(t, 55.6, 56)); setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('AZIMUT MATAHARI', W - 446, 896);
    setFont(FONT_D, 34, 700); ctx.fillStyle = css(C.gold); ctx.fillText(`${Math.round(sunAz)}°`, W - 446, 938); ctx.restore(); }
  caption(t, 50.3, 53.1, 'Footprint 2D × tinggi = model kota 3D', 'Ekstrusi sederhana (LOD1) dari data bangunan dan tinggi hasil LiDAR.');
  caption(t, 53.4, 55.7, 'Analisis bayangan & paparan matahari', 'Ilustrasi kawasan kampus, Depok — bukan data survei.');
}
function convexHull(P) {
  P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/* 08 — workflow (56–60), rack focus from the terrain to the diagram */
let OFF = null;
function sFlow(t) {
  bgFill(t);
  const [hx, hy] = hand(t, 0.5);
  setCam({ t: [0, 5, 0], az: 1.2 + 0.08 * (t - 56), el: 0.62, d: 128, fov: 40, ox: hx, oy: hy });
  drawSurface({ t, color: c => { const s = Math.max(0, dot3(cellNormal(c, 1), SUN)); const g = 50 + 200 * s; return mixc([g, g, g], hypsoCol(c, t), 0.35); }, light: false });
  flush();
  // rack focus: blur the plate behind the diagram
  const blur = 12 * eio(seg(t, 56.0, 56.7));
  if (!OFF) { OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; }
  const o = OFF.getContext('2d'); o.clearRect(0, 0, W, H); o.drawImage(cv, 0, 0);
  ctx.save(); ctx.filter = `blur(${blur.toFixed(1)}px)`; ctx.drawImage(OFF, 0, 0); ctx.restore();
  ctx.fillStyle = `rgba(5,12,25,${0.55 * eio(seg(t, 56.0, 56.7))})`; ctx.fillRect(0, 0, W, H);
  const cols = [
    ['INPUT', C.cyan, ['Point cloud LiDAR', 'DEM / TIN', 'Footprint bangunan', 'Titik pengamat']],
    ['PROSES', C.gold, ['Interpolasi permukaan', 'Slope · aspect · hillshade', 'Viewshed · line of sight', 'Cut & fill · ekstrusi']],
    ['OUTPUT', C.green, ['Peta tematik', 'Model 3D', 'Volume & statistik', 'Dasar keputusan']]];
  const cw = 470, gap = 110, x0 = (W - (cw * 3 + gap * 2)) / 2, y0 = 300;
  cols.forEach(([title, col, items], k) => {
    const st = 56.4 + k * 1.0, p = eexp(seg(t, st, st + 0.6)), out = ei(seg(t, 59.6, 60));
    const x = x0 + k * (cw + gap), al = p * (1 - out);
    if (al <= 0) return;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(0, (1 - p) * 40);
    ctx.fillStyle = 'rgba(8,18,38,0.86)'; roundRect(x, y0, cw, 420, 18); ctx.fill(); ctx.strokeStyle = css(col, 0.7); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = css(col); ctx.fillRect(x, y0, cw, 6);
    setFont(FONT_D, 40, 700); ctx.fillText(title, x + 36, y0 + 80);
    items.forEach((s, i) => { const pi = eo(seg(t, st + 0.25 + i * 0.12, st + 0.6 + i * 0.12));
      ctx.globalAlpha = al * pi; setFont(FONT_B, 30, 500); ctx.fillStyle = css(C.ink); ctx.fillText(s, x + 36 + (1 - pi) * 20, y0 + 160 + i * 64);
      ctx.fillStyle = css(col); ctx.fillRect(x + 36 + (1 - pi) * 20 - 18, y0 + 150 + i * 64, 6, 6); });
    ctx.restore();
    if (k < 2) { const ap = eio(seg(t, st + 0.6, st + 1.0)) * (1 - out); if (ap > 0) {
      const ax = x + cw + 14, ay = y0 + 210; ctx.save(); ctx.strokeStyle = css(C.ink, 0.9); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (gap - 34) * ap, ay); ctx.stroke();
      ctx.fillStyle = css(C.ink); ctx.beginPath(); ctx.moveTo(ax + (gap - 28) * ap + 4, ay); ctx.lineTo(ax + (gap - 28) * ap - 12, ay - 10); ctx.lineTo(ax + (gap - 28) * ap - 12, ay + 10); ctx.fill(); ctx.restore(); } }
  });
  kinetic('Alur kerja analisis 3D', W / 2, 220, { t, a: 56.2, b: 59.6, size: 54, weight: 700, align: 'center', stag: 0.02 });
}

/* end card (60–64) */
function sEnd(t) {
  bgFill(t, 1);
  // small rotating terrain on the right, dimmed
  setCam({ t: [0, 5, 0], az: 2.2 + 0.25 * (t - 60), el: 0.55, d: 185, fov: 34, ox: 520, oy: 40 });
  const ap = eo(seg(t, 60.0, 61.0));
  drawSurface({ t, dim: lerp(0.9, 0.18, ap) });
  flush();
  goldPin([OE[0], OE[1] + 0.4, OE[2]], t, ap, null);
  kinetic('PEKAN 9 · 19–23 OKTOBER', 120, 330, { t, a: 60.1, b: 70, size: 24, font: FONT_M, weight: 600, col: C.mute, stag: 0.015 });
  kinetic('Analisis', 116, 470, { t, a: 60.2, b: 70, size: 118, weight: 800, mask: true, stag: 0.04 });
  kinetic('Data 3D', 116, 600, { t, a: 60.35, b: 70, size: 118, weight: 800, col: C.gold, mask: true, stag: 0.04 });
  kinetic('Konsep analisis data tiga dimensi (3D analysis) · PAR', 120, 680, { t, a: 60.8, b: 70, size: 30, font: FONT_B, weight: 500, stag: 0.008 });
  const li = eo(seg(t, 61.0, 61.8));
  ctx.fillStyle = css(C.gold); ctx.fillRect(120, 720, 520 * li, 3);
  kinetic('Titik → Permukaan → Volume → Keputusan', 120, 780, { t, a: 61.3, b: 70, size: 26, font: FONT_M, weight: 500, col: C.cyan, stag: 0.012 });
  // fade out
  const f = seg(t, 63.0, 64);
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${eio(f)})`; ctx.fillRect(0, 0, W, H); }
}

/* ---------------- post ---------------- */
let GRAIN = null;
function grain(t) {
  if (!GRAIN) { GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 256; const g = GRAIN.getContext('2d'); const id = g.createImageData(256, 256); const r = rng(3);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }
  const f = Math.floor(t * FPS), r = rng(f + 1);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-r() * 256, -r() * 256); ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
}
function vignette() { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
let SMEAR = null;
const WHIPS = [10, 28, 36, 50, 56];
function whip(t) {
  let k = 0, dir = 1; for (const w of WHIPS) { const d = Math.abs(t - w); if (d < 0.2) { k = Math.max(k, 1 - d / 0.2); dir = t < w ? 1 : -1; } }
  if (k <= 0.01) return;
  if (!SMEAR) { SMEAR = document.createElement('canvas'); SMEAR.width = W; SMEAR.height = H; }
  const s = SMEAR.getContext('2d'); s.clearRect(0, 0, W, H); s.drawImage(cv, 0, 0);
  const n = 9, amt = 220 * k * k;
  ctx.save(); for (let i = 1; i <= n; i++) { ctx.globalAlpha = 0.22; ctx.drawImage(SMEAR, -dir * amt * i / n, 0); } ctx.restore();
}
function flash(t) { const e = impactEnv(t); if (e > 0.02) { ctx.fillStyle = `rgba(236,242,255,${(0.35 * Math.pow(e, 3)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); } }

function scrim() {
  const g = ctx.createLinearGradient(0, H - 320, 0, H); g.addColorStop(0, 'rgba(5,12,25,0)'); g.addColorStop(1, 'rgba(5,12,25,0.82)');
  ctx.fillStyle = g; ctx.fillRect(0, H - 320, W, 320);
  const g2_ = ctx.createLinearGradient(0, 0, 0, 220); g2_.addColorStop(0, 'rgba(5,12,25,0.7)'); g2_.addColorStop(1, 'rgba(5,12,25,0)');
  ctx.fillStyle = g2_; ctx.fillRect(0, 0, W, 220);
}
/* ---------------- main ---------------- */
function frameAt(t) {
  t = clamp(t, 0, DUR - 1e-4);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = css(C.bg); ctx.fillRect(0, 0, W, H);
  const [sx, sy] = shake(t);
  ctx.save(); ctx.translate(sx, sy);
  if (t < 4) sIntro(t);
  else if (t < 10) sRise(t);
  else if (t < 18) sDims(t);
  else if (t < 28) sModels(t);
  else if (t < 36) sSurface(t);
  else if (t < 44) sView(t);
  else if (t < 50) sCut(t);
  else if (t < 56) sCity(t);
  else if (t < 60) sFlow(t);
  else sEnd(t);
  ctx.restore();
  whip(t);
  if (t >= 4 && t < 60) { hud(t, t < 56 && !(t >= 10 && t < 18)); actLabel(t); }
  vignette(); grain(t); flash(t);
}
window.frameAt = frameAt;
window.REEL = { DUR, FPS, VIS_PCT, CUT, FILL, LOS: LOS.first };
})();
