# How to Profile Memory Usage via Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Memory, Profiling, Performance

Description: Profile memory usage of Ceph daemons via the admin socket to identify memory leaks, oversized caches, and excessive heap allocation impacting cluster stability.

---

## Overview

Ceph daemons can consume significant memory, and unexpected growth often indicates cache misconfiguration, memory leaks, or excessive PG counts. The admin socket provides memory profiling commands including heap dump and cache introspection.

## Viewing Memory Usage Summary

```bash
# View memory allocator stats for an OSD
ceph daemon osd.0 dump_mempools

# Get detailed memory pool breakdown
ceph daemon osd.0 dump_mempools | python3 -m json.tool
```

## Understanding Memory Pools

Ceph uses named memory pools for major subsystems:

```bash
ceph daemon osd.0 dump_mempools | python3 -c "
import sys, json
data = json.load(sys.stdin)
pools = data.get('mempool', {}).get('by_pool', {})
total_bytes = 0
for pool_name, stats in sorted(pools.items()):
    bytes_used = stats.get('bytes', 0)
    items = stats.get('items', 0)
    if bytes_used > 1024*1024:  # Only show pools > 1MB
        print(f'{pool_name}: {bytes_used/1024/1024:.1f} MB ({items} items)')
        total_bytes += bytes_used
print(f'Total tracked: {total_bytes/1024/1024:.1f} MB')
"
```

Key memory pools include:
- `osd` - OSD operation buffers
- `buffer_anon` - anonymous buffers for network I/O
- `bluefs` - BlueStore filesystem metadata
- `bluestore_cache_data` - BlueStore data cache
- `bluestore_cache_onode` - BlueStore object node cache

## BlueStore Cache Memory

BlueStore's internal cache is a major memory consumer:

```bash
# Check BlueStore cache configuration
ceph daemon osd.0 config get bluestore_cache_size
ceph daemon osd.0 config get bluestore_cache_size_hdd
ceph daemon osd.0 config get bluestore_cache_size_ssd

# View current BlueStore cache stats
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "bluestore_cache"
```

## Heap Profiling with tcmalloc

If Ceph was compiled with tcmalloc (default in most distributions), you can take heap snapshots:

```bash
# Dump heap profile
ceph daemon osd.0 heap dump

# Get heap stats
ceph daemon osd.0 heap stats

# Release free memory back to the OS
ceph daemon osd.0 heap release
```

## Checking Total Process Memory

```bash
# Get OSD process memory from the OS
OSD_PID=$(systemctl show ceph-osd@0 --property=MainPID --value)
cat /proc/$OSD_PID/status | grep -E "VmRSS|VmPeak|VmSwap"

# For all OSDs
for osd in $(ceph osd ls); do
    PID=$(systemctl show ceph-osd@$osd --property=MainPID --value 2>/dev/null)
    if [ -n "$PID" ] && [ "$PID" != "0" ]; then
        RSS=$(grep VmRSS /proc/$PID/status 2>/dev/null | awk '{print $2}')
        echo "OSD $osd: ${RSS}kB RSS"
    fi
done
```

## Reducing Memory Usage

```bash
# Reduce BlueStore cache if OSD is OOM-killing
ceph config set osd bluestore_cache_size_hdd 1073741824   # 1GB for HDD OSDs
ceph config set osd bluestore_cache_size_ssd 3221225472   # 3GB for SSD OSDs

# Reduce OSD operation threads (reduces per-thread stack memory)
ceph config set osd osd_op_num_threads_per_shard 2

# Apply to running daemon
ceph daemon osd.0 config set bluestore_cache_size 1073741824
```

## Summary

Profiling Ceph OSD memory usage via the admin socket involves `dump_mempools` for pool-level breakdown, BlueStore cache configuration review, and heap profiling with tcmalloc. The most common memory optimization is reducing BlueStore cache sizes on memory-constrained hosts. Monitor process RSS via `/proc` to detect unexpected growth and correlate with the mempool breakdown to identify the responsible subsystem.
