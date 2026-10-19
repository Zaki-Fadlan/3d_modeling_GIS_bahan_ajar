/* ===== Formula breakdowns: the base scene freezes, the camera moves in, parts separate,
   each term is labelled with this scene's real numbers, then everything reassembles. ===== */
const TLJ = window.__TIMELINE || { base: 132, inserts: [] };
const INSL = TLJ.inserts;
const DUR_REAL = TLJ.base + INSL.reduce((s, i) => s + i.dur, 0);
const b2r = tb => tb + INSL.filter(i => i.at < tb - 1e-9).reduce((s, i) => s + i.dur, 0);
function r2b(T) { let acc = 0; for (const i of INSL) { const s = i.at + acc; if (T < s) return [T - acc, null, 0]; if (T < s + i.dur) return [i.at, i, T - s]; acc += i.dur; } return [T - acc, null, 0]; }
let INS_ACTIVE = null, INS_L = 0; const STOP = {};
const fmt = (v, d = 1) => v.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = v => Math.round(v).toLocaleString('id-ID');

/* camera blend: base framing → close-up → base framing */
function camBlend(o, c, w) {
  if (w <= 0) return o;
  let da = (c.az - o.az) % (2 * Math.PI); if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
  return { t: [lerp(o.t[0], c.t[0], w), lerp(o.t[1], c.t[1], w), lerp(o.t[2], c.t[2], w)], az: o.az + da * w, el: lerp(o.el, c.el, w), d: lerp(o.d, c.d, w), fov: lerp(o.fov, c.fov || o.fov, w),
    ox: lerp(o.ox || 0, c.ox || 0, w), oy: lerp(o.oy || 0, c.oy || 0, w) };
}
const insW = (L, dur) => eio(seg(L, 0, 1.2)) * (1 - eio(seg(L, dur - 1.25, dur)));
const explode = (L, dur, a = 1.0, b = 1.9) => eio(seg(L, a, b)) * (1 - eio(seg(L, dur - 1.5, dur - 0.7)));

/* overlay helpers */
function tag3(p, text, col, al, dx = 14, dy = -10, size = 22) {
  const q = proj(p); if (!q || al <= 0.01) return;
  ctx.save(); ctx.globalAlpha = al; setFont(FONT_M, size, 600); const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(5,12,25,0.78)'; roundRect(q[0] + dx - 8, q[1] + dy - size, w + 16, size + 12, 6); ctx.fill();
  ctx.fillStyle = css(col); ctx.fillText(text, q[0] + dx, q[1] + dy); ctx.restore();
}
function seg3(a, b, col, w, al, dash) { const A = proj(a), B = proj(b); if (!A || !B || al <= 0.01) return; ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = css(col); ctx.lineWidth = w; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore(); }
function arrow3(a, b, col, w, al) { const A = proj(a), B = proj(b); if (!A || !B || al <= 0.01) return; const an = Math.atan2(B[1] - A[1], B[0] - A[0]);
  ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = ctx.fillStyle = css(col); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0] - Math.cos(an) * 10, B[1] - Math.sin(an) * 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] - Math.cos(an - 0.4) * 22, B[1] - Math.sin(an - 0.4) * 22); ctx.lineTo(B[0] - Math.cos(an + 0.4) * 22, B[1] - Math.sin(an + 0.4) * 22); ctx.fill(); ctx.restore(); }
/* formula card: lines appear at their step, the newest one is highlighted */
function fcard(L, dur, title, lines, opt = {}) {
  const al = clamp(seg(L, 0.6, 1.1)) * (1 - seg(L, dur - 1.0, dur - 0.5)); if (al <= 0) return;
  const x = opt.x || 110, y = opt.y || 220, w = opt.w || 700;
  const shown = lines.filter(l => L >= l.at);
  const h = 76 + lines.length * 46 + (opt.extra || 0);
  ctx.save(); ctx.globalAlpha = al;
  ctx.fillStyle = 'rgba(5,12,25,0.84)'; roundRect(x, y, w, h, 16); ctx.fill(); ctx.strokeStyle = 'rgba(244,197,66,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = css(C.gold); ctx.fillRect(x, y, 6, h);
  setFont(FONT_M, 18, 600); ctx.fillStyle = css(C.gold); ctx.fillText(title, x + 30, y + 40);
  lines.forEach((l, k) => {
    if (L < l.at) return; const p = eexp(seg(L, l.at, l.at + 0.5)); const latest = l === shown[shown.length - 1];
    ctx.globalAlpha = al * p * (latest ? 1 : 0.72);
    setFont(FONT_M, l.size || 26, l.bold ? 700 : 500); ctx.fillStyle = css(l.col || C.ink);
    ctx.fillText(l.text, x + 30 + (1 - p) * 18, y + 92 + k * 46);
  });
  ctx.restore();
}
function steps(L, list) { for (let k = 0; k < list.length; k++) { const [a, main, subt] = list[k]; const b = k + 1 < list.length ? list[k + 1][0] - 0.15 : 99; caption(L, a, b, main, subt); } }

