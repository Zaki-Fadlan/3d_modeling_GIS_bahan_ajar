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


def hillshade(z, res, azimuth=315, altitude=45, z_factor=1.0):
    """Hillshade metode Horn (setara gdaldem; rumus di notebook 02): 0 = gelap, 1 = terang. res dalam meter."""
    zp = np.pad(z, 1, mode="edge")
    a, b, c = zp[:-2, :-2], zp[:-2, 1:-1], zp[:-2, 2:]
    d, f = zp[1:-1, :-2], zp[1:-1, 2:]
    g, h, i = zp[2:, :-2], zp[2:, 1:-1], zp[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * res) * z_factor
    dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * res) * z_factor
    slope = np.arctan(np.hypot(dzdx, dzdy))
    aspect = np.arctan2(dzdy, -dzdx)
    zen, azi = np.radians(90 - altitude), np.radians(360 - azimuth + 90)
    hs = np.cos(zen) * np.cos(slope) + np.sin(zen) * np.sin(slope) * np.cos(azi - aspect)
    return np.clip(hs, 0, 1)


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


# Peta web 3D (notebook 08, 09): terrain dan citra di-stream dari tile publik, tidak ada data mentah yang disebar.
TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"  # AWS Terrain Tiles
IMAGERY_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
TERRAIN_ZOOM = 15  # ~4,8 m/piksel di ekuator
WEB_CREDIT = "Citra: Esri World Imagery (pendidikan/non-komersial) · Terrain: AWS Terrain Tiles (Mapzen, SRTM)"


def web_credit(prefix=""):
    """Kotak atribusi pojok kiri bawah untuk pdk.Deck(description=...). Kotak bawaan pydeck ber-z-index 1, sama
    dengan kanvas yang ada belakangan di DOM, sehingga tertutup peta; z-index dinaikkan lewat <style>."""
    box = ".deck-json-description-box{z-index:10!important;left:0!important;bottom:0!important;top:auto!important}"
    return (f"<style>{box}</style>"
            f"<div style='font:11px sans-serif;background:#fffc;padding:2px 6px'>{prefix}{WEB_CREDIT}</div>")


def terrain_layer():
    """TerrainLayer pydeck: elevasi terrarium + tekstur citra Esri."""
    import pydeck as pdk

    return pdk.Layer("TerrainLayer", id="terrain", elevation_data=TERRAIN_TILES, texture=IMAGERY_TILES,
                     elevation_decoder={"rScaler": 256, "gScaler": 1, "bScaler": 1 / 256, "offset": -32768},
                     max_zoom=TERRAIN_ZOOM, mesh_max_error=1)


def terrarium_z(lon, lat, zoom=TERRAIN_ZOOM):
    """Tinggi tanah (m) dari tile terrarium yang sama dengan terrain_layer(), sampel piksel terdekat.

    pydeck tidak membawa TerrainExtension, jadi objek 3D harus diberi z sendiri agar tepat menempel di terrain web.
    Tile di-cache di interim/terrarium/.
    """
    import requests
    from PIL import Image

    lon, lat = np.asarray(lon, float), np.asarray(lat, float)
    n = 256 * 2 ** zoom
    px = (lon + 180) / 360 * n
    py = (1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * n
    tx, ty = (px // 256).astype(int), (py // 256).astype(int)
    z = np.full(lon.shape, np.nan)
    for x, y in set(zip(tx.ravel(), ty.ravel())):
        p = interim(f"terrarium/{zoom}_{x}_{y}.png")
        if not p.exists():
            r = requests.get(TERRAIN_TILES.format(z=zoom, x=x, y=y), timeout=60)
            r.raise_for_status()
            p.write_bytes(r.content)
        rgb = np.asarray(Image.open(p).convert("RGB"), float)
        h = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768
        m = (tx == x) & (ty == y)
        z[m] = h[(py[m] - y * 256).astype(int).clip(0, 255), (px[m] - x * 256).astype(int).clip(0, 255)]
    return z


def web_ground(geoms, q):
    """Persentil q tinggi terrain web di simpul ring luar tiap poligon EPSG:4326 (satu panggilan tile untuk semua)."""
    xy = [np.asarray(g.exterior.coords)[:, :2] for g in geoms]
    z = terrarium_z(*np.vstack(xy).T)
    return [float(np.percentile(zi, q)) for zi in np.split(z, np.cumsum([len(a) for a in xy])[:-1])]


def web_rings(g, z):
    """Poligon → ring [lon, lat, z] (luar + lubang) untuk PolygonLayer pydeck."""
    return [[[*p[:2], z] for p in r.coords] for r in [g.exterior, *g.interiors]]


def road_polygons(roads):
    """Buffer garis jalan sesuai lebar per kelas highway (config roads.width_m)."""
    w = CFG["roads"]["width_m"]
    width = roads["highway"].map(w).fillna(w["default"]).astype(float)
    return roads.geometry.buffer(width / 2, cap_style="flat")
