# Bare-earth DTM from DSM-like DEMs and DEM accuracy evaluation against ICESat-2 (Depok/Jakarta, Indonesia)

Research date: 2026-10-16. Claims are tied to sources actually opened or returned by search in this session. Items I could not open or verify are listed under Gaps. Where a number came only from a search-result summary (not the paper itself) I say so.

## Q1. Global/regional bare-earth DEMs: availability, licence, tropical/urban accuracy, Indonesian-specific DTMs

### Takeaway
Three open products are worth testing for Depok/Jakarta: FABDEM (30 m, forest/building-corrected Copernicus, non-commercial licence), GEDTM30 (30 m, CC-BY-4.0, ICESat-2/GEDI-trained, v1.2.0 March 2026) and DeltaDTM (30 m, CC-BY-4.0, only the coastal zone below +10 m, includes an Indonesian validation). FathomDEM is the most accurate in several benchmarks but is gated (request-only, CC BY-NC-SA). No free Indonesian-specific bare-earth DTM or open Jakarta LiDAR dataset was found, and DEMNAS itself is a hybrid DSM with partial mass-point ground correction. None of these products has been validated in Depok specifically; Jakarta is covered only indirectly (DeltaDTM Indonesia test sites, Philippines FABDEM study).

### Cited Findings
**FABDEM**
- FABDEM (Hawker et al. 2022, Environmental Research Letters 17(2) 024016) corrects Copernicus GLO-30 with machine learning; vs Copernicus, mean absolute error falls from 5.15 m to 2.88 m in forests and from 1.61 m to 1.12 m in built-up areas; trained on reference data from 12 countries; coverage 60°S to 80°N, ~30 m — [Bristol research portal / abstract summary](https://research-information.bris.ac.uk/en/publications/a-30m-global-map-of-elevation-with-forests-and-buildings-removed/); also [EGU22 abstract](https://meetingorganizer.copernicus.org/EGU22/EGU22-8994.html) (biggest gains where canopy cover exceeds 50%)
- FABDEM licence: a GEE community catalog entry lists CC BY-NC-SA 4.0 (non-commercial, share-alike); I could not confirm on the Bristol record itself; the latest version is described as V1-2 (DOI 10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn) — [GEE community catalog](https://gee-community-catalog.org/projects/fabdem/); [Bristol dataset page (DOI above; fetch timed out)](https://data.bris.ac.uk/data/dataset/s5hqmjcdj8yo2ibzi9b4ew3sn)
- Philippines (nearest tropical archipelago validation): 17,013 geodetic control points, mean error -1.44 m (FABDEM underestimates terrain), country RMSE 4.74 m (islands 3.03 to 5.80 m), LE90 7.80 m, LE95 9.80 m; best below 100 m elevation and slopes under 2 degrees. Author warns of caution in the archipelago. A corrigendum exists, so numbers may have been revised — [Santillan 2023, ISPRS Archives XLVIII-4/W6-2022](https://isprs-archives.copernicus.org/articles/XLVIII-4-W6-2022/311/2023/)
- Peninsular Malaysia: FABDEM RMSE 1.681 m vs GNSS-derived heights, best of the DEMs tested (search-result summary only) — [Int. J. Geoinformatics 2026](https://ijg.journals.publicknowledgeproject.org/index.php/journal/article/view/4781)
- Global ICESat-2 comparison of five DEMs (Shahabi et al. 2025, summary from search results, study area not stated in snippet): FABDEM RMSE 2.06 m (ME -1.01), AW3D30 3.47, NASADEM 3.59, SRTM 3.90, ASTER 6.58 — [Springer J. Geovisualization & Spatial Analysis](https://link.springer.com/article/10.1007/s41651-025-00245-0) (page not opened; paywall redirect)
- Turkey, ICESat-2 reference: FABDEM best overall (RMSE 2.93 m), in forests 3.98 m and under >70% canopy 4.31 m (search-result summary only) — Advances in Space Research 2025, via the search results of [this query](https://acikerisim.kastamonu.edu.tr/entities/wos/8a5f1dcd-6469-4da2-b33b-7c5f08158ae6/full)
- Multi-DEM benchmark with 65 airborne-LiDAR surveys in flood-prone areas: FABDEM ranked first; land cover is the main driver of vertical error, especially forests — [Int. J. Digital Earth, Dec 2024](https://doaj.org/article/87fa65b8ab4b4f3a888fbe40764fd41a)

**FathomDEM**
- FathomDEM (Uhe et al. 2025, Environmental Research Letters, DOI 10.1088/1748-9326/ada972) uses a hybrid vision transformer to remove trees/buildings from Copernicus DEM; trained on LiDAR DTMs; claims it beats FABDEM and Copernicus and approaches LiDAR in flood modelling — [Fathom paper page](https://www.fathom.global/academic-papers/fathomdem-research-paper/)
- Distribution: Zenodo v1.0 (Eurasia+Africa, east of 30°W, includes Indonesia), 1°x1° GeoTIFF, vertical datum EGM08, CC BY-NC-SA 4.0; files are restricted: login + access request, academic email, sanctions declaration; derivatives must be share-alike — [Zenodo 14511570](https://zenodo.org/records/14511570)
- Independent LiDAR benchmark (Guth et al. 2025, Remote Sensing 17(23) 3919; 1,510 ~10x10 km tiles in US and western Europe, six 1-arc-second DEMs): FathomDEM best against the lidar reference but restrictively licensed; Copernicus DEM best freely licensed option; FABDEM and GEDTM v1.2 also evaluated — [MDPI](https://www.mdpi.com/2072-4292/17/23/3919) and [Fathom summary (vendor)](https://www.fathom.global/product/fathomdem-global-terrain-data/); search summary only, full text not retrieved
- Site comparison inside the GEDTM30 paper: FathomDEM had lowest RMSE of GEDTM30/FABDEM/MERIT at Trentino (5.45 m), Chincoteague (0.85 m), Vestfold (2.28 m); all three sites are temperate — [GEDTM30, PeerJ 2025 (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/)

**GEDTM30 / OpenLandMap**
- GEDTM30 (Ho et al. 2025, PeerJ): global Random Forest (+ 1,019 local 5°x5° models) trained on >30 billion GEDI + ICESat-2 ATL08 points; covariates include GLO-30, AW3D30, tree cover, canopy height models, WSF2019, GHS-BUILT-H, Landsat indices — [PMC12296579](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/)
- Licence CC-BY-4.0; Cloud-Optimized GeoTIFFs on Zenodo (doi 10.5281/zenodo.14900180) and OpenLandMap STAC (stac.openlandmap.org); code and samples at github.com/openlandmap/GEDTM30; authors deliberately did not mix FABDEM/FathomDEM into outputs because of their licences — [PMC12296579](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/)
- Zenodo v1.2.0 (6 March 2026) is flagged "for testing purposes only, provided as is" — [Zenodo 18887460](https://zenodo.org/records/18887460)
- Accuracy vs Copernicus: RMSE reduced ~25.4% in built-up, ~10.0% at tree cover 10-50%, ~27.3% at tree cover >50%. Table 3: tree cover >50%: GEDTM30 RMSE 3.73 m vs GLO30 5.14 m (mean error -2.94 m for GLO30); built-up: 3.03 m vs 4.06 m (GEDTM30 ME -1.92 m, i.e. still biased) — [PMC12296579](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/)
- Stable-class RMSE (Table 5): tree cover GEDTM30 6.72 / FABDEM 6.82 / FathomDEM 4.95 / MERIT 10.76 m; built-up 2.75 / 2.74 / 1.95 / 4.76 m — [PMC12296579](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/)
- The paper states LiDAR reference DTMs under-represent Asia and Africa and uncertainty is highest in dense forests (Amazon, Congo); no tropical-specific metrics reported in the portion I read (first ~100k of 182k characters) — [PMC12296579](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/)

**DeltaDTM (coastal, free)**
- Scientific Data 2024; covers coastal zone below +10 m above MSL, 7,073 1°x1° tiles at ~30 m; built from Copernicus DEM corrected with ICESat-2 ATL08 (bias per quarter tile), ICESat-2/GEDI terrain heights inserted, non-terrain cells removed with a modified progressive morphological filter, gaps filled by adjusted IDW — [DeltaDTM, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10917791/)
- Accuracy vs airborne LiDAR (9 areas): MAE 0.45 m, RMSE 0.74 m, 91% within 1 m; Indonesia (East Sumatra + Central Kalimantan): bias 0.04 m, MAE 0.50 m, RMSE 0.67 m, 89% within 1 m; Central Kalimantan (dense forest/peat) is the hardest; FABDEM in the same comparison: MAE 1.05 m, RMSE 1.96 m (the extraction flagged table ambiguity — verify in Supplementary Table 1); built-up MAE ~0.61 m vs FABDEM 0.69 m; tree cover MAE ~0.56 m local and 1.21 m in global ICESat-2 cross-validation — [PMC10917791](https://pmc.ncbi.nlm.nih.gov/articles/PMC10917791/)
- Licence CC BY 4.0 (data), code DeltaDTM.jl GPL-3.0; also a GEE collection; dataset on 4TU (v1.1 quotes MAE 0.43 m, not 0.45 m) — [PMC10917791](https://pmc.ncbi.nlm.nih.gov/articles/PMC10917791/); [4TU](https://data.4tu.nl/articles/dataset/_/21997565)
- Limitation: highway embankments sometimes removed (underestimation); +10 m cut-off may be unsuitable for drainage analysis — [PMC10917791](https://pmc.ncbi.nlm.nih.gov/articles/PMC10917791/). Jakarta's coast is within this zone, but Depok (inland, ~50-100 m) is largely outside it.

**Spaceborne-lidar DTM and radar bias evidence**
- Pracna et al. 2025 (Science of Remote Sensing): interpolated ICESat-2+GEDI 90 m terrain models gave RMSE 3.7 m vs 11.2 m for Copernicus (GLO-90) in forests where cells had enough accurate observations (4-6 observations < 5 m); ICESat-2 more accurate than GEDI for terrain; reference LiDAR in Switzerland, New Zealand, California (not tropical) — [search summary of Pracna et al.](https://earthbridge.eu/towards-90-m-resolution-digital-terrain-models-from-spaceborne-lidar-balancing-accuracy-and-sampling-intensity/) 
- Simard et al. 2024 (JGR Biogeosciences 129, e2023JG007672) is the global evaluation of SRTM, NASADEM and GLO-30 against ICESat; Eos summary: radar DEMs remain biased over dense forests — [Eos](https://eos.org/editor-highlights/improvements-to-measuring-the-ups-and-downs-of-the-landscape); [AGU paper (403 on fetch)](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023JG007672)

**Indonesia-specific**
- DEMNAS is explicitly built from DSMs (IFSAR 5 m, TerraSAR-X 5 m, ALOS PALSAR 11.25 m) with trusted stereo-plotted mass points; the DSM minus mass-point difference is used to produce an adjusted surface; datum EGM2008; GMT "surface" interpolation tension 0.32; grid 0.27" (~8.25 m). The author states "Elevation data adalah DSM" and cites no independent check that the correction yields terrain — [Susetyo blog, concept of DEMNAS](http://danangsusetyo.blogspot.com/2020/03/konsep-pembentukan-dem-nasional-demnas.html); [BIG DEMNAS page](https://big.go.id/en/content/produk/demnas) (specs only, no accuracy, no licence stated; points to tides.big.go.id/DEMNAS)
- Jakarta tidal-flood study (abstract on Garuda author pages only): airborne LiDAR DEM used as the baseline; DEMNAS-based model matched the LiDAR-based flooded area at 97%, SRTM/TanDEM-X(60 m)/AW3D at 5-48%; EGM2008 vs HAT datum choice changed inundation area by >70% — [Garuda author page](https://garuda.kemdikbud.go.id/author/view/7112784). This confirms a Jakarta airborne-LiDAR DEM exists in research use, but I found no open download.
- No FABDEM, FathomDEM, GEDTM30 or Copernicus DEM validation specifically in Java/Sumatra/Kalimantan/Jakarta was found (see Gaps).

### Inferences
- For Depok (inland, vegetated + dense urban, low relief) the most relevant open candidates are FABDEM (licence limits redistribution/commercial use but fine for teaching/research), GEDTM30 (cleanly licensed, version flagged "testing"), and FathomDEM (request required). DeltaDTM is useful only for the Jakarta coastal strip, and as a method template (ATL08 bias correction + PMF).
- Because FABDEM was trained largely on temperate LiDAR (12 countries) and the Philippines study shows a negative bias (-1.44 m) and RMSE of 3-6 m, a tropical-urban residual bias of order metres should be expected; it must be measured locally, not assumed.
- GEDTM30 residual built-up bias (-1.9 m mean error) and "stable built-up RMSE ~2.7 m" are similar to FABDEM, so none of the global products will reach the 0.85 m levelling accuracy of the replicated paper in dense Depok urban areas without local correction.

### Gaps
- No Indonesia/Jakarta/Depok validation of FABDEM, FathomDEM or GEDTM30 against ICESat-2 or GNSS was found.
- FABDEM licence text on the Bristol record not verified (fetch timed out); only the GEE catalog statement was seen.
- Open Jakarta/Depok airborne-LiDAR DTM or building-height dataset: none found; likely requires a request to BIG / Pemprov DKI (unverified).
- Simard 2024 and Guth 2025 per-DEM numbers not retrieved (paywall/403 or not opened).
- CoastalDEM, MERIT DEM, NASADEM, TanDEM-X 30 m EDEM: not individually researched here beyond appearances above; CoastalDEM is commercial-ish (Climate Central) and TanDEM-X EDEM requires DLR proposal access (from my background knowledge, not verified in this session).

---

## Q2. Tools and methods to convert DSM to DTM (raster morphological filters, ML bias removal, canopy-height-based correction)

### Takeaway
There is no maintained, plug-and-play deep-learning package for GLO-30/DEMNAS canopy removal; the practical open route is (a) an ML residual-correction model trained on ICESat-2/GEDI terrain heights with canopy height and built-up covariates (the GEDTM30/DeltaDTM recipe, which you can reproduce locally), plus (b) classical raster filters (PMF/dsm2dtm, WhiteboxTools, SAGA/PDAL CSF) as baselines. Raster morphological filters work for isolated buildings but not for large continuous canopy or urban blocks in 8-30 m grids.

### Cited Findings
- dsm2dtm (MIT licence): optimized Progressive Morphological Filter + surface refinement; defaults radius 40 m, slope auto-estimated and capped at 0.1; objects larger than 2x radius typically not removed; artifacts at building borders; clamps DTM below DSM; fills nodata gaps within 100 m — [GitHub seedlit/DSM2DTM](https://github.com/seedlit/DSM2DTM); tuned for very high resolution inputs (resamples <0.5 m data), so applicability to 8-30 m DEMs is untested
- GEMAUT (IGN, ISPRS Archives XLIX-B3-2026): open-source DTM generation from satellite DSMs; ground points via SAGA slope-based filter or PDAL Cloth Simulation Filter, then energy-based surface optimisation with curvature regularisation; pixel-level precision mask; stated as released on GitHub (URL not given in the abstract; no accuracy numbers in what I read) — [ISPRS Archives](https://isprs-archives.copernicus.org/articles/XLIX-B3-2026/19/2026/)
- DSM2DTM (DLR, ISPRS Annals X-1/W1-2023): end-to-end deep learning DSM to DTM; Residual U-Net TU Delft thesis trained on resampled AHN4 DSM/DTM pairs and tested on Copernicus DEM, reported to outperform conventional filters — [ISPRS Annals](https://isprs-annals.copernicus.org/articles/X-1-W1-2023/925/2023/); [TU Delft repository](https://repository.tudelft.nl/file/File_cc41f817-bb65-46df-9dfb-44783358064a); code availability not verified
- Preprint (2024) on ML removal of vegetation bias from Copernicus DEM using GEDI + multispectral data: average bias reduced from 9.6 m to 1.5 m over South America (search-result summary; the preprint page returned 403) — [preprints.org 202404.1305](https://preprints.org/manuscript/202404.1305/v1)
- The DeltaDTM pipeline is a documented recipe: remove low outliers, per-tile ICESat-2 ATL08 bias correction, insert lidar terrain heights, classify non-terrain with a modified PMF, IDW gap fill, add back roughness; code DeltaDTM.jl (GPL-3.0, Julia) — [PMC10917791](https://pmc.ncbi.nlm.nih.gov/articles/PMC10917791/)
- GEDTM30 recipe: Random Forest on lidar terrain heights using covariates GLO-30, AW3D30, tree cover, canopy height models, WSF2019, GHS-BUILT-H, Landsat indices; code and training samples at github.com/openlandmap/GEDTM30 — [PMC12296579](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/)
- FOSS4G 2026 talk abstract: open-source workflow fusing Copernicus DEM, imagery and ICESat-2 ATL08 into bare-earth DTMs; ATL08 may cover only 0.1-0.2% of dense-forest mountain areas, limiting sparse-lidar fusion (search-result summary only) — [FOSS4G 2026 talk](https://talks.osgeo.org/foss4g-2026/talk/ZFRGQZ.ics)
- Meta/WRI 1 m canopy height: code and model weights Apache-2.0; weights at `s3://dataforgood-fb-data/forests/v1/models/` (no-sign-request); trained on US forests, MAE ~2.8 m (Meta claim) and reported aerial-test MAE 3.1-3.3 m for satellite-only models; the page offers no tropical evaluation; independent Italian Alps study found maximum canopy height substantially underestimated — [GitHub facebookresearch/HighResCanopyHeight](https://github.com/facebookresearch/HighResCanopyHeight); [Alps evaluation (search listing)](https://bia.unibz.it/esploro/outputs/journalArticle/Evaluating-the-reliability-of-the-1-meter/991007384663701241); [Mongabay](https://news.mongabay.com/2024/04/ai-model-maps-global-tree-canopy-heights-in-hi-res-with-carbon-counting-in-mind/)
- Classical LiDAR ground filters tested in Indonesia (airborne LiDAR DSM to DTM; cloth simulation, SMRF, Mongus): Mongus most accurate across six terrain types, RMSEz 0.003-0.664 m — [Jurnal Geodesi Undip](https://ejournal3.undip.ac.id/index.php/geodesi/article/view/25158); note these are for point clouds at sub-metre spacing, not satellite DEMs.
- Canopy-height-based simple correction (DEM minus canopy height) is the idea behind several products (canopy height models are covariates in GEDTM30), but I found no validated standalone recipe or accuracy number for DEMNAS or GLO-30 in Indonesia.

### Inferences
- Subtracting a canopy height raster (Meta 1 m, ETH 10 m, GEDI-derived) from a radar DEM overcorrects: radar penetrates canopy partially (C-/X-band partial, so GLO-30 sits somewhere within the canopy), and the penetration fraction varies; the correct approach is regression: terrain_ref = f(DEM, canopy height, tree cover, built-up height/fraction, slope), trained on ICESat-2/GEDI points. This is what GEDTM30/FABDEM do globally; doing it locally with Depok-region ATL08 can pick up local bias.
- A practical experiment: train a gradient-boosting / RF residual model (target = ATL08 h_te_best_fit minus DEM) with covariates (canopy height, tree cover, WSF/GHS built-up, slope, DEM itself), cross-validated by held-out ground tracks (spatial blocking), then compare to FABDEM/GEDTM30. The training sample will be small in Depok; so train on the Jabodetabek + West Java extent, and evaluate on held-out tracks.
- Because ICESat-2 sampling in dense forest is tiny (0.1-0.2%), local training should draw on GEDI too (not just ATL08), with proper quality filtering.
- Morphological filters (dsm2dtm, WhiteboxTools) should be treated as a baseline; at 8 m/30 m a "building" is 1-3 pixels, and large dense urban blocks exceed the filter's scale. WhiteboxTools' RemoveOffTerrainObjects exists (from background knowledge; I did not open its documentation in this session).

### Gaps
- No documentation fetched for WhiteboxTools RemoveOffTerrainObjects, PDAL SMRF/CSF raster usage, or the DSM2DTM (DLR) code repo; no accuracy numbers for any of these on 8-30 m radar DEMs in the tropics.
- GEMAUT GitHub URL and accuracy not found.
- No evidence of a published, validated canopy-height-subtraction recipe for DEMNAS or GLO-30.
- ETH (Lang et al.) 10 m canopy height map and GLAD (Potapov) forest height: no search result; licences and tropical accuracy not researched.
- Meta/WRI canopy-height data licence (separate from code licence) not confirmed.

---

## Q3. ICESat-2/GEDI evaluation best practices and open tools (filters, workflows, robust metrics, co-registration)

### Takeaway
ATL08 terrain heights are a good but not perfect reference: they are biased high under dense canopy, low on steep slopes, and strongly influenced by uncertainty, day/night, cloud and snow; use uncertainty-based filtering plus stratified, robust (NMAD, median, LE90) reporting and co-register the DEM before computing stats. Open tooling exists for each step (SlideRule, icepyx, earthaccess, xdem, IVERT). demcompare is no longer maintained.

### Cited Findings
**ATL08 error behaviour and filters**
- ATL08 terrain height is underestimated on steep slopes / large incidence angle and overestimated where terrain is covered by dense canopy — [Purdue TGRS evaluation of ATL08 terrain product](https://engineering.purdue.edu/~jshan/publications/2021/TGRS%20final%20paper%20print%20-%20Comprehensive_Evaluation_of_the_ICESat-2_ATL08_Terrain_Product.pdf)
- Uncertainty-based filtering improved ATL08 strong-beam accuracy by 43.91% and weak beams by 74.05% when used as height reference for ASTER/SRTM/TanDEM-X in vegetated mountains; strong beams agreed with LiDAR DTM points within 0.6 m — [Farsheh et al., ATL08 as height reference](https://www.bu.edu.eg/staff/mohamedfarsheh3-publications/49233)
- Turkey study (2026, rugged forested terrain, vs GNSS): h_te_best_fit gave lowest error among terrain metrics (RMSE 3.37 m, bias -0.42 m); slope degrades accuracy (pulse broadening); (search summary) — [Kastamonu publication listing](https://unis.kastamonu.edu.tr/yayin-detay/2_DJOoE34_4/investigating-icesat-2-atl08-terrain-height-estimation-performance-and-affecting-factors-the-impact-of-land-cover-slope-and-acquisition-time)
- European mountains: night acquisitions with <=1 cloud layer gave forest terrain RMSE 1.73 m vs 3.22 m for day with multiple cloud layers; cloud_flag_atm outperformed the older msw_flag (search summary) — [sciforum 20911](https://sciforum.net/paper/view/20911)
- Tropical rainforest, Ketapang, West Kalimantan: ATL08 canopy-height error grew with slope (5.7, 6.6, 9.3 m for 0-10, 10-20, 20-30 degrees); too few ground photons under high canopy cover for ATL08 to fit terrain; authors conclude ATL08 hard to use in dense tropical rainforest for forest height (canopy, not terrain, error) — [Journal of Remote Sensing (ygxb.ac.cn)](https://www.ygxb.ac.cn/de/article/doi/10.11834/jrs.20219449/)
- icesat2DB default filters per 100 m segment: valid h_te_uncertainty / h_te_best_fit / h_te_median (below fill value, > -999), valid h_canopy, urban_flag == 0, segment_watermask == 0; optional query-time filters: night_flag, layer_flag, segment_landcover, n_ca_photons, n_te_photons (no thresholds provided; no snr guidance) — [icesat2db docs](https://icesat2db.readthedocs.io/en/stable/user/fundamentals.filters.html)
- ATL08 Release 007 (June 2025) added a terrain and canopy quality score, single-surface search for ground finding and ground-finding correction based on a-priori DEM bias; check the v007 user guide/ATBD/known-issues for flag semantics and whether the a-priori DEM influences ground finding (relevant: it may leak the reference DEM into "independent" ATL08 heights) — [NSIDC ATL08](https://nsidc.org/data/ATL08); [Known issues v007](https://nsidc.org/sites/default/files/documents/technical-reference/icesat2_atl08_known_issues_v007.pdf); [User guide v007](https://nsidc.org/sites/default/files/documents/user-guide/atl08-v007-userguide.pdf) (not opened)
- Spaceborne lidar terrain: ICESat-2 consistently outperformed GEDI for terrain elevation across slope, land cover, beam strength and day/night — [Pracna et al. summary](https://earthbridge.eu/towards-90-m-resolution-digital-terrain-models-from-spaceborne-lidar-balancing-accuracy-and-sampling-intensity/)
- ICESat-2 reference with global DEMs on a low-gradient coastal plain, with HAND flood-model cascade (Remote Sensing 18(10) 1511, 2026): title found; page returned 403, details unverified — [MDPI](https://doi.org/10.3390/rs18101511)
- Eastern China coastal ICESat-2 evaluation (2026): FABDEM RMSE 1.24 m / NMAD 0.49 m; GLO-30 RMSE 1.56 m / NMAD 0.65 m (search summary) — [MDPI Remote Sensing 18(13) 2064](https://doi.org/10.3390/rs18132064) (not opened)

**GEDI**
- gediDB default filters ("community-recommended"): quality_flag == 1, sensitivity_a0 0.5-1.0, sensitivity_a2 0.7-1.0, degrade_flag excluded, |elev_lowestmode minus DEM| within 150 m; elev_lowestmode is relative to the ellipsoid; the DEM field is SRTM (TanDEM-X separate) — [gediDB docs](https://gedidb.readthedocs.io/en/stable/user/fundamentals.filters.html); [GEDI L2A data dictionary](https://edcftp.cr.usgs.gov/project/lpdaac/GEDI_L2/gedi_l2a_product_data_dictionary.html)

**Workflow tools**
- SlideRule (ICESat-2-SlideRule/sliderule-python): ATL03-based on-demand processing; photon classification can use ATL03 confidence, ATL08 classes or experimental YAPC; example notebooks incl. single-track demo — [SlideRule notebooks (nbviewer)](https://nbviewer.jupyter.org/github/ICESat2-SlideRule/sliderule-python/blob/main/examples/single_track_demo.ipynb); [coincident wrapper source (ground = "atl08_ground")](https://coincident.readthedocs.io/en/v0.5/_modules/coincident/io/sliderule.html). The ATL03x/phoreal API pages returned 404/503, so these were not read.
- IVERT (ICESat-2 Validation of Elevations Reporting Tool, PyPI `ivert`): compares DEMs with ICESat-2 photons and outputs bias, RMSE, NMAD and per-cell error maps; depends on the continuous-dems GitHub organization (search summary; PyPI page failed to load, so filters/scope unverified) — [PyPI ivert](https://pypi.org/project/ivert/)
- icepyx: open-source Python library to query, download and preprocess ICESat-2 data — [icepyx PyPI](https://pypi.org/project/icepyx)
- xDEM (GlacioHack, Apache-2.0): DEM and elevation point-cloud (EPC) classes, vertical CRS detection and transformation, coregistration pipelines (ICP, Nuth & Kaab, LZD, CPD), bias correction, gap-filling, uncertainty analysis (heteroscedasticity, spatial correlation, error propagation); docs "Need for robust estimators"; latest docs version 0.2; ICESat/EGM2008 not mentioned on the pages I read — [xDEM GitHub](https://github.com/GlacioHack/xdem); [xDEM docs](https://xdem.readthedocs.io/en/stable/)
- demcompare (CNES): Nuth & Kaab coregistration, stats classified by slope (and user-supplied classes), but the README states "not maintained anymore. You can use xDEM instead" — [GitHub CNES/demcompare](https://github.com/CNES/demcompare)

**DEMNAS/Indonesia accuracy numbers (reference-data-dependent)**
- BIG/portal: RMSE 2.79 m, bias -0.13 m (reference unexplained); Susetyo et al. 2018: RMSE 2.237 m vs GPS in northern Sumatra (3.679 m at Indonesian 90% vertical accuracy standard in the ISPRS 2018 paper) — [Susetyo blog](http://danangsusetyo.blogspot.com/2020/03/konsep-pembentukan-dem-nasional-demnas.html); [ISPRS Archives XLII-4/609/2018](https://isprs-archives.copernicus.org/articles/XLII-4/609/2018/)
- Independent GPS-based test (Geodesy and Cartography 2023): DEMNAS RMSE 4.968 m and LE90 8.172 m, errors roughly uniform across elevation; SRTM-1 LE90 5.529 m, ASTER GDEM 13.632 m (the "8.172 m" and "5.529 m" are LE90 in this paper, not RMSE) — [Vilnius Tech](https://mla.vilniustech.lt/index.php/GAC/article/view/18168)
- Karimunjawa small islands: DEMNAS RMSE 6.33 m, LE90 10.45 m (search summary) — [ResearchGate](https://www.researchgate.net/publication/375484470_Assessing_the_accuracy_of_open-source_digital_elevation_models_for_the_geomorphological_analysis_of_very_small_islands_of_Indonesia)
- Namibia ICESat-2 validation: GLO-30 RMSE 1.1 m (arid, not transferable) — via search result; Perlis, Malaysia: SRTM/NASADEM/CopDEM tested against 38 GNSS benchmarks and 1,177 ICESat-2 points (results not retrieved) — [UiTM repository](https://ir.uitm.edu.my/id/eprint/145989/)

### Inferences
- The user's pattern (RMSE 7.6 m but NMAD 2.4-3.1 m, 20% within 0.85 m, median canopy 9.7 m, 15 open-ground points) is the signature of canopy/building contamination in both reference and DEM, plus a positive bias; the RMSE is dominated by a heavy tail, so report median error, NMAD, percentiles and LE90 alongside RMSE.
- The 0.85 m criterion from levelling is the wrong benchmark for ATL08-based evaluation: ATL08 h_te_best_fit uncertainty itself is typically metres under canopy and the footprint is ~11 m wide along a 100 m segment; DEMNAS's official RMSE is 2.8 m, and independent LE90 8-10 m. The replicated 0.85 m result is a different quantity (GNSS/levelling benchmarks in open ground), so comparisons need matching reference quality.
- Stratify before concluding: (1) open ground only (canopy < ~2 m, `h_canopy` small; urban_flag to separate built-up vs non-urban; landcover via ESA WorldCover); (2) dense canopy strata; (3) slope bins; (4) night/day and strong/weak beam; (5) per `h_te_uncertainty` thresholds (e.g. < 1, < 2, < 5 m — thresholds in studies vary; choose and report sensitivity).
- Co-registration: run xDEM's Nuth and Kaab on stable (flat, open-ground) points, but with only 15 open-ground ATL08 points the shift estimate is not reliable; instead estimate a vertical bias with robust median on open-ground points only and do not apply coregistration to forest/urban strata.
- Datum caution: verify ATL08 ellipsoid to EGM2008 conversion (xDEM vertical CRS transforms or pyproj grids), and that the DEM is truly referenced to EGM2008 (DEMNAS: yes per BIG; GLO-30: EGM2008; FABDEM/FathomDEM: EGM2008). The Jakarta tidal-flood study shows datum choice (EGM2008 vs HAT) is material in coastal Jakarta.
- Independence: ATL08 v007 uses an a-priori DEM in ground finding; if that DEM correlates with your test DEM, errors may be understated. Prefer ATL03-level reclassification (SlideRule) or the ATL08 `h_te_best_fit` with filters, and cross-check with GEDI L2A `elev_lowestmode` (quality_flag==1, sensitivity thresholds).
- Recommended minimal evaluation recipe (all Python): earthaccess/icepyx or SlideRule to fetch ATL08/ATL03 with night_flag, h_te_uncertainty, n_te_photons, cloud flags; GEDI L2A with the gediDB-style filters; sample each DEM (DEMNAS, GLO-30, FABDEM, GEDTM30, FathomDEM if approved) at the same points; compute median, NMAD, LE90, RMSE, % within thresholds per stratum; plot error vs canopy height and vs built-up fraction; bootstrap CIs. NMAD = 1.4826 x median(|e - median(e)|) is the standard definition used in IVERT/xDEM literature (definition from background knowledge; xDEM's docs page I read does not name it explicitly).

### Gaps
- No peer-reviewed ATL08 terrain-height accuracy figures specific to dense urban areas (building contamination) in Southeast Asia were found.
- Specific recommended thresholds for n_te_photons, snr, night_flag, terrain_flg (ATL08 "terrain_flg"/"terrain slope") were not found in sources; NSIDC ATBD/user guide v007 were not opened.
- SlideRule ATL03x/phoreal/atl08 documentation pages returned 404/503; I could not verify current API names.
- IVERT scope (US coastal vs global) and filters not verified.
- xDEM docs: no verification of ICESat-2 helpers, an NMAD function name, or EGM2008 handling.
- Simard 2024 numbers and the 2026 MDPI papers (18/10/1511, 18/13/2064) not read (403/not opened).
- ETH and GLAD canopy height and WorldCover licensing not researched.

---

## Q4. Reported accuracy of DEMNAS, Copernicus GLO-30 and FABDEM vs ICESat-2/GNSS in Indonesia or similar tropical settings (summary table of what exists)

### Takeaway
No study found compares DEMNAS, GLO-30 and FABDEM together over Indonesian land with ICESat-2. Reported numbers are GNSS/GPS-based for DEMNAS (RMSE 2.2-6.3 m, LE90 8-10 m), GNSS-based for FABDEM in Malaysia/Philippines (RMSE 1.7 and 4.7 m), and ICESat-2-based for FABDEM/GLO-30 in other regions (RMSE 1.2-2.9 m). Your RMSE of ~7.6 m with NMAD 2.4-3.1 m in a vegetated urban area is not inconsistent with these.

### Cited Findings
- DEMNAS: RMSE 2.79 m, bias -0.13 m (BIG portal figure); 2.237 m (N. Sumatra GPS); 4.968 m RMSE / 8.172 m LE90 (independent GPS test); 6.33 m RMSE / 10.45 m LE90 (Karimunjawa) — sources listed in Q3.
- FABDEM: Philippines RMSE 4.74 m (bias -1.44 m, LE90 7.80 m); Peninsular Malaysia 1.681 m; India sites 5.96 m (Dehradun), 2.77 m (Jaipur), 4.29 m (Kendrapara) (search summary) — [Santillan 2023](https://isprs-archives.copernicus.org/articles/XLVIII-4-W6-2022/311/2023/); [IJG Malaysia](https://ijg.journals.publicknowledgeproject.org/index.php/journal/article/view/4781)
- FABDEM vs GLO-30 with ICESat-2: coastal eastern China 1.24 m vs 1.56 m RMSE (NMAD 0.49 vs 0.65 m); Turkey FABDEM forest RMSE 3.98 m — see Q1/Q3 citations
- GLO-30 vs ICESat-2: Namibia 1.1 m RMSE (arid, low-canopy) — search result summary
- Jakarta tidal-flood: DEMNAS flood extent matches LiDAR at 97%, global open DEMs 5-48% — [Garuda](https://garuda.kemdikbud.go.id/author/view/7112784)

### Inferences
- DEMNAS RMSE depends heavily on reference and region (2.2 to 6.3 m); its official 2.79 m figure is not reproducible from the sources I could open. Treat ~3-6 m RMSE and LE90 8-10 m as the credible envelope for vegetated areas.
- A gain from switching DEMNAS to FABDEM or GEDTM30 over Depok's tree-covered areas is plausible (several metres of canopy bias removed; the global papers report ~25-27% RMSE reduction vs GLO-30), but expect the improvement to be concentrated in tree cover >50%, and expect a possible negative bias of about 1-2 m in built-up/tropical settings.

### Gaps
- No ICESat-2-based DEM accuracy numbers for Java/Jakarta/Depok for any product.
- DEMNAS vs ICESat-2 in any region not found.
- Perlis, Malaysia (SRTM/NASADEM/CopDEM vs 1,177 ICESat-2 points) full results not retrieved.
