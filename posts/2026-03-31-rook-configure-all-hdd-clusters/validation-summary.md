# Validation Summary: How to Configure Ceph for All-HDD Clusters

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (BlueStore storage backend)
- Linux block device tuning (I/O scheduler, read-ahead, queue depth)
- Kubernetes CRDs (CephCluster, CephBlockPool)

## Sources Consulted
- Ceph official documentation: BlueStore configuration reference (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph official documentation: OSD configuration reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph official documentation: Admin socket commands (https://docs.ceph.com/en/latest/man/8/ceph/#daemon)
- Rook documentation: CephCluster CRD (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Linux kernel documentation: block device queue tuning

## Issues Found

1. **Used generic `osd_op_num_shards` instead of HDD-specific `osd_op_num_shards_hdd`**: The blog used `ceph config set osd osd_op_num_shards 8`, but Ceph has HDD-specific variants (`osd_op_num_shards_hdd`, default 5) that take precedence over the generic option. The value 8 is the SSD default, which contradicts the comment about HDDs needing fewer threads. Changed to `osd_op_num_shards_hdd 5`.

2. **Used generic `osd_op_num_threads_per_shard` instead of `osd_op_num_threads_per_shard_hdd`**: Same issue as above — Ceph has HDD-specific variants. Changed to `osd_op_num_threads_per_shard_hdd 1` (which matches the HDD default).

3. **`osd_max_ops` is not a valid Ceph configuration option**: There is no `osd_max_ops` config setting in Ceph. The concurrency is already controlled by the shard and thread-per-shard settings above. Removed the invalid command and its comment.

4. **`dump_op_pq_state` is not a valid admin socket command; misleading "fragmentation" comment**: `dump_op_pq_state` does not exist in Ceph's admin socket interface. Replaced with `dump_ops_in_flight`, which is a valid command that shows currently executing operations. Also corrected the misleading comment from "Check for HDD fragmentation" to "Check OSD operation queue depth (indicator of HDD saturation)", since the command inspects operation state, not disk fragmentation.

## Review Notes
- Several BlueStore settings (`bluestore_cache_size_hdd` = 1GB, `bluestore_min_alloc_size_hdd` = 64KB) and recovery settings (`osd_recovery_max_active_hdd` = 3, `osd_recovery_sleep_hdd` = 0.1) are being set to their Ceph defaults (Pacific/Quincy/Reef). This is not wrong — explicitly setting defaults is a valid practice for documentation and ensuring consistent behavior across upgrades — but readers should be aware these are already the defaults in modern Ceph.
- The `crush_rule: hdd-rule` in the CephBlockPool spec references a CRUSH rule that is not created anywhere in the post. Readers would need to create this rule separately. This is not technically incorrect but could cause confusion.
- The `blockdev --setra` and sysfs tuning commands are ephemeral and will not survive a reboot unless persisted via udev rules or similar mechanisms. The post does not mention this caveat.
