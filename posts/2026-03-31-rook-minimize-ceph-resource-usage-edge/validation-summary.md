# Validation Summary: How to Minimize Ceph Resource Usage for Edge Deployments

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (BlueStore, RocksDB, OSD, MGR, MON daemons)
- Rook (CephCluster CRD, CephBlockPool CRD)
- Kubernetes (resource requests/limits, kubectl)

## Sources Consulted
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph OSD Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Hardware Recommendations (osd_memory_target default): https://docs.ceph.com/en/quincy/start/hardware-recommendations/
- Ceph RocksDB Tuning Deep-Dive: https://ceph.io/en/news/blog/2022/rocksdb-tuning-deep-dive/
- Ceph Control Commands (ceph tell syntax): https://docs.ceph.com/en/latest/rados/operations/control/
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Ceph Dashboard Documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Monitoring/ceph-dashboard/
- RocksDB Setup Options and Basic Tuning: https://github.com/facebook/rocksdb/wiki/Setup-Options-and-Basic-Tuning

## Issues Found
No technical issues found.

## Review Notes
- All eight Ceph config options (`osd_memory_target`, `bluestore_cache_size_hdd`, `bluestore_cache_size_ssd`, `bluestore_rocksdb_options`, `osd_op_num_threads_per_shard`, `osd_op_num_shards`, `osd_max_backfills`, `osd_recovery_max_active`) are valid and correctly named.
- The `osd_memory_target` default of 4 GB (4294967296 bytes) is correctly stated; reducing to 1 GB (1073741824 bytes) is a reasonable edge recommendation.
- The RocksDB sub-options (`max_write_buffer_number`, `min_write_buffer_number_to_merge`, `write_buffer_size`) are valid RocksDB tuning parameters.
- All Rook CRD fields (`spec.resources.*`, `spec.dashboard.enabled`, `spec.monitoring.enabled`, `spec.mgr.modules`, `spec.mgr.count`, `spec.parameters.pg_num/pgp_num`) are correctly structured per the Rook CRD documentation.
- The `ceph tell osd.0 perf dump` command is valid syntax — `ceph tell` sends commands to daemons via the monitor, which is preferable in Kubernetes environments where direct admin socket access (`ceph daemon`) may not be available.
- In newer Ceph versions (Quincy+), some generic options like `osd_op_num_threads_per_shard` and `osd_op_num_shards` have been split into HDD/SSD-specific variants (e.g., `osd_op_num_threads_per_shard_hdd`/`_ssd`). The generic versions still work but a future revision could mention the device-specific variants.
- The `bluestore_cache_size_ssd` value (1 GB) equals the `osd_memory_target` (1 GB). With `bluestore_cache_autotune` enabled (the default since Nautilus), `osd_memory_target` governs the total memory budget and the explicit cache size settings are effectively unused. If autotuning were disabled, the cache size should be set lower than the memory target. A future revision could add a note about this interaction.
- The MGR memory limit of 256Mi is aggressive but reasonable for edge deployments with dashboard and non-essential modules disabled.
