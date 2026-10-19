/* ===== Studi kasus: Kampus UI Depok — DATA ASLI dari pipeline ui3d (notebook 00–11) ===== */
const UIJ = window.__UI;
const UIB = UIJ.buildings;
const UI_REK = UIB.findIndex(b => b.name === 'Rektorat');
const UI_DEK = UIB.findIndex(b => b.name === 'Dekanat FTUI');
const UI_FEB = UIB.findIndex(b => b.name === UIJ.fp.name);
const uiWy = z => (z - UIJ.ZB) / UIJ.U * UIJ.VE;
const UI_FL = UIJ.flood;                                     // flood_impact.csv
const UI_FL0 = UI_FL[0].level_m, UI_FL1 = UI_FL[UI_FL.length - 1].level_m;
const UI_IS = UIJ.icesat;                                     // 57 ICESat-2 ATL08 segments inside the campus
const UI_IS_SS = UI_IS.reduce((s, p) => s + p.dz * p.dz, 0), UI_IS_RMSE = Math.sqrt(UI_IS_SS / UI_IS.length);
const TE = UIJ.terrain_eval.find(r => r.dem === 'DEMNAS' && r.subset === 'semua');
const ROOM_USES = [...new Set(UIJ.indoor.rooms.map(r => r.use))];
const ROOM_COL = { 'Lab': hex('#A493FF'), 'Ruang Dosen': hex('#F4C542'), 'Ruang Kelas': hex('#47D7EA'), 'Toilet/Tangga': hex('#FF6B57'), 'Koridor': hex('#9AA3B5'), 'Administrasi': hex('#5EDB8E'), 'Ruang Rapat': hex('#F28A3C') };
const roomCol = u => ROOM_COL[u] || hsl((ROOM_USES.indexOf(u) * 67) % 360, 0.55, 0.6);
const uiCentroid = i => [UIB[i].cx, UIB[i].y0, UIB[i].cz];
function uiCredit(t) { const al = clamp(seg(t, 88.4, 88.9)) * (1 - seg(t, 123.6, 124)); if (al <= 0) return;
  ctx.save(); ctx.globalAlpha = al; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.textAlign = 'right';
  ctx.fillText('Data: OSM · DEMNAS · ICESat-2 · Google Open Buildings · pipeline ui3d · tinggi ×2', W - 120, 156); ctx.textAlign = 'left'; ctx.restore(); }
function ringPath(ring, y, col, w, al, dash) { const s = ring.map(([x, z]) => proj([x, y, z])); if (s.some(v => !v) || al <= 0.01) return;
  ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = css(col); ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); s.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke(); ctx.restore(); }
function uiFloodLevel(t) { return t >= 107 ? lerp(UI_FL0, UI_FL1, eio(seg(t, 108.2, 114.2))) * (1 - seg(t, 116.6, 117.4)) + UI_FL0 * seg(t, 116.6, 117.4) : null; }
function uiFloodCount(L) { let n = 0; for (const r of UI_FL) if (r.level_m <= L + 1e-6) n = r.gedung_terhubung; return n; }
function isSticks(e, sq) { // ICESat-2 sticks: from the DEM surface down/up to the laser-measured ground
  for (const p of UI_IS) { const yTop = uiWy(p.zd), yG = uiWy(p.zd - p.dz), col = p.dz >= 0 ? hex('#E0442E') : hex('#2F6FE0');
    const y0 = Math.min(yTop, yG), y1 = Math.max(yTop, yG), h = (y1 - y0) * e; if (h < 0.01) continue; const mid = (y0 + y1) / 2;
    box(p.x - 0.5, mid - h / 2, p.z - 0.5, p.x + 0.5, mid + h / 2, p.z + 0.5, col);
    if (sq > 0) { const s = Math.abs(p.dz) / UIJ.U * 0.9 * sq; box(p.x - s, yTop + 0.1, p.z - s, p.x + s, yTop + 0.25, p.z + s, hex('#F4C542')); } } }

