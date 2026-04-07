# How to Trigger Manual Compaction via Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Compaction, BlueStore, Performance

Description: Trigger manual BlueStore compaction on Ceph OSD daemons via the admin socket to reclaim disk space, reduce fragmentation, and improve read performance.

---

## Overview

Ceph OSDs using BlueStore write data in a log-structured manner. Over time, this creates fragmentation and space that is logically freed but not yet reclaimed. BlueStore performs compaction automatically in the background, but there are situations where triggering manual compaction is beneficial - after large deletes, before benchmarking, or when disk space appears higher than expected.

## Understanding BlueStore Compaction

BlueStore uses RocksDB for its metadata. RocksDB uses a log-structured merge (LSM) tree that accumulates compaction debt during heavy write periods. The OSD itself also maintains an allocation database that benefits from periodic compaction.

```bash
# Check current BlueStore stats including fragmentation
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "bluefs|bluestore" | head -30
```

## Triggering Compaction via Admin Socket

```bash
# Compact RocksDB and BlueFS
ceph daemon osd.0 compact
```

Note: Compaction is I/O intensive. Run it during low-traffic periods.

## Checking BlueStore Fragmentation

```bash
# View BlueStore performance counters
ceph daemon osd.0 perf dump bluestore

# Check free space fragmentation
ceph daemon osd.0 bluestore allocator score

# View BlueFS (internal metadata FS) allocation
ceph daemon osd.0 bluefs stats
```

## RocksDB Compaction

```bash
# Trigger manual RocksDB compaction
ceph daemon osd.0 compact

# Check RocksDB performance counters
ceph daemon osd.0 perf dump rocksdb
```

## When to Run Manual Compaction

Run manual compaction when:

```bash
# 1. After a large delete operation
ceph osd df | grep osd.0  # If used% seems high after deletes

# 2. Before performance benchmarking
ceph daemon osd.0 compact
rados bench -p benchpool 30 write --no-cleanup

# 3. When BlueFS is consuming unexpected space
ceph daemon osd.0 perf dump | python3 -m json.tool | grep "bluefs_bytes"
```

## Monitoring Compaction Progress

```bash
# Watch compaction activity in OSD logs
journalctl -u ceph-osd@0 -f | grep -i "compact\|rocksdb"

# Monitor BlueStore performance counters during compaction
watch -n 5 'ceph daemon osd.0 perf dump | python3 -m json.tool | grep -i "compact"'
```

## Running Compaction on All OSDs

```bash
#!/bin/bash
# compact-all-osds.sh - trigger compaction across all OSDs sequentially

for osd in $(ceph osd ls); do
    echo "Compacting OSD $osd..."
    ceph daemon osd.$osd compact 2>&1
    # Wait for compaction to complete before moving to next OSD
    sleep 30
done

echo "Compaction triggered on all OSDs"
```

## Safety Considerations

- Compaction is read-only metadata safe - it does not risk data loss
- It can temporarily increase I/O load and CPU usage
- Avoid running on multiple OSDs simultaneously in production
- Allow compaction to complete before taking OSD out of service

## Summary

Manual BlueStore compaction via the admin socket reclaims space and reduces fragmentation after large delete operations. Use `ceph daemon osd.X compact` to trigger RocksDB and BlueFS compaction together. Trigger compaction during low-traffic periods, run it sequentially across OSDs, and monitor CPU and I/O impact via logs and performance counters.
