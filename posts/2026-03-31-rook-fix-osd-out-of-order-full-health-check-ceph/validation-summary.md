# Validation Summary: How to Fix OSD_OUT_OF_ORDER_FULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- OSD fullness thresholds (nearfull, backfillfull, full ratios)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph Health Checks Documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph CLI Man Page: https://docs.ceph.com/en/reef/man/8/ceph/
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Ceph Troubleshooting OSDs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph PR #31588 (documentation fix for OSD_OUT_OF_ORDER_FULL ordering): https://github.com/ceph/ceph/pull/31588

## Issues Found
- **Incorrect `sort -k 8` column reference in `ceph osd df` pipeline**: The original command `ceph osd df | sort -k 8 -rn | head -10` assumed `%USE` is the 8th whitespace-separated field. In modern Ceph versions (Nautilus 14.2+), additional columns (DATA, OMAP, META) were added, and size columns include unit suffixes (e.g., "500 GiB") that are treated as separate fields by `sort`. This makes `sort -k 8` sort on the wrong column. **Fix**: Replaced the sort pipeline with a plain `ceph osd df` command and updated the description to direct readers to review the `%USE` column visually, which is reliable across all Ceph versions.

## Review Notes
- All default threshold values (nearfull 0.85, backfillfull 0.90, full 0.95) are correct per official Ceph documentation.
- The required ordering `nearfull < backfillfull < full` is correct.
- All three `ceph osd set-*-ratio` CLI commands use correct syntax.
- The Rook CephCluster CRD field names (`fullRatio`, `backfillFullRatio`, `nearFullRatio`) and their location under `spec.storage` are correct.
- The health check code `OSD_OUT_OF_ORDER_FULL` is the correct Ceph health check identifier.
- Behavioral descriptions for each threshold are accurate: nearfull is a warning only, backfillfull prevents backfill operations, and full blocks all write I/O.
- The "Typical production values" (0.75, 0.80, 0.85) shown in the post are lower than Ceph defaults; this is fine as they are presented as example custom values, not defaults.
