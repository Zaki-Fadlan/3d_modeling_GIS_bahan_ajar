# Improving building instance segmentation with scarce, noisy OSM labels (0.3 m RGB, Mask R-CNN baseline F1 0.29)

Research depth note: about 25 tool calls, mostly search snippets plus summarised page fetches. Several primary papers were only partly readable (see Gaps). Items marked "(background, unverified)" come from general knowledge, not from a fetched source.

## 1. Which frameworks are best for remote-sensing instance/semantic segmentation (2025-2026)?

### Takeaway
No fetched benchmark ranks frameworks head to head. TorchGeo (4.2k stars, 2026 copyright, Mask R-CNN example on VHR-10) and geoai (3.4k stars, MIT, wraps segmentation_models_pytorch and ships a catalog of ~20 foundation models) are the maintained geospatial wrappers. The task-specific model code (HiSup, AIO2, DBMatch) lives in research repos that are MIT-licensed or announced, not in the general frameworks.

### Cited Findings
- TorchGeo: 4.2k stars, 599 forks, 3,465 commits, 121 open issues, 93 open PRs, 2026 copyright, security policy present, so actively developed; supports instance-segmentation datasets and shows a Mask R-CNN example on VHR-10 with boxes and masks. Provides multispectral pretrained weights such as `ResNet18_Weights.SENTINEL2_ALL_MOCO` — [TorchGeo GitHub](https://github.com/microsoft/torchgeo)
- geoai (opengeos): 3.4k stars, MIT license, `pip install geoai-py`; advertises "Integration with PyTorch Segmentation Models" and streamlined workflows for segmenting buildings; `geoai.list_foundation_models()` lists a catalog of 20 remote sensing foundation models. The README does not describe instance-level training or Mask R-CNN — [geoai GitHub](https://github.com/opengeos/geoai)
- HiSup (polygonal building mapping, repo SarahwXU/HiSup): MIT license, HRNetV2-W48 backbone initialised from ImageNet weights, single-GPU training script (`scripts/train.py` with `crowdai-small_hrnet48.yaml`), expects COCO-format `annotation.json` per split, converter `tools/inria_to_coco.py`. The environment is old (Python 3.7, PyTorch 1.7/1.8, CUDA 11.0) and requires building C extensions with `make` — [HiSup GitHub](https://github.com/SarahwXU/HiSup)
- HiSup paper claims "unanimous improvements" in AP, AP-boundary and PoLiS on the AICrowd (CrowdAI) benchmark, and "very competitive" IoU/accuracy on Inria — [arXiv 2208.00609](https://arxiv.org/abs/2208.00609)
- A later method (RoIPoly) reports 83.6 AP on CrowdAI, a 4.2 AP gain over HiSup, which implies HiSup is about 79.4 AP (back-calculation, not a reported figure) — [RoIPoly arXiv 2407.14920](https://arxiv.org/pdf/2407.14920)
- On IRSAMap, a different and harder dataset, HiSup scored only 12.0 AP_poly, below SAMPolyBuild and GCP, so rankings are dataset dependent — [IRSAMap arXiv 2508.16272](https://arxiv.org/pdf/2508.16272)
- YOLO11 (Ultralytics): released September 2024 under AGPL-3.0; Mask R-CNN is available in Meta's Detectron2 — [Roboflow comparison](https://roboflow.com/compare/yolo11-vs-mask-rcnn)
- YOLOv11-seg reached 60.4 mAP50 and 38.3 mAP50-95 for building instance segmentation on DFC2023 Track 2, with no Mask R-CNN baseline in the same paper — [Mask-to-Height arXiv 2510.27224](https://arxiv.org/pdf/2510.27224)
- In xView2 building damage, a semantic-segmentation model beat the instance-segmentation (Mask R-CNN) model significantly; authors attribute this to Mask R-CNN missing buildings in dense clusters — [DeepDamageNet arXiv 2405.04800](https://arxiv.org/pdf/2405.04800)

### Inferences
- For a 6 GB GPU, semantic segmentation (smp U-Net/UPerNet/DeepLab with an EfficientNet/ResNet encoder, installed via `pip`, driven from TorchGeo or geoai) is the lowest-risk first switch. Instance separation then comes from a boundary/touch channel plus watershed (see section 3). Keep Mask R-CNN only as a baseline.
- HiSup is the strongest documented polygon-style option, but the old PyTorch 1.7 / CUDA 11 stack and custom C extensions make installation costly on a modern machine. Budget time for porting.
- Ultralytics YOLO-seg is the cheapest to train on 6 GB, but AGPL-3.0 matters if the model is distributed, and I found no clean building benchmark against Mask R-CNN.
- mmdetection/mmsegmentation/mmrotate, detectron2, solaris and raster-vision were not fetched; I make no claim about their maintenance (see Gaps).

### Gaps
- No direct maintenance data (last release or commit dates) for TorchGeo, geoai, mmseg/mmdet, detectron2, solaris, raster-vision, Ultralytics; GitHub release tabs were empty in the fetched summaries.
- Solaris is, from general knowledge, largely unmaintained since about 2021-2022 (background, unverified).
- No HiSup exact table values or GPU memory requirement were retrievable.
- No head-to-head Mask R-CNN vs YOLO11-seg vs U-Net result on the same building dataset was found.

## 2. Large public building datasets matching our domain (pretrain / fine-tune)

### Takeaway
Open Cities AI (African cities, drone imagery) and SpaceNet are the best known large building sets, but I could not verify resolution, city lists or sizes from fetched sources. For Indonesia, no open very-high-resolution building label set was found; Google Open Buildings and Microsoft footprints remain the only wide-coverage labels (and you already found Google v3 gave no gain).

### Cited Findings
- Open Cities AI Challenge: about 790K building footprints and 400 km2 of drone imagery across 10 African urban areas per GFDRR; the concluding report and DrivenData blog say 12 cities/regions (11 countries) and more than 700K buildings. 4-band GeoTIFFs with pixel-wise building masks. Official ground sample distance was not stated in the results; sources disagree on the number of cities — [GFDRR/OpenDRI post](https://opendri.org/?p=6981); [Concluding report](https://opendri.org/wp-content/uploads/2020/07/Open-ML-Challenge-for-Urban-Resilience-Concluding-Report-FINAL-1.pdf); [Source Cooperative](https://source.coop/open-cities/ai-challenge)
- Open Cities winners' write-ups are published on the DrivenData blog and GitHub (architectures not retrieved) — [DrivenData winners blog](https://blog.drivendata.org/blog/open-cities-disaster-winners)
- WHU aerial dataset: 0.2 m resolution, 187,000 buildings; used by 2026 PolyBuild paper — [PolyBuild arXiv 2606.08920](https://arxiv.org/pdf/2606.08920)
- Massachusetts Buildings: 1 m RGB aerial of Boston; Germany: 3 m Planet basemap RGB over ten German cities (both used by AIO2) — [AIO2 arXiv 2403.01641](https://arxiv.org/html/2403.01641v1)
- Google Open Buildings: 1.8 billion detections, CC BY-4.0 or ODbL, includes South-East Asia; third party says Indonesia is included (verify against Google's coverage list) — [Google Open Buildings](https://sites.research.google/open-buildings/)
- Indonesia: HRSL is a population grid derived from 0.5 m DigitalGlobe imagery, not footprints; GlobalBuildingAtlas is PlanetScope-derived (medium resolution); a Jakarta study extracted about 1.25 million buildings over 643 km2 from 0.5 m stereo imagery but was a method paper, not a confirmed download — [HRSL Indonesia](https://data.amerigeoss.org/dataset/high-resolution-settlement-layer-for-indonesia); [Jakarta study via Soton](https://eprints.soton.ac.uk/488295/2/1-s2.0-S0198971524000334-main.pdf)
- PANGAEA includes Five Billion Pixels, xView2 and SpaceNet 7 as downstream tasks — [PANGAEA arXiv 2412.04204](https://arxiv.org/html/2412.04204v2)

### Inferences
- Domain gap: Open Cities is drone imagery of African settlements; WHU is 0.2 m aerial in a New Zealand/aerial look. Neither matches 0.3 m satellite over a tree-rich Indonesian campus exactly, but pretraining on WHU (0.2 m, near our GSD after a 1.5x downsample) then fine-tuning on the campus chips is the closest fit among datasets I could confirm.
- For false positives on tree canopy and sports fields, a land-cover dataset (LoveDA, OpenEarthMap, Five Billion Pixels) as an auxiliary "not building" signal is plausible, but I did not verify their resolution or licence.
- A cheap, in-domain way to get more labels is to prelabel more of Depok with a model and manually correct it; no source tested this.

### Gaps
- Verified details missing for: SpaceNet (which cities, GSD of SpaceNet 1/2/7), Inria (0.3 m, 5 cities in general knowledge, unverified), CrowdAI (0.3 m, 280k training chips in general knowledge, unverified), xBD, OpenEarthMap, LoveDA, MapSwipe.
- No open Indonesian building-label dataset at <=0.5 m was confirmed. HOT/OSM Indonesia and MapSwipe were not searched.

## 3. Techniques for noisy and incomplete OSM labels

### Takeaway
Published evidence: handling missing buildings online (AIO2) recovers most of the IoU lost to incomplete labels (e.g. 22.8 to 65.5 IoU at 70% of buildings missing on Massachusetts), alignment-correction networks are an established first stage for OSM-style data, and semantic-segmentation approaches beat Mask R-CNN where buildings are dense. Exact OSM-specific numbers are scarce.

### Cited Findings
- AIO2 (Liu et al., IEEE TGRS; zhu-xlab): Adaptive Correction Trigger plus Online Object-wise Correction using a mean-teacher; corrects only omitted objects. Massachusetts IoU with 30/50/70% of buildings removed: noisy training 58.06/40.43/22.84, AIO2 71.56/70.47/65.45, clean GT 72.47. Germany (3 m, EfficientNet-B5 U-Net): noisy 38.42/27.46/15.42, AIO2 45.52/43.91/39.66, clean 48.10. Baselines: noisy-label regularization 69.71/66.88/60.09 (Mass.), bootstrapping 66.63/63.23/56.11. Code stated at github.com/zhu-xlab/AIO2 ("will be available"; availability not confirmed). Authors' own conclusion cites smaller gains (about 10 and about 5 points at 30%) than the table, so check the paper — [AIO2 arXiv 2403.01641](https://arxiv.org/html/2403.01641v1)
- Fobi et al. "Learning to segment from misaligned and partial labels": two stages, an Alignment Correction Network re-registers open-source labels (applied to OSM footprints), then a Pointer Segmentation Network handles missing annotations; 0.79 mean IoU on AIRS — [arXiv 2005.13180](https://arxiv.org/abs/2005.13180)
- Map-Repair corrects label noise and misalignment between cadastre footprints and imagery end to end, with OSM suggested as an application — [arXiv 2007.12470](https://arxiv.org/pdf/2007.12470)
- A study training on noisy OSM labels and modelling false-positive/false-negative error maps as intermediate predictions reported +2.74% IoU and +1.75% F1 over a baseline — via search summary of [IGARSS-era OSM noise work](https://arxiv.org/pdf/2104.01263) (snippet attribution uncertain; verify)
- A 2021 IGARSS dataset provides OSM image/label pairs with injected noise types for benchmarking label denoising (same search result set, source not fetched).
- Urban3D/SpaceNet U-Net study: exponentially weighted boundary loss plus F-beta objective helped separate touching footprints and sharpen edges — [arXiv 2104.01263](https://arxiv.org/pdf/2104.01263)
- Mask R-CNN plus watershed (distance transform with local maxima) separated connected buildings without over-segmentation (2022 Japanese conference paper) — [GISA Japan proceedings](https://www.gisa-japan.org/content/files/conferences/proceedings/2022cd/papers/A-5-3.pdf)
- 2026 ISPRS Annals: LiDAR-derived nDSM used to refine OSM building labels before training; a 2026 ISPRS Archives paper proposes boundary-aware correction of OSM geometry — [ISPRS Annals X-4-2024](https://isprs-annals.copernicus.org/articles/X-4-2024/141/2024/isprs-annals-X-4-2024-141-2024.pdf); [ISPRS Archives XLIX-B4-2026](https://isprs-archives.copernicus.org/articles/XLIX-B4-2026/151/2026/isprs-archives-XLIX-B4-2026-151-2026.pdf)
- DBMatch (Huang et al., IEEE TGRS 2025): semi-supervised building footprints with weak-to-strong self-training and a logit-debiasing module that calibrates pseudo-labels between building and background; tested on three public datasets over six cities; code announced at zhu-xlab/SSL_Buildings — [TUM portal](https://portal.fis.tum.de/en/publications/semi-supervised-building-footprint-extraction-using-debiased-pseu/)
- GAN-based boundary regularisation post-processing is used to make footprints more regular (search summary only).
- Note that TorchGeo/geoai README fetches did not mention any noisy-label loss; these are research-repo techniques.

### Inferences
- Your errors are two types: missing labels (incomplete OSM) and false positives on canopy/sports fields. The first is exactly AIO2's setting; treat the Mask R-CNN false positives as, in part, true detections of unlabeled buildings and check by eye on a held-out hand-labelled sample before trusting F1 0.29. Evaluating on OSM itself caps measurable precision.
- A pragmatic recipe consistent with the evidence: (1) hand-correct a small clean validation/test set (e.g. 30-50 chips) so metrics are trustworthy; (2) train a semantic U-Net with 3 outputs (building interior, boundary/touch, background) and a weighted boundary/F-beta loss; (3) apply mean-teacher pseudo-label correction of omitted objects (AIO2-style) once the model plateaus; (4) split instances by watershed on the interior-minus-boundary map; (5) optionally regularise polygons.
- Early overfitting at epoch 3-5 on ~470 overlapping chips is expected: the overlapping chips are near duplicates, so effective sample size is small. Strong geometric/photometric augmentation, a pretrained encoder (remote-sensing or DINOv3-SAT) with low learning rate, and splitting train/val by area (not by chip) are standard remedies (background, unverified).
- Ignore-mask idea: down-weight or ignore loss on pixels where the model is confidently "building" but OSM says background (this is what AIO2 formalises).

### Gaps
- No quantified OSM-specific result for Southeast Asia or for campus-style scenes.
- HiSup, frame-field learning (Girard et al., polygonization with frame fields, background, unverified) were not fetched in full; no verified numbers for frame-field boundary quality.
- AIO2 and DBMatch repositories were not confirmed to be published; the Fobi paper PDF could not be parsed in this session.
- 'Microsoft footprints as labels' was not researched; Google v3 was already tried with no gain on your side.

## 4. Foundation models usable with few labels at ~0.3 m RGB

### Takeaway
The best-fitting weights I could confirm are DINOv3 SAT-493M (ViT-L/16 distilled, 300M parameters; trained on 0.6 m Maxar RGB), which matches RGB at roughly 0.3-0.6 m. Prithvi (HLS, 30 m) and Clay (10 m Sentinel-2, background, unverified) do not match your GSD. PANGAEA indicates high-resolution-pretrained models (Scale-MAE, RemoteCLIP) help more as labels shrink.

### Cited Findings
- DINOv3 SAT-493M: ViT-L/16 distilled (300M parameters) and ViT-7B/16 (6.7B). Hugging Face IDs `facebook/dinov3-vitl16-pretrain-sat493m`, `facebook/dinov3-vit7b16-pretrain-sat493m`; satellite normalisation mean (0.430, 0.411, 0.296), std (0.213, 0.156, 0.143). Weights require accepting the DINOv3 License (request access form), code and weights under DINOv3 License (not an OSI licence). Only satellite-based head published is canopy height (CHMv2, DPT head) — [DINOv3 GitHub](https://github.com/facebookresearch/dinov3)
- SAT-493M is 493 million 512x512 images sampled from Maxar RGB ortho-rectified imagery at 0.6 m resolution — [HF model card ViT-L/16 SAT](https://huggingface.co/facebook/dinov3-vitl16-pretrain-sat493m)
- A third-party frozen SAT-493M ViT-L/16 with Mask2Former decoder reached 57.58% mIoU on EarthVQA validation, 61.86% IoU for the building class (not comparable to official evaluation); official GEO-Bench segmentation average for this model is 74.5 — [QVLM arXiv 2601.13401](https://arxiv.org/pdf/2601.13401)
- DINOv3 distilled sizes: ViT-S 21M, ViT-B 86M, ViT-L 0.3B — [DINOv3 paper](https://arxiv.org/html/2508.10104)
- PANGAEA: supervised UNet beats most geospatial foundation models at full labels (e.g. HLS Burn Scars 84.51 vs 83.62 Prithvi; AI4SmallFarms 46.34 vs ~27), but GFMs win on MADOS (CROMA 67.55 vs UNet 54.79) and Five Billion Pixels (RemoteCLIP 69.19, Scale-MAE 67.19 vs UNet 60.47). In low-label regimes GFMs gain relative ground (UNet top-2 count falls 6 to 4 to 2 at 100/50/10% labels; Scale-MAE 56.06 vs UNet 46.77 on xView2 at 10% labels). Models pretrained on high-resolution data do better on high-resolution tasks; downsampling input hurt CROMA on Five Billion Pixels from 51.83 to 21.10 — [PANGAEA arXiv 2412.04204](https://arxiv.org/html/2412.04204v2)
- GEO-Bench-2 (19 datasets): DOFA-ViT-B full fine-tune leads the core aggregate over frozen Clay-V1 ViT-B by a margin of 0.019 — [GEO-Bench-2 arXiv 2511.15658](https://arxiv.org/pdf/2511.15658)
- SAM-family: vanilla SAM struggles with small, irregular buildings in satellite imagery and does not beat U-Net; SAM-adapter tuning with limited labels gave large gains in refugee-camp building segmentation (SAM4Refugee) — [SAM4Refugee arXiv 2407.11381](https://arxiv.org/pdf/2407.11381)
- DirectSAM-RS fine-tuned on a building extraction benchmark reached ODS 0.887 (contour extraction, about 5% over prior best) — [arXiv 2410.06194](https://arxiv.org/pdf/2410.06194)
- A CNN-prompted SAM gained 5.47% IoU / 4.81% F1 out of distribution on WHU (snippet, source paper not identified) — see search listing above.
- RSPrompter (WHU building, NWPU VHR-10, SSDD; code at kychen.me/RSPrompter) learns prompts for SAM for instance segmentation; the retrieved abstract gives no numbers — [RSPrompter arXiv 2306.16269](https://arxiv.org/abs/2306.16269)

### Inferences
- Best-evidence plan under 6 GB VRAM: a ViT-L (300M) at 512 px with frozen or LoRA-tuned backbone and a light decoder (UPerNet/DPT/linear) with mixed precision and small batch is feasible but tight; ViT-7B is not. A ViT-S/B distilled DINOv3 (web weights, LVD-1689M) is the fallback, and a ResNet/ConvNeXt U-Net with ImageNet weights is the safest.
- At 0.3 m you may need to downsample to about 0.6 m to match SAT-493M's training GSD; PANGAEA shows mismatch in scale hurts, but I found no experiment for this exact case.
- SAMRS (the SAM-derived remote sensing dataset), SkySense, SatMAE, Prithvi, Clay, RemoteCLIP details were not verified; Prithvi and Clay (background, unverified) are multispectral, coarse-GSD models and unlikely to fit 0.3 m RGB.
- SAM as an annotator (box or point prompts from model detections) to expand/clean labels is plausible, but there is no benchmark for this in my fetched sources.

### Gaps
- No verified weights, licence, or GSD for SkySense, SatMAE, Prithvi, Clay, DOFA, RemoteCLIP, SAMRS.
- No building-specific DINOv3-SAT benchmark (SpaceNet/WHU) was retrieved; Section 8 of the DINOv3 paper could not be read.
- No RSPrompter numbers (Mask AP) retrieved.
- SAM2/SAM3 not researched.

## 5. Typical expected F1/IoU with a few hundred chips

### Takeaway
Direct evidence for "a few hundred noisy chips" is thin. Reference points: clean-label upper bounds on 1 m Massachusetts data are IoU 72.5 / F1 84.2 with 3,065 training patches, and noisy labels cut that sharply. A pixel F1 of 0.62 on noisy OSM is therefore in the plausible range for noisy labels, and instance F1 0.29 is probably depressed by label incompleteness and metric strictness.

### Cited Findings
- Massachusetts (1 m, 3,065 training patches of 256 px): U-Net IoU 72.47, F1 84.20 with clean labels; with 30/50/70% missing buildings F1 falls to 73.84/57.97/37.49, and AIO2 restores it to 83.55/82.74/79.28 — [AIO2](https://arxiv.org/html/2403.01641v1)
- Germany (3 m): clean IoU 48.10; noisy 38.42/27.46/15.42; AIO2 45.52/43.91/39.66 — [AIO2](https://arxiv.org/html/2403.01641v1)
- CrowdAI: state-of-the-art polygon methods about 79 to 84 AP (HiSup about 79.4 back-calculated; RoIPoly 83.6) with about 280k training images (training-set size from general knowledge, unverified) — [RoIPoly](https://arxiv.org/pdf/2407.14920)
- PANGAEA 10%-label regime: xView2 change detection, UNet 46.77 vs Scale-MAE 56.06 — [PANGAEA](https://arxiv.org/html/2412.04204v2)

### Inferences
- With a few hundred chips from one site, expect gains mostly from (a) correct evaluation, (b) pretrained encoder, (c) label correction. A realistic target is pixel F1 around 0.70-0.80 against clean hand-labelled reference polygons; this is my estimate, not a sourced figure.
- Instance F1 at IoU 0.5 stays well below pixel F1 when adjacent buildings merge; boundary-channel plus watershed is the lever.

### Gaps
- No published number for fine-tuning on a few hundred chips with noisy OSM labels at 0.3 m; no Southeast Asia benchmark.
- No verified published Mask R-CNN vs U-Net comparison on a matching dataset (only DeepDamageNet on xView2, qualitative).