function sUI(t) {
  bgFill(t, 0.6);
  const [hx, hy] = hand(t, 0.8);
  const rek = UIB[UI_REK], dek = UIB[UI_DEK];
  // ---------- camera ----------
  let cam;
  if (t < 93) cam = { t: [0, 2, 0], az: lerp(0.15, 0.5, eio(seg(t, 88, 93))), el: lerp(1.05, 0.72, eio(seg(t, 88, 93))), d: lerp(360, 300, eio(seg(t, 88, 93))) };
  else if (t < 99) cam = { t: [0, 2, 0], az: Math.PI / 2, el: lerp(1.45, 1.35, seg(t, 93, 99)), d: 300 };
  else if (t < 103) { const q = eio(seg(t, 99, 101.5)); cam = { t: [lerp(0, rek.cx, q), lerp(2, rek.y0 + 3, q), lerp(0, rek.cz, q)], az: lerp(Math.PI / 2, 0.55, q), el: lerp(1.35, 0.5, q), d: lerp(300, 120, q) }; }
  else if (t < 107) { const q = eio(seg(t, 103, 104.2)); cam = { t: [rek.cx, rek.y0 + 3, rek.cz], az: 0.55 + 0.1 * (t - 103), el: lerp(0.5, 0.32, q), d: lerp(120, 42, q), ox: 160 * q }; }
  else if (t < 117) { const q = eio(seg(t, 107, 108.8)); cam = { t: [lerp(rek.cx, 15, q), lerp(rek.y0 + 3, 1, q), lerp(rek.cz, -40, q)], az: lerp(1.5, 2.5, eio(seg(t, 107, 117))), el: lerp(0.32, 0.62, q), d: lerp(42, 250, q), ox: lerp(160, -120, q) }; }
  else { const q = eio(seg(t, 117, 118.8)); cam = { t: [lerp(15, dek.cx, q), lerp(1, dek.y0 + 3, q), lerp(-40, dek.cz, q)], az: 2.5 + 0.08 * (t - 117), el: lerp(0.62, 0.55, q), d: lerp(250, 17, q), ox: lerp(-120, 220, q) }; }
  cam.fov = 40; cam.ox = (cam.ox || 0) + hx; cam.oy = (cam.oy || 0) + hy; setCam(cam);

  // ---------- scene state ----------
  const level = uiFloodLevel(t);
  const indoor = t >= 117 ? eio(seg(t, 117.6, 119.4)) : 0;
  const grow = t < 99 ? -5 : t - 99.6;            // buildings appear in Langkah 3 (height)
  const hide = new Set(); if (indoor > 0) hide.add(UI_DEK); if (INS_ACTIVE && INS_ACTIVE.ins.id === 'height') hide.add(UI_REK);
  GL.ui({
    grow, lod: t >= 105.9 ? clamp(seg(t, 105.9, 106.4)) : 0, flood: level != null ? uiWy(level) : null,
    dl: t >= 93 && t < 99 && !(INS_ACTIVE && INS_ACTIVE.ins.id === 'rmse_fp') ? { z: lerp(-175, 175, eio(seg(t, 93.6, 95.8))), a: 1 - seg(t, 98.4, 99) } : null, hide,
    color: (b, i) => {
      if (level != null && b.flood <= level + 1e-6) return hex('#E8553F');
      if (i === UI_REK && t >= 99 && t < 107) return hex('#E3C27A');
      if (indoor > 0) return mixc(mixc(hex('#CFCBC2'), hex('#ECE8E0'), hash2(b.cx, b.cz)), C.bg, 0.45 * indoor);
      return mixc(hex('#CFCBC2'), hex('#ECE8E0'), hash2(b.cx, b.cz));
    }, dim: indoor * 0.45
  });
  if (t < 93) isSticks(clamp(seg(t, 90.2, 91.2)), 0);
  if (indoor > 0) {
    const x0 = dek.y0 + 0.02, gap = 1.3 * indoor;
    const st = GL.uiStack('dek', UIJ.indoor.rooms.map(r => ({ ring: r.r, h: r.h / UIJ.U * UIJ.VE * 0.92, col: roomCol(r.use), f: r.f, z0: r.z0 })));
    st.visible = true; st.children.forEach(m => { const p = m.userData; m.position.y = x0 + p.z0 / UIJ.U * UIJ.VE + (p.f - 1) * gap; m.visible = clamp(seg(t, 118.0 + (p.f - 1) * 0.3, 118.5 + (p.f - 1) * 0.3)) > 0; m.scale.y = Math.max(0.02, clamp(seg(t, 118.0 + (p.f - 1) * 0.3, 118.6 + (p.f - 1) * 0.3))); });
  }
  flush();

  // ---------- overlays ----------
  // A: lake names, ICESat panel
  const la = clamp(seg(t, 88.4, 89)) * (1 - seg(t, 90.0, 90.4));
  if (la > 0) for (const l of UIJ.lakes) if (l.name && l.area > 10000) tag3([l.cx, l.y + 0.5, l.cz], l.name, C.ink, la, -40, 0, 20);
  const ha = clamp(seg(t, 90.4, 90.9)) * (1 - seg(t, 92.6, 93));
  if (ha > 0) {
    const px = W - 600, py = 520, pw = 480, ph = 330; plate(px, py, pw, ph, ha);
    ctx.save(); ctx.globalAlpha = ha; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('ΔZ = DEMNAS − ICESat-2 · 1.249 SEGMEN', px + 24, py + 36);
    const H_ = UIJ.hist, mx = Math.max(...H_), bw = (pw - 48) / H_.length, gp = eo(seg(t, 90.6, 91.6));
    H_.forEach((v, k) => { const e = -22 + (k + .5) * 2, hh = v / mx * 150 * gp; ctx.fillStyle = css(e >= 0 ? mixc(hex('#E9ECEF'), hex('#E0442E'), clamp(e / 10)) : mixc(hex('#E9ECEF'), hex('#2F6FE0'), clamp(-e / 10)));
      ctx.fillRect(px + 24 + k * bw + 2, py + 210 - hh, bw - 4, hh); });
    const X = v => px + 24 + (v + 22) / 44 * (pw - 48); ctx.fillStyle = css(C.gold); ctx.fillRect(X(-0.85), py + 216, Math.max(3, X(0.85) - X(-0.85)), 3);
    setFont(FONT_M, 16, 500); ctx.fillStyle = css(C.mute); ctx.fillText('≤ −20 m', px + 24, py + 240); ctx.textAlign = 'right'; ctx.fillText('≥ +20 m', px + pw - 24, py + 240); ctx.textAlign = 'center'; ctx.fillStyle = css(C.gold); ctx.fillText('±0,85 m', X(0), py + 240); ctx.textAlign = 'left';
    setFont(FONT_M, 21, 600); ctx.fillStyle = css(C.ink); ctx.fillText(`RMSE ${fmt(TE.rmse, 2)} m · NMAD ${fmt(TE.nmad, 2)} m`, px + 24, py + 278);
    ctx.fillStyle = css(C.coral); ctx.fillText(`${fmt(TE['pct_abs_lt_0.85m'], 1)}% < 0,85 m (paper: 90%)`, px + 24, py + 310); ctx.restore();
  }
  caption(t, 88.6, 90.6, 'Studi kasus: Kampus UI Depok dengan data asli', `${UIB.length} gedung OSM di atas DEMNAS 8 m. Langkah 1: uji DEM terhadap laser ICESat-2.`);
  caption(t, 90.8, 92.8, 'Tongkat = selisih DEM terhadap tanah ICESat-2 di 57 titik kampus', 'Merah: DEM lebih tinggi. DEMNAS adalah DSM radar: ikut merekam kanopi (median ±9,7 m) dan atap.');
  // B: Mask R-CNN class map + metrics
  if (t >= 93 && t < 99) {
    const ca = clamp(seg(t, 94.0, 94.5)) * (1 - seg(t, 98.6, 99));
    if (ca > 0) { plate(120, 220, 340, 200, ca); ctx.save(); ctx.globalAlpha = ca; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('MASK R-CNN · RUN 3', 144, 256);
      [['Bangunan', C.coral], ['Jalan', C.gold], ['Vegetasi', C.green], ['Air', C.blue]].forEach(([s, c], r) => { ctx.fillStyle = css(c); ctx.fillRect(144, 276 + r * 34, 22, 22); setFont(FONT_B, 22, 500); ctx.fillStyle = css(C.ink); ctx.fillText(s, 180, 295 + r * 34); }); ctx.restore(); }
    const ma = clamp(seg(t, 95.9, 96.4)) * (1 - seg(t, 98.6, 99));
    if (ma > 0) { plate(W - 600, 640, 480, 216, ma); ctx.save(); ctx.globalAlpha = ma; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('BANGUNAN · 39 CHIP VALIDASI', W - 576, 676);
      setFont(FONT_M, 23, 600); ctx.fillStyle = css(C.ink); ctx.fillText('F1 piksel        0,62', W - 576, 716); ctx.fillStyle = css(C.coral); ctx.fillText('F1 instance      0,29  (paper 0,82)', W - 576, 752);
      ctx.fillStyle = css(C.gold); ctx.globalAlpha = ma * clamp(seg(t, 97.3, 97.8)); ctx.fillText('GOB v3: RMSE vertex 3,72 m', W - 576, 800); setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('paper digitasi manual: 3,7 m', W - 576, 830); ctx.restore(); }
    caption(t, 93.4, 95.9, 'Langkah 2: Mask R-CNN mengklasifikasi citra 0,3 m', 'Peta kelas ini hasil run 3 Anda: bangunan, jalan, vegetasi, air.');
    caption(t, 96.0, 97.4, 'Atap ditemukan (recall piksel 75%), bentuk per gedung belum', 'Gedung terpecah atau menyatu → IoU < 0,5 → F1 instance hanya 0,29.');
    caption(t, 97.5, 98.8, 'Untuk footprint, Google Open Buildings v3 setara paper', 'RMSE vertex 3,72 m terhadap OSM, distorsi luas −0,36%.');
  }
  // C: height formula on Rektorat
  const fa = clamp(seg(t, 100.8, 101.3)) * (1 - seg(t, 102.7, 103.1));
  if (fa > 0) { const n = Math.min(rek.N, Math.floor(seg(t, 101.0, 102.3) * (rek.N + 1)));
    plate(W - 660, 690, 540, 166, fa); ctx.save(); ctx.globalAlpha = fa; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('REKTORAT UI · Bld_Height', W - 636, 726);
    setFont(FONT_M, 24, 600); ctx.fillStyle = css(C.ink); ctx.fillText('H = GFl + Fl × N + 1,0', W - 636, 764);
    ctx.fillStyle = css(C.gold); ctx.fillText(`  = 4,0 + 3,5 × ${n} + 1,0 = ${fmt(4 + 3.5 * n + 1)} m`, W - 636, 802);
    setFont(FONT_M, 17, 500); ctx.fillStyle = css(C.mute); ctx.fillText('N = lantai di atas lantai dasar · seluruh kampus: MAE 1,87 m vs 2.5D', W - 636, 834); ctx.restore(); }
  caption(t, 99.3, 102.8, `Langkah 3: ${UIB.length} gedung diberi tinggi dari jumlah lantai`, 'N dari Open Buildings 2.5D (880 gedung) dan OSM building:levels (115). Disimpan di ui3d.gpkg.');
  // D: procedural LOD2 on Rektorat
  if (t >= 103 && t < 107) {
    const step = t < 104.1 ? 0 : t < 105.0 ? 1 : t < 105.9 ? 2 : 3;
    stepChips(t, ['Extrude', 'Comp', 'Split', 'Texture'], step, clamp(seg(t, 103.1, 103.5)) * (1 - seg(t, 106.6, 107)));
    const ring = rek.rings[0], top = rek.y0 + rek.hy;
    if (step === 1) { const a = clamp(seg(t, 104.1, 104.4)); ring.forEach((p, k) => { const q = ring[(k + 1) % ring.length]; seg3([p[0], rek.y0, p[1]], [p[0], top, p[1]], C.cyan, 2.5, a); seg3([p[0], top, p[1]], [q[0], top, q[1]], C.cyan, 2.5, a); }); }
    if (step === 2) { const a = clamp(seg(t, 105.0, 105.3)); const gf = 4 / UIJ.U * UIJ.VE, fl = 3.5 / UIJ.U * UIJ.VE; for (let k = 0; k <= rek.N; k++) ringPath(ring, rek.y0 + gf + k * fl, hex('#0B1931'), 2, a * 0.8); }
    caption(t, 103.3, 106.8, 'Langkah 4: aturan prosedural mengganti CGA', `${UIB.length} gedung LOD2, ±44 ribu jendela, dibuat dalam 3,4 detik (notebook 07).`);
  }
  // E: flood chart from flood_impact.csv
  const ea = clamp(seg(t, 108.0, 108.5)) * (1 - seg(t, 116.6, 117));
  if (ea > 0 && level != null) {
    const px = W - 640, py = 520, pw = 520, ph = 330; plate(px, py, pw, ph, ea);
    ctx.save(); ctx.globalAlpha = ea; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText('GEDUNG TERDAMPAK · flood_impact.csv', px + 24, py + 36);
    const ix = px + 70, iw = pw - 100, iy = py + 60, ih = ph - 130, nMax = UI_FL[UI_FL.length - 1].gedung_terhubung;
    const X = L => ix + (L - UI_FL0) / (UI_FL1 - UI_FL0) * iw, Y = n => iy + ih - n / nMax * ih;
    ctx.strokeStyle = 'rgba(140,157,190,0.3)'; ctx.lineWidth = 1; for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(ix, iy + ih * k / 4); ctx.lineTo(ix + iw, iy + ih * k / 4); ctx.stroke(); }
    ctx.strokeStyle = css(C.coral); ctx.lineWidth = 3.5; ctx.beginPath(); let st = false;
    for (const r of UI_FL) { if (r.level_m > level + 1e-6) break; st ? ctx.lineTo(X(r.level_m), Y(r.gedung_terhubung)) : ctx.moveTo(X(r.level_m), Y(r.gedung_terhubung)); st = true; } ctx.stroke();
    const nNow = uiFloodCount(level); ctx.fillStyle = css(C.coral); ctx.beginPath(); ctx.arc(X(Math.floor(level)), Y(nNow), 7, 0, Math.PI * 2); ctx.fill();
    setFont(FONT_M, 16, 500); ctx.fillStyle = css(C.mute); ctx.fillText(`${nMax}`, px + 24, iy + 6); ctx.fillText('0', px + 24, iy + ih + 6);
    ctx.fillText(`${UI_FL0} m`, ix, iy + ih + 28); ctx.textAlign = 'right'; ctx.fillText(`${UI_FL1} m`, ix + iw, iy + ih + 28); ctx.textAlign = 'left';
    setFont(FONT_M, 23, 600); ctx.fillStyle = css(C.ink); ctx.fillText(`muka air ${fmt(level, 1)} m → ${nNow} gedung`, px + 24, py + ph - 22); ctx.restore();
  }
  caption(t, 107.3, 111.6, 'Aplikasi 1: muka air dinaikkan 54 → 65 m (EGM2008)', `${UI_FL[0].gedung_terhubung} gedung terdampak di 54 m, ${UI_FL[UI_FL.length - 1].gedung_terhubung} gedung di 65 m. Danau utara paling rendah, jadi meluap duluan.`);
  caption(t, 111.9, 116.8, 'Catatan kritis: model ambang (bathtub)', 'Metode "terhubung ke danau" hanya berbeda 0–9 gedung dari ambang biasa. Tanpa debit dan saluran: skenario, bukan prediksi.');
  // F: indoor legend
  const ia = clamp(seg(t, 118.4, 118.9)) * (1 - seg(t, 123.6, 124));
  if (ia > 0) { const uses = ROOM_USES; plate(120, 220, 360, 70 + uses.length * 34, ia); ctx.save(); ctx.globalAlpha = ia; setFont(FONT_M, 18, 500); ctx.fillStyle = css(C.mute); ctx.fillText(`DEKANAT FTUI · ${fmt0(UIJ.indoor.area)} m² · 2 LANTAI`, 144, 256);
    uses.forEach((u, r) => { ctx.fillStyle = css(roomCol(u)); ctx.fillRect(144, 276 + r * 34, 22, 22); setFont(FONT_B, 22, 500); ctx.fillStyle = css(C.ink); ctx.fillText(u, 180, 295 + r * 34); }); ctx.restore(); }
  caption(t, 117.5, 123.7, 'Aplikasi 2: indoor mapping Dekanat FTUI', `${UIJ.indoor.rooms.length} ruang di 2 lantai; tiap ruang punya nomor dan fungsi (indoor_dekanat_ftui.gpkg).`);
  uiCredit(t);
}

