# Validation Summary: How to Set Full and Near-Full Thresholds in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster — full/nearfull/backfillfull OSD thresholds)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl, ConfigMap)
- Prometheus (alerting rules for capacity monitoring)
- RADOS (object listing and inspection)

## Sources Consulted
- Ceph Monitor Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph Troubleshooting OSDs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph Monitoring a Cluster (ceph osd df output format): https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub Issue #14263 (OSD full settings in CephCluster CR): https://github.com/rook/rook/issues/14263
- Red Hat OpenShift Data Foundation — Setting Ceph OSD full thresholds: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/4.17/html/managing_and_allocating_storage_resources/setting-ceph-osd-full-thresholds__rhodf

## Issues Found

### 1. Incorrect Ceph config key names in Step 1
**What was wrong:** The blog used `osd_nearfull_ratio`, `osd_full_ratio`, and `osd_backfillfull_ratio` as config key names with `ceph config get global`. These are not valid Ceph config option names.
**What was changed:** Corrected to `mon_osd_nearfull_ratio`, `mon_osd_full_ratio`, and `mon_osd_backfillfull_ratio`, which are the actual monitor-level config options.
**Why:** These threshold defaults are owned by the Ceph monitors and the config keys are prefixed with `mon_`. Using the wrong key names would return empty or error results.

### 2. Incorrect Rook CephCluster YAML in Step 3
**What was wrong:** The blog placed threshold settings under `spec.storage.config` in a CephCluster CR with keys like `osd_nearfull_ratio`. The `spec.storage.config` section is for OSD-level storage configuration (e.g., `metadataDevice`, `osdsPerDevice`), not cluster-wide capacity thresholds. These settings would be silently ignored.
**What was changed:** Replaced the CephCluster CR YAML with a `rook-config-override` ConfigMap using the correct `mon_osd_*` config keys under `[global]`. Added a note clarifying this applies at cluster initialization and that the toolbox commands from Step 2 should be used for existing clusters.
**Why:** The ConfigMap override is the documented Rook mechanism for passing custom Ceph configuration. The OSD map threshold values set via `ceph osd set-*-ratio` (Step 2) are the authoritative runtime values for existing clusters.

### 3. Wrong sort column in Step 4
**What was wrong:** `sort -k7` was used to sort `ceph osd df` output by %USE, but column 7 in the shown output format is AVAIL, not %USE.
**What was changed:** Corrected to `sort -k8` to match the %USE column in the 10-column output format shown in the post.
**Why:** Using `-k7` would sort by available space instead of utilization percentage, producing misleading results.

### 4. Wrong awk column in Step 6
**What was wrong:** `awk '$9 > 85'` was used to filter OSDs by %USE, but column 9 in the shown output format is VAR, not %USE.
**What was changed:** Corrected to `awk '$8 > 85'` to match the %USE column.
**Why:** Using `$9` would filter on the variance column, which would never exceed 85 in normal operation, so the command would return no results when OSDs are actually full.

## Review Notes
- The `ceph osd df` output format shown in the blog uses a 10-column layout that corresponds to older Ceph versions. Modern Ceph releases (Quincy 17.x, Reef 18.x) output a 14-column layout with additional columns (RAW USE, DATA, OMAP, META, STATUS). If the blog targets modern Ceph, the example output and column numbers would need further updating. The fixes applied are consistent with the output format shown in the post.
- The `ceph osd set-*-ratio` commands in Step 2 are correct and are the recommended way to change thresholds on a running cluster. These modify OSD map values directly.
- The Prometheus alert metric names (`ceph_osd_stat_bytes_used`, `ceph_osd_stat_bytes`) are correct for the Ceph MGR Prometheus module exporter.
- The default threshold values listed (nearfull 0.85, backfillfull 0.90, full 0.95) are accurate.
- The `ceph df --format json | jq -r '.stats.total_used_raw_ratio'` JSON path in Step 7 is correct for recent Ceph versions.
