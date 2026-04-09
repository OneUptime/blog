# Validation Summary: How to Tune OSD Thread Limits in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (OSD threading, BlueStore, RocksDB)
- Rook (CephCluster CRD, toolbox pod)
- Kubernetes (kubectl exec)

## Sources Consulted
- [Ceph OSD Config Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/)
- [Ceph mClock Config Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/)
- [Ceph RocksDB Tuning Deep-Dive (ceph.io)](https://ceph.io/en/news/blog/2022/rocksdb-tuning-deep-dive/)
- [Ceph Admin Socket Documentation](https://docs.ceph.com/en/latest/man/8/ceph/)
- [Ceph Admin Socket Usage (IBM)](https://www.ibm.com/docs/en/storage-ceph/5.3.0?topic=cluster-using-ceph-administration-socket)
- [Rook CephCluster CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Ceph BlueStore Config Reference](https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- [Ceph Bug #19511 - bluestore aio queue](https://tracker.ceph.com/issues/19511)

## Issues Found

### 1. `ceph daemon` used from toolbox pod (Monitoring section)
- **What was wrong:** The post used `ceph daemon osd.0 dump_ops_in_flight` via the rook-ceph-tools deployment. The `ceph daemon` command requires direct access to the daemon's admin socket on the host where the OSD runs. The toolbox pod does not have access to OSD admin sockets.
- **What was changed:** Replaced `ceph daemon osd.0 dump_ops_in_flight` with `ceph tell osd.0 dump_ops_in_flight`. The `ceph tell` command is relayed via the monitors and works from any pod with Ceph client access, including the toolbox.
- **Why:** `ceph daemon` only works when executed on the daemon's host with access to its Unix socket. `ceph tell` achieves the same result over the monitor network.

### 2. `bluestore_rocksdb_threads` is not a valid Ceph config parameter (Disk Queue Depth section)
- **What was wrong:** The post used `ceph config set osd bluestore_rocksdb_threads 8`. There is no `bluestore_rocksdb_threads` config option in Ceph. RocksDB thread counts are controlled via `bluestore_rocksdb_options` which accepts a string of RocksDB options.
- **What was changed:** Replaced with `ceph config set osd bluestore_rocksdb_options "max_background_jobs=8"`, which uses the `max_background_jobs` RocksDB option (the modern recommended parameter that controls both compaction and flush threads).
- **Why:** The `bluestore_rocksdb_threads` parameter does not exist in any Ceph version. The official Ceph RocksDB Tuning Deep-Dive confirms that `max_background_jobs` is the recommended way to control RocksDB parallelism.

### 3. Summary section referenced incorrect monitoring command
- **What was wrong:** The summary mentioned `ceph daemon osd.X ops` for monitoring.
- **What was changed:** Updated to `ceph tell osd.X dump_ops_in_flight`.
- **Why:** Same admin socket issue as #1, and the correct subcommand is `dump_ops_in_flight`, not `ops`.

## Review Notes
- The generic parameters `osd_op_num_shards` and `osd_op_num_threads_per_shard` (used in the "Configuring I/O Threads" section) are valid but override both the `_ssd` and `_hdd` device-specific variants when set to non-zero. In mixed SSD/HDD clusters, readers should be aware that setting the generic parameter will affect all device types. For device-specific tuning, using `osd_op_num_shards_ssd` or `osd_op_num_shards_hdd` is more precise.
- The HDD default values in the table (`osd_op_num_shards_hdd` = 1, `osd_op_num_threads_per_shard_hdd` = 5) reflect the Ceph Reef/Squid defaults. These were changed from the pre-Reef defaults (5 shards / 1 thread per shard) as part of mClock scheduler tuning. Readers using older Ceph versions (Quincy and earlier) should note the defaults were different.
- The `osd_recovery_op_priority` default is already 3, so the blog's recommendation to "pair with a lower recovery priority" and then set it to 3 is technically setting it to its default rather than lowering it. This is not incorrect but could be misleading.
