# Validation Summary: How to Expand Storage Capacity in a Running Rook-Ceph Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- kubectl CLI

## Sources Consulted
- Ceph official documentation on OSD fullness ratios (`mon_osd_nearfull_ratio`, `mon_osd_backfillfull_ratio`, `mon_osd_full_ratio`)
- Rook official documentation — CephCluster CRD Storage Selection Settings (rook.io)
- Rook official documentation — Storage Class Device Sets (rook.io)
- Ceph documentation on recovery/backfill tuning (`osd_max_backfills`, `osd_recovery_max_active`)

## Issues Found
1. **Incorrect Ceph usage thresholds**: The post stated 75% triggers `HEALTH_WARN` and 85% triggers `HEALTH_ERR`. The actual Ceph defaults are: 85% (`mon_osd_nearfull_ratio`) triggers `HEALTH_WARN`, and 95% (`mon_osd_full_ratio`) triggers `HEALTH_ERR` and blocks writes. Fixed to reflect correct default values.

2. **`watch` command quoting**: `watch kubectl -n rook-ceph get pods | grep osd` would not work as intended because the pipe is evaluated by the shell before `watch` runs, meaning `grep` only executes once on watch's terminal output rather than repeatedly. Fixed to `watch "kubectl -n rook-ceph get pods | grep osd"` so the entire pipeline is re-executed on each interval.

## Review Notes
- All Rook CephCluster CRD field names (`spec.storage.nodes`, `spec.storage.useAllNodes`, `spec.storage.useAllDevices`, `spec.storage.deviceFilter`, `spec.storage.storageClassDeviceSets`) are correct and verified against official Rook documentation.
- All Ceph CLI commands (`ceph df`, `ceph status`, `ceph osd df tree`, `ceph osd stat`, `ceph config set`) use correct syntax.
- The `osd_max_backfills` default is 1 and `osd_recovery_max_active` default is 3; setting both to 4 is a reasonable tuning suggestion.
- In Method 2, the `kubectl label node` step is shown alongside `useAllNodes: true`. With `useAllNodes: true`, Rook provisions OSDs on all nodes regardless of labels, making the label step unnecessary for Rook itself. This is not technically incorrect but could confuse readers—worth clarifying in a future revision.
