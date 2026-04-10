# Validation Summary: How to Configure BlueStore DB Device Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph BlueStore
- RocksDB (embedded metadata database in BlueStore)
- cephadm (Ceph orchestrator deployment tool)
- ceph-volume (OSD provisioning tool)
- Rook-Ceph (Kubernetes Ceph operator)
- NVMe / SSD devices for metadata offloading

## Sources Consulted
- Ceph OSD Service documentation (cephadm): https://docs.ceph.com/en/reef/cephadm/services/osd/
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph ceph-volume lvm prepare documentation: https://docs.ceph.com/en/reef/ceph-volume/lvm/prepare/
- Ceph RocksDBStore source (src/kv/RocksDBStore.cc, src/kv/RocksDBStore.h) for perf counter keys
- Ceph BlueFS source (src/os/bluestore/BlueFS.cc) for DB usage counters
- Red Hat Ceph Storage Administration Guide (BlueStore section)
- Ceph OSD admin socket source (src/osd/OSD.cc) for compact command validation
- Rook-Ceph CephCluster CRD documentation for storageClassDeviceSets

## Issues Found

### 1. Fabricated cephadm syntax (lines 37-49)
**What was wrong:** Both `ceph orch daemon add osd` examples used completely fabricated colon-delimited syntax (`myhost:/dev/sdb:data /dev/ssd0:/dev/nvme0n1:block_db:block_wal` and `myhost:/dev/sdb:data:/dev/ssd0:db`). This syntax does not exist in any version of Ceph.
**What was changed:** Replaced with the correct inline syntax (`ceph orch daemon add osd myhost:data_devices=/dev/sdb,db_devices=/dev/ssd0`) and added a YAML service specification example for complex setups with DB and WAL devices, applied via `ceph orch apply -i`.
**Why:** The original commands would fail with errors. The correct syntax uses `key=value` pairs or YAML service specs.

### 2. Undersized DB device recommendations (sizing section)
**What was wrong:** The post stated a blanket "1-2% of OSD data size" rule and provided a sizing table based on that range. This is only accurate for pure RBD (block storage) workloads. For RGW, CephFS, and mixed workloads, the official Ceph documentation recommends at least 4% of block size.
**What was changed:** Updated the rule of thumb to "1-4%" with workload-specific guidance. Replaced the sizing table with two columns: one for RBD workloads (1-2%) and one for RGW/CephFS/mixed workloads (4%). Updated the summary paragraph accordingly.
**Why:** Using the 1-2% figure for RGW-heavy workloads would lead to DB device overflow and performance degradation -- the exact problem the post warns against.

### 3. Fabricated RocksDB perf counter keys (monitoring section)
**What was wrong:** The Python snippet referenced `rocksdb.compact_range_count` and `rocksdb.l0_file_count_limit_slowdowns`. Neither key exists in Ceph's RocksDB perf counters (verified against source code in src/kv/RocksDBStore.cc).
**What was changed:** Replaced with the actual perf counter keys: `compact` (total compaction count) and `compact_queue_len` (compaction queue length).
**Why:** The original keys would silently return the default value of 0, giving misleading results.

### 4. Invalid `bluestore_db` grep target (overflow section)
**What was wrong:** `ceph daemon osd.0 perf dump | grep bluestore_db` would match nothing. There is no `bluestore_db` section or key in the perf dump output. DB device usage metrics are in the `bluefs` section.
**What was changed:** Replaced with a Python snippet that reads `bluefs.db_total_bytes`, `bluefs.db_used_bytes`, and `bluefs.slow_used_bytes` to show DB capacity, usage, and any spillover to the slow device.
**Why:** The original command would produce no output, making it useless for diagnosing DB overflow.

### 5. Incorrect `du -sh` on block.db device (sizing section)
**What was wrong:** `du -sh /var/lib/ceph/osd/ceph-0/block.db` would not show useful results because block.db is a symlink to a block device, not a regular file or directory. `du` reports 0 for block devices.
**What was changed:** Replaced with a `ceph daemon osd.0 perf dump bluefs` command that reads the BlueFS perf counters to show actual DB usage.
**Why:** The correct way to check DB usage is through Ceph's perf counters, not filesystem tools.

## Review Notes
- The `ceph-volume lvm prepare` command and the Rook-Ceph CephCluster YAML are correct.
- The `ceph daemon osd.0 compact` command is valid (confirmed against OSD source code).
- The Rook-Ceph `storageClassDeviceSets` example correctly uses a volume claim template named `metadata` to designate the DB device, which is the documented Rook convention.
- The explanations of what is stored on the DB device and which operations benefit from a fast DB device are accurate.
