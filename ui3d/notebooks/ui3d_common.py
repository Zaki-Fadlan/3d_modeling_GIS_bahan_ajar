"""Helper bersama untuk notebook ui3d: config, path, kategori gedung, statistik zonal."""
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
import yaml
from rasterio.mask import mask as rio_mask

ROOT = Path(__file__).resolve().parents[1]
CFG = yaml.safe_load((ROOT / "config.yaml").read_text())
CRS = CFG["crs"]["work"]


def _dir_path(key, name):
    p = ROOT / CFG["paths"][key] / name
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def raw(key):
    return ROOT / CFG["raw"][key]


def interim(name):
    return _dir_path("interim", name)


def out(name):
    return _dir_path("output", name)


def model_path(name):
    return _dir_path("models", name)


def fig_path(name):
    return _dir_path("figures", name)


def savefig(fig, name):
    fig.savefig(fig_path(name), dpi=150, bbox_inches="tight")


def aoi(layer="aoi_buf50"):
    """AOI hasil notebook 01 di CRS kerja. Layer: aoi, aoi_buf50, aoi_terrain."""
    return gpd.read_file(interim("aoi.gpkg"), layer=layer)


# Kategori gedung (PRD Langkah 6) dan warna RGB untuk peta, pydeck, dan model 3D.
CATEGORY_COLORS = {
    "fakultas": [66, 133, 244],
    "rumah_sakit": [219, 68, 55],
    "masjid": [15, 157, 88],
    "olahraga": [255, 152, 0],
    "asrama": [156, 39, 176],
    "fasilitas_umum": [158, 158, 158],
}


def _tag(row, key):
    v = row.get(key)
    return "" if v is None or (isinstance(v, float) and np.isnan(v)) else str(v).lower()


def categorize(row):
    """Kategori dari tag OSM building/amenity/leisure dan nama."""
    name, b, a, l = (_tag(row, k) for k in ("name", "building", "amenity", "leisure"))
    if a == "hospital" or b == "hospital" or "rumah sakit" in name:
        return "rumah_sakit"
    if b == "mosque" or a == "place_of_worship" or "masjid" in name:
        return "masjid"
    if b == "dormitory" or "asrama" in name:
        return "asrama"
    if (b in ("sports_hall", "stadium", "sports_centre") or l in ("sports_centre", "stadium", "sports_hall")
            or "stadion" in name or "gor " in f"{name} "):
        return "olahraga"
    if b in ("university", "college", "school") or a in ("university", "college") or "fakultas" in name:
        return "fakultas"
    return "fasilitas_umum"


def zonal(gdf, raster_path, func, band=1, all_touched=True):
    """Statistik zonal `func` (mis. np.median) nilai raster di tiap geometri; NaN bila kosong."""
    vals = []
    with rasterio.open(raster_path) as src:
        geoms = gdf.to_crs(src.crs).geometry
        for g in geoms:
            try:
                arr, _ = rio_mask(src, [g], crop=True, filled=False, all_touched=all_touched, indexes=band)
            except ValueError:  # geometri di luar raster
                vals.append(np.nan)
                continue
            v = arr.compressed()
            v = v[np.isfinite(v)]
            vals.append(float(func(v)) if v.size else np.nan)
    return np.array(vals)


def road_polygons(roads):
    """Buffer garis jalan sesuai lebar per kelas highway (config roads.width_m)."""
    w = CFG["roads"]["width_m"]
    width = roads["highway"].map(w).fillna(w["default"]).astype(float)
    return roads.geometry.buffer(width / 2, cap_style="flat")
