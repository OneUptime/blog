# Validation Summary: How to Configure Ceph for All-NVMe Clusters

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (BlueStore, OSD, CRUSH)
- Rook (CephCluster CRD, CephBlockPool CRD)
- NVMe storage devices
- Kubernetes resource management
- Linux kernel I/O tuning (schedulers, queue depth, IRQ affinity)
- fio (Flexible I/O Tester)
- rados bench

## Sources Consulted
- Ceph official documentation — BlueStore configuration reference (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph official documentation — OSD configuration reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph source code — config option definitions (osd.yaml.in, BlueStore.cc)
- Rook official documentation — CephCluster CRD (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official documentation — CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph rados man page — bench subcommand (https://docs.ceph.com/en/latest/man/8/rados/)
- fio official documentation (https://fio.readthedocs.io/en/latest/fio_doc.html)
- fio GitHub issue #1388 — iodepth behavior with sync engines (https://github.com/axboe/fio/issues/1388)

## Issues Found

1. **Misleading comment on `bluestore_prefer_deferred_size_ssd 0`**: The comment said "Enable write-combining for NVMe (groups small writes)" but setting this to 0 actually *disables* deferred writes, meaning I/O goes directly to the block device without passing through the WAL first. This is correct for NVMe (avoids double-write overhead) but the comment described the opposite behavior. Fixed the comment to: "Disable deferred writes for NVMe (write directly to device, avoiding WAL double-write overhead)."

2. **Non-existent config option `bluestore_max_bytes_per_device_hint`**: This is not a valid Ceph configuration option. It does not appear in any version of the Ceph source code or documentation. The `ceph config set` command would fail at runtime. Removed the line and its comment entirely.

3. **fio benchmark command missing `--ioengine=libaio` and `--direct=1`**: The fio command specified `--iodepth=64` but used the default `psync` (synchronous) I/O engine, which silently caps queue depth to 1 per job. This would produce dramatically lower IOPS than intended. Added `--ioengine=libaio` to enable async I/O with proper queue depth support. Also added `--direct=1` to bypass the page cache, which is essential for accurate raw device benchmarking.

## Review Notes
- Several settings explicitly set values that match current Ceph defaults: `osd_recovery_max_active_ssd 10` (default is 10), `osd_backfill_scan_max 512` (default is 512), `osd_numa_auto_affinity true` (default is true), and `bluestore_min_alloc_size_ssd 4096` (default since Octopus). While redundant, explicitly documenting these values is reasonable in a tuning guide for clarity.
- The `osd_op_num_threads_per_shard` is set to 4, while the SSD-specific default (`osd_op_num_threads_per_shard_ssd`) is 5. However, combined with `osd_op_num_shards` set to 16 (vs default 8), total parallelism increases from 40 to 64 threads, so the overall tuning direction is correct.
- The CephBlockPool uses `spec.parameters.crush_rule` which works but is not the idiomatic Rook approach. Using `spec.deviceClass: nvme` would let Rook manage the CRUSH rule automatically. This is a style preference, not an error.
- When `osd_memory_target` autotuning is enabled (default in modern Ceph), it may override the explicit `bluestore_cache_size_ssd` setting. The post could mention this caveat in a future update.
