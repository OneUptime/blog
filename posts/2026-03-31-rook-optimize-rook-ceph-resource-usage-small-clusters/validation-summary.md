# Validation Summary: How to Optimize Rook-Ceph Resource Usage on Small Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- BlueStore (Ceph OSD backend)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Configuration docs: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph OSD Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph Autoscaling Placement Groups docs: https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Rook CRD specification on GitHub: https://github.com/rook/rook/blob/master/Documentation/CRDs/Cluster/ceph-cluster-crd.md

## Issues Found

1. **Incorrect `cephConfig` key format (line 80):** The post used `osd` as the key under `spec.cephConfig`, but Rook's CephCluster CRD expects Ceph Mon config store selectors. The correct key for targeting all OSDs is `"osd.*"`. Changed `osd:` to `"osd.*":`.

2. **Misleading BlueStore HDD cache reduction (lines 87-91):** The post claimed to "reduce BlueStore cache sizes" and set both `bluestore_cache_size_hdd` and `bluestore_cache_size_ssd` to 1 GiB. However, `bluestore_cache_size_hdd` already defaults to 1 GiB, making that setting a no-op. Only `bluestore_cache_size_ssd` (default 3 GiB) is actually reduced. Rewrote the section to clarify the different defaults and removed the redundant HDD command.

## Review Notes
- The `osd_memory_target` default of 4 GiB is confirmed correct. Ceph documentation notes that setting it below 2 GiB is not recommended, so the 1 GiB value in the post is aggressive. Users should monitor OSD stability.
- In newer Ceph releases (Pacific / 16.x+), the `pg_autoscaler` module is enabled by default and may be treated as always-on. Disabling it entirely may not work; controlling autoscaling per-pool (`ceph osd pool set <pool> pg_autoscale_mode off`) may be preferable on recent versions.
- The extended scrub intervals (7 days min, 30 days max vs defaults of 1 day and 7 days) significantly delay data integrity checks. This is a valid tradeoff for small clusters with limited IOPS but users should understand the increased risk window for silent data corruption.
- The `spec.resources` structure, `spec.mon.count`, `spec.mon.allowMultiplePerNode`, and all `ceph config set` command syntax were verified as correct.
