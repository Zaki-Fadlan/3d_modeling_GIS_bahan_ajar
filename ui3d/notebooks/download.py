"""Unduh ulang data mentah ke ui3d/raw (dipanggil dari 00_setup bila file belum ada).

DEMNAS dan Open Buildings 2.5D tidak ada di sini: keduanya butuh akun (unduh manual).
bbox = (minx, miny, maxx, maxy) dalam EPSG:4326.
"""
import gzip
import io
from concurrent.futures import ThreadPoolExecutor

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
import requests
from shapely import wkt

UA = {"User-Agent": "ui3d-edu/1.0"}


def aoi(query, bbox_fallback, dst):
    """Poligon kampus dari Nominatim; fallback bbox manual. Layer aoi + aoi_buf50."""
    import osmnx as ox
    from shapely.geometry import box
    try:
        g = ox.geocode_to_gdf(query)[["geometry"]]
    except Exception as e:  # noqa: BLE001 - fallback sesuai PRD
        print("geocode gagal, pakai bbox manual:", e)
        g = gpd.GeoDataFrame(geometry=[box(*bbox_fallback)], crs=4326)
    g.to_file(dst, layer="aoi")
    buf = g.to_crs(32748).buffer(50).to_crs(4326)
    gpd.GeoDataFrame(geometry=buf, crs=4326).to_file(dst, layer="aoi_buf50")


def osm(bbox, xml_dst, gpkg_dst, poly):
    """OSM lewat API /map (Overpass sering tidak bisa diakses), lalu dipotong ke `poly`."""
    import osmnx as ox
    x0, y0, x1, y1 = bbox
    r = requests.get(f"https://api.openstreetmap.org/api/0.6/map?bbox={x0},{y0},{x1},{y1}", headers=UA, timeout=300)
    r.raise_for_status()
    xml_dst.write_bytes(r.content)
    layers = {"buildings": {"building": True}, "roads": {"highway": True},
              "water": {"natural": "water", "water": True, "waterway": True},
              "vegetation": {"landuse": ["grass", "forest", "meadow"], "leisure": "park",
                             "natural": ["wood", "scrub", "grassland"]}}
    for name, tags in layers.items():
        g = ox.features_from_xml(xml_dst, polygon=poly, tags=tags).reset_index()
        for c in g.columns:
            if c != "geometry" and g[c].dtype == object:
                g[c] = g[c].astype(str)
        g.to_file(gpkg_dst, layer=name)


def copdem(bbox, dst):
    """Copernicus DEM GLO-30 dari Planetary Computer (tanpa key)."""
    import planetary_computer as pc
    import pystac_client
    from rasterio.merge import merge
    cat = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1", modifier=pc.sign_inplace)
    items = list(cat.search(collections=["cop-dem-glo-30"], bbox=bbox).items())
    srcs = [rasterio.open(i.assets["data"].href) for i in items]
    arr, tr = merge(srcs, bounds=bbox)
    prof = srcs[0].profile
    prof.update(height=arr.shape[1], width=arr.shape[2], transform=tr, driver="GTiff", compress="deflate")
    with rasterio.open(dst, "w", **prof) as d:
        d.write(arr)


def esri(bbox, zoom, dst):
    """Mosaik tile Esri World Imagery (EPSG:3857). Hanya untuk pendidikan/riset non-komersial."""
    import mercantile
    from PIL import Image
    from rasterio.transform import from_bounds
    tiles = list(mercantile.tiles(*bbox, zoom))
    xs, ys = sorted({t.x for t in tiles}), sorted({t.y for t in tiles})
    url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    s = requests.Session()
    s.headers.update(UA)

    def get(t):
        for _ in range(3):
            try:
                r = s.get(url.format(z=t.z, y=t.y, x=t.x), timeout=30)
                if r.ok:
                    return t, np.array(Image.open(io.BytesIO(r.content)).convert("RGB"))
            except requests.RequestException:
                pass
        return t, None

    img = np.zeros((len(ys) * 256, len(xs) * 256, 3), np.uint8)
    with ThreadPoolExecutor(8) as ex:
        for t, a in ex.map(get, tiles):
            if a is not None:
                i, j = ys.index(t.y), xs.index(t.x)
                img[i * 256:(i + 1) * 256, j * 256:(j + 1) * 256] = a
    ul, lr = mercantile.xy_bounds(xs[0], ys[0], zoom), mercantile.xy_bounds(xs[-1], ys[-1], zoom)
    tr = from_bounds(ul.left, lr.bottom, lr.right, ul.top, img.shape[1], img.shape[0])
    with rasterio.open(dst, "w", driver="GTiff", height=img.shape[0], width=img.shape[1], count=3, dtype="uint8",
                       crs="EPSG:3857", transform=tr, compress="jpeg", photometric="ycbcr", tiled=True) as d:
        d.write(img.transpose(2, 0, 1))


def gob_v3(bbox, dst):
    """Google Open Buildings v3: stream tile S2 level-4 lalu filter bbox (tile bisa > 5 GB)."""
    import s2sphere
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    token = s2sphere.CellId.from_lat_lng(s2sphere.LatLng.from_degrees(cy, cx)).parent(4).to_token()
    url = f"https://storage.googleapis.com/open-buildings-data/v3/polygons_s2_level_4_gzip/{token}_buildings.csv.gz"
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()
    parts = []
    for ch in pd.read_csv(gzip.GzipFile(fileobj=r.raw), chunksize=500_000):
        m = ch[ch.longitude.between(bbox[0], bbox[2]) & ch.latitude.between(bbox[1], bbox[3])]
        if len(m):
            parts.append(m)
    df = pd.concat(parts)
    g = gpd.GeoDataFrame(df.drop(columns="geometry"), geometry=df.geometry.map(wkt.loads), crs=4326)
    g.to_file(dst, layer="gob_v3")


def icesat2(bbox, dst):
    """Segmen 100 m setara ATL08 lewat SlideRule (tanpa akun Earthdata). Tinggi = ellipsoid WGS84."""
    import sliderule
    from sliderule import icesat2 as is2
    x0, y0, x1, y1 = bbox
    poly = [{"lon": x, "lat": y} for x, y in [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]]
    sliderule.init("slideruleearth.io", verbose=False)
    parms = {"poly": poly, "t0": "2018-10-01T00:00:00Z", "cnf": 0,
             "atl08_class": ["atl08_ground", "atl08_canopy", "atl08_top_of_canopy"],
             "len": 100.0, "res": 100.0,
             "phoreal": {"binsize": 1.0, "geoloc": "center", "use_abs_h": False, "send_waveform": False},
             "atl08_fields": ["terrain/h_te_best_fit", "terrain/h_te_uncertainty", "terrain/terrain_slope", "night_flag"]}
    is2.atl08p(parms, keep_id=True).to_file(dst, layer="atl08_100m")
