# How to Troubleshoot Redis Memory Fragmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Fragmentation, Jemalloc, Performance, Troubleshooting

Description: Diagnose high Redis memory fragmentation ratios, understand the jemalloc allocator behaviour, and reclaim fragmented memory with active defragmentation.

---

## What is Memory Fragmentation

Memory fragmentation in Redis occurs when the allocator (jemalloc by default) allocates memory in chunks that do not perfectly match the data sizes stored. Over time, after many allocations and deallocations, the physical memory held by Redis exceeds what the actual data requires.

The fragmentation ratio is:

```text
mem_fragmentation_ratio = used_memory_rss / used_memory
```

- Ratio 1.0 = perfect utilization, no fragmentation
- Ratio 1.0 - 1.5 = normal, acceptable range
- Ratio > 1.5 = high fragmentation, action recommended
- Ratio < 1.0 = Redis is using swap (much worse than fragmentation)

## Step 1 - Check Current Fragmentation

```bash
redis-cli INFO memory | grep -E 'used_memory_human|used_memory_rss_human|mem_fragmentation_ratio|mem_fragmentation_bytes|active_defrag'
```

Example output:

```text
used_memory_human:2.50G
used_memory_rss_human:4.00G
mem_fragmentation_ratio:1.60
mem_fragmentation_bytes:1610612736
active_defrag_running:0
```

`mem_fragmentation_bytes` shows the absolute waste in bytes (here 1.5GB).

## Step 2 - Identify the Cause

High fragmentation is commonly caused by:

1. Many keys with varying value sizes (allocator holds size-class buckets)
2. Frequent key deletions or expirations creating holes
3. Large keys that were reduced in size (SETRANGE, LPOP operations)
4. Sustained key churn over a long-running instance without restart

```bash
# Check key churn
redis-cli INFO stats | grep -E 'expired_keys|evicted_keys'

# Check whether fragmentation appeared after a specific event
redis-cli INFO server | grep uptime_in_seconds
```

## Step 3 - Enable Active Defragmentation

Redis 4.0+ includes an online defragmentation feature that incrementally moves data to reclaim fragmented memory without restarting:

```bash
redis-cli CONFIG SET activedefrag yes
```

Tune the defragmentation aggressiveness:

```bash
# Only start defrag when fragmentation exceeds 10% waste
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10

# Use maximum defrag effort when fragmentation reaches 100%
redis-cli CONFIG SET active-defrag-threshold-upper 100

# CPU usage limits for defrag
redis-cli CONFIG SET active-defrag-cycle-min 1
redis-cli CONFIG SET active-defrag-cycle-max 25
```

Monitor defragmentation progress:

```bash
redis-cli INFO memory | grep -E 'active_defrag|defrag'
```

```text
active_defrag_running:1
active_defrag_hits:12345
active_defrag_misses:100
active_defrag_key_hits:500
active_defrag_key_misses:10
```

## Step 4 - Force Defragmentation via Restart

If active defragmentation is too slow or not available, a Redis restart forces all memory to be reallocated compactly. Before restarting:

1. Ensure a replica is up-to-date
2. Use `BGSAVE` to create a current RDB snapshot
3. Restart the process

The RDB load compacts all data into fresh allocations.

```bash
redis-cli BGSAVE
# Wait for BGSAVE to complete
redis-cli LASTSAVE
# Restart (with replication the replica keeps serving)
systemctl restart redis
```

## Step 5 - Use MEMORY PURGE

Redis 4.0+ supports `MEMORY PURGE` which calls jemalloc's arena purge to return dirty pages to the OS:

```bash
redis-cli MEMORY PURGE
```

This may reduce `used_memory_rss` without affecting `used_memory` (actual data), improving the fragmentation ratio. It is a lightweight operation that does not move data.

## Step 6 - Consider Using libc Allocator for Low-Fragmentation Workloads

In some workloads, the libc allocator produces less fragmentation than jemalloc. This requires recompiling Redis, which is not practical for most deployments. The jemalloc allocator is generally preferred for Redis.

## Step 7 - Monitor Fragmentation Over Time

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

while True:
    info = r.info('memory')
    ratio = info['mem_fragmentation_ratio']
    waste = info.get('mem_fragmentation_bytes', 0)
    print(f"Fragmentation ratio: {ratio:.2f}, Waste: {waste / 1024 / 1024:.1f} MB")
    time.sleep(30)
```

Alert when `mem_fragmentation_ratio` exceeds 1.5 for more than 5 consecutive samples.

## Summary

Memory fragmentation above 1.5 means Redis is holding significantly more physical memory than necessary. Enable active defragmentation (`activedefrag yes`) to reclaim memory online, or schedule a Redis restart during low-traffic periods to force compact re-allocation. For monitoring, track both `mem_fragmentation_ratio` and `mem_fragmentation_bytes` since a large ratio on a small dataset may be less urgent than a moderate ratio on a 10GB dataset.
