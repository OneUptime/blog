# Validation Summary: How to Configure Ceph for NVMe WAL/DB with HDD Data

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph BlueStore (OSD backend)
- BlueFS (BlueStore filesystem layer for RocksDB/WAL)
- RocksDB (metadata store used by BlueStore)
- NVMe and HDD device management
- ceph-volume (OSD provisioning)

## Sources Consulted
- [CephCluster CRD - Rook Ceph Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/) — confirmed `metadataDevice` config key, its behavior placing both WAL and DB, and support for shared metadata devices
- [ceph-volume lvm batch - Ceph Documentation](https://docs.ceph.com/en/latest/ceph-volume/lvm/batch/) — confirmed WAL colocation with DB when no separate WAL device is specified
- [Ceph Perf Counters Documentation](https://docs.ceph.com/en/latest/dev/perf_counters/) — verified perf counter naming conventions
- [Ceph BlueFS.cc source code](https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueFS.cc) — confirmed perf counter names registered without subsystem prefix (e.g., `bytes_written_slow`, not `bluefs_bytes_written_slow`)
- [Ceph Tracker #23251](https://tracker.ceph.com/issues/23251) — real-world `perf dump` output showing actual counter names under the `bluefs` section
- [Rook ceph-volume provisioning design doc](https://github.com/rook/rook/blob/master/design/ceph/ceph-volume-provisioning.md) — confirmed metadataDevice design intent

## Issues Found

### 1. Incorrect BlueFS perf counter key in DB overflow detection script (line 102)
- **What was wrong:** The Python script used `d.get('bluefs', {}).get('bluefs_bytes_written_slow', 0)` to access the spillover counter. The key `bluefs_bytes_written_slow` is incorrect — within the `bluefs` section of `perf dump` output, counter names do not repeat the subsystem prefix.
- **What was changed:** Changed the key from `'bluefs_bytes_written_slow'` to `'bytes_written_slow'`.
- **Why:** The incorrect key would silently return the default value of 0, causing the overflow detection to never trigger even when DB spillover was occurring. This is a functional bug that defeats the purpose of the monitoring script.

### 2. Incorrect grep pattern for monitoring BlueFS usage (line 64)
- **What was wrong:** The command `ceph daemon osd.0 perf dump | grep bluefs_bytes` searches for the substring `bluefs_bytes` in the pretty-printed JSON output. No single line contains this substring — `"bluefs"` is a section key on its own line, and counter names like `"bytes_written_slow"` are on separate indented lines.
- **What was changed:** Changed to `ceph daemon osd.0 perf dump bluefs | grep bytes`. This uses the `perf dump` subsystem filter to output only the `bluefs` section, then greps for lines containing `bytes` to show all relevant size and throughput counters.
- **Why:** The original command would return no output, making it useless for monitoring. The fix correctly filters to BlueFS counters showing DB, WAL, and slow device usage.

## Review Notes
- Rook also supports `databaseSizeMB` and `walSizeMB` as device-level config options alongside `metadataDevice`, which gives explicit control over how much NVMe space each OSD's DB and WAL consume. The post's approach of using `ceph config set` for `bluestore_block_db_size` and `bluestore_block_wal_size` also works but only affects newly created OSDs. Both approaches are valid.
- The `max_background_compactions` RocksDB option used in the tuning section has been deprecated in newer RocksDB versions in favor of `max_background_jobs`. However, Ceph still accepts this option for backward compatibility, so it is not incorrect.
- The 4% DB sizing recommendation, byte calculations, and NVMe-to-HDD ratios are all mathematically correct and align with Ceph upstream guidance.
- The `ceph osd metadata` verification script correctly filters for device and rotational fields.
