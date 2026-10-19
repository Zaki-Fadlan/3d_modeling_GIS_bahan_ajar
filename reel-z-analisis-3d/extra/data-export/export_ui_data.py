"""Ekspor output pipeline ui3d (repo 3d_modeling_GIS_bahan_ajar) ke data/ui_data.js.
Pakai: python export_ui_data.py <folder ui3d> <file keluaran ui_data.js>
Butuh: geopandas, rasterio, shapely, pillow."""
"""Export the real UI Depok pipeline outputs (repo ui3d/output) into a compact JS payload for the reel."""
import json, base64, io, numpy as np, pandas as pd, geopandas as gpd, rasterio
from rasterio.enums import Resampling
from shapely.geometry import Polygon, MultiPolygon, box
from PIL import Image
import sys, os
R = os.path.join(sys.argv[1] if len(sys.argv) > 1 else 'ui3d', 'output') + os.sep
P = R + 'ui3d.gpkg'
aoi = gpd.read_file(P, layer='aoi').geometry.iloc[0]
minx, miny, maxx, maxy = aoi.bounds
CX, CY = (minx + maxx) / 2, (miny + maxy) / 2
U = 10.0                      # metres per world unit (same as the rest of the reel)
VE = 2.0                      # vertical exaggeration for the campus scene
ZB = 50.0                     # height datum subtracted before scaling (m, EGM2008)
wx = lambda e: round((e - CX) / U, 2)
wz = lambda n: round(-(n - CY) / U, 2)
wy = lambda z: round((z - ZB) / U * VE, 3)
def rings(geom, tol=0.6):
    g = geom.simplify(tol)
    polys = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    out = []
    for p in polys:
        if p.is_empty or p.area < 4: continue
        out.append([[wx(x), wz(y)] for x, y in list(p.exterior.coords)[:-1]])
    return out

# --- DEM crop + resample to 16 m ---
M = 160
with rasterio.open(R + 'dem_ui_8m.tif') as s:
    win = rasterio.windows.from_bounds(minx - M, miny - M, maxx + M, maxy + M, s.transform)
    win = win.round_offsets().round_lengths()
    full = s.read(1, window=win).astype('float32'); tr = s.window_transform(win)
step = 2
dem = full[::step, ::step]
nrow, ncol = dem.shape
x0 = tr.c + tr.a * step / 2 * 0; y0 = tr.f
res = tr.a * step
# lakes: hydro-flatten like notebook 07 (p10 inside each lake, lower DEM 1 m below)
water = gpd.read_file(P, layer='water')
lakes = []
from rasterio.features import geometry_mask
tr16 = rasterio.Affine(res, 0, tr.c, 0, -res, tr.f)
for _, r in water.iterrows():
    if r.geometry.geom_type not in ('Polygon', 'MultiPolygon') or r.geometry.area < 400: continue
    m = ~geometry_mask([r.geometry], out_shape=dem.shape, transform=tr16, all_touched=True)
    if m.sum() == 0:
        c = r.geometry.representative_point(); i = int((tr16.f - c.y) / res); j = int((c.x - tr16.c) / res)
        lvl = float(dem[min(max(i, 0), nrow - 1), min(max(j, 0), ncol - 1)])
    else:
        lvl = float(np.percentile(dem[m], 10)); dem[m] = np.minimum(dem[m], lvl - 1.0)
    nm = r['name'] if isinstance(r['name'], str) else ''
    lakes.append({'name': nm, 'level': round(lvl, 2), 'y': wy(lvl), 'rings': rings(r.geometry, 1.0), 'cx': wx(r.geometry.centroid.x), 'cz': wz(r.geometry.centroid.y), 'area': round(r.geometry.area)})
demW = {'nx': ncol, 'nz': nrow, 'x0': wx(tr16.c + res / 2), 'z0': wz(tr16.f - res / 2), 'dx': res / U,
        'h': [wy(v) for v in dem.flatten().tolist()], 'zmin': float(dem.min()), 'zmax': float(dem.max())}

