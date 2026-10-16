# Pretrained / ready-to-use building footprint extraction for 0.3 m tropical campus imagery (UI Depok)

Research date: 2026-10-16. All "last update" statements are limited to what the fetched page showed; many GitHub pages did not expose commit dates (marked as gap). Researcher used ~30 tool calls; statements not backed by a fetched page are labelled as such or moved to Gaps.

## Q1. Which pretrained models / repos can be used zero-shot or with light fine-tuning (samgeo, geoai, Microsoft, Google, RAMP, fAIr, Esri, HF, TorchGeo, Open Cities, SpaceNet)?

### Takeaway
Only a few options are actually runnable: (a) opengeos/geoai `BuildingFootprintExtractor` (Mask R-CNN-style weights trained for USA/NAIP, MIT code), (b) segment-geospatial (SAM / SAM2 / SAM3 + text prompt, MIT), (c) the RAMP baseline model (Docker, TensorFlow, semantic masks, 256 px chips), (d) Esri DLPKs (downloadable, terms unclear). Microsoft GlobalMLBuildingFootprints and Google Open Buildings v3 are DATA ONLY (no weights released). HOT fAIr is a train-your-own-locally-then-predict service, not a global pretrained model.

### Cited Findings
Tier A - actually usable models
- **opengeos/geoai (geoai-py)**, MIT license; install `pip install geoai-py`; includes building examples for USA, Africa, China, a "Building Detection with WHU Pre-trained Model", Mask R-CNN training, SAM semantic segmentation, remote-sensing foundation models, and building regularization examples — [GitHub](https://github.com/opengeos/geoai), [docs home](https://opengeoai.org/), [example notebook list](https://github.com/opengeos/geoai/tree/main/docs/examples) (notebooks: building_footprints_usa/africa/china, building_detection_whu, building_detection_lidar, building_regularization, regularization, train_building_footprints_usa).
- geoai default building model: `BuildingFootprintExtractor` default `model_path="building_footprints_usa.pth"`, downloaded via `hf_hub_download` from Hugging Face repo `giswqs/geoai`; the base `ObjectDetector` class builds `maskrcnn_resnet50_fpn` when no model is passed, so the model is probably a torchvision Mask R-CNN R50-FPN (the extractor's own body was not visible, so this is unconfirmed) — [geoai/extract.py](https://raw.githubusercontent.com/opengeos/geoai/main/geoai/extract.py). The notebook never states architecture, training dataset, tile size or GPU memory — [building_footprints_usa.ipynb](https://raw.githubusercontent.com/opengeos/geoai/main/docs/examples/building_footprints_usa.ipynb).
- geoai notebook inference parameters: `process_raster(confidence_threshold=0.5, overlap=0.25, batch_size=4, nms_iou_threshold=0.5, mask_threshold=0.5, min_object_area=100, simplify_tolerance=1.0)` then `regularize_buildings(min_area=100, angle_threshold=15, orthogonality_threshold=0.3, rectangularity_threshold=0.7)` — [same notebook](https://raw.githubusercontent.com/opengeos/geoai/main/docs/examples/building_footprints_usa.ipynb).
- geoai regularization API: `geoai.regularization(building_polygons=gdf, angle_tolerance=10, simplify_tolerance=0.5, orthogonalize=True, preserve_topology=True)`, `geoai.hybrid_regularization(gdf)`, `geoai.adaptive_regularization(building_polygons=gdf, simplify_tolerance=0.5, area_threshold=0.9, preserve_shape=True)`; input is a GeoDataFrame of polygons produced by `geoai.raster_to_vector` — [building_regularization example](https://opengeoai.org/examples/building_regularization/).
- geoai repo README: 603 commits, Releases section empty on the page, MIT license, mentions catalog of 20 remote-sensing foundation models (`geoai.list_foundation_models()`) — [GitHub](https://github.com/opengeos/geoai).
- A Hugging Face model from a different project: `geobase/building-footprint-segmentation` (U-Net-style CNN for the geoai.js JavaScript library) — [HF](https://huggingface.co/geobase/building-footprint-segmentation/blob/main/README.md?code=true) (found via search snippet only; not opened).
- **segment-geospatial (samgeo)**, MIT; supports SAM, SAM 2 (`samgeo2` extra), SAM 3 (`samgeo3` extra), HQ-SAM, FastSAM, and text prompts via Grounding DINO (LangSAM-style); README recommends >= 8 GB GPU memory; install via pixi, pip extras or conda-forge; README does not mention buildings explicitly — [GitHub](https://github.com/opengeos/segment-geospatial).
- samgeo SAM3 usage: `SamGeo3` and `generate_masks(prompt="building")` on satellite imagery, plus box prompts and batch processing — [samgeo SAM3 docs](https://samgeo.gishub.org/examples/sam3_image_segmentation/), [batch](https://samgeo.gishub.org/examples/sam3_batch_segmentation/).
- **RAMP baseline model** (`radiantearth/model_ramp_baseline`, "model_ramp_baseline_v1"): semantic segmentation, Eff-UNet-inspired, TensorFlow checkpoint bundled via Git LFS, runs via Docker Compose (CPU or GPU image), input 256x256 GeoTIFF chips, EPSG:4326, 3-band 8-bit RGB; needs ~4 GB RAM; license not stated on the README page (license listed as "other" in an aggregator); no metrics on the README; training resolution not stated — [GitHub](https://github.com/radiantearth/model_ramp_baseline), [aggregator note](https://awesome.ecosyste.ms/projects/github.com%2Fradiantearth%2Fmodel_ramp_baseline). Repo last pushed Sept 2023 per aggregator, so likely stale.
- **RAMP datasets** (source.coop/ramp/ramp): 22 training datasets (256x256 tile TIFF + GeoJSON labels) from 18 countries, license CC BY-NC 4.0 (non-commercial; fine for education), contains NO weights; no Indonesia/SE Asia region confirmed on the page — [source.coop](https://source.coop/ramp/ramp), [source.coop/ramp](https://source.coop/ramp).
- **Esri pretrained models** (Building Footprint Extraction USA / Africa / China etc.): downloadable DLPK from ArcGIS Living Atlas, "available to anyone with an ArcGIS Online subscription at no additional cost", intended input 10-40 cm, 8-bit, 3 band, orthorectified; page states off-nadir imagery fails; no accuracy/license on that doc page; running them outside ArcGIS (Python `arcgis.learn`/ArcGIS Pro licence) and redistribution terms were not found — [Esri USA doc](https://doc.arcgis.com/en/pretrained-models/latest/imagery/using-building-footprint-extraction-usa.htm), [Esri blog](https://www.esri.com/arcgis-blog/products/arcgis/imagery/introducing-ready-to-use-deep-learning-models), [fine-tuning sample](https://developers.arcgis.com/python/samples/finetuning-pre-trained-building-footprint-model). Treat as not open-source.

Tier B - tools that need local training data
- **HOT fAIr**, AGPL-3.0: AI-assisted mapping service; trains a local model from validated OSM labels + OpenAerialMap imagery, then applies to similar areas; backend library fAIr-utilities; YOLOv8 adopted (2025 roadmap); pretrained-model reuse on new imagery added in v2.2.0; "15+ ready-to-use models" is only planned; Docker local install guide; no accuracy numbers on page — [GitHub](https://github.com/hotosm/fAIr).
- **Open Cities AI Challenge** (drone imagery, 12 African cities): winning semantic-segmentation repo `qubvel/open-cities-challenge` (Unet-like, Docker; license not seen); also DrivenData "winning models" repo; dataset license reported as ODbL-1.0 on source.coop vs CC BY 4.0 in STAC metadata (conflict) — [qubvel repo](https://github.com/qubvel/open-cities-challenge), [winners blog](https://blog.drivendata.org/blog/open-cities-disaster-winners), [dataset README](https://data.source.coop/open-cities/ai-challenge/README.md).
- **TorchGeo**: ships Inria Aerial and SpaceNet datasets/datamodules and training trainers; search found NO dedicated pretrained building-segmentation checkpoint (its weights are sensor-based encoders, e.g. Sentinel-2/NAIP/Landsat) — [PyPI](https://pypi.org/project/torchgeo), [v0.7 notes](https://www.osgeo.org/community-news/torchgeo-release-v0-7-0/), [weights tutorial](https://mytorchgeo.readthedocs.io/en/latest/tutorials/pretrained_weights.html).
- **Hugging Face generic**: no dedicated, well-known building-footprint SegFormer checkpoint was found by search; HF docs show instance-segmentation tutorial on a ~9,600-image satellite building dataset using RF-DETR-Seg; a 2025 PLoS One paper reports SegFormer MiT-B5 94.13% IoU on WHU aerial (not a released checkpoint) — [HF instance seg guide](https://huggingface.co/docs/transformers/v5.14.0/tasks/instance_segmentation.md), [PubMed paper](https://pubmed.ncbi.nlm.nih.gov/41359638/).

Tier C - DATA ONLY (no usable model)
- **Microsoft GlobalMLBuildingFootprints**: repo describes data and helper scripts only, no model weights; license CDLA Permissive 2.0; method = DNN pixel classification + polygonization; reported building-match precision ~92-97%, recall ~71-86% (Africa 94.4/70.9, Europe 94.3/85.9), IoU ~63-68%, weaker in dense areas; page says global dataset refreshed 13 Aug 2026 (1,945 of 30,340 tiles updated) — [GitHub](https://github.com/microsoft/GlobalMLBuildingFootprints). Indonesia/SE Asia-specific accuracy not given on the page.
- **Google Open Buildings v3**: dataset only (CSV / Earth Engine); dual license CC BY-4.0 and ODbL; Indonesia (IDN) covered; inference May 2023; confidence >= 0.65 filter; suggested score thresholds for 80/85/90% precision; page says model trained on satellite imagery (arXiv 2107.12283) but does not state release of the model; has both omission and commission errors — [Open Buildings](https://sites.research.google/gr/open-buildings/). I found no evidence a model was released.
- **Google Open Buildings 2.5D Temporal**: raster annual building presence/count/height 2016-2023 from Sentinel-2 (teacher-student super-resolution), covers Africa/South+SE Asia/LatAm; CC-BY 4.0 + ODbL; weights not stated as released; height MAE 1.5 m; nominal resolution conflicting across pages (4 m vs 0.5 m raster vs 1 m) — [Google blog](https://blog.google/products-and-platforms/products/maps/google-open-buildings-dataset/), [Earth Engine catalog](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1?hl=en).

### Inferences
- The geoai USA Mask R-CNN is architecturally the same family as the user's failed model (torchvision Mask R-CNN R50-FPN) and was trained on US NAIP (~0.6 m) data: expect similar tree-canopy confusion in the tropics unless fine-tuned. Inference from the code snippet; not tested.
- RAMP baseline is the only found pretrained model trained on LMIC imagery, but its weights are 2023-era TensorFlow, 256 px chips, resolution unknown; probable domain fit better than USA-only models but unverified for 0.3 m z19.
- Google/Microsoft data cannot be fine-tuned from; they are best used as weak labels / pseudo-labels (e.g. to expand the 470-chip training set with cleaned Open Buildings polygons) or as verification layers.

### Gaps
- Exact architecture, training set and resolution of geoai `building_footprints_usa.pth`/africa/china/WHU weights (not in docs fetched). Check the HF repo `giswqs/geoai` model card.
- Esri DLPK licence terms for use outside ArcGIS (not found).
- Whether Google ever released Open Buildings model weights (not found; assume no).
- RAMP baseline licence text and training resolution.
- Commit dates/last release for most GitHub repos (pages did not show them).

## Q2. Which give instance polygons with regularized (orthogonal) outlines (HiSup, FFL, PolyWorld, regularization tools)?

### Takeaway
HiSup (MIT) and Frame Field Learning (BSD-3) both ship pretrained weights and output vector polygons directly; HiSup has the best reported CrowdAI AP but is a hard install (old PyTorch/CUDA/C++ build) with weights only for CrowdAI (0.3 m aerial, US) and Inria. geoai offers post-hoc regularization (orthogonalization) on any raster/polygon output and is the easiest drop-in.

### Cited Findings
- **HiSup** (`SarahwXU/HiSup`), MIT; HRNetV2-W48 weights for AICrowd (CrowdAI) and Inria (select with `--dataset crowdai|inria`); tested on Ubuntu 18.04, CUDA 11.0, PyTorch 1.7/1.8, GCC 7.3, Python 3.7 conda env, needs C++ extension compiled with `make`; GPU VRAM not stated; 21 commits, no date shown — [GitHub](https://github.com/SarahwXU/HiSup). Paper (ISPRS J. 2023, arXiv 2208.00609) uses vertex, line-segment and mask supervision — [arXiv](https://arxiv.org/abs/2208.00609v1). One blog summary reports AICrowd AP 79.4, AP-boundary 66.5, PoLiS 0.726, +12.4 pp AP vs Frame-Field (unverified against paper tables) — [Spyrosoft blog / search summary](https://spyro-soft.com/blog/geospatial/closing-the-geometry-gap-in-building-footprint-extraction-our-first-look-at-hisup), [Papers with Code](https://paperswithcode.com/paper/accurate-polygonal-mapping-of-buildings-in).
- **Frame Field Learning** (`Lydorn/Polygonization-by-Frame-Field-Learning`), BSD-3-Clause; pretrained "runs" on Google Drive (e.g. `inria_dataset_polygonized.unet_resnet101_pretrained.leaderboard`, `mapping_dataset.unet_resnet101_pretrained.train_val`); Python 3.10 + PyTorch 1.13 (as of 2022-12), Docker/conda old; multi-GPU capable; 101 commits (no date); eval via COCO API (`--mode eval_coco`); the polygonization uses frame field aligned with contours — [GitHub](https://github.com/Lydorn/Polygonization-by-Frame-Field-Learning), [paper abstract](https://arxiv.org/abs/2004.14875).
- **PolyWorld** (`zorzi-s/PolyWorld`): page could not be fetched (404 at the URL tried); details not verified.
- **Regularization tools**: geoai `regularization / hybrid_regularization / adaptive_regularization / regularize_buildings` (see Q1). A SAM-based Indonesian UAV study reports adding regularization to SAM output and averages above 87% for precision/recall/F1/IoU — [Elipsoida (UNDIP)](https://ejournal2.undip.ac.id/index.php/elipsoida/article/view/25145).

### Inferences
- For a 6 GB GPU the pretrained HiSup HRNetV2-W48 at inference should be feasible with 512 px tiles, but this is not documented; try batch size 1.
- CrowdAI is ~0.3 m aerial from the US (inference from general knowledge of the dataset, not sourced here), which matches the resolution but not the tropical scene; expect domain shift on canopy and tin roofs.
- Easiest regularization path: any semantic/instance output -> `raster_to_vector` -> geoai regularization.

### Gaps
- Verified HiSup Inria IoU and CrowdAI table values from the paper itself.
- PolyWorld weights, licence, AP (unfetched).
- Last-commit dates and VRAM figures for HiSup and FFL.

## Q3. Reported metrics on benchmarks (WHU, Inria, SpaceNet, CrowdAI, Open Cities) and Southeast Asia / Indonesia results

### Takeaway
Benchmarks show supervised models reach ~0.8 AP on CrowdAI and ~94% IoU on WHU aerial, but these are in-domain; direct evidence for tropical, tree-heavy, VHR satellite imagery in Indonesia is sparse and mostly UAV-based. The paper's target F1 0.82 is therefore plausible only with in-domain, clean labels.

### Cited Findings
- WHU aerial: SegFormer MiT-B5 94.13% IoU (100 epochs) — [PubMed](https://pubmed.ncbi.nlm.nih.gov/41359638/). WHU building dataset: aerial subset (Christchurch NZ) and a satellite subset; sources disagree on resolution/count (0.075 m vs 0.0075 m; ~22,000 vs ~220,000 buildings) — [WHU](https://gpcv.whu.edu.cn/data/building_dataset.html), [IEEE DataPort search snippet](https://ieee-dataport.org/comment/1658).
- CrowdAI: HiSup AP 79.4 (secondary source), see Q2.
- Microsoft global ML footprints: IoU ~63-68%, precision 92-97% (match-based), recall 71-86% — [GitHub](https://github.com/microsoft/GlobalMLBuildingFootprints).
- SAM zero-shot: results vary hugely with prompt; box prompts ~64% IoU vs ~47% for single point in one (unidentified-source) table; a Mask R-CNN vs SAM comparison reports precision 0.81-0.94 (Mask R-CNN) vs 0.79-0.93 (SAM) — [sciforum](https://sciforum.net/paper/16885), [ESA abstract](https://stateo26.esa.int/iframe-agenda/files/ID_107.pdf). SAM 3 benchmark (blog, qualitative): fewer fragmented masks than SAM, but small/low-contrast targets missed and dense buildings merged — [Labellerr](https://www.labellerr.com/blog/sam-vs-sam-3-aerial-segmentation-benchmark/). No quantitative samgeo3 building IoU found.
- Indonesia: UAV orthophoto SAM+regularization >87% (above); UGM UAV U-Net IoU 86.58%, P/R/F1 >90% — [ACRS 2023](https://a-a-r-s.org/proceeding/ACRS2023/Spatial%20Information%20Sciences/ACRS2023180.pdf); GeoCARTA six-province YOLOv8 on 10 cm UAV F1 93.88%, fails on complex/connected buildings — [GeoWeek slides](https://geoinfo.utm.my/geoweek/downloads/slides/ladm3dla/Automatic-DTM-and-Building-Footprint-Extraction-from-Imageries-and-Point-Clouds-in-Indonesia-Land-Registration.pdf). Thailand Google-satellite imagery: Res-U-Net and DeepLabV3+ F1 ~85% — [KMITL](https://cast.kmitl.ac.th/articles/comparative-analysis-of-deep-learning-models-for-building-extraction-from-high-resolution-satellite-imagery).
- Transfer warning: pre-trained DL building models "not efficient in predicting buildings in other locations" — [ISPRS 2022 (DOAJ)](https://doaj.org/article/eb515ec46c16494fb5d93267108902de).
- SpaceNet: TorchGeo lists SpaceNet (building footprints, >11M footprints); no SpaceNet-winner repos were reviewed — [OSGeo](https://www.osgeo.org/community-news/torchgeo-release-v0-7-0/).

### Inferences
- Indonesian high numbers are on 10 cm UAV data, not 0.3 m satellite; not comparable to the user's z19 target.
- Practical ceiling for a pretrained zero-shot Mask R-CNN on tropical z19 tiles is likely below the supervised F1 0.8+ range; fine-tuning (or SAM refinement of Open Buildings boxes) is the likely route. Reasoned, not measured.

### Gaps
- No published numbers found for any pretrained model evaluated on Universitas Indonesia / Depok / Jakarta VHR satellite imagery.
- SpaceNet and Open Cities winners' scores/licences not retrieved.
- Open Buildings v3 numeric precision/recall for Indonesia not on the page (only curves).

## Q4. Practical: install complexity, GPU memory, licence, maintenance (RTX 3050 6 GB)

### Takeaway
samgeo and geoai are pip-installable, MIT, actively maintained (as of 2026 per SAM3/foundation-model features), but samgeo advises >= 8 GB VRAM (SAM-ViT-H); on 6 GB use smaller SAM variants or SAM2 small/tiny. HiSup/FFL are permissive but have brittle legacy environments. Data sources have open licences suitable for education.

### Cited Findings
- samgeo: MIT; >= 8 GB GPU recommended; extras samgeo/samgeo2/samgeo3/hq/fast/text; Windows SAM3 needs Python 3.12, CUDA 12.1 PyTorch — [GitHub](https://github.com/opengeos/segment-geospatial).
- geoai: MIT; pip/conda; automatic device handling — [GitHub](https://github.com/opengeos/geoai).
- HiSup: MIT; Python 3.7/PyTorch 1.7-1.8/CUDA 11.0 + C++ build — [GitHub](https://github.com/SarahwXU/HiSup).
- FFL: BSD-3; Python 3.10/PyTorch 1.13 venv recommended; Docker/conda older — [GitHub](https://github.com/Lydorn/Polygonization-by-Frame-Field-Learning).
- fAIr: AGPL-3.0, Docker Compose, Django/React/Postgres/TF/PyTorch (heavy) — [GitHub](https://github.com/hotosm/fAIr).
- RAMP baseline: Docker, 4 GB RAM, optional GPU — [GitHub](https://github.com/radiantearth/model_ramp_baseline).
- Data licences: Microsoft CDLA-Permissive-2.0; Google Open Buildings CC-BY-4.0/ODbL; RAMP datasets CC-BY-NC-4.0; fAIr labels ODbL, imagery CC-BY-4.0 (see links above).

### Inferences
- A 6 GB card can run Mask R-CNN R50 inference at 512 px tiles and SAM-B/SAM2-small; SAM-H and SAM3 may need tiling/fp16 or CPU offload (SAM3 VRAM not documented in sources).
- Esri imagery licensing (World Imagery) governs derivative-data use; not researched here.

### Gaps
- VRAM measurements for SAM3, HiSup, geoai Mask R-CNN on RTX 3050.
- Dates of last release for geoai/samgeo (README pages showed empty release lists).

## Q5. Fit for 0.3 m tropical, tree-heavy campus imagery and suggested approach

### Takeaway
No found pretrained model is validated for this scene. Best-evidence plan: (1) use Google Open Buildings v3 (CC-BY/ODbL) or Microsoft footprints as candidate boxes, filter by confidence, then refine with SAM/SAM2 box prompts and geoai regularization; (2) alternatively fine-tune geoai's Mask R-CNN or HiSup/FFL on many more chips (WHU/Inria/CrowdAI pretraining then campus fine-tune with corrected labels); (3) evaluate against a hand-checked set, not incomplete OSM.

### Cited Findings
- SAM box prompts score notably higher than point prompts (≈64% vs ≈47% IoU, unattributed table) — [sciforum](https://sciforum.net/paper/16885).
- Google Open Buildings v3 provides score thresholds for 80/85/90% precision and covers Indonesia — [Open Buildings](https://sites.research.google/gr/open-buildings/).
- The user's Open Buildings vertex RMSE of 3.7 m vs OSM is from the task brief, not a source.
- geoai documents the polygonize -> regularize pipeline — [docs](https://opengeoai.org/examples/building_regularization/).

### Inferences
- Box-prompted SAM sidesteps the false-positive-on-canopy problem if boxes come from a reliable footprint source, but SAM may include roof overhang vs tree occlusion errors; test before adopting.
- Pretraining on a larger public set (Inria/CrowdAI via FFL or HiSup weights) probably beats 470 chips of incomplete OSM, but tropical roofs/trees remain out-of-domain.
- Dense low-rise buildings with canopy occlusion are where Microsoft/Google data are weakest (page says weaker in dense areas), so manual QA is required.

### Gaps
- No tropical VHR satellite benchmark results for any candidate; no hands-on test was run.
- Not covered: PolyWorld, SpaceNet winners, Overture Maps (Overture is a merge of OSM/Microsoft/Google data per general knowledge; not researched/sourced), Planetary Computer model catalogue.
