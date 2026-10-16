# Open-source tools for LOD1/LOD2 3D city models (footprints + heights, no LiDAR) and web publishing

Research date: 2026-10-16. Repo metadata (licence, last push, release) was read from the GitHub API, PyPI JSON and npm registry on that date; "last push" means the most recent commit to any branch, not a release. Where a README fetch did not state something, it is listed under Gaps rather than guessed.

User constraints: only footprints (OSM, 995 buildings), 8 m DEM (DSM-like), Google Open Buildings 2.5D height raster (4 m) or floor counts, 0.3 m imagery, no point cloud. Current stack: trimesh, own rule dict, pydeck.

---

## Q1. Footprint + height to LOD1 / LOD1.2 / LOD2: what exists, and what works without LiDAR?

### Takeaway
The high-quality TU Delft reconstruction engines (roofer, geoflow, City4CFD LoD2 mode, 3dfier) all need a point cloud for anything beyond a flat-roofed block, so they do not solve the no-LiDAR roof problem. The realistic open options are (a) keep extruding yourself and add a roof generator driven by a straight skeleton (bpypolyskel, ladybug-geometry-polyskel, CGAL) and OSM `roof:shape` tags, (b) use OSM2World or Blosm, which already implement OSM roof shapes, and (c) use CityJSON/CityGML libraries only as the standard-format writer/validator layer. Nothing found does image-only LoD2 out of the box.

### Cited Findings

