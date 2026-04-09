# How to Plan RAM Requirements for Ceph Monitors and OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RAM, Memory, Hardware, OSD, Monitor, Capacity Planning

Description: Calculate RAM requirements for Ceph monitors and OSDs based on cluster size, OSD count, workload patterns, and BlueStore cache configuration for optimal performance.

---

## Overview

RAM is often the most critical hardware resource for Ceph performance. Insufficient RAM leads to OSD thrashing, monitor OOM kills, and degraded cluster performance. This guide covers memory sizing for both monitors and OSD nodes.

## Monitor Memory Requirements

Monitor RAM scales with cluster size:

| Cluster Size | Monitor RAM |
|-------------|-------------|
| Up to 50 OSDs | 1-2 GB |
| 50-500 OSDs | 4-8 GB |
| 500-1000 OSDs | 8-16 GB |
| 1000+ OSDs | 16-32 GB |

Monitors store the cluster map in memory. Larger clusters with more OSD history require more RAM.

## Step 1 - Calculate OSD RAM (BlueStore)

BlueStore uses a write-ahead log (WAL) and metadata cache:

```bash
# Default BlueStore cache size
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config get osd bluestore_cache_autotune
# Default: true (auto-scales with available RAM)

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config get osd osd_memory_target
# Default: 4294967296 (4 GB)
```

The minimum is 2 GB per OSD, the recommended is 4-8 GB per OSD.

## Step 2 - Per-OSD Memory Breakdown

```text
BlueStore write buffer: 256 MB - 1 GB
BlueStore RocksDB cache: 1-2 GB
BlueStore data cache (auto): remaining memory target
ceph-osd process overhead: 512 MB
Kernel buffer cache (shared): benefits from additional RAM
```

## Step 3 - Calculate Total Node RAM

```bash
#!/bin/bash
NUM_OSDS=12
RAM_PER_OSD=4  # GB
OS_RAM=4       # GB for OS and kernel
MONITORS=2     # GB if monitors co-located
MANAGERS=2     # GB if managers co-located

TOTAL=$((NUM_OSDS * RAM_PER_OSD + OS_RAM + MONITORS + MANAGERS))
echo "Minimum RAM for ${NUM_OSDS} OSDs: ${TOTAL} GB"

# Add 20% safety margin
RECOMMENDED=$(echo "$TOTAL * 1.2" | bc | cut -d. -f1)
echo "Recommended RAM: ${RECOMMENDED} GB"
```

Example for 12 OSD node:

```text
12 OSDs x 4 GB = 48 GB
OS/kernel = 4 GB
Monitors = 2 GB
Managers = 2 GB
Total minimum = 56 GB -> use 64 GB
```

## Step 4 - Set the OSD Memory Target

Tune BlueStore memory usage based on available RAM:

```bash
# For nodes with 64 GB RAM and 12 OSDs
# Available per OSD: (64 - 8 system) / 12 = ~4.7 GB

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_memory_target 5368709120  # 5 GB
```

Or set per OSD in the Rook CephCluster spec:

```yaml
spec:
  cephConfig:
    osd:
      osd_memory_target: "5368709120"
```

## Step 5 - Monitor Memory Usage

```bash
# Check actual OSD memory usage via heap stats (requires TCMalloc)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph tell osd.* heap stats

# Check from the OS
ps aux | grep ceph-osd | awk '{sum += $6} END {print sum/1024/1024 " GB"}'
```

## Step 6 - MDS Memory for CephFS

MDS daemons cache metadata and require significant RAM:

| Working Set Size | MDS RAM |
|-----------------|---------|
| < 1 million inodes | 4-8 GB |
| 1-10 million inodes | 8-32 GB |
| 10+ million inodes | 64+ GB |

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_memory_limit 8589934592  # 8 GB
```

## Step 7 - RGW Memory Considerations

Each RGW worker thread uses approximately 256-512 MB:

```yaml
spec:
  gateway:
    instances: 2
    # Each instance with 4 workers = ~2 GB RAM
```

## Summary

RAM sizing for Ceph is driven primarily by OSD count at 4-8 GB per OSD as the base requirement. Monitor RAM scales logarithmically with cluster size. For production clusters, always provision 20-30% more RAM than the calculated minimum to accommodate BlueStore cache growth, recovery operations, and avoid OOM situations. Enabling BlueStore's memory auto-tuning helps optimize cache allocation across all OSDs on a node.
