# Validation Summary: How to Tune BlueStore for SSD and NVMe Drives

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph BlueStore
- Rook Ceph Operator
- SSD and NVMe storage
- RocksDB (BlueStore metadata backend)
- Kubernetes (CephCluster CRD)

## Sources Consulted
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph OSD Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Configuration: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/
- Ceph rados man page: https://docs.ceph.com/en/reef/man/8/rados/
- Ceph PR #30698 (min_alloc_size change to 4K for SSDs in Octopus)
- Ceph PR #14435 (deferred_batch_ops HDD/SSD split)

## Issues Found

1. **`bluestore_bluefs_max_ratio` set to 0.10 is dangerously low.** The default is 0.90. Setting it to 0.10 would severely restrict BlueFS and could cause RocksDB space issues. Removed the max_ratio command and clarified that only increasing the min_ratio (from default 0.02 to 0.05) is the recommended tuning. Updated section title and explanation.

2. **`bluestore_min_alloc_size_ssd` = 4096 is already the default since Octopus.** The post implied this was a reduction from a larger value. Updated the explanation to note this is the current default (changed from 16KB in Octopus) and added an important caveat that this value is stamped at OSD creation time and cannot be changed on existing OSDs.

3. **`bluestore_max_blob_size_ssd` is not a valid option name.** The correct option is `bluestore_max_blob_size` (without the `_ssd` suffix). Fixed the command.

4. **`bluestore_deferred_batch_ops_ssd` is not a valid option name.** The correct option is `bluestore_deferred_batch_ops` (without the `_ssd` suffix). Fixed the command and added context that deferred writes are disabled by default on SSDs.

5. **`bluestore_op_thread_timeout` uses wrong prefix.** This is an OSD-level option, not a BlueStore option. The correct name is `osd_op_thread_timeout`. Fixed the command.

## Review Notes
- The RocksDB options string uses valid format but deviates significantly from Ceph defaults (e.g., `max_write_buffer_number` default is 64, not 4; `min_write_buffer_number_to_merge` default is 6, not 1). These are intentional tuning choices and are technically valid, but users should understand the tradeoffs.
- The Rook CephCluster YAML example uses `spec.cephConfig` which is the correct path. However, the section key format may vary by Rook version -- some versions use `"osd.*"` pattern matching instead of plain `osd`.
- The `rados bench` command syntax is correct.
- The general performance claims (2-5x improvement, 20-40% with tuning) are reasonable ballpark estimates but will vary significantly by workload and hardware.