#### Comparative table (reconstruction / generation)
| Tool | Licence | Input needed | Output / LOD | Python | Status (as of 2026-10-16) | Fit, no LiDAR |
|---|---|---|---|---|---|---|
| [roofer](https://github.com/3DBAG/roofer) | GPL-3.0 | Point cloud + 2D roofprint polygon | CityJSONSeq; LoD1.2, 1.3, 2.2 | C++ and Python bindings stated; install route not documented on the pages fetched | v1.0.0 2026-04-20, last push 2026-07-30 ([GitHub API](https://api.github.com/repos/3DBAG/roofer)) | Poor: point cloud mandatory |
| [geoflow / geoflow-bundle](https://github.com/geoflow3d/geoflow-bundle) | GPL-3.0 (bundle: NOASSERTION) | Point cloud + footprint | OBJ, GPKG, CityJSON, PostgreSQL; LoD1.2/1.3/2.2 | No | Superseded by roofer; bundle last push 2026-01-06, last release 2024-03-08 ([GitHub API](https://api.github.com/repos/geoflow3d/geoflow-bundle)) | Poor |
| [City4CFD](https://github.com/tudelft3d/City4CFD) | AGPL-3.0 | Point cloud + footprints, OR footprints with height / floor-number attribute (extrusion), OR existing models | OBJ, STL, CityJSON; LoD1.2/1.3/2.2 (LoD2.2/1.3 via roofer) | No (C++/Docker) | 0.8.1 2026-07-28 ([GitHub API](https://api.github.com/repos/tudelft3d/City4CFD)) | Only its extrusion mode applies; geared to CFD domains with terrain, not visualisation |
| [3dfier](https://github.com/tudelft3d/3dfier) | GPL-3.0 | 2D planar partition (buildings, roads, water, terrain...) + LAS/LAZ point cloud | OBJ, CityGML, CityJSON, CSV, PostGIS, STL; buildings LoD1 blocks | No | v1.5.0 2026-09-08 ([GitHub API](https://api.github.com/repos/tudelft3d/3dfier)); [README](https://github.com/tudelft3d/3dfier) | Poor: heights/terrain taken from point cloud. Conceptually matches your "drape roads/water on DEM" but needs LAS |
| [OSM2World](https://github.com/tordanik/OSM2World) | MIT | OSM data (tags: height, levels, roof:shape...) | OBJ, glTF, 3D Tiles (repo topics) | Java (Maven build), no Python API found | last push 2026-10-15, no GitHub releases ([GitHub API](https://api.github.com/repos/tordanik/OSM2World)) | Good reference or CLI step if footprints can be kept as OSM objects; roof shape list not stated on README fetched |
| [Blosm / Blender OSM](https://github.com/vvoovv/blosm) | GPL source; Pro is paid on Gumroad | OSM | Blender scenes; Pro adds texture baking "for 3D Tiles" | Blender Python addon; no standalone API found | last push 2026-09-08 ([GitHub API](https://api.github.com/repos/vvoovv/blosm)) | Base version: height/levels, parts, "a large number of roof shapes" ([README](https://github.com/vvoovv/blosm)). Facade textures are Pro |
| [BlenderGIS](https://github.com/domlysz/BlenderGIS) | GPL-3.0 | Shapefile/OSM/DEM | Blender meshes (extrusion by attribute) | Blender addon | release 2215 2025-12-20 ([GitHub API](https://api.github.com/repos/domlysz/BlenderGIS)) | Useful for DEM drape and extrusion in Blender; not a LoD2 generator |
| [bpypolyskel](https://github.com/prochitecture/bpypolyskel) | GPL-3.0 | Footprint polygon (holes ok) | Hipped-roof faces with heights via `polygonize()` | Pure Python, `pip install mathutils`; runs outside Blender (`demo.py`) | not on PyPI (404 on PyPI JSON); commit date not shown on page | Best-documented open hipped-roof-from-footprint code. Author reports success on 99.99% of ~320,000 OSM hipped roofs ([README](https://github.com/prochitecture/bpypolyskel); [OSArch thread](https://community.osarch.org/discussion/423/)) |
| [ladybug-geometry-polyskel](https://pypi.org/project/ladybug-geometry-polyskel) | AGPL-3.0 | Polygon | Straight skeleton, core/perimeter polygons | Pure Python | 1.7.55, 2026-09-16 ([PyPI](https://pypi.org/pypi/ladybug-geometry-polyskel/json)) | Derivative of Bottfy polyskel; skeleton only, no roof gen |
| CGAL 2D Straight Skeleton | CGAL (GPL/commercial) | Polygon with holes | Weighted straight skeleton; "straight skeleton extrusion" added | C++; Python pip route unconfirmed | CGAL 6.0 docs ([CGAL news 2023](https://www.cgal.org:443/2023/05/09/improved_straight_skeleton); [CGAL 6.0 docs](https://doc.cgal.org/6.0/Straight_skeleton_2/index.html)) | Weighted skeletons allow per-edge slope (gable via weights); Python wrapper status not verified |
| [SAT2LoD2 / LOD2BuildingModel](https://github.com/GDAOSU/LOD2BuildingModel) | Not stated (LICENSE file exists) | Orthophoto + satellite-derived DSM; OSM optional | LoD2 models (mesh by `building_obj.py`) | Python GUI software | 52 commits; no dates on page; CUDA 10/11 builds (filename mentions 2024) | Only open "image + DSM to LoD2" tool found, but built for stereo-satellite DSM and Nvidia GPU; your 8 m DEM is likely too coarse ([paper](https://arxiv.org/pdf/2204.04139)) |
| [osmsc](https://github.com/ruirzma/osmsc) | MIT | OSM | CityJSON semantic city models (buildings, vegetation, water, transport) | Python, `pip install osmsc` | 0.1.20, 2023-09-21 ([PyPI](https://pypi.org/pypi/osmsc/json)) | Stale; useful as a CityJSON-from-OSM example |
| [Random3Dcity](https://github.com/tudelft3d/Random3Dcity) | MIT | none (synthetic) | Random CityGML/CityJSON test cities | Python | Archived; last push 2019-01-08 ([GitHub API](https://api.github.com/repos/tudelft3d/Random3Dcity)) | Test data only |
| [Streets GL](https://github.com/StrandedKitty/streets-gl) | MIT | OSM vector tiles (modified Planetiler), Esri terrain | Real-time WebGL render | TypeScript | last push 2025-08-21; "early development" ([GitHub API](https://api.github.com/repos/StrandedKitty/streets-gl); [README](https://github.com/StrandedKitty/streets-gl)) | Renderer, not a model generator; tiles served from tiles.streets.gl, self-hosting tiles not explained |
| [OSMBuildings](https://github.com/OSMBuildings/OSMBuildings) | NOASSERTION | GeoJSON/OSM | Browser extrusion | JS | last push 2021-04-29 ([GitHub API](https://api.github.com/repos/OSMBuildings/OSMBuildings)) | Effectively unmaintained |

#### OSM roof tags and Overture schema (inputs for a procedural roof stage)
- OSM `roof:shape` values include gabled, flat, hipped, pyramidal, skillion, half-hipped, hipped-and-gabled, butterfly, dome; also `roof:height`, `roof:levels`, `roof:angle`, `roof:direction` — [OSM wiki](https://wiki.openstreetmap.org/wiki/Key:roof:shape)
- OSM wiki warns that reconstructing roofs from tags suits simple rectangles, not complex cadastral outlines; `height` is ground-to-ridge, so eaves height needs `building:eaves:height`; value `many` is rendered flat — [OSM wiki](https://wiki.openstreetmap.org/wiki/Key:roof:shape)
- Overture buildings carry optional roof shape, roof direction/orientation, roof colour, roof height; `has_parts` buildings link to `building_part` features (from OSM `building:part=yes`) for more representative 3D — [Overture guide](https://docs.overturemaps.org/guides/buildings), [Overture schema](https://docs.overturemaps.org/schema/reference/buildings/building/)
- Overture Python client `overturemaps` 1.0.2, MIT, 2026-08-25 — [PyPI](https://pypi.org/pypi/overturemaps/json)

#### Gable limitation of straight skeleton
- Straight skeletons give hipped roofs naturally; extending to gables, monopitch, half-hips and dormers is hard, discussed by the bpypolyskel author — [OSArch](https://community.osarch.org/discussion/423/). Laycock and Day roof-from-footprint method is cited as a gable route (Swift port claims it) — same thread.

#### CityJSON / CityGML libraries (format layer)
| Tool | Licence | Role | Python | Status |
|---|---|---|---|---|
| [cjio](https://github.com/cityjson/cjio) | MIT | CLI + API: subset, reproject, triangulate, validate, upgrade, export (glb shown) | Yes, `cityjson.reader` | 0.10.1, 2025-05-09 ([PyPI](https://pypi.org/pypi/cjio/json)); single release in ~17 months suggests slow maintenance |
| [cjval](https://github.com/cityjson/cjval) | MIT | Rust CityJSON validator | via cjvalpy | cjval 0.10.0 2026-08-10 ([GitHub API](https://api.github.com/repos/cityjson/cjval)) |
| [cjvalpy](https://github.com/cityjson/cjvalpy) | MIT | Python bindings of validator | Yes | 0.4.1, 2023-10-05 — stale vs cjval ([PyPI](https://pypi.org/pypi/cjvalpy/json)) |
| cityjson-lib (3DGI) | MIT OR Apache-2.0 | Python bindings to a Rust cityjson library | Yes | 0.11.0, 2026-08-04 ([PyPI](https://pypi.org/pypi/cityjson-lib/json)); API maturity not assessed |
| [citygml4j](https://github.com/citygml4j/citygml4j) | Apache-2.0 | Java CityGML 3.0/2.0/1.0 library | No | v3.5.1, 2026-10-12 ([GitHub API](https://api.github.com/repos/citygml4j/citygml4j)) |
| [citygml-tools](https://www.cityjson.org/) | not checked | CityGML <-> CityJSON both ways (CityGML 3.0 included) | CLI | listed on cityjson.org |
| [3DCityDB](https://github.com/3dcitydb/3dcitydb) + [citydb-tool](https://github.com/3dcitydb/citydb-tool) | Apache-2.0 | PostGIS-based CityGML store; CLI import/export | No | v5.1.4 2026-08-25; citydb-tool v1.4.0 2026-09-02 ([GitHub API](https://api.github.com/repos/3dcitydb/3dcitydb)) |
| [cjdb](https://pypi.org/project/cjdb/) | MIT | CityJSON into PostgreSQL | Yes | 2.3.0, 2026-08-20 ([PyPI](https://pypi.org/pypi/cjdb/json)) |
| FlatCityBuf | not checked | Cloud-optimised binary CityJSON, libs for Rust/C++/Python/TS | Yes | Python reader 0.5.2, 2026-08-14 ([PyPI](https://pypi.org/pypi/flatcitybuf/json)); [cityjson.org](https://www.cityjson.org/) |
- CityJSON v2.0.2 is the current spec; v2.0 is an OGC standard (20-072r5) — [cityjson.org](https://www.cityjson.org/)
- CityJSON stores semantic surfaces (RoofSurface, WallSurface, GroundSurface) in a `surfaces` array linked by `values`; geometry type is MultiSurface (no Polygon) — [CityJSON paper](https://arxiv.org/pdf/1902.09155), [modelling guide](https://cityjson.org/dev/modelling-guide/)
- LoD1 is an extruded block with flat roof; LoD2 adds generalised roof shape and superstructures; refined LoD scheme (LoD0.x–2.3) is Biljecki, Ledoux, Stoter 2016 — [TU Delft LoD page](https://3d.bk.tudelft.nl/lod/)
- Working OSM-to-CityJSON extrusion example: ualsg/hdb3d-code (OSM -> GeoJSON -> reproject -> extrude -> CityJSON, then cjio for OBJ) — [repo](https://github.com/ualsg/hdb3d-code)

#### Other Python geometry libraries already in or near your stack
- trimesh 5.1.1 (MIT, 2026-10-02), pyvista 0.49.1 (MIT, 2026-10-11), shapely 2.2.0 (BSD-3, 2026-10-07), mapbox_earcut 2.1.0, manifold3d 3.5.4 (2026-09-29), compas_cgal 0.10.0 (2026-07-23; CGAL wrapper, which CGAL packages it exposes not checked) — [trimesh](https://pypi.org/pypi/trimesh/json), [pyvista](https://pypi.org/pypi/pyvista/json), [shapely](https://pypi.org/pypi/shapely/json), [compas_cgal](https://pypi.org/pypi/compas_cgal/json), [manifold3d](https://pypi.org/pypi/manifold3d/json)
- No PyPI package found under the names `polyskel`, `skgeom`, `scikit-geometry`, `pyroof`, `cityjson-py` (HTTP 404 on PyPI JSON on 2026-10-16); scikit-geometry may exist on conda-forge, not verified.

### Inferences
- Because your only vertical info is a 4 m height raster plus floor counts, the dominant error is height, not roof geometry. A roof generator should take eaves height from the raster/floors and ridge height from a slope rule or `roof:height`, which is exactly what OSM tags assume.
- Practical LoD2-lite plan: classify each footprint (rectangle-like vs complex) with shapely (e.g. minimum rotated rectangle ratio), use bpypolyskel for hipped, a ridge-line-through-rectangle rule for gable, flat for the rest. This is code you largely already have in your rule dict; bpypolyskel mainly replaces hand-written hip geometry.
- Licence flags: bpypolyskel, roofer, 3dfier are GPL-3.0; City4CFD and ladybug-geometry-polyskel are AGPL-3.0. Importing GPL code into a distributed pipeline has copyleft consequences; shelling out to a CLI is a lower-risk route but legal reading is the user's call.
- City4CFD's footprint-extrusion mode is the only TU Delft engine here that explicitly accepts height/floor attributes without LiDAR, but it duplicates what trimesh already does.

### Gaps
- OSM2World's supported roof shapes, release cadence and Python-callable usage were not found on the README fetched (the README is 2 lines; docs at osm2world.org not fetched).
- bpypolyskel last-commit date not obtained (GitHub API rate limit hit).
- roofer Python bindings: installation route and API reference page not retrieved; PyPI `roofer` is an unrelated 2014 package, so do not `pip install roofer`.
- roofer "input data requirements" page returned 404; point density needs come from geoflow/TU Delft slides (8–15 points/m2 for AHN3) — [TU Delft slides](https://3d.bk.tudelft.nl/courses/geo1004/data/lod2recon.pdf), [geoflow bundle](https://github.com/geoflow3d/geoflow-bundle). No evidence found that roofer can use a DSM raster instead of points (it might, if you convert raster cells to points, but that is untested and 8 m/4 m cells would be far below the stated density).
- Whether CGAL straight skeleton has a maintained pip-installable Python binding was not confirmed.

---

## Q2. Roof type inference from imagery without LiDAR

### Takeaway
No ready-to-use open tool was found that outputs gable/hip/flat per footprint from 0.3 m imagery alone. Research exists (roof-type CNNs on orthophotos, SAT2LoD2 with a DSM, DLR single-image roof-section networks), but datasets and code are partial; RoofN3D and Roofpedia do not fit the need.

### Cited Findings
- A 2021 ISPRS paper built a 10,000-image roof-type dataset from 10 cm orthophotos of Cesme, Turkey, six classes (flat, hip, half-hip, gable, pyramid, complex), shallow CNN vs fine-tuned networks; public release not stated — [ISPRS Archives XLIII-B3-2021](https://isprs-archives.copernicus.org/articles/XLIII-B3-2021/55/2021/isprs-archives-XLIII-B3-2021-55-2021.pdf)
- A 2026 METU thesis: U-Net on Roof Information Dataset 2 (RID2) segments roofs, then classifies flat / gable-hip / complex; accuracy 80.77% on its test set — [METU thesis](https://open.metu.edu.tr/handle/11511/118369)
- A 2026 journal article classifies gable / half-hip / complex from UAV orthophotos (HOG/LBP vs deep learning); dataset hand-annotated — [EOGE article](https://eoge.ut.ac.ir/article_106441_dcfc50fd0193cccd4ef91465b9545303.pdf)
- RoofN3D is a point-cloud roof-type training dataset (mostly gable, pyramid, hip) hosted at TU Berlin; one paper reports 457 samples with annotation errors — [RoofN3D](https://roofn3d.gis.tu-berlin.de/); needs 3D points, not imagery
- Roofpedia (ualsg) maps green and solar roofs, not roof shape; repo archived 2024-05-11 — [GitHub](https://github.com/ualsg/Roofpedia)
- Point2Roof (PyTorch) offers synthetic roof data plus a RoofN3D subset; point cloud input — [GitHub](https://github.com/Li-Li-Whu/Point2Roof)
- A 2025 ISPRS paper states footprints alone support LOD-1 only; roof structure must come from imagery; found that prior segmentation did not consistently improve HEAT's reconstruction — [ISPRS 2025](https://isprs-archives.copernicus.org/articles/XLVIII-M-9-2025/1251/2025/isprs-archives-XLVIII-M-9-2025-1251-2025.pdf)
- DLR work predicts roof planes, building sections and heights from one orthorectified panchromatic image plus photogrammetric DSM — [arXiv 2307.05409](https://arxiv.org/pdf/2307.05409); [DLR journal paper](https://elib.dlr.de/218534/1/3rd_Journal_Paper.pdf)
- Image-only height prediction is described as an ill-posed task in one of the reviewed papers (search summary of the DLR line of work) — [arXiv 2307.05409](https://arxiv.org/pdf/2307.05409)
- Google Open Buildings 2.5D Temporal: annual rasters 2016–2023, ~4 m effective resolution (0.5 m source), heights predicted by a deep model from Sentinel-2; coverage Africa, South Asia, South-East Asia, Latin America and Caribbean — [Earth Engine catalog](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1)
- A paper on TEMPO treats Overture as a prior and Google 2.5D as weak labels — [arXiv 2511.12104](https://arxiv.org/pdf/2511.12104); VoxCity says Overture height accuracy is not provided and its footprints/heights differ from OSM — [arXiv 2504.13934](https://arxiv.org/pdf/2504.13934)

### Inferences
- A pragmatic substitute for deep learning: derive a roof-type cue from the data you have. Local variance/shape of the 4 m Google height raster inside a footprint and the 0.3 m imagery's shadow/edge orientation can pick ridge direction; this is unvalidated and would need a hand-labelled sample (e.g. 100 of your 995 buildings).
- If fine-tuning a classifier, the Cesme-style 6-class scheme maps directly onto OSM `roof:shape` values, so labels could be exported back to OSM-style tags.
- 995 buildings is small enough that manual or semi-manual roof-type labelling in QGIS (or reading existing OSM `roof:shape`) may be cheaper than model training.

### Gaps
- No public, downloadable roof-type-from-orthophoto dataset with a clear licence was verified (Cesme dataset release unknown; RID2 licence not checked).
- SAT2LoD2 licence and recent maintenance not verified; whether it accepts an arbitrary 8 m DEM was not tested (designed for satellite-derived DSM and orthophoto).
- No evidence for an off-the-shelf model that runs on 0.3 m imagery in Indonesia-type scenes.

---

## Q3. Web publishing: 3D Tiles, I3S, deck.gl, MapLibre, iTowns, QGIS

### Takeaway
You can drop ArcGIS Online and Cesium ion entirely: write glb per building or per tile, build a 3D Tiles tileset with 3d-tiles-tools or py3dtiles (Python), or load footprints with height into PostGIS and run pg2b3dm for 3D Tiles 1.1 implicit tiling. deck.gl Tile3DLayer renders the result, and 995 buildings do not even need tiling. I3S has no Python-friendly open writer; the open route is 3D Tiles to I3S with loaders.gl.

### Cited Findings
| Tool | Licence | What it does | Version / status |
|---|---|---|---|
| [pg2b3dm](https://github.com/Geodan/pg2b3dm) | MIT | PostGIS table (Polygon, MultiPolygon, PolyhedralSurface, TIN; geometries need Z) to glb/b3dm tiles + tileset.json; default 3D Tiles 1.1 implicit tiling; attributes via `-a` | 2.28.0; releases 2025-12 (2.25.1) at least; test: 9.7 M Dutch BAG LoD1.2 buildings in ~1 h 54 m ([README](https://github.com/Geodan/pg2b3dm)) |
| [py3dtiles](https://gitlab.com/py3dtiles/py3dtiles) | Apache-2.0 | CLI converts LAS/PLY/XYZ to pnts; Python API reads/writes pnts and b3dm; 3D Tiles 1.1 support noted | 12.1.1, 2026-03-20 ([PyPI](https://pypi.org/pypi/py3dtiles/json)); GitLab is the active home, GitHub is a fork ([GitLab](https://gitlab.com/py3dtiles/py3dtiles)) |
| [py3dtilers](https://github.com/VCityTeam/py3dtilers) | LGPL-2.1 | GeojsonTiler (`geojson-tiler --height`), ObjTiler, IfcTiler, CityTiler | Discontinued since January 2025; README says migrate to py3dtiles ([README](https://github.com/VCityTeam/py3dtilers)) |
| [3d-tiles-tools](https://github.com/CesiumGS/3d-tiles-tools) | Apache-2.0 | `glbToB3dm`, `createTilesetJson`, `upgrade` to 1.1, `merge`, `convert` to `.3tz`, `serve` | 0.5.4, 2026-07-15 ([npm](https://registry.npmjs.org/3d-tiles-tools/latest)); `createTilesetJson` builds tileset.json from a folder of content files incl. glb (layout of result not documented in fetched page) |
| [3d-tiles-validator](https://github.com/CesiumGS/3d-tiles-validator) | Apache-2.0 | Validates tilesets | 0.6.1, 2026-01-25 ([npm](https://registry.npmjs.org/3d-tiles-validator/latest)) |
| [loaders.gl tile-converter](https://loaders.gl/docs/modules/tile-converter/cli-reference/tile-converter) | MIT (npm) | Two-way batch 3D Tiles <-> I3S; Node 18+ or Docker | 4.5.4, 2026-10-10 ([npm](https://registry.npmjs.org/@loaders.gl/tile-converter/latest)) |
| [nusamai / PLATEAU GIS Converter](https://github.com/MIERUNE/plateau-gis-converter) | MIT | PLATEAU CityGML 2.0 to 3D Tiles, MVT, GeoPackage, GeoJSON, Shapefile, KML, CZML, glTF, OBJ | 778 commits; "operation not guaranteed"; input is PLATEAU CityGML only |
| [plateaukit](https://pypi.org/project/plateaukit/) | MIT | Python library for PLATEAU data, parallel conversion, CityJSON without citygml4j dependency (partially) | 0.20.0, 2026-09-07 ([PyPI](https://pypi.org/pypi/plateaukit/json)) |
| [CesiumJS](https://www.npmjs.com/package/cesium) | Apache-2.0 | Viewer | 1.146.0, 2026-10-01 ([npm](https://registry.npmjs.org/cesium/latest)) |
| [deck.gl](https://deck.gl) `Tile3DLayer` | MIT | Renders 3D Tiles (b3dm via ScenegraphLayer, i3dm, pnts) and Esri I3S; loaders `Tiles3DLoader` (default), `CesiumIonLoader`, `I3SLoader`; ion token only with CesiumIonLoader | deck.gl 9.4.0, 2026-09-05 ([docs](https://deck.gl/docs/api-reference/geo-layers/tile-3d-layer), [npm](https://registry.npmjs.org/deck.gl/latest)); docs page does not state 3D Tiles 1.0 vs 1.1 support |
| [MapLibre GL JS](https://maplibre.org) fill-extrusion | BSD-3 | Extrudes polygons by height attribute; LoD1 only | 6.14.0, 2026-10-11 ([npm](https://registry.npmjs.org/maplibre-gl/latest)) |
| [iTowns](https://github.com/iTowns/itowns) | CECILL-B OR MIT | Three.js GIS viewer, 3D Tiles | 2.46.0, 2025-10-03 ([npm](https://registry.npmjs.org/itowns/latest)); last npm release is ~1 year old |
| [Streets GL](https://github.com/StrandedKitty/streets-gl) | MIT | See Q1 | early development |

- Cesium ion Self-Hosted is a commercial Kubernetes product by sales quote; no open-source Cesium-ion replacement hosting platform was found in search; 3D Tiles is an open standard and any static host can serve a tileset — [Cesium self-hosted](https://cesium.com/platform/cesium-ion/cesium-ion-self-hosted/), [MapTiler comparison](https://www.maptiler.com/cesium-alternative/)
- Reference OSM-to-3D-Tiles recipe: OSM -> QGIS filter `"building" is not null` -> GeoJSON (EPSG:2154) -> `geojson-tiler --height 6` -> view in Cesium, iTowns or UD-Viz — [VCityTeam note](https://github.com/VCityTeam/UD-SV/blob/master/ImplementationKnowHow/OSM_to_3DTiles.md) (uses the now-discontinued py3dtilers)
- Esri/con terra tools convert CityGML buildings to SLPK (I3S); these are Esri products — [Esri blog](https://www.esri.com/arcgis-blog/products/arcgis/3d-gis/citygmlbuildingstoi3s)
- cjio `export` can write glb from CityJSON — [cjio README](https://github.com/cityjson/cjio); QGIS processing docs 3.34/3.44 list a "3D Tiles" algorithm group (contents not shown) — [QGIS 3.44 docs](https://docs.qgis.org/3.44/de/docs/user_manual/processing_algs/qgis/index.html)
- Blosm Pro advertises baking multiple textures into one for 3D Tiles — [README](https://github.com/vvoovv/blosm)

### Inferences
- Lowest-effort path for your pipeline: keep trimesh -> one glb per building (with `_BATCHID`/EXT_structural_metadata for attributes, or just node names), run `3d-tiles-tools createTilesetJson` or wrap in py3dtiles, validate with 3d-tiles-validator, load with `Tile3DLayer` in pydeck/deck.gl. Alternatively load LoD1/LoD2 meshes with Z into PostGIS and run pg2b3dm (needs PostGIS + .NET binary, but gives implicit tiling and attribute metadata).
- For 995 buildings a single glb or a single-level tileset is enough; tiling matters only for the DEM mesh and larger extents.
- I3S: publishing to I3S without Esri tools means 3D Tiles -> I3S via loaders.gl (Node), untested for textured LoD2; consider whether I3S is really needed since deck.gl, CesiumJS and iTowns read 3D Tiles.
- py3dtilers' discontinuation means do not start new work on it; py3dtiles b3dm API is the supported Python replacement.

### Gaps
- Exact structure of the tileset `createTilesetJson` produces from many glb files is not documented in the fetched page.
- pydeck's bundled deck.gl version and whether it supports `Tile3DLayer` in current pydeck were not checked.
- Whether QGIS 4.x can export 3D Tiles was not confirmed; only viewing/algorithm-group listing seen.
- loaders.gl tile-converter licence stated as MIT on npm only; the fetched doc page did not state it.
- No benchmark of 3D Tiles 1.1 vs 1.0 client support in deck.gl.

---

## Q4. Indoor / floor-level modelling (brief)

### Takeaway
Not researched in depth; only supporting tool found is IfcOpenShell. Storey modelling for your use case is better handled by keeping floor counts as attributes (`storeysAboveGround` in CityJSON/CityGML) rather than building interiors.

### Cited Findings
- IfcOpenShell 0.9.0.post1, LGPL-3.0-or-later, Python bindings and high-level API, 2026-10-15 — [PyPI](https://pypi.org/pypi/ifcopenshell/json)
- py3dtilers had an IfcTiler for IFC to 3D Tiles but is discontinued — [README](https://github.com/VCityTeam/py3dtilers)

### Inferences
- `storeysAboveGround` as a CityJSON attribute name is from general CityGML knowledge, not verified in a fetched source.

### Gaps
- IndoorGML open tools, CityJSON storey/room support, and CityGML 3.0 Space/Storey concepts were not searched. No sources gathered.

---

## Q5. Complete open pipelines and what can be reused

### Takeaway
3D BAG (Netherlands) is the reference open pipeline and its components (roofer, cjio, cjval, 3DCityDB-like storage, pg2b3dm-tested at 9.7 M buildings) are all open, but it is point-cloud driven. PLATEAU (Japan) offers open converters from CityGML to 3D Tiles. Overture offers a worldwide footprint + optional height/roof attribute source, but I found no open LOD2-generation pipeline built on it.

### Cited Findings
- 3D BAG: all ~10 million Dutch buildings at LoD1.2, 1.3 and 2.2, fully automatic, from BAG registry + AHN point cloud, open data — [geoflow bundle search result](https://github.com/geoflow3d/geoflow-bundle), [TU Delft slides](https://3d.bk.tudelft.nl/courses/backup/geo1004/2021/data/slides2.2_3dbag.pdf), [cityjson.org news](https://cityjson.org/news/2021/04/07/release-3dbag)
- roofer is the current engine behind 3D BAG LoD2.2; refactored from geoflow in summer 2024; LoD2.2 method: plane/line detection, line regularisation, roof partition, graph-cut selection — [roofer README](https://github.com/3DBAG/roofer), [TU Delft 2026 slides](https://3d.bk.tudelft.nl/courses/backup/geo1004/2026/data/lod2recon.pdf)
- 3D BAG pipeline repo `3DBAG/3dbag-pipeline` exists (not fetched; GitHub rate limit) — org page [github.com/3DBAG](https://github.com/3DBAG)
- pg2b3dm benchmark lists "Dutch 3d BAG buildings lod12_3d, 12 GB, 9,712,728 features, 1h54m" — [pg2b3dm README](https://github.com/Geodan/pg2b3dm)
- PLATEAU: MLIT publishes a learning page on converting PLATEAU CityGML to 3D Tiles with PLATEAU GIS Converter for Cesium — [MLIT PLATEAU](https://www.mlit.go.jp/plateau/learning/tpc30/); a FOSS4G Europe 2025 talk compares py3dtiles, mago 3DTiler and PLATEAU GIS Converter — [FOSS4G-E 2025](https://talks.osgeo.org/foss4g-europe-2025/talk/GL39FY/)
- Esri ArcGIS Pro has an "Extract LOD2 Buildings" tool, proprietary and out of scope — [Esri docs](https://doc.esri.com/en/arcgis-pro/latest/tool-reference/3d-analyst/extract-lod2-buildings.html)
- ualsg/hdb3d-code: OSM footprints to CityJSON extrusion for Singapore HDB — [repo](https://github.com/ualsg/hdb3d-code)
- Source for reusable standards: CityJSON (OGC), 3D Tiles (OGC community standard), I3S (OGC) — CityJSON OGC status from [cityjson.org](https://www.cityjson.org/); 3D Tiles/I3S OGC status not verified in a fetched source.

### Inferences
- Reusable architecture from 3D BAG for your scale: footprints + attributes in a table (PostGIS or GeoPackage) -> generator producing CityJSON with RoofSurface/WallSurface/GroundSurface semantics -> cjval validation -> glb / 3D Tiles via pg2b3dm or py3dtiles. Swap the roofer step for your own roof generator.
- Emitting CityJSON from trimesh output is a modest writing task (vertices + MultiSurface boundaries + semantic surfaces); cjio/cjval then give validation, glb export, CRS reprojection and upgrade for free.
- PLATEAU's tooling is only relevant if you want to read their data or study their glTF/3D Tiles writer (nusamai); no footprint-extrusion mode found.

### Gaps
- 3dbag-pipeline repo contents/licence, Open City Model, and "Overture buildings 3D" pipelines not examined; no verified end-to-end open Overture-to-LOD2 pipeline found.
- 3D BAG download formats and licence page (3dbag.nl) failed to load.
- Overture height-attribute coverage percentage not found.

---

## Cross-cutting summary (for the report writer)
1. Roof geometry without LiDAR: no open tool found; realistic stack = OSM/Overture roof tags + straight-skeleton roof generator (bpypolyskel for hips) + own gable rule.
2. Standard formats: CityJSON via cjio/cjval/cityjson-lib (Python); CityGML via citygml4j/citygml-tools (Java); storage via 3DCityDB 5.x / cjdb.
3. Publishing without Esri/Cesium ion: glb -> 3d-tiles-tools / py3dtiles / pg2b3dm -> deck.gl Tile3DLayer, CesiumJS or iTowns. I3S only via loaders.gl 3D Tiles to I3S converter.
4. Licence caution: roofer, geoflow, 3dfier, bpypolyskel, BlenderGIS are GPL-3.0; City4CFD, ladybug-geometry-polyskel AGPL-3.0; MIT/Apache for cjio, cjval, py3dtiles, pg2b3dm, 3d-tiles-tools, deck.gl, OSM2World.
5. Maintenance red flags: Random3Dcity archived; OSMBuildings last push 2021; py3dtilers discontinued (2025); cjvalpy stale (2023); osmsc stale (2023); Roofpedia archived; cjio single release in 17 months.