/* ---------- 1. IDW ---------- */
const IDW_LIFT = 7;
const IDW_W = (() => { const ws = IDW_NB.map(([, d]) => 1 / (d * d)), S = ws.reduce((a, b) => a + b, 0); return { ws, S, num: IDW_NB.reduce((a, [v], k) => a + ws[k] * v[1], 0) }; })();
const INS_FN = {};
INS_FN.idw = {
  cam: L => ({ t: [IDW_C[0], IDW_Z + IDW_LIFT * 0.6, IDW_C[1]], az: 0.9, el: 0.62, d: 42, fov: 38, ox: 330, oy: 30 }),
  pre(L, dur) { const e = explode(L, dur);
    IDW_NB.forEach(([v], k) => { const y = v[1] + IDW_LIFT * e; box(v[0] - 0.35, y - 0.35, v[2] - 0.35, v[0] + 0.35, y + 0.35, v[2] + 0.35, hex('#47D7EA'));
      const wb = IDW_W.ws[k] / IDW_W.S * 6 * clamp(seg(L, 4.6, 5.6)); if (wb > 0.02) box(v[0] + 0.6, y - 0.35, v[2] - 0.25, v[0] + 1.1, y - 0.35 + wb, v[2] + 0.25, hex('#F4C542')); });
    const y = IDW_Z + IDW_LIFT * e, s = DEMC * 0.45; box(IDW_C[0] - s, y - 0.15, IDW_C[1] - s, IDW_C[0] + s, y + 0.15, IDW_C[1] + s, hex('#F4C542')); },
  post(L, dur) { const e = explode(L, dur);
    const P = [IDW_C[0], IDW_Z + IDW_LIFT * e + 0.2, IDW_C[1]];
    IDW_NB.forEach(([v, d], k) => { const q = [v[0], v[1] + IDW_LIFT * e + 0.4, v[2]];
      seg3([v[0], v[1], v[2]], [v[0], v[1] + IDW_LIFT * e, v[2]], C.cyan, 1.5, 0.6 * e, [5, 6]);
      tag3(q, `z${k + 1} ${fmt(v[1] * M)} m`, C.cyan, clamp(seg(L, 1.5 + k * 0.1, 2.0 + k * 0.1)) * e, 14, -14, 20);
      seg3(P, q, C.ink, 2, clamp(seg(L, 3.0, 3.4)) * e);
      const mid = [(P[0] + q[0]) / 2, (P[1] + q[1]) / 2, (P[2] + q[2]) / 2];
      tag3(mid, `d${k + 1} ${fmt0(d * M)} m`, C.ink, clamp(seg(L, 3.1 + k * 0.08, 3.5 + k * 0.08)) * e * (1 - seg(L, 4.5, 4.8)), -40, 8, 18);
      tag3([v[0] + 0.85, v[1] + IDW_LIFT * e + IDW_W.ws[k] / IDW_W.S * 6 * clamp(seg(L, 4.6, 5.6)) - 0.2, v[2]], `w ${fmt(IDW_W.ws[k] / IDW_W.S * 100, 0)}%`, C.gold, clamp(seg(L, 5.0, 5.5)) * e, 10, -6, 18); });
    tag3(P, '?', C.gold, clamp(seg(L, 1.2, 1.6)) * e * (1 - seg(L, 7.6, 7.9)), 18, -20, 28);
    tag3(P, `z = ${fmt(IDW_Z * M)} m`, C.gold, clamp(seg(L, 7.6, 8.0)) * e, 18, -20, 26);
    const d0 = IDW_NB[0][1] * M, z0 = IDW_NB[0][0][1] * M;
    fcard(L, dur, 'IDW · CONTOH SATU SEL', [
      { at: 1.4, text: 'z = Σ wᵢ·zᵢ / Σ wᵢ', col: C.ink, bold: true },
      { at: 3.0, text: `dᵢ = jarak sel → titik i (d₁ = ${fmt0(d0)} m)`, col: C.ink },
      { at: 4.6, text: `wᵢ = 1 / dᵢ²   →  w₁ = 1/${fmt0(d0)}² `, col: C.gold },
      { at: 6.2, text: `Σwᵢzᵢ / Σwᵢ = ${fmt(IDW_W.num / IDW_W.S * M)} m`, col: C.gold },
      { at: 7.6, text: `referensi ${fmt(hT(IDW_C[0], IDW_C[1]) * M)} m → galat ${fmt((IDW_Z - hT(IDW_C[0], IDW_C[1])) * M)} m`, col: C.coral }]);
    steps(L, [[1.4, 'Sel kuning belum punya nilai z. IDW meminjam dari 6 titik terdekat.', 'Titik-titik sampel diangkat dari permukaan supaya nilainya terbaca.'],
      [3.0, 'Ukur jarak setiap titik ke pusat sel.', `Titik terdekat ${fmt0(d0)} m, terjauh ${fmt0(IDW_NB[5][1] * M)} m.`],
      [4.6, 'Bobot = 1 / jarak². Batang emas = porsi pengaruh tiap titik.', 'Jarak dua kali lebih jauh → pengaruh empat kali lebih kecil.'],
      [6.2, 'Rata-rata berbobot: kalikan z dengan bobot, jumlahkan, bagi total bobot.', `Hasilnya ${fmt(IDW_Z * M)} m untuk sel ini.`],
      [7.6, 'Bandingkan dengan nilai referensi: inilah galat interpolasi.', 'Tetangga yang lebih rendah menarik nilainya turun. Titik sampel rapat mengecilkan galat.']]);
  }
};

