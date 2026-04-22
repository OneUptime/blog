# How to Handle BlueStore Fragmentation in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, BlueStore, Fragmentation, OSD, Performance, Maintenance, Tuning

Description: Understand BlueStore fragmentation in Ceph OSDs and learn how to diagnose, prevent, and remediate excessive fragmentation.

---

## Overview

BlueStore fragmentation occurs when the block device's free space becomes scattered into many small non-contiguous extents. Fragmentation degrades write performance because BlueStore must find and stitch together multiple small free extents for each new write. This guide explains what causes BlueStore fragmentation and how to manage it.

## How BlueStore Fragmentation Develops

BlueStore uses a free-list allocator to manage space on the block device. Over time, as objects are written, overwritten, and deleted, the free space becomes fragmented:

1. Objects are written in allocation units
2. Some objects are deleted, freeing their extents
3. New objects fill some but not all freed extents
4. Remaining free space is scattered in small chunks

## Checking Fragmentation Level

Ceph provides a health warning for excessive fragmentation:

```bash
# Check for fragmentation health warnings
ceph health detail | grep BLUESTORE_FRAGMENTATION
```

Get a detailed fragmentation report:

```bash
# For a specific OSD
ceph daemon osd.0 bluestore allocator score block
```

Example output:

```json
{
  "fragmentation_rating": 0.42
}
```

## Thresholds and Health Warnings

Ceph issues a health warning when the fragmentation score exceeds a configurable threshold (default 0.8):

| Score | Description |
|---|---|
| 0.0 - 0.4 | Tiny fragmentation |
| 0.4 - 0.7 | Small, acceptable fragmentation |
| 0.7 - 0.9 | Considerable, but generally safe |
| 0.9 - 1.0 | Severe fragmentation |

```bash
# View current fragmentation warning threshold (default: 0.8)
ceph config show osd.0 bluestore_warn_on_free_fragmentation
```

## Preventing Fragmentation

### Set Appropriate min_alloc_size

The `min_alloc_size` is baked into the OSD at creation time. It cannot be changed after the OSD is created - the OSD must be reprovisioned for a new value to take effect. The current default is 4096 (4KB). For HDD workloads with larger sequential writes, a larger value like 65536 (64KB) can reduce fragmentation:

```bash
# This only takes effect for newly created OSDs
ceph config set osd bluestore_min_alloc_size_hdd 65536
```

### Tune Deferred Write Batching

BlueStore batches small writes before flushing them to the block device, which can reduce write amplification and the resulting fragmentation. The `bluestore_deferred_batch_ops` option controls how many deferred write operations are batched together (defaults to 64 for HDDs, 16 for SSDs):

```bash
ceph config set osd bluestore_deferred_batch_ops_hdd 64
```

## Remediating Fragmentation

### Method 1 - Rebalance the OSD

Temporarily mark the OSD out and back in to trigger data redistribution:

```bash
# Warning: this moves data off the OSD
ceph osd out 0
# Wait for data to migrate to other OSDs
# Then bring back in
ceph osd in 0
```

### Method 2 - Online Compaction

For RocksDB metadata fragmentation, trigger a manual compaction:

```bash
ceph daemon osd.0 compact
```

This compacts RocksDB but not the main block device allocator.

### Method 3 - OSD Replacement

For severe fragmentation, replace the OSD:

```bash
# Mark OSD out
ceph osd out 0

# Wait for data migration
watch ceph osd df | grep "osd.0"

# Remove and recreate the OSD
ceph osd purge 0 --yes-i-really-mean-it
# Then provision a new OSD on the same device
```

## Monitoring Fragmentation Over Time

Create a monitoring script:

Note: `ceph daemon` communicates via the local admin socket and only works for OSDs running on the same host. On a multi-node cluster, you need to run this script on each OSD host or use SSH.

```bash
#!/bin/bash
# Run this on each OSD host - ceph daemon only works for local OSDs
for OSD in $(ceph osd ls); do
  SCORE=$(ceph daemon osd.$OSD bluestore allocator score block 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('fragmentation_rating','N/A'))")
  echo "OSD $OSD: fragmentation_rating=$SCORE"
done
```

## Summary

BlueStore fragmentation develops naturally over time as objects are created and deleted. Monitoring fragmentation scores with `ceph daemon osd.X bluestore allocator score block`, setting appropriate `min_alloc_size` before OSD creation to match your workload, and periodically cycling heavily fragmented OSDs out-and-in keeps fragmentation manageable. For metadata-level fragmentation, triggering RocksDB compaction with `ceph daemon osd.X compact` provides partial relief without data movement.
