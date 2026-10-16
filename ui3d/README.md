# ui3d — 3D City Model Kampus UI Depok (versi lokal)

Implementasi PRD `PRD_3D_City_Model_UI_Depok.md` untuk dijalankan di komputer sendiri (tanpa Google Colab/Drive).

## Menjalankan

```bash
cd ui3d
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
jupyter lab notebooks/
```

Jalankan notebook berurutan `00` → `10`. Tiap notebook membaca output notebook sebelumnya dari
`interim/` dan `output/`, jadi bisa dijalankan ulang terpisah. Notebook 04 (Mask R-CNN) butuh GPU CUDA.

## Isi

| Path | Isi |
| --- | --- |
| `config.yaml` | Parameter global: CRS, path data, `GFl`, `Fl`, ambang evaluasi, Mask R-CNN, banjir, indoor |
| `notebooks/ui3d_common.py` | Helper bersama: config, path, kategori gedung, statistik zonal, lebar jalan |
| `notebooks/download.py` | Unduh ulang data mentah yang hilang (dipanggil dari 00) |
| `notebooks/00_setup` … `10_indoor` | Langkah 0–10 PRD |
| `raw/` | Data mentah (lihat `raw/README.md`) |
| `interim/` | AOI, citra UTM, layer OSM bersih, titik terrain, indeks chip |
| `models/` | Checkpoint Mask R-CNN per epoch, `maskrcnn_ui.pt` |
| `output/` | `ui3d.gpkg`, `ui_lod1.glb/.obj`, `ui_lod2.glb`, `ui3d_web.html`, tabel evaluasi, banjir, indoor |
| `figures/` | Padanan Fig. 1–25 paper |

## Beda dari PRD

- Data sudah diunduh ke `raw/`, jadi notebook membaca file lokal. Unduh ulang opsional (`00_setup`).
- OSM diambil lewat OSM API `/map`, bukan Overpass. Overpass tidak bisa diakses saat data diunduh.
- ICESat-2 lewat SlideRule (setara ATL08, tanpa akun Earthdata), bukan `earthaccess` + `.h5`.
- Citra diunduh langsung dari tile Esri, bukan lewat `tms_to_geotiff` (leafmap).
- Evaluasi footprint Mask R-CNN juga dihitung khusus di area validasi, karena model dilatih dari OSM.