/* ---------- 2–4. slope, aspect, hillshade: three different cells on three different hills ---------- */
const SD = CS;
function cellCalc(cx, cz) {
  const SZ = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) SZ.push([a, b, hT(cx + a * SD, cz + b * SD)]);
  const zAt = (a, b) => SZ.find(v => v[0] === a && v[1] === b)[2];
  const dx = (zAt(1, 0) - zAt(-1, 0)) / (2 * SD), dn = (zAt(0, -1) - zAt(0, 1)) / (2 * SD);
  const rise = Math.hypot(dx, dn); let asp = Math.atan2(-dx, -dn) * 180 / Math.PI; if (asp < 0) asp += 360;
  return { SC: [cx, cz], SZ, zAt, DZDX: dx, DZDN: dn, S_RISE: rise, S_DEG: Math.atan(rise) * 180 / Math.PI, A_DEG: asp, SMIN: Math.min(...SZ.map(v => v[2])) };
}
function pickCell(cx, cz, r, ok, score) {
  let best = null, bs = -1e9;
  for (let x = cx - r; x <= cx + r; x += SD * 0.5) for (let z = cz - r; z <= cz + r; z += SD * 0.5) {
    if (Math.abs(x) > EXT - 3 * SD || Math.abs(z) > EXT - 3 * SD || hRaw(x, z) <= LAKE + 0.5) continue;
    const c = cellCalc(x, z); if (!ok(c)) continue; const s = score(c); if (s > bs) { bs = s; best = c; } }
  return best || cellCalc(cx, cz);
}
// slope: the steep flank of the main hill
const CSL = pickCell(14, -12, 14, c => c.S_DEG > 18 && c.S_DEG < 34, c => -Math.abs(c.S_DEG - 26) - 0.02 * Math.hypot(c.SC[0] - 6, c.SC[1] + 2));
// aspect: the western hill, a slope facing roughly east/south-east (a different direction from the slope cell)
const CAS = pickCell(-24, 16, 12, c => c.S_DEG > 10 && c.S_DEG < 30, c => -Math.abs(((c.A_DEG - 120 + 540) % 360) - 180) - 0.5 * Math.abs(c.S_DEG - 18));
// hillshade: the north-east hill, a face turned towards the sun (az 350°)
const SUN_AZ = 350, SUN_ALT = 48;
const CHS = pickCell(30, 24, 11, c => c.S_DEG > 10 && c.S_DEG < 30, c => -Math.abs(((c.A_DEG - SUN_AZ + 540) % 360) - 180) - 0.5 * Math.abs(c.S_DEG - 20));
const S_DEG = CSL.S_DEG, A_DEG = CAS.A_DEG;
const COMPASS = d => ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'][Math.round(d / 45) % 8];
const SLIFT = 6.5;
function pillars(K, L, dur, hi) {
  const e = explode(L, dur), gap = 1 + 0.6 * e;
  for (const [a, b, z] of K.SZ) {
    const x = K.SC[0] + a * SD * gap, zz = K.SC[1] + b * SD * gap, w = SD * 0.44, top = z + SLIFT * e;
    const col = a === 0 && b === 0 ? hex('#F4C542') : (b === 0 && a !== 0 ? hex('#F28A3C') : (a === 0 ? hex('#47D7EA') : hex('#C9CFD8')));
    box(x - w, top - (z - K.SMIN + 0.8), zz - w, x + w, top, zz + w, hi ? hi(a, b, col) : col);
  }
}
const ptop = (K, a, b, L, dur) => { const e = explode(L, dur), gap = 1 + 0.6 * e; return [K.SC[0] + a * SD * gap, K.zAt(a, b) + SLIFT * e, K.SC[1] + b * SD * gap]; };
function pillarLabels(K, L, dur, at) { const e = explode(L, dur); for (const [a, b, z] of K.SZ) tag3(ptop(K, a, b, L, dur), `${fmt(z * M)}`, a === 0 && b === 0 ? C.gold : C.ink, clamp(seg(L, at, at + 0.5)) * e, -30, -12, 18); }
function deltas(K, L, dur, ax0, ay0) { const e = explode(L, dur);
  const E = ptop(K, 1, 0, L, dur), Wp = ptop(K, -1, 0, L, dur), Np = ptop(K, 0, -1, L, dur), Sp = ptop(K, 0, 1, L, dur);
  const ax = clamp(seg(L, ax0, ax0 + 0.5)) * e; seg3(Wp, E, hex('#F28A3C'), 4, ax); seg3(Wp, [E[0], Wp[1], E[2]], hex('#F28A3C'), 2, ax, [6, 6]); seg3([E[0], Wp[1], E[2]], E, hex('#F28A3C'), 2, ax, [6, 6]);
  tag3([E[0], (Wp[1] + E[1]) / 2, E[2]], `Δz ${fmt((K.zAt(1, 0) - K.zAt(-1, 0)) * M)} m`, hex('#F28A3C'), ax, 16, 0, 20);
  const ay = clamp(seg(L, ay0, ay0 + 0.5)) * e; seg3(Sp, Np, C.cyan, 4, ay); seg3(Sp, [Np[0], Sp[1], Np[2]], C.cyan, 2, ay, [6, 6]); seg3([Np[0], Sp[1], Np[2]], Np, C.cyan, 2, ay, [6, 6]);
  tag3([Np[0], (Sp[1] + Np[1]) / 2, Np[2]], `Δz ${fmt((K.zAt(0, -1) - K.zAt(0, 1)) * M)} m`, C.cyan, ay, 16, 0, 20); }