/* ---------- formula breakdowns for the UI part, on the real data ---------- */
INS_FN.rmse_dem = {
  cam: L => ({ t: [0, 3, 0], az: 0.6 + 0.02 * L, el: 0.42, d: 230, fov: 38, ox: 330, oy: 40 }),
  pre(L, dur) { const e = explode(L, dur); isSticks(1, clamp(seg(L, 2.8, 3.6)) * e); },
  post(L, dur) { const e = explode(L, dur);
    const big = UI_IS.slice().sort((a, b) => Math.abs(b.dz) - Math.abs(a.dz));
    big.slice(0, 6).forEach((p, k) => tag3([p.x, uiWy(Math.max(p.zd, p.zd - p.dz)) + 0.6, p.z], `${p.dz >= 0 ? '+' : ''}${fmt(p.dz, 1)} m`, p.dz >= 0 ? hex('#FF8A73') : hex('#8FB8FF'), clamp(seg(L, 1.5 + k * 0.08, 1.9 + k * 0.08)) * e, 10, -8, 18));
    fcard(L, dur, 'RMSE DEM · TITIK ICESat-2 DI KAMPUS', [
      { at: 1.3, text: 'eᵢ = z_DEMNAS − z_ICESat-2', col: C.ink },
      { at: 2.8, text: `Σ eᵢ² = ${fmt0(UI_IS_SS)} m²  (n = ${UI_IS.length})`, col: C.gold },
      { at: 4.2, text: `RMSE = √(${fmt0(UI_IS_SS)} / ${UI_IS.length}) = ${fmt(UI_IS_RMSE, 2)} m`, col: C.ink, bold: true },
      { at: 5.6, text: `1.249 segmen: RMSE ${fmt(TE.rmse, 2)} m · NMAD ${fmt(TE.nmad, 2)} m`, col: C.gold, bold: true }]);
    steps(L, [[1.3, 'Di setiap titik, tinggi DEMNAS dikurangi tanah yang diukur laser ICESat-2.', 'Tongkat = selisihnya (tinggi ×2). Label = enam selisih terbesar.'],
      [2.8, 'Setiap selisih dikuadratkan: kotak emas sebanding dengan eᵢ².', 'Satu titik ekstrem bisa mendominasi jumlah kuadrat.'],
      [4.2, 'Rata-rata kuadrat lalu diakarkan: RMSE titik-titik di dalam kampus.', 'Titik di kanopi rapat menaikkan RMSE karena DEM merekam puncak pohon.'],
      [5.6, 'Di seluruh area, NMAD (tahan pencilan) jauh lebih kecil dari RMSE.', 'Galat besar datang dari sedikit titik ekstrem: DSM vs tanah, bukan DEM yang rusak.']]);
  }
};
const FPX = UIJ.fp;
INS_FN.rmse_fp = {
  cam: L => { const b = UIB[UI_FEB]; return { t: [b.cx, b.y0 + 0.5, b.cz], az: Math.PI / 2, el: 1.5, d: 17, fov: 38, ox: 300, oy: 20 }; },
  pre() {},
  post(L, dur) { const e = explode(L, dur), y = FPX.y + 0.15;
    ringPath(FPX.ref, y, C.cyan, 4, e); ringPath(FPX.cand, y, C.ink, 3, e, [10, 7]);
    FPX.ref.forEach((p, k) => { let best = null, bd = 1e9; for (const q of FPX.cand) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } }
      const a = clamp(seg(L, 1.3 + k * 0.08, 1.7 + k * 0.08)) * e; arrow3([p[0], y, p[1]], [best[0], y, best[1]], C.coral, 3, a);
      if (k % 2 === 0) tag3([best[0], y, best[1]], `${fmt(bd * UIJ.U)} m`, C.coral, a, 10, -6, 18); });
    tag3([FPX.ref[0][0], y, FPX.ref[0][1]], 'OSM (referensi)', C.cyan, clamp(seg(L, 1.0, 1.4)) * e, -180, -20, 20);
    fcard(L, dur, `FOOTPRINT · ${FPX.name.toUpperCase()}`, [
      { at: 1.3, text: `IoU OSM ∩ GOB v3 = ${fmt(FPX.iou, 2)}`, col: C.ink },
      { at: 2.6, text: `jarak vertex (pipeline) = ${fmt(FPX.vd, 2)} m`, col: C.coral, bold: true },
      { at: 3.8, text: `distorsi = (${fmt0(FPX.aref)} − ${fmt0(FPX.acand)}) / ${fmt0(FPX.aref)} = ${fmt(FPX.dist, 1)} %`, col: C.ink },
      { at: 3.8, text: '516 pasangan: RMSE 3,72 m · distorsi −0,36%', col: C.gold, bold: true }]);
    steps(L, [[1.3, `Garis biru = footprint OSM. Putus-putus = Google Open Buildings v3 untuk ${FPX.name}.`, 'Panah = jarak tiap sudut OSM ke sudut GOB terdekat.'],
      [2.6, 'Jarak sudut dirata-rata kuadratnya → galat posisi gedung ini.', 'Rumus RMSE yang sama dengan DEM, tapi untuk posisi x,y.'],
      [3.8, 'Distorsi luas membandingkan luas kandidat dengan luas referensi.', 'Di seluruh kampus GOB v3 setara digitasi manual paper (3,7 m).']]);
  }
};
INS_FN.height = {
  cam: L => { const b = UIB[UI_REK]; return { t: [b.cx, b.y0 + 4, b.cz], az: 0.95, el: 0.22, d: 34, fov: 38, ox: 300, oy: 30 }; },
  pre(L, dur) { const b = UIB[UI_REK], e = explode(L, dur), gap = 0.9 * e, ring = b.rings[0], k = UIJ.VE / UIJ.U;
    const parts = [{ ring, h: 4.0 * k * 0.97, col: hex('#D9C08A'), kind: 'g' }]; for (let i = 0; i < b.N; i++) parts.push({ ring, h: 3.5 * k * 0.97, col: hex('#E3C27A'), kind: 'f', i }); parts.push({ ring, h: 1.0 * k * 0.97, col: hex('#B9A06A'), kind: 'p' });
    const st = GL.uiStack('rek', parts); st.visible = true; let y = b.y0;
    st.children.forEach((m, i) => { m.position.y = y; m.visible = true; y += (m.userData.kind === 'g' ? 4.0 : m.userData.kind === 'f' ? 3.5 : 1.0) * k + gap; }); },
  post(L, dur) { const b = UIB[UI_REK], e = explode(L, dur), gap = 0.9 * e, k = UIJ.VE / UIJ.U, ring = b.rings[0];
    let xr = -1e9, zr = 0; for (const p of ring) if (p[0] > xr) { xr = p[0]; zr = p[1]; } xr += 1.5; let y = b.y0;
    tag3([xr, y + 0.4, zr], 'lantai dasar GFl 4,0 m', C.ink, clamp(seg(L, 1.3, 1.7)) * e, 10, 8, 20); y += 4.0 * k + gap;
    for (let i = 0; i < b.N; i++) { tag3([xr, y + 0.35, zr], `N${i + 1} · Fl 3,5 m`, C.gold, clamp(seg(L, 2.6 + i * 0.12, 3.0 + i * 0.12)) * e, 10, 8, 18); y += 3.5 * k + gap; }
    tag3([xr, y + 0.1, zr], 'parapet & atap 1,0 m', C.ink, clamp(seg(L, 4.0, 4.4)) * e, 10, 8, 20);
    fcard(L, dur, 'REKTORAT UI · Bld_Height (Pers. 1)', [
      { at: 1.3, text: 'H = GFl + Fl × N + 1,0', col: C.ink, bold: true },
      { at: 2.6, text: `Fl × N = 3,5 × ${b.N} = ${fmt(3.5 * b.N)} m`, col: C.gold },
      { at: 4.0, text: `H = 4,0 + ${fmt(3.5 * b.N)} + 1,0 = ${fmt(b.H)} m`, col: C.gold, bold: true },
      { at: 5.4, text: `Open Buildings 2.5D: ${fmt(b.h25, 1)} m → selisih ${fmt(b.H - b.h25, 1)} m`, col: C.ink }]);
    steps(L, [[1.3, 'Rektorat dibongkar per komponen. Lantai dasar GFl = 4,0 m.', 'Footprint asli dari OSM, diekstrusi per lapis.'],
      [2.6, `N = ${b.N} lantai di atas lantai dasar (total ${b.N + 1} lantai), masing-masing 3,5 m.`, 'Run 1 memakai N = lantai total sehingga gedung 1 lantai jadi 8,5 m. Run 2 memperbaikinya.'],
      [4.0, 'Ditambah 1,0 m parapet dan atap, lalu disusun kembali.', 'Hasil inilah yang dipakai untuk ekstrusi LOD1.'],
      [5.4, 'Dicek dengan tinggi Google Open Buildings 2.5D.', 'Seluruh kampus: median selisih +0,52 m, MAE 1,87 m.']]);
  }
};
