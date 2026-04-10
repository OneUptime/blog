# Validation Summary: How to Pass Custom Ceph Config Overrides in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (CephCluster CRD)
- BlueStore (Ceph OSD backend)
- kubectl CLI

## Sources Consulted
- Rook official documentation: CephCluster CRD specification (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook Ceph configuration guide (https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)
- Cross-referenced with 55+ Rook blog posts in this repository that use the same `cephConfig` CRD field and parameter names
- Verified against `posts/2026-03-31-rook-how-to-configure-osd-memory-target-in-ceph/README.md` for OSD memory parameters
- Verified against `posts/2026-03-31-rook-configure-osd-settings-in-ceph/README.md` for scrub and recovery parameters
- Verified against `posts/2026-03-31-rook-example-ceph-conf-for-production/README.md` for production config structure
- Verified against `posts/2026-03-31-rook-update-ceph-config-running/README.md` for config override mechanisms

## Issues Found
No technical issues found.

## Review Notes
- The `cephConfig` CRD field name is correct and consistently used across 55+ blog posts in this repository.
- All byte values are correctly calculated: 4 GiB = 4294967296, 1 GiB = 1073741824, 2 GiB = 2147483648, 256 MiB = 268435456, 128 MiB = 134217728.
- All time interval values are correct: 86400 = 1 day, 604800 = 7 days.
- All Ceph config parameter names (`osd_memory_target`, `osd_memory_base`, `osd_memory_cache_min`, `bluestore_cache_size`, `osd_scrub_min_interval`, `osd_scrub_max_interval`, `osd_deep_scrub_interval`, `mon_osd_down_out_interval`, `mgr_stats_period`, etc.) are valid Ceph configuration options.
- The `bluestore_cache_size` parameter is used alongside `osd_memory_target` in the first example. While `osd_memory_target` provides automatic cache management, explicitly setting `bluestore_cache_size` is still valid for fine-grained control.
- The post correctly notes that Rook writes `cephConfig` values to the Ceph monitor config database (via `ceph config set`) rather than flat files, and that manual toolbox changes will be overwritten on reconciliation if the same key exists in the CRD.
- The older `rook-config-override` ConfigMap approach is not mentioned, which is fine since the `cephConfig` CRD field is the modern recommended method.
- All kubectl and ceph CLI commands use correct syntax.
