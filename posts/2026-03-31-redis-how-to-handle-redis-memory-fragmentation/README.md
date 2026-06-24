# How to Handle Redis Memory Fragmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Fragmentation, Performance, Operation

Description: Learn how to detect, diagnose, and fix Redis memory fragmentation using the mem_allocator_frag_ratio metric and active defragmentation settings.

---

## What Is Memory Fragmentation

Memory fragmentation occurs when Redis allocates and frees memory in patterns that leave gaps between live allocations. The allocator (jemalloc by default) cannot always reuse these gaps efficiently, so the OS-level memory used by Redis grows larger than the sum of the data it actually stores.

High fragmentation means Redis reports using (say) 8GB of RSS (Resident Set Size) but only 5GB of that is actual data. The extra 3GB is wasted due to fragmentation.

## Measuring Fragmentation

```bash
redis-cli INFO memory | grep -E "used_memory|mem_fragmentation|allocator_frag"
```

Sample output:
```text
used_memory:5368709120
used_memory_human:5.00G
used_memory_rss:8053063680
used_memory_rss_human:7.50G
mem_fragmentation_ratio:1.50
mem_fragmentation_bytes:2684354560
allocator_frag_ratio:1.48
allocator_frag_bytes:2550136832
allocator_rss_ratio:1.02
allocator_rss_bytes:134217728
```

Key metrics:
- `mem_fragmentation_ratio` - RSS / used_memory. Values > 1.5 indicate significant fragmentation.
- `mem_fragmentation_bytes` - absolute bytes wasted
- `allocator_frag_ratio` - fragmentation within the allocator's own pool

## Interpreting the Ratio

| Ratio | Interpretation |
|-------|----------------|
| < 1.0 | Redis is using swap (serious problem) |
| 1.0 - 1.1 | Normal, healthy |
| 1.1 - 1.5 | Moderate fragmentation, monitor |
| > 1.5 | High fragmentation, take action |
| > 2.0 | Severe, restart may be needed |

## Causes of High Fragmentation

1. **Write-heavy workloads** - Frequent SET/DEL cycles create holes in memory
2. **Expiring keys** - As keys expire, gaps form in the memory pool
3. **Large value updates** - Replacing a 1KB value with a 10KB value may not reuse the same memory block
4. **APPEND operations** - Repeated string appends cause reallocation

## Enabling Active Defragmentation

Redis 4.0+ supports active defragmentation (activedefrag), which runs in the background to compact memory:

```bash
# Enable active defragmentation
redis-cli CONFIG SET activedefrag yes

# Only defrag when fragmentation exceeds 10%
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10

# Become more aggressive above 25% fragmentation
redis-cli CONFIG SET active-defrag-threshold-upper 25

# CPU usage limits for defrag (percentage of Redis CPU time)
redis-cli CONFIG SET active-defrag-cycle-min 5
redis-cli CONFIG SET active-defrag-cycle-max 25
```

In `redis.conf`:
```text
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
active-defrag-threshold-upper 25
active-defrag-cycle-min 5
active-defrag-cycle-max 25
```

## Monitoring Active Defragmentation Progress

```bash
redis-cli INFO stats | grep defrag
```

```text
active_defrag_running:1
active_defrag_hits:1423782
active_defrag_misses:48291
active_defrag_key_hits:95847
active_defrag_key_misses:1293
```

## Reducing Fragmentation Without Restart

If active defragmentation is not sufficient, you can migrate data to a fresh instance:

```bash
# Option 1: Use redis-cli --rdb to create a snapshot and restore
redis-cli BGSAVE
# Wait for save to complete
redis-cli DEBUG RELOAD

# Option 2: Perform a live restart with RDB persistence
# 1. Ensure RDB is enabled in redis.conf
# 2. Trigger BGSAVE
redis-cli BGSAVE
# 3. Wait for LASTSAVE to update
# 4. Restart Redis - it will load fresh from RDB, compacting memory
```

## Preventing Fragmentation

1. Use consistent value sizes where possible
2. Avoid frequent DEL + SET cycles on the same keys
3. Use EXPIRE instead of manually deleting keys
4. Consider using hashes for objects instead of individual string keys
5. Tune jemalloc using the `jemalloc-bg-thread yes` option

```text
# redis.conf
jemalloc-bg-thread yes
```

This enables jemalloc's background purging thread, which periodically returns unused memory pages to the OS.

## Python Script to Monitor Fragmentation

```python
import redis
import time

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

def check_fragmentation():
    info = r.info('memory')
    ratio = info['mem_fragmentation_ratio']
    frag_bytes = info.get('mem_fragmentation_bytes', 0)
    used_mb = info['used_memory'] / 1024 / 1024
    rss_mb = info['used_memory_rss'] / 1024 / 1024

    print(f"Used: {used_mb:.1f}MB, RSS: {rss_mb:.1f}MB, Frag ratio: {ratio:.2f}")

    if ratio > 1.5:
        print("WARNING: High memory fragmentation detected!")
        if ratio > 2.0:
            print("CRITICAL: Consider enabling activedefrag or restarting Redis")

    return ratio

# Monitor every 60 seconds
while True:
    check_fragmentation()
    time.sleep(60)
```

## Summary

Memory fragmentation in Redis is measured by the `mem_fragmentation_ratio` metric. Ratios above 1.5 warrant action. Enable `activedefrag` in Redis 4.0+ to automatically compact memory in the background with minimal performance impact. For severe fragmentation, a controlled restart with RDB persistence will reload data into a compact memory layout.