# --- buildings + flood level at which each is first touched (connected method) ---
b = gpd.read_file(P, layer='buildings')
fl = gpd.read_file(R + 'flood_levels.gpkg', layer='connected')
lvl_col = [c for c in fl.columns if c != 'geometry'][0]
first = np.full(len(b), 999.0)
for _, f in fl.sort_values(lvl_col).iterrows():
    hit = b.intersects(f.geometry).values
    first = np.where(hit & (first > 900), float(f[lvl_col]), first)
B = []
for k, r in b.iterrows():
    rr = rings(r.geometry)
    if not rr: continue
    c = r.geometry.centroid
    B.append({'id': int(r['id']), 'name': r['name'] or '', 'cat': r['category'], 'N': int(r['N']), 'H': float(r['Bld_Height']), 'h25': float(r['h_25d_m']),
              'base': float(r['base_elev']), 'y0': wy(r['base_elev']), 'hy': round(float(r['Bld_Height']) / U * VE, 3), 'flood': float(first[k]),
              'cx': wx(c.x), 'cz': wz(c.y), 'area': float(r['area_m2']), 'rings': rr})
print('buildings', len(B), 'flood levels column', lvl_col, 'hit@65', int((first <= 65).sum()))

# --- roads (for the ground texture), vegetation (texture + trees) ---
roads = gpd.read_file(P, layer='roads')
W = {'primary': 10, 'primary_link': 8, 'secondary': 8, 'tertiary': 7, 'unclassified': 6, 'residential': 6, 'service': 4, 'living_street': 4, 'track': 3, 'footway': 2, 'path': 1.5, 'cycleway': 2, 'steps': 2}
RD = [{'w': W.get(r.highway, 3) / U, 'p': [[wx(x), wz(y)] for x, y in r.geometry.simplify(1.0).coords]} for _, r in roads.iterrows() if r.geometry.geom_type == 'LineString']
veg = gpd.read_file(P, layer='vegetation')
V = []
for _, r in veg.iterrows():
    kind = 'wood' if (r.get('natural') == 'wood' or r.get('landuse') == 'forest') else ('park' if r.get('leisure') == 'park' else 'grass')
    for ring in rings(r.geometry, 1.0): V.append({'k': kind, 'r': ring})
# trees: inside wood/forest polygons + sparse in parks/grass, never on buildings, roads or lakes
rng = np.random.default_rng(3)
bl = b.geometry.buffer(3).union_all(); wl = water.geometry.buffer(2).union_all()
rl = roads.geometry.buffer(3).union_all()
T = []
for _, r in veg.iterrows():
    kind = 'wood' if (r.get('natural') == 'wood' or r.get('landuse') == 'forest') else ('park' if r.get('leisure') == 'park' else 'grass')
    dens = {'wood': 1 / 180, 'park': 1 / 900, 'grass': 1 / 2500}[kind]
    n = int(r.geometry.area * dens); x0b, y0b, x1b, y1b = r.geometry.bounds; got = 0; tries = 0
    while got < n and tries < n * 6:
        tries += 1; x = rng.uniform(x0b, x1b); y = rng.uniform(y0b, y1b)
        from shapely.geometry import Point
        p = Point(x, y)
        if not r.geometry.contains(p) or bl.contains(p) or wl.contains(p) or rl.contains(p): continue
        i = int((tr16.f - y) / res); j = int((x - tr16.c) / res)
        if not (0 <= i < nrow and 0 <= j < ncol): continue
        T.append([wx(x), wy(float(dem[i, j])), wz(y), round(float(rng.uniform(0.7, 1.3)), 2), round(float(rng.random()), 2)]); got += 1
print('trees', len(T))

