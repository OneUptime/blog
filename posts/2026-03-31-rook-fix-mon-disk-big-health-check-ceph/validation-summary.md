# Validation Summary: How to Fix MON_DISK_BIG Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (monitor store, RocksDB, health checks)
- Rook (Kubernetes Ceph operator, CephCluster CRD)
- Kubernetes (ConfigMaps, Deployments, kubectl)

## Sources Consulted
- Ceph official documentation: monitor configuration reference (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Ceph official documentation: health checks (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph CLI man pages for `ceph osd` subcommands
- Rook official documentation: CephCluster CRD configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)

## Issues Found

### 1. Invalid command: `ceph osd get-epoch`
- **What was wrong:** The post used `ceph osd get-epoch` to retrieve the current OSD map epoch. This is not a valid Ceph CLI command.
- **What was changed:** Replaced with `ceph osd stat`, which outputs the current OSD map epoch along with OSD count and status.

### 2. Invalid command: `ceph tell mon.* osdmap trim --epoch <old-epoch>`
- **What was wrong:** The post suggested using `ceph tell mon.* osdmap trim --epoch <old-epoch>` to force trimming of old OSD map epochs. This command does not exist in Ceph. OSD map trimming is handled automatically by monitors based on the `mon_min_osdmap_epochs` configuration.
- **What was changed:** Replaced the invalid force-trim command block with an explanation that trimming happens automatically after adjusting the retention config, followed by `ceph osd stat` to check the current epoch and `ceph tell mon.* compact` to reclaim space after trimming.

## Review Notes
- All Ceph config options referenced in the post (`mon_min_osdmap_epochs`, `paxos_trim_min`, `paxos_trim_max`, `mon_data_size_warn`, `mon_compact_on_start`, `mon_compact_on_trim`) are verified as real and correctly named.
- The distinction between `MON_DISK_BIG` (absolute store size) and `MON_DISK_LOW` (available disk space) is accurate.
- The default 15 GiB threshold for `mon_data_size_warn` is correct.
- The Rook CephCluster CRD `spec.cephConfig` section-based configuration is valid in current Rook versions.
- The `mon_data_size_warn` byte calculation (32212254720 = 30 GiB) is mathematically correct.
