# Reel Z — Konsep Analisis Data 3D (versi kelas)

Film motion 3 menit 32 detik (1920×1080, 24 fps) untuk Pekan 9 "Konsep analisis data tiga dimensi (3D analysis)".
Semua gambar dihitung langsung di browser (Canvas 2D + WebGL/three.js) dan musiknya disintesis dengan Python.
Studi kasus Kampus UI Depok memakai output pipeline `ui3d` (repo `3d_modeling_GIS_bahan_ajar`).

## Isi folder

| Path | Isi |
| --- | --- |
| `index.html` | Hasil build siap putar (offline, three.js sudah tertanam). Buka langsung di Chrome/Edge. |
| `showreel-64.html` | Versi showreel 64 detik (gaya 2D). |
| `src/core.js` | Mesin utama: timeline, kamera, terrain sintetis, semua babak, HUD, subtitle, post-processing. |
| `src/inserts.js` | Sisipan penjelasan rumus (exploded view): IDW, slope, aspect, hillshade, cut & fill, jarak 3D, akuifer. |
| `src/ui/uiscene.js` | Babak Kampus UI Depok (data asli) + sisipan RMSE DEM, footprint, dan tinggi gedung. |
| `src/gl.js` | Renderer WebGL: langit, kabut, matahari & bayangan, air, pohon, gedung berjendela, kampus UI. |
| `src/shell.html` | Halaman pemutar (tombol putar, suara, subtitle on/off, bab). |
| `data/timeline.json` | Posisi & durasi tiap sisipan rumus. Ubah di sini untuk memperpanjang/memperpendek penjelasan. |
| `data/ui_data.js` | Data kampus UI hasil ekspor (DEM, 995 gedung, danau, jalan, vegetasi, ICESat-2, Mask R-CNN, genangan, indoor). |
| `audio/music.py` | Sintesis musik → `audio/score.wav` + `audio/audio.json` (penanda ketukan untuk kamera). |
| `audio/score.mp3` | Musik yang sudah jadi (dipakai pemutar & render bila `score.wav` tidak ada). |
| `tools/build.py` | Gabungkan semua sumber → `index.html`. |
| `tools/render.py` | Render ke MP4 (Playwright + Chromium + ffmpeg). |
| `tools/preview_frames.py` | Contact sheet beberapa frame untuk cek cepat. |
| `extra/data-export/export_ui_data.py` | Ekspor ulang `data/ui_data.js` dari folder `ui3d/output`. |
| `extra/showreel-64/` | Sumber versi showreel 64 detik. |
| `fonts/`, `vendor/` | Font (OFL) dan three.js r149 (MIT). |

## 1. Persiapan (sekali saja)

Butuh Python 3.10+ dan ffmpeg.

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

ffmpeg: Windows `winget install Gyan.FFmpeg` · macOS `brew install ffmpeg` · Ubuntu `sudo apt install ffmpeg`.

## 2. Render ke MP4

```bash
python tools/build.py          # membuat index.html dari src/
python tools/render.py         # -> out/reel-z.mp4 (±5.088 frame)
```

Pilihan berguna:

```bash
python tools/render.py --start 140 --end 212 --out out/bagian-ui.mp4   # hanya satu bagian (detik)
python tools/render.py --fps 30 --crf 15                               # lebih halus & tajam
python tools/render.py --png --keep-frames                             # simpan frame PNG (bisa dilanjutkan)
python tools/render.py --resume --keep-frames                          # lanjutkan render yang terputus
python tools/render.py --page showreel-64.html --out out/showreel.mp4  # versi 64 detik
```

**Perkiraan waktu.** Skrip mencetak `WebGL renderer` di awal. Jika yang tertulis kartu grafis Anda (NVIDIA/AMD/Intel),
render memakai GPU dan biasanya selesai dalam puluhan menit. Jika tertulis `SwiftShader`, Chromium jatuh ke render CPU:
di mesin tanpa GPU ini butuh ±8 detik per frame (berjam-jam untuk video penuh). Coba `--headful` agar Chromium membuka
jendela dan memakai GPU, atau render per bagian dengan `--start/--end` lalu gabungkan.

Menggabungkan beberapa bagian:

```bash
printf "file 'bagian1.mp4'\nfile 'bagian2.mp4'\n" > out/list.txt
ffmpeg -f concat -safe 0 -i out/list.txt -c copy out/reel-z.mp4
```

## 3. Mengubah isi

- **Teks subtitle & kartu rumus**: cari `caption(` dan `fcard(` di `src/core.js`, `src/inserts.js`, `src/ui/uiscene.js`.
- **Durasi penjelasan rumus**: ubah `dur` dan `steps` di `data/timeline.json`, lalu jalankan `python audio/music.py`
  supaya musik mengikuti panjang baru, lalu `ffmpeg -i audio/score.wav -b:a 160k audio/score.mp3`, lalu build ulang.
- **Data kampus**: jalankan `python extra/data-export/export_ui_data.py <path>/ui3d data/ui_data.js`
  (butuh `geopandas rasterio shapely pillow`). Tinggi di babak UI diperbesar ×2 (`VE` di skrip ekspor).
- Setelah mengubah apa pun di `src/` atau `data/`, jalankan `python tools/build.py` lagi.

## Catatan

- Video deterministik: `window.frameAt(t)` selalu menggambar frame yang sama untuk waktu `t`, jadi hasil render identik
  dengan pemutar.
- Babak 01–10 memakai terrain sintetis untuk menjelaskan konsep; angka di layar (slope, viewshed, volume, IDW, dll.)
  dihitung dari terrain yang sama yang terlihat.
- Babak 11–13 memakai data asli pipeline `ui3d`; tekstur tanahnya dari layer OSM karena citra 0,3 m (`raw/`) tidak ada di repo.