// a pulsing ring that shows where on the map the close-up comes from (first second of each breakdown)
function locator(K, L) { const a = clamp(seg(L, 0.2, 0.5)) * (1 - seg(L, 1.3, 1.7)); if (a <= 0) return; const q = proj([K.SC[0], K.zAt(0, 0) + 0.3, K.SC[1]]); if (!q) return;
  const p = (L * 1.6) % 1; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = css(C.gold); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(q[0], q[1], 14 + p * 60, 0, Math.PI * 2); ctx.globalAlpha = a * (1 - p); ctx.stroke();
  ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q[0], q[1], 10, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
const hillName = K => K === CSL ? 'bukit utama' : K === CAS ? 'bukit barat' : 'bukit timur laut';

INS_FN.slope = {
  // low, side-on view across the flank so the rise reads as height
  cam: L => ({ t: [CSL.SC[0], CSL.zAt(0, 0) + SLIFT * 0.6, CSL.SC[1]], az: Math.atan2(CSL.DZDX, -CSL.DZDN) + Math.PI / 2 + 0.25 + 0.03 * L, el: 0.46, d: 27, fov: 38, ox: 360, oy: 110 }),
  pre: (L, dur) => pillars(CSL, L, dur),
  post(L, dur) { const K = CSL, e = explode(L, dur); locator(K, L);
    pillarLabels(K, L, dur, 1.5); deltas(K, L, dur, 3.0, 4.6);
    const Cp = ptop(K, 0, 0, L, dur), ga = clamp(seg(L, 6.0, 6.5)) * e;
    const dir = norm([K.DZDX, 0, -K.DZDN]); arrow3(Cp, [Cp[0] + dir[0] * 3, Cp[1] + K.S_RISE * 3, Cp[2] + dir[2] * 3], C.gold, 4, ga);
    seg3(Cp, [Cp[0] + dir[0] * 3, Cp[1], Cp[2] + dir[2] * 3], C.gold, 2, ga, [6, 6]);
    tag3([Cp[0] + dir[0] * 3, Cp[1] + K.S_RISE * 3, Cp[2] + dir[2] * 3], `${fmt(K.S_DEG)}°`, C.gold, clamp(seg(L, 7.4, 7.8)) * e, 14, -8, 26);
    fcard(L, dur, 'SLOPE · SATU SEL DI LERENG BUKIT UTAMA', [
      { at: 1.4, text: `sel ${fmt(SD * M)} m, pusat z = ${fmt(K.zAt(0, 0) * M)} m`, col: C.ink },
      { at: 3.0, text: `∂z/∂x = (zT − zB)/2Δ = ${fmt(K.DZDX, 3)}`, col: hex('#F28A3C') },
      { at: 4.6, text: `∂z/∂y = (zU − zS)/2Δ = ${fmt(K.DZDN, 3)}`, col: C.cyan },
      { at: 6.0, text: `√(${fmt(K.DZDX, 3)}² + ${fmt(K.DZDN, 3)}²) = ${fmt(K.S_RISE, 3)}`, col: C.gold },
      { at: 7.4, text: `slope = arctan(${fmt(K.S_RISE, 3)}) = ${fmt(K.S_DEG)}°`, col: C.gold, bold: true }]);
    steps(L, [[1.4, 'Kita ambil sel di lereng terjal bukit utama, bersama 8 tetangganya.', 'Angka = elevasi (m). Kemiringan dihitung dari beda tinggi tetangga.'],
      [3.0, `Arah x: tetangga timur dikurangi barat, dibagi jarak ${fmt(2 * SD * M)} m.`, 'Kaki segitiga oranye = naik-turun ke arah timur.'],
      [4.6, 'Arah y: tetangga utara dikurangi selatan.', 'Kaki segitiga biru = naik-turun ke arah utara.'],
      [6.0, 'Dua kemiringan digabung seperti sisi miring segitiga.', 'Panah emas = arah naik paling curam (gradien).'],
      [7.4, 'arctan mengubah rasio naik/jarak menjadi sudut.', `Sel ini miring ${fmt(K.S_DEG)}°: merah di peta slope. Diulang untuk setiap sel.`]]);
  }
};
INS_FN.aspect = {
  // high, almost top-down over the western hill so the compass reads flat
  cam: L => ({ t: [CAS.SC[0], CAS.zAt(0, 0) + SLIFT * 0.8, CAS.SC[1]], az: -0.5 - 0.05 * L, el: 1.12, d: 28, fov: 38, ox: 330, oy: 40 }),
  pre: (L, dur) => pillars(CAS, L, dur),
  post(L, dur) { const K = CAS, e = explode(L, dur), Cp = ptop(K, 0, 0, L, dur); locator(K, L);
    pillarLabels(K, L, dur, 1.0);
    deltas(K, L, dur, 1.3, 1.3);
    const ra = clamp(seg(L, 2.4, 2.9)) * e, R = 3.2;
    ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = css(C.ink); ctx.lineWidth = 2; ctx.beginPath();
    for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2, q = proj([Cp[0] + Math.sin(a) * R, Cp[1] + 0.3, Cp[2] - Math.cos(a) * R]); if (q) k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke(); ctx.restore();
    [['U', 0], ['T', 90], ['S', 180], ['B', 270]].forEach(([s, d]) => tag3([Cp[0] + Math.sin(d * Math.PI / 180) * (R + 0.7), Cp[1] + 0.3, Cp[2] - Math.cos(d * Math.PI / 180) * (R + 0.7)], s, C.ink, ra, -8, 8, 22));
    const da = clamp(seg(L, 2.6, 3.1)) * e, ang = K.A_DEG * Math.PI / 180;
    arrow3([Cp[0], Cp[1] + 0.3, Cp[2]], [Cp[0] + Math.sin(ang) * R, Cp[1] + 0.3, Cp[2] - Math.cos(ang) * R], C.coral, 5, da);
    tag3([Cp[0] + Math.sin(ang) * R, Cp[1] + 0.3, Cp[2] - Math.cos(ang) * R], `${fmt(K.A_DEG, 0)}° · ${COMPASS(K.A_DEG)}`, C.coral, clamp(seg(L, 3.8, 4.2)) * e, 14, -6, 22);
    fcard(L, dur, 'ASPECT · SEL DI BUKIT BARAT', [
      { at: 1.3, text: `turun ke timur  = −∂z/∂x = ${fmt(-K.DZDX, 3)}`, col: hex('#F28A3C') },
      { at: 1.3, text: `turun ke utara = −∂z/∂y = ${fmt(-K.DZDN, 3)}`, col: C.cyan },
      { at: 2.6, text: 'aspect = atan2(timur, utara)', col: C.ink, bold: true },
      { at: 3.8, text: `       = ${fmt(K.A_DEG, 0)}° → menghadap ${COMPASS(K.A_DEG)}`, col: C.coral, bold: true }]);
    steps(L, [[1.3, 'Pindah ke bukit barat. Turunan x dan y dihitung dengan cara yang sama, lalu dibalik tandanya.', 'Tanda dibalik karena aspect menunjuk arah air mengalir turun.'],
      [2.6, 'atan2 mengubah dua komponen itu menjadi satu arah kompas.', 'Kompas: 0° = utara, berputar searah jarum jam.'],
      [3.8, `Lereng ini menghadap ${COMPASS(K.A_DEG)} (${fmt(K.A_DEG, 0)}°), berbeda dari sel bukit utama tadi.`, 'Berguna untuk paparan matahari, erosi, dan penempatan panel surya.']]);
  }
};
const SH = (() => { const K = CHS; const Z = (90 - SUN_ALT) * Math.PI / 180, S = K.S_DEG * Math.PI / 180, A = K.A_DEG * Math.PI / 180, Az = SUN_AZ * Math.PI / 180;
  const v = Math.cos(Z) * Math.cos(S) + Math.sin(Z) * Math.sin(S) * Math.cos(Az - A); return { az: SUN_AZ, alt: SUN_ALT, Zd: 90 - SUN_ALT, v, b: Math.max(0, v) * 255 }; })();
INS_FN.shade = {
  // low view from the shadow side, looking up the face towards the sun
  cam: L => ({ t: [CHS.SC[0], CHS.zAt(0, 0) + 1.8, CHS.SC[1]], az: SUN_AZ * Math.PI / 180 - Math.PI / 2 - 0.15 - 0.03 * L, el: 0.26, d: 24, fov: 38, ox: 330, oy: 40 }),
  pre(L, dur) { const K = CHS, e = explode(L, dur), z = K.zAt(0, 0); const w = SD * 0.5, gg = clamp(seg(L, 5.6, 6.2));
    const g = 40 + 215 * clamp(SH.v) * gg; box(K.SC[0] - w, z + 0.05, K.SC[1] - w, K.SC[0] + w, z + 0.05 + 0.25 * e, K.SC[1] + w, gg > 0 ? [g, g, g] : hex('#F4C542')); },
  post(L, dur) { const K = CHS, e = explode(L, dur), z = K.zAt(0, 0) + 0.3 * e, P = [K.SC[0], z, K.SC[1]]; locator(K, L);
    const n = norm([-K.DZDX, 1, K.DZDN]), sun = sunFrom(SUN_AZ, SUN_ALT), Ln = 4;
    arrow3(P, add3(P, mul3(n, Ln)), C.ink, 4, clamp(seg(L, 1.3, 1.8)) * e); tag3(add3(P, mul3(n, Ln)), 'normal n', C.ink, clamp(seg(L, 1.5, 1.9)) * e, 12, -6, 20);
    arrow3(add3(P, mul3(sun, Ln * 1.3)), P, C.gold, 4, clamp(seg(L, 2.8, 3.3)) * e); tag3(add3(P, mul3(sun, Ln * 1.3)), 'matahari', C.gold, clamp(seg(L, 2.9, 3.3)) * e, 12, -6, 20);
    seg3(add3(P, [0, 0.01, 0]), add3(P, [0, Ln, 0]), C.mute, 2, clamp(seg(L, 2.8, 3.3)) * e, [5, 6]);
    tag3(P, `kecerahan ${fmt0(SH.b)} / 255`, C.ink, clamp(seg(L, 5.6, 6.0)) * e, 20, 40, 22);
    fcard(L, dur, 'HILLSHADE · SEL DI BUKIT TIMUR LAUT', [
      { at: 1.3, text: `slope S = ${fmt(K.S_DEG)}°   aspect A = ${fmt(K.A_DEG, 0)}°`, col: C.ink },
      { at: 2.8, text: `matahari: azimut ${SH.az}°, zenith Z = ${SH.Zd}°`, col: C.gold },
      { at: 4.2, text: 'cosZ·cosS + sinZ·sinS·cos(Az − A)', col: C.ink, bold: true },
      { at: 5.6, text: `= ${fmt(SH.v, 3)} × 255 = ${fmt0(SH.b)}`, col: C.gold, bold: true }]);
    steps(L, [[1.3, 'Sel ketiga, di bukit timur laut. Normalnya dihitung dari slope & aspect sel ini.', 'Vektor normal = arah tegak lurus permukaan.'],
      [2.8, 'Matahari dinyatakan dengan azimut dan zenith (90° − altitude).', 'Lereng ini menghadap hampir ke arah matahari.'],
      [4.2, 'Rumus ini adalah kosinus sudut antara normal dan matahari.', 'Bagian pertama: dari atas. Bagian kedua: koreksi arah hadap lereng.'],
      [5.6, `Hasilnya ${fmt(SH.v, 3)} × 255 → nilai abu-abu ${fmt0(SH.b)}: terang karena menghadap matahari.`, 'Lereng di balik bukit akan mendapat nilai jauh lebih kecil.']]);
  }
};

/* ---------- 5. cut & fill ---------- */
const CUT_C = CELLS.filter(c => c.h > Z0 + 0.6 && c.h < Z0 + 2.6 && c.cx > 0).sort((a, b) => Math.hypot(a.cx - 10, a.cz) - Math.hypot(b.cx - 10, b.cz))[0];
const FILL_C = CELLS.filter(c => !c.lake && c.h < Z0 - 1.2 && c.h > Z0 - 3.5).sort((a, b) => Math.hypot(a.cx - CUT_C.cx - 8, a.cz - CUT_C.cz) - Math.hypot(b.cx - CUT_C.cx - 8, b.cz - CUT_C.cz))[0];
const ROWJ = CUT_C.j;
const ROW = CELLS.filter(c => c.j === ROWJ), ROWV = ROW.reduce((s, c) => s + (c.h - Z0), 0) * CS * CS * M * M * M;
const AREA = CS * M * CS * M;
INS_FN.cut = {
  cam: L => ({ t: [CUT_C.cx + 3, Z0 + 3, CUT_C.cz], az: 3.75, el: 0.42, d: 40, fov: 38, ox: 330, oy: 40 }),
  pre(L, dur) { const e = explode(L, dur), lift = 5 * e;
    for (const [c, col] of [[CUT_C, hex('#E8823A')], [FILL_C, hex('#4F8FE0')]]) {
      const y0 = Math.min(c.h, Z0), y1 = Math.max(c.h, Z0);
      box(c.cx - CS / 2, y0 + lift, c.cz - CS / 2, c.cx + CS / 2, y1 + lift, c.cz + CS / 2, col); }
    const rp = clamp(seg(L, 6.2, 7.4));
    if (rp > 0) ROW.forEach((c, k) => { if (k / ROW.length > rp) return; const y0 = Math.min(c.h, Z0), y1 = Math.max(c.h, Z0); const up = 2.5 * e;
      box(c.cx - CS * 0.45, y0 + up, c.cz - CS * 0.45, c.cx + CS * 0.45, y1 + up + 0.02, c.cz + CS * 0.45, c.h > Z0 ? hex('#E8823A') : hex('#4F8FE0')); }); },
  post(L, dur) { const e = explode(L, dur), lift = 5 * e;
    const top = [CUT_C.cx, CUT_C.h + lift, CUT_C.cz], bot = [CUT_C.cx, Z0 + lift, CUT_C.cz];
    const da = clamp(seg(L, 1.4, 1.9)) * e;
    seg3([CUT_C.cx - CS / 2, CUT_C.h + lift + 0.3, CUT_C.cz + CS / 2 + 0.3], [CUT_C.cx + CS / 2, CUT_C.h + lift + 0.3, CUT_C.cz + CS / 2 + 0.3], C.ink, 2, da);
    tag3([CUT_C.cx, CUT_C.h + lift + 0.3, CUT_C.cz + CS / 2 + 0.3], `${fmt(CS * M)} m`, C.ink, da, -30, -10, 20);
    seg3([CUT_C.cx + CS / 2 + 0.3, top[1], CUT_C.cz - CS / 2], [CUT_C.cx + CS / 2 + 0.3, bot[1], CUT_C.cz - CS / 2], C.gold, 3, clamp(seg(L, 3.0, 3.4)) * e);
    tag3([CUT_C.cx + CS / 2 + 0.3, (top[1] + bot[1]) / 2, CUT_C.cz - CS / 2], `z − z₀ = ${fmt((CUT_C.h - Z0) * M)} m`, C.gold, clamp(seg(L, 3.0, 3.4)) * e, 14, 0, 20);
    tag3([FILL_C.cx, Z0 + lift + 0.2, FILL_C.cz], `${fmt((FILL_C.h - Z0) * M)} m → timbun`, hex('#7FB6FF'), clamp(seg(L, 4.6, 5.0)) * e, 14, -10, 20);
    tag3([ROW[ROW.length - 1].cx, Z0 + 3, ROW[ROW.length - 1].cz], `Σ satu baris = ${fmt0(ROWV)} m³`, C.ink, clamp(seg(L, 7.2, 7.6)) * e, 10, -10, 20);
    const vc = AREA * (CUT_C.h - Z0) * M, vf = AREA * (FILL_C.h - Z0) * M;
    fcard(L, dur, 'CUT & FILL · DUA SEL CONTOH', [
      { at: 1.4, text: `A = ${fmt(CS * M)} × ${fmt(CS * M)} = ${fmt(AREA)} m²`, col: C.ink },
      { at: 3.0, text: `V = A · (z − z₀) = ${fmt(AREA)} × ${fmt((CUT_C.h - Z0) * M)}`, col: hex('#F2A55E') },
      { at: 3.0, text: `  = +${fmt0(vc)} m³  (galian)`, col: hex('#F2A55E'), bold: true },
      { at: 4.6, text: `sel lain: ${fmt0(vf)} m³  (timbunan)`, col: hex('#7FB6FF'), bold: true },
      { at: 6.2, text: `Σ semua sel: galian ${fmt0(CUT)} m³`, col: C.ink },
      { at: 7.6, text: `            timbunan ${fmt0(FILL)} m³`, col: C.ink }]);
    steps(L, [[1.4, 'Satu sel dicabut. Alasnya adalah luas sel.', `Grid ${fmt(CS * M)} m → satu sel ${fmt(AREA)} m².`],
      [3.0, 'Tingginya = elevasi permukaan dikurangi bidang acuan z₀ = 60 m.', 'Positif → tanah di atas acuan harus digali.'],
      [4.6, 'Sel yang lebih rendah dari z₀ memberi nilai negatif.', 'Negatif → perlu timbunan sampai rata z₀.'],
      [6.2, 'Ulangi untuk setiap sel. Ini satu baris saja.', 'Kolom oranye dan biru dijumlahkan dengan tandanya.'],
      [7.6, 'Total semua 3.136 sel memberi volume galian dan timbunan.', 'Karena hampir seimbang, tanah galian bisa dipakai untuk menimbun.']]);
  }
};

/* ---------- 6. 3D distance ---------- */
INS_FN.dist = {
  cam: L => { const lm = BLD[BLD.length - 1]; return { t: [(lm.x + DIST_B.x) / 2, 5, (lm.z + DIST_B.z) / 2], az: 0.9 + 0.02 * L, el: 0.4, d: 46, fov: 38, ox: 330, oy: 20 }; },
  pre(L, dur) { const lm = BLD[BLD.length - 1], A = [lm.x, lm.h + 1.4, lm.z], B = [DIST_B.x, DIST_B.h, DIST_B.z], e = explode(L, dur), off = 3 * e * (1 - eio(seg(L, 5.2, 6.0))), r = 0.14;
    const a1 = clamp(seg(L, 1.3, 1.9)), a2 = clamp(seg(L, 2.6, 3.2)), a3 = clamp(seg(L, 3.9, 4.5));
    if (a1 > 0) box(Math.min(A[0], B[0]), A[1] - r + off, A[2] - r, Math.max(A[0], B[0]), A[1] + r + off, A[2] + r, hex('#F28A3C'));
    if (a2 > 0) box(B[0] - r + off * 0.6, A[1] - r + off, Math.min(A[2], B[2]), B[0] + r + off * 0.6, A[1] + r + off, Math.max(A[2], B[2]), hex('#47D7EA'));
    if (a3 > 0) box(B[0] - r + off, Math.min(A[1], B[1]), B[2] - r, B[0] + r + off, Math.max(A[1], B[1]), B[2] + r, hex('#5EDB8E')); },
  post(L, dur) { const lm = BLD[BLD.length - 1], A = [lm.x, lm.h + 1.4, lm.z], B = [DIST_B.x, DIST_B.h, DIST_B.z], e = explode(L, dur), off = 3 * e * (1 - eio(seg(L, 5.2, 6.0)));
    const dx = Math.abs(B[0] - A[0]) * M, dy = Math.abs(B[2] - A[2]) * M, dz = Math.abs(A[1] - B[1]) * M, d2 = Math.hypot(dx, dy), d3 = Math.hypot(dx, dy, dz);
    tag3([(A[0] + B[0]) / 2, A[1] + off, A[2]], `Δx ${fmt0(dx)} m`, hex('#F28A3C'), clamp(seg(L, 1.5, 1.9)) * e, 10, -12, 20);
    tag3([B[0] + off * 0.6, A[1] + off, (A[2] + B[2]) / 2], `Δy ${fmt0(dy)} m`, C.cyan, clamp(seg(L, 2.8, 3.2)) * e, 10, -12, 20);
    tag3([B[0] + off, (A[1] + B[1]) / 2, B[2]], `Δz ${fmt0(dz)} m`, C.green, clamp(seg(L, 4.1, 4.5)) * e, 12, 0, 20);
    seg3(A, B, C.ink, 4, clamp(seg(L, 5.2, 5.8)));
    fcard(L, dur, 'JARAK 3D · ANTENA → ATAP', [
      { at: 1.3, text: `Δx (timur) = ${fmt0(dx)} m`, col: hex('#F28A3C') },
      { at: 2.6, text: `Δy (utara) = ${fmt0(dy)} m   → 2D = ${fmt0(d2)} m`, col: C.cyan },
      { at: 3.9, text: `Δz (tinggi) = ${fmt0(dz)} m`, col: C.green },
      { at: 5.2, text: `√(${fmt0(dx)}² + ${fmt0(dy)}² + ${fmt0(dz)}²) = ${fmt0(d3)} m`, col: C.ink, bold: true }]);
    steps(L, [[1.3, 'Garis antena–atap diurai menjadi tiga batang searah sumbu.', 'Batang oranye: selisih ke arah timur.'],
      [2.6, 'Batang biru: selisih ke arah utara.', `Dua batang ini saja memberi jarak 2D ${fmt0(d2)} m.`],
      [3.9, 'Batang hijau: selisih tinggi, yang diabaikan oleh peta 2D.', `Antena ${fmt0(A[1] * M)} m, atap ${fmt0(B[1] * M)} m.`],
      [5.2, 'Ketiganya disambung: Pythagoras dalam tiga sumbu.', `Jarak 3D ${fmt0(d3)} m, selisih ${fmt0(d3 - d2)} m dari jarak 2D.`]]);
  }
};

/* ---------- 7. aquifer volume ---------- */
const AQV = (() => { for (let i = GN - 1; i >= 0; i--) for (let j = 0; j < GN; j++) { const col = GEO[i][j]; for (let l = 0; l < col.length; l++) if (col[l] === 2 && (-GE + (i + .5) * GC) < -6) return [i, j, l]; } return [0, 0, 0]; })();
INS_FN.aquifer = {
  cam: L => ({ t: [-GE + (AQV[0] + .5) * GC, (AQV[2] + .5) * GV + 4, -GE + (AQV[1] + .5) * GC], az: 1.0, el: 0.45, d: 34, fov: 38, ox: 330, oy: 40 }),
  pre(L, dur) { const e = explode(L, dur), x = -GE + (AQV[0] + .5) * GC, z = -GE + (AQV[1] + .5) * GC, y = (AQV[2] + .5) * GV + 7 * e, s = 1 + 0.4 * e;
    box(x - GC / 2 * s, y - GV / 2 * s, z - GC / 2 * s, x + GC / 2 * s, y + GV / 2 * s, z + GC / 2 * s, hex('#4F9BD9')); },
  post(L, dur) { const e = explode(L, dur), x = -GE + (AQV[0] + .5) * GC, z = -GE + (AQV[1] + .5) * GC, y = (AQV[2] + .5) * GV + 7 * e, s = 1 + 0.4 * e, h = GC / 2 * s, v = GV / 2 * s;
    const a = clamp(seg(L, 1.3, 1.8)) * e;
    seg3([x - h, y + v + 0.3, z + h + 0.3], [x + h, y + v + 0.3, z + h + 0.3], C.ink, 2, a); tag3([x, y + v + 0.3, z + h + 0.3], '40 m', C.ink, a, -24, -10, 20);
    seg3([x + h + 0.3, y + v + 0.3, z - h], [x + h + 0.3, y + v + 0.3, z + h], C.ink, 2, a); tag3([x + h + 0.3, y + v + 0.3, z], '40 m', C.ink, a, 12, -10, 20);
    seg3([x + h + 0.3, y - v, z + h + 0.3], [x + h + 0.3, y + v, z + h + 0.3], C.gold, 2, a); tag3([x + h + 0.3, y, z + h + 0.3], '16 m', C.gold, a, 12, 6, 20);
    fcard(L, dur, 'VOLUME AKUIFER · KUERI VOXEL', [
      { at: 1.3, text: 'V voxel = 40 × 40 × 16 = 25.600 m³', col: C.ink },
      { at: 2.6, text: `n = ${AQ_N} voxel berlabel "pasir jenuh"`, col: hex('#7FB6FF') },
      { at: 3.8, text: `V = ${AQ_N} × 25.600 = ${fmt0(AQ_N * 25600)} m³`, col: C.ink, bold: true }]);
    steps(L, [[1.3, 'Satu voxel ditarik keluar: ukurannya tetap dan diketahui.', 'Grid horizontal 40 m, tebal lapisan 16 m.'],
      [2.6, 'Hitung berapa voxel yang atributnya "pasir jenuh".', 'Ini kueri atribut biasa, hanya saja datanya bervolume.'],
      [3.8, 'Jumlah voxel × volume satu voxel = volume akuifer.', 'Ketelitiannya bergantung ukuran voxel: makin kecil, makin halus.']]);
  }
};

/* ---------- 8. DEM RMSE from check points ---------- */
const GCP = (() => { const out = [], r = rng(55); while (out.length < 12) { const x = (r() * 2 - 1) * (UE - 6), z = (r() * 2 - 1) * (UE - 6); if (inLake(x, z, 1.5)) continue;
  const veg = g2(x, z, -28, 18, 6) + g2(x, z, 4, -22, 7) + g2(x, z, 30, 6, 5); const e = 0.55 * Math.sin(x * 0.23 + 1) * Math.cos(z * 0.19) + 0.3 * Math.sin(x * 0.5 + z * 0.4) + 1.6 * veg;
  out.push([x, uH(x, z), z, e]); } return out; })();
const GCP_SS = GCP.reduce((s, p) => s + p[3] * p[3], 0), GCP_RMSE = Math.sqrt(GCP_SS / GCP.length);
INS_FN.rmse_dem = {
  cam: L => ({ t: [0, 3, 0], az: 0.75, el: 0.62, d: 62, fov: 38, ox: 330, oy: 40 }),
  pre(L, dur) { const e = explode(L, dur), sq = clamp(seg(L, 2.8, 3.6)), k = 6;
    GCP.forEach(([x, y, z, er]) => { const hgt = Math.abs(er) * k * e * (1 - sq * 0.85), col = er >= 0 ? hex('#E0442E') : hex('#1F5FD0');
      box(x - 0.18, y + 0.1, z - 0.18, x + 0.18, y + 0.1 + Math.max(0.05, hgt), z + 0.18, col);
      if (sq > 0) { const s = Math.abs(er) * k * 0.5 * sq; box(x - s, y + 0.1 + hgt, z - s, x + s, y + 0.18 + hgt, z + s, hex('#F4C542')); } }); },
  post(L, dur) { const e = explode(L, dur);
    GCP.forEach(([x, y, z, er], k) => tag3([x, y + 0.3 + Math.abs(er) * 6 * e * (1 - clamp(seg(L, 2.8, 3.6)) * 0.85), z], `${er >= 0 ? '+' : ''}${fmt(er, 2)}`, er >= 0 ? hex('#FF8A73') : hex('#8FB8FF'), clamp(seg(L, 1.4 + k * 0.05, 1.8 + k * 0.05)) * e * (1 - seg(L, 4.2, 4.5)), 10, -8, 18));
    fcard(L, dur, 'RMSE · 12 TITIK CEK LAPANGAN', [
      { at: 1.3, text: 'eᵢ = z_DEM − z_referensi', col: C.ink },
      { at: 2.8, text: `Σ eᵢ² = ${fmt(GCP_SS, 2)} m²`, col: C.gold },
      { at: 4.2, text: `RMSE = √(Σeᵢ² / n) = √(${fmt(GCP_SS, 2)} / 12)`, col: C.ink, bold: true },
      { at: 5.6, text: `     = ${fmt(GCP_RMSE, 2)} m  (seluruh grid: ${fmt(DEM_RMSE, 2)} m)`, col: C.gold, bold: true }]);
    steps(L, [[1.3, 'Di 12 titik cek, tinggi DEM dibandingkan dengan pengukuran lapangan.', 'Tongkat merah = DEM terlalu tinggi, biru = terlalu rendah (skala ×6).'],
      [2.8, 'Setiap selisih dikuadratkan: tongkat berubah jadi kotak.', 'Kuadrat menghapus tanda dan menghukum galat besar lebih berat.'],
      [4.2, 'Rata-ratakan kuadratnya, lalu akarkan kembali ke satuan meter.', 'Itulah Root Mean Square Error.'],
      [5.6, `RMSE ${fmt(GCP_RMSE, 2)} m. Paper memakai ambang 0,85 m.`, 'Titik cek sedikit → hasilnya bisa beda dengan RMSE seluruh grid.']]);
  }
};

/* ---------- 9. footprint RMSE & area distortion on one building ---------- */
const FPB = UB.filter(b => !b.ft).sort((a, b) => b.Hm - a.Hm)[0];
const FPC = (() => { const sh = FPB.Hm / M * 0.09, k = 1.05; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => {
  const t = [FPB.x + a * FPB.w / 2, FPB.z + c * FPB.d / 2], p = [FPB.x + LEAN[0] * sh + a * FPB.w / 2 * k, FPB.z + LEAN[2] * sh + c * FPB.d / 2 * k]; return [t, p, Math.hypot(p[0] - t[0], p[1] - t[1]) * M]; }); })();
