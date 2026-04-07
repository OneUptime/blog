# Validation Summary: How to Tune BlueStore for HDD Drives

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph BlueStore
- Rook Ceph Operator
- Kubernetes (CephCluster CRD)
- rados bench

## Sources Consulted
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph BlueStore Configuration Reference (latest): https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph mClock Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/
- Rook CephCluster CRD docs: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph PR #32809 (bluestore_min_alloc_size_hdd default history)
- Ceph PR #14435 (deferred_batch_ops HDD/SSD split)
- rados man page: https://docs.ceph.com/en/reef/man/8/rados/

## Issues Found

1. **Incorrect default for `bluestore_min_alloc_size_hdd`**: The post stated the default is 64KB. In Ceph Pacific and later (Quincy, Reef, Squid), the default is 4KB (4096). Corrected the stated default and kept 64KB as a valid tuning recommendation. Also added a critical caveat that this value is baked at OSD creation time and cannot be changed on existing OSDs without recreating them.

2. **`bluestore_max_blob_size_hdd` set to its default value**: The post recommended setting this to 524288 (512KB), which is already the default. Changed to 1048576 (1MB) and noted the default, making it an actual tuning change.

3. **`bluestore_cache_size_hdd` set to its default value**: The post recommended setting this to 1GB (1073741824), which is already the default. Changed to 2GB (2147483648) and noted the default, making it an actual tuning improvement. Updated the recommended range from "1-2GB" to "2-4GB".

4. **`bluestore_deferred_batch_ops_hdd` set to its default value**: The post recommended 64, which is already the default. Changed to 128 and noted the default.

5. **`osd_op_num_threads_per_shard_hdd` set to its default value**: The post recommended setting this to 1, which is already the default. Replaced with advice to reduce `osd_op_num_shards_hdd` from the default of 5 to 3, which is an actionable tuning change for HDD.

6. **Updated Rook CephCluster YAML**: Updated the `spec.cephConfig` example to reflect the corrected tuning values.

## Review Notes
- The `bluestore_min_alloc_size_hdd` default has changed across Ceph versions (64KB in Mimic/Nautilus, 4KB in Pacific+). Users on older Ceph versions may see different defaults.
- The Rook `spec.cephConfig` section uses `osd` as the key, which maps to the `[osd]` section in ceph.conf. This is valid but Rook docs sometimes show `"osd.*"` with quotes for glob-style matching.
- The `rados bench` command is correct and uses appropriate flags.
- The Rook YAML for separating BlueFS onto SSD via `metadataDevice` is correct.
