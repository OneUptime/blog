# Validation Summary: How to Tune BlueStore WAL and DB Performance in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph BlueStore
- Ceph OSD (Object Storage Daemon)
- RocksDB (BlueStore metadata backend)
- Rook Ceph Operator (Kubernetes)
- ceph-bluestore-tool (migration utility)
- Linux iostat (sysstat)

## Sources Consulted
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Rook Ceph Cluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph ceph-bluestore-tool man page: https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/
- Ceph BlueFS and BlueStore internals documentation: https://docs.ceph.com/en/latest/dev/bluestore/

## Issues Found
- **Summary percentage inconsistency**: The summary stated "Size DB devices at roughly 4% of the total HDD data capacity per OSD" but the sizing table in the post showed much lower ratios (e.g., 1 TB HDD → 4-10 GB DB = 0.4-1%, 4 TB HDD → 10-20 GB = 0.25-0.5%). Fixed the summary to reference the sizing table instead of claiming a specific percentage that contradicted the table values.

## Review Notes
- The sizing table values are on the conservative side compared to the official Ceph recommendation of 4% minimum DB size relative to the data device. In production with many small objects, larger DB devices may be needed. The post's values are reasonable for typical workloads with default 4 MiB object sizes but users with small-object-heavy workloads should provision larger DB devices.
- In Ceph Pacific and later, `bluestore_cache_autotune` is enabled by default, which automatically adjusts cache ratios. Manually setting `bluestore_cache_kv_ratio`, `bluestore_cache_meta_ratio`, and `bluestore_cache_data_ratio` will only take effect if autotune is disabled. The post's cache tuning section is technically valid but could benefit from mentioning this caveat.
- The `ceph-bluestore-tool bluefs-bdev-migrate` command syntax is correct but the migration process may require additional steps in containerized/Rook deployments where direct systemctl access is not available. The post correctly frames this section in a bare-metal context.
- All Rook CephCluster YAML is valid for the current `ceph.rook.io/v1` API version. The `metadataDevice` field under device config is the correct way to specify separate WAL/DB devices in Rook.
