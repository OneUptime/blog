# Validation Summary: How to Optimize Ceph for Lowest Cost Per TB

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (BlueStore, Erasure Coding, compression)
- Rook (Ceph operator for Kubernetes)
- SATA HDDs / NVMe SSDs (hardware selection)
- Python 3 (inline CLI scripting)

## Sources Consulted
- Ceph Erasure Code documentation (https://docs.ceph.com/en/reef/rados/operations/erasure-code/)
- Ceph BlueStore Configuration Reference (https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/)
- Ceph Pool Operations documentation (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph Monitoring documentation for `ceph df detail` JSON output structure (https://docs.ceph.com/en/reef/rados/operations/monitoring/)

## Issues Found

### 1. Incorrect JSON field name in Python script (`max_bytes` -> `quota_bytes`)
- **What was wrong:** The Python script parsing `ceph df detail --format json` output used `pool['stats'].get('max_bytes', 0)` to read pool quotas. In the JSON output of `ceph df detail`, the correct field name is `quota_bytes`, not `max_bytes`. The `max_bytes` field name appears in different commands (`ceph osd dump`, `ceph osd pool ls detail`) but not in `ceph df detail`.
- **What was changed:** Replaced `max_bytes` with `quota_bytes` on the relevant line.
- **Why:** The script would never find any pools with quotas because it was reading a non-existent field, causing the `.get()` to always return 0 and the `if quota > 0` check to always be false.

### 2. Misleading Prometheus reference
- **What was wrong:** The "Eliminate Idle Capacity with Tiering Awareness" section intro stated "Use Prometheus to identify over-provisioned pools" but the code example uses `ceph df detail` piped to a Python one-liner -- no Prometheus involved.
- **What was changed:** Changed "Use Prometheus to identify over-provisioned pools:" to "Use the Ceph CLI to identify over-provisioned pools:" to accurately describe the code that follows.
- **Why:** The original text was misleading about the tool being used.

## Review Notes
- The `bluestore_cache_size` config key queried via `ceph config get osd bluestore_cache_size` will return 0 by default (auto-tuned). The effective cache sizes are governed by `bluestore_cache_size_hdd` (1 GB default) and `bluestore_cache_size_ssd` (3 GB default). In modern Ceph (Nautilus+), `osd_memory_target` (4 GB default) is the preferred way to manage OSD memory. The blog's claim of "1 GB per OSD" is correct for the HDD-specific default, but readers should be aware that actual OSD memory usage is typically higher due to `osd_memory_target`.
- The CPU core recommendation of "1 core per 2-3 HDDs" is on the lean side; many Ceph sizing guides recommend 1 core per HDD OSD as a baseline. However, for the cold-data/cost-optimized use case this post targets, the lower ratio is defensible.
- All arithmetic in the cost calculations, EC overhead ratios, and drive pricing examples is correct.
- The compression commands use correct syntax and valid parameter values (`aggressive` mode, `zstd` algorithm).