const FPB_RMSE = Math.sqrt(FPC.reduce((s, c) => s + c[2] * c[2], 0) / 4);
INS_FN.rmse_fp = {
  cam: L => ({ t: [FPB.x, 3, FPB.z], az: 0, el: 1.5, d: 15, fov: 38, ox: 330, oy: 20 }),
  pre() {},
  post(L, dur) { const e = explode(L, dur);
    const poly2 = (pts, col, w, al, dash) => { const s = pts.map(p => proj([p[0], 3.05, p[1]])); if (s.some(v => !v) || al <= 0) return; ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = css(col); ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); s.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke(); ctx.restore(); };
    poly2(FPC.map(c => c[0]), C.cyan, 4, e); poly2(FPC.map(c => c[1]), C.ink, 3, e, [10, 7]);
    FPC.forEach(([t, p, d], k) => { arrow3([t[0], 3.05, t[1]], [p[0], 3.05, p[1]], C.coral, 3, clamp(seg(L, 1.3 + k * 0.15, 1.7 + k * 0.15)) * e);
      tag3([p[0], 3.05, p[1]], `${fmt(d)} m`, C.coral, clamp(seg(L, 1.4 + k * 0.15, 1.8 + k * 0.15)) * e, 12, -6, 20); });
    const Ar = FPB.w * FPB.d * M * M, Ap = Ar * 1.05 * 1.05;
    fcard(L, dur, 'FOOTPRINT · SATU GEDUNG', [
      { at: 1.3, text: `galat sudut: ${FPC.map(c => fmt(c[2])).join(' · ')} m`, col: C.coral },
      { at: 2.6, text: `RMSE = √(Σd² / 4) = ${fmt(FPB_RMSE)} m`, col: C.ink, bold: true },
      { at: 3.8, text: `distorsi = |${fmt0(Ap)} − ${fmt0(Ar)}| / ${fmt0(Ar)}`, col: C.ink },
      { at: 3.8, text: `         = ${fmt((Ap - Ar) / Ar * 100)} %`, col: C.gold, bold: true }]);
    steps(L, [[1.3, 'Garis biru = footprint referensi. Putus-putus = hasil digitasi atap.', `Gedung ${FPB.N} lantai: atapnya tergeser ke satu arah (relief displacement).`],
      [2.6, 'Galat tiap sudut dikuadratkan, dirata-rata, lalu diakarkan.', 'Rumus RMSE yang sama dengan DEM, tapi untuk posisi x,y.'],
      [3.8, 'Distorsi luas membandingkan luas hasil dengan luas referensi.', 'Gedung tinggi → pergeseran lebih besar. Solusi: ortorektifikasi atau ambil tapak, bukan atap.']]);
  }
};

