# Validation Summary: How to Configure OSD Settings in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (Object Storage Daemon configuration)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl, CephCluster CRD)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Configuration documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph OSD configuration reference (scrubbing, recovery, backfill, and capacity settings)
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/

## Issues Found
No technical issues found.

## Review Notes
- The `spec.cephConfig` field on the CephCluster CR is the recommended approach in current Rook versions. The older `rook-config-override` ConfigMap approach is still supported but considered legacy.
- Rook documentation examples use `"osd.*"` as the section key (with wildcard), while the blog uses `osd`. Both are valid identifiers for targeting all OSDs in the Ceph config store, so this is not an error.
- All scrubbing settings (`osd_scrub_begin_hour`, `osd_scrub_end_hour`, `osd_scrub_sleep`, `osd_deep_scrub_interval`) are valid Ceph OSD configuration options.
- All recovery/backfill settings (`osd_recovery_max_active`, `osd_recovery_op_priority`, `osd_max_backfills`, `osd_backfill_scan_min`, `osd_backfill_scan_max`) are valid with reasonable values.
- Full ratio thresholds (`mon_osd_full_ratio` 0.95, `mon_osd_nearfull_ratio` 0.85, `mon_osd_backfillfull_ratio` 0.90) are correctly set to their Ceph default values.
- The `osd_deep_scrub_interval` value of 604800 equals 7 days, which is the Ceph default.
- Values in the `cephConfig` YAML are correctly quoted as strings, matching the `map[string]map[string]string` type of the field.
