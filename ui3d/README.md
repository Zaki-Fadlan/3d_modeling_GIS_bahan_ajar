# ui3d — 3D City Model Kampus UI Depok (Google Colab)

Implementasi PRD `PRD_3D_City_Model_UI_Depok.md` untuk dijalankan di Google Colab dengan data di Google Drive.

## Menjalankan (Google Colab)

1. Upload folder `ui3d/` ke Google Drive sebagai `MyDrive/ui3d` (minimal `config.yaml`, `requirements.txt`,
   `notebooks/`, `raw/`; `.venv/` dan `models/` tidak perlu).
2. Buka `main.ipynb` dari Drive dengan Google Colab.
3. Pilih **Runtime → Change runtime type → T4 GPU** (bagian 04 Mask R-CNN butuh GPU).
4. Jalankan sel setup (mount Drive, `pip install -r requirements.txt`, Xvfb untuk PyVista), lalu bagian
   `00` → `11` berurutan. Tiap bagian membaca output bagian sebelumnya dari `interim/` dan `output/` di Drive,
   jadi setelah runtime restart cukup jalankan ulang sel setup dan sel import bagian yang ingin dilanjutkan.

## Isi

| Path | Isi |
| --- | --- |
| `config.yaml` | Parameter global: CRS, path data, `GFl`, `Fl`, ambang evaluasi, Mask R-CNN, banjir, indoor |
| `notebooks/ui3d_common.py` | Helper bersama: config, path, kategori gedung, statistik zonal, lebar jalan, hillshade, DSM → DTM, terrain web (pydeck) |
| `notebooks/download.py` | Unduh ulang data mentah yang hilang (dipanggil dari 00) |
| `main.ipynb` | Seluruh pipeline: bagian 00–10 = Langkah 0–10 PRD, 11 = animasi orbit 360° LOD2 ke GIF/MP4 (PyVista) |
| `raw/` | Data mentah (lihat `raw/README.md`) |
| `interim/` | AOI, citra UTM, layer OSM bersih, titik terrain, indeks chip |
| `models/` | Checkpoint Mask R-CNN per epoch, `maskrcnn_ui.pt` |
| `output/` | `ui3d.gpkg`, `ui_lod1.glb/.obj`, `ui_lod2.glb`, `ui3d_web.html`, `ui_orbit.gif/.mp4`, `flood_rise.gif`, `svf_1m.tif`, tabel evaluasi, banjir, indoor |
| `figures/` | Padanan Fig. 1–25 paper |

## Beda dari PRD

- Data sudah diunduh ke `raw/`, jadi notebook membaca file dari Drive. Unduh ulang opsional (bagian 00).
- OSM diambil lewat OSM API `/map`, bukan Overpass. Overpass tidak bisa diakses saat data diunduh.
- ICESat-2 lewat SlideRule (setara ATL08, tanpa akun Earthdata), bukan `earthaccess` + `.h5`.
- Citra diunduh langsung dari tile Esri, bukan lewat `tms_to_geotiff` (leafmap).
- Evaluasi footprint Mask R-CNN juga dihitung khusus di area validasi, karena model dilatih dari OSM.