/* ---------- 10. height from floors, exploded ---------- */
let HIDE_FT = false;
INS_FN.height = {
  enter() { HIDE_FT = true; }, leave() { HIDE_FT = false; },
  cam: L => ({ t: [FT.x, FT.gb + 2.2, FT.z], az: 0.95, el: 0.22, d: 17, fov: 38, ox: 300, oy: 30 }),
  pre(L, dur) { const e = explode(L, dur), gap = 0.45 * e; let y = FT.gb; const x0 = FT.x - FT.w / 2, x1 = FT.x + FT.w / 2, z0 = FT.z - FT.d / 2, z1 = FT.z + FT.d / 2;
    box(x0, y - 0.3, z0, x1, y + 0.45, z1, hex('#D9C08A'), null, 0, { win: 1, floor: 0.45, base: y - 0.45 }); y += 0.45 + gap;
    for (let k = 0; k < FT.N; k++) { box(x0, y, z0, x1, y + 0.35, z1, hex('#E3C27A'), null, 0, { win: 1, floor: 0.35, base: y - 0.35 * 0.6 }); y += 0.35 + gap; }
    box(x0, y, z0, x1, y + 0.1, z1, hex('#B9A06A')); },
  post(L, dur) { const e = explode(L, dur), gap = 0.45 * e, xr = FT.x + FT.w / 2 + 0.6; let y = FT.gb;
    tag3([xr, y + 0.22, FT.z], 'lantai dasar 4,5 m', C.ink, clamp(seg(L, 1.3, 1.7)) * e, 10, 8, 20); y += 0.45 + gap;
    for (let k = 0; k < FT.N; k++) { tag3([xr, y + 0.17, FT.z], `lantai ${k + 1} · 3,5 m`, C.gold, clamp(seg(L, 2.6 + k * 0.12, 3.0 + k * 0.12)) * e, 10, 8, 18); y += 0.35 + gap; }
    tag3([xr, y + 0.05, FT.z], 'parapet & atap 1,0 m', C.ink, clamp(seg(L, 4.0, 4.4)) * e, 10, 8, 20);
    const ga = clamp(seg(L, 5.4, 5.9)); seg3([FT.x - FT.w / 2 - 0.5, FT.gb, FT.z + FT.d / 2], [FT.x - FT.w / 2 - 0.5, FT.gb + FT.Hm / M, FT.z + FT.d / 2], C.gold, 3, ga);
    tag3([FT.x - FT.w / 2 - 0.5, FT.gb + FT.Hm / M / 2, FT.z + FT.d / 2], `H = ${fmt(FT.Hm)} m`, C.gold, ga, -170, 0, 24);
    fcard(L, dur, 'TINGGI GEDUNG · RUMUS PAPER', [
      { at: 1.3, text: 'H = h_dasar + h_lantai × N + 1,0', col: C.ink, bold: true },
      { at: 2.6, text: `h_lantai × N = 3,5 × ${FT.N} = ${fmt(3.5 * FT.N)} m`, col: C.gold },
      { at: 4.0, text: '+ 1,0 m parapet/atap', col: C.ink },
      { at: 5.4, text: `H = 4,5 + ${fmt(3.5 * FT.N)} + 1,0 = ${fmt(FT.Hm)} m`, col: C.gold, bold: true }]);
    steps(L, [[1.3, 'Gedung dipisah per komponen. Lantai dasar biasanya lebih tinggi: 4,5 m.', 'Lobi, kanopi, dan struktur transfer membuatnya lebih tinggi dari lantai biasa.'],
      [2.6, `Di atasnya ${FT.N} lantai tipikal, masing-masing 3,5 m.`, 'Jumlah lantai bisa dihitung dari Street View atau survei lapangan.'],
      [4.0, 'Ditambah 1,0 m untuk parapet dan atap.', 'Konstanta ini dari paper; nilainya perlu dicek untuk gedung UI.'],
      [5.4, 'Komponen disusun kembali: tinggi total untuk ekstrusi LOD1.', 'Rumus sederhana, tapi asumsi tinggi lantai sangat menentukan hasil.']]);
  }
};
