# Validation Summary: How to Configure BlueStore WAL Device Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph BlueStore
- Write-Ahead Log (WAL) / RocksDB / BlueFS
- cephadm (OSD orchestration)
- ceph-volume (LVM-based OSD provisioning)
- Rook-Ceph (Kubernetes operator)
- NVMe storage devices

## Sources Consulted
- Ceph OSD Service documentation (cephadm DriveGroups): https://docs.ceph.com/en/reef/cephadm/services/osd/
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph source code `src/common/options/global.yaml.in` for `bluestore_block_wal_size` default value
- Ceph source code `src/kv/RocksDBStore.cc` for RocksDB perf counter names
- Ceph source code `src/osd/osd_perf_counters.cc` for OSD perf counter types
- Ceph Performance Counters documentation: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph orchestrator module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/orchestrator/module.py

## Issues Found

1. **Incorrect cephadm syntax (lines 39-46)**: The post used a fabricated `host:device:role` syntax (`ceph orch daemon add osd myhost:/dev/sdb:data /dev/nvme0n1:wal`) which does not exist in cephadm. Replaced with the correct approach: a DriveGroup service specification YAML applied via `ceph orch apply -i`.

2. **Wrong default value for `bluestore_block_wal_size` (line 91)**: The post claimed the default is "0 = use all available space on WAL device". The actual default is 96 MiB, as defined in the Ceph source code (`global.yaml.in`). Corrected the comment.

3. **Non-existent RocksDB perf counter name (line 120)**: The post referenced `rocksdb_compact_range_count`, which does not exist in Ceph's RocksDB perf counters. Replaced with `rocksdb_compact`, which is a valid counter tracking total compactions.

4. **Incorrect perf counter access for write bytes (line 144)**: The post accessed `op_w_in_bytes` as if it were an average-type counter with `avgcount`/`sum` fields. In reality, `op_w_in_bytes` is a plain `u64_counter` (scalar integer), not a nested object. Fixed to access it directly as a scalar value and corrected the label from "Write bytes/s" to "Write bytes (cumulative)" since a single perf dump snapshot gives cumulative totals, not a rate.

## Review Notes
- The `ceph-volume lvm prepare --data --block.wal` syntax is correct and unchanged.
- The Rook-Ceph `volumeClaimTemplates` configuration with `data` and `wal` named PVCs is correct.
- The overview's description of WAL being used for "small writes smaller than bluestore_min_alloc_size" is a simplification (the RocksDB WAL handles all metadata transactions), but it correctly identifies the primary performance-relevant use case and is acceptable for a blog post.
- The performance latency table values are reasonable ballpark estimates, not precise benchmarks.
- The WAL sizing guideline of "10-30 seconds of write data" in the summary is a reasonable rule of thumb.