# --- Mask R-CNN class raster (run 3) → coloured PNG at 3 m ---
with rasterio.open(R + 'dl_classes.tif') as s:
    f = 10; cls = s.read(1, out_shape=(s.height // f, s.width // f), resampling=Resampling.mode); cb = s.bounds
pal = {0: (0, 0, 0, 0), 1: (255, 107, 87, 235), 2: (244, 197, 66, 235), 3: (94, 219, 142, 200), 4: (61, 139, 255, 235)}
img = np.zeros(cls.shape + (4,), 'uint8')
for k, c in pal.items(): img[cls == k] = c
buf = io.BytesIO(); Image.fromarray(img, 'RGBA').save(buf, 'PNG', optimize=True)
DL = {'png': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode(), 'x0': wx(cb.left), 'x1': wx(cb.right), 'z0': wz(cb.top), 'z1': wz(cb.bottom)}
print('dl png KB', len(buf.getvalue()) // 1024)

# --- ICESat-2 points inside the campus ---
tp = gpd.read_file(P, layer='terrain_points'); tp = tp[tp.within(aoi)]
IS = [{'x': wx(p.geometry.x), 'z': wz(p.geometry.y), 'zd': round(float(p['z_DEMNAS']), 2), 'dz': round(float(p['dz_DEMNAS']), 2), 'can': round(float(p['h_canopy']) if p['h_canopy'] < 1e3 else 0, 1)} for _, p in tp.iterrows()]
te = pd.read_csv(R + 'terrain_eval.csv')

# --- footprint example: one OSM building vs its GOB v3 match ---
fp = gpd.read_file(R + 'footprint_pairs.gpkg')
g = fp[(fp.sumber == 'GOB_v3') & fp.iou.between(0.55, 0.8) & fp.vertex_dist_m.between(2.5, 5) & fp.area_ref.between(700, 2500)].copy()
g['d'] = g.rid.map(lambda i: (b.geometry.iloc[i].centroid.x - CX) ** 2 + (b.geometry.iloc[i].centroid.y - CY) ** 2)
ex = g.sort_values('d').iloc[0]
ref = b.geometry.iloc[int(ex.rid)]
FP = {'name': b['name'].iloc[int(ex.rid)] or 'gedung tanpa nama', 'ref': rings(ref, 0.3)[0], 'cand': rings(ex.geometry, 0.3)[0], 'iou': float(ex.iou), 'vd': float(ex.vertex_dist_m),
      'shift': float(ex.shift_centroid_m), 'aref': float(ex.area_ref), 'acand': float(ex.area_cand), 'dist': float(ex.distortion_pct), 'y': wy(b['base_elev'].iloc[int(ex.rid)])}
print('fp example', FP['name'], round(FP['iou'], 2), round(FP['vd'], 2))

# --- indoor: Dekanat FTUI rooms ---
rooms = gpd.read_file(R + 'indoor_dekanat_ftui.gpkg')
dek = b[b.name == 'Dekanat FTUI'].iloc[0]
IN = {'bid': int(dek['id']), 'base': float(dek['base_elev']), 'area': float(dek['area_m2']), 'rooms': [{'f': int(r.FloorNo), 'no': str(r.RoomNo), 'use': r.RoomUse, 'z0': float(r.z0), 'h': float(r.height), 'a': float(r.area_m2), 'r': rings(r.geometry, 0.05)[0]} for _, r in rooms.iterrows()]}

flood = pd.read_csv(R + 'flood_impact.csv').to_dict('records')
import numpy as _np
hist = _np.histogram(_np.clip(gpd.read_file(P, layer='terrain_points').dz_DEMNAS, -21, 21), bins=_np.arange(-22, 24, 2))[0].tolist()
out = {'hist': hist, 'U': U, 'VE': VE, 'ZB': ZB, 'origin': [CX, CY], 'aoi': rings(aoi, 2)[0], 'dem': demW, 'lakes': lakes, 'buildings': B, 'roads': RD, 'veg': V, 'trees': T,
       'dl': DL, 'icesat': IS, 'fp': FP, 'indoor': IN, 'flood': flood, 'terrain_eval': te.to_dict('records')}
s = json.dumps(out, separators=(',', ':'))
open(sys.argv[2] if len(sys.argv) > 2 else 'ui_data.js', 'w').write('window.__UI=' + s + ';')
print('payload MB', round(len(s) / 1e6, 2), 'dem', nrow, ncol, 'lakes', [(l['name'], l['level']) for l in lakes if l['name']])
print(te.to_string())
