# How to Defragment Redis Memory Online (activedefrag)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Defragmentation, Activedefrag, Performance, Operation

Description: Learn how to enable and tune Redis active defragmentation to reclaim fragmented memory without restarting the server or causing downtime.

---

## What Is Memory Fragmentation in Redis

Over time, Redis allocates and frees memory in patterns that leave gaps in the heap. The memory allocator (jemalloc) holds onto these gaps rather than returning them to the OS immediately. This causes the resident set size (RSS) to grow beyond what Redis actually needs for its data.

The fragmentation ratio is the key metric:

```bash
redis-cli INFO memory | grep mem_fragmentation_ratio
```

- Below 1.0: Redis is using more memory than allocated (likely swapping)
- 1.0 - 1.5: Healthy, normal fragmentation
- Above 1.5: Elevated fragmentation, defragmentation recommended
- Above 2.0: High fragmentation, active action needed

## What Is Active Defragmentation

Active defragmentation (activedefrag) is a Redis feature introduced in version 4.0 that runs incrementally in the background, moving live objects to fresh memory pages and freeing fragmented pages back to the OS. It operates online - no restart or fork required.

## Enabling Active Defragmentation

In redis.conf:

```text
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
active-defrag-threshold-upper 100
active-defrag-cycle-min 1
active-defrag-cycle-max 25
active-defrag-max-scan-fields 1000
```

Or enable at runtime without restarting:

```bash
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-threshold-upper 100
```

## Configuration Parameters Explained

```text
activedefrag yes
```
Enables the feature. Disabled by default.

```text
active-defrag-ignore-bytes 100mb
```
Minimum amount of fragmented memory before defrag kicks in. Prevents unnecessary CPU usage for small instances.

```text
active-defrag-threshold-lower 10
```
Fragmentation percentage (10%) at which defrag starts. Below this, defrag is idle.

```text
active-defrag-threshold-upper 100
```
Fragmentation percentage at which defrag runs at maximum effort.

```text
active-defrag-cycle-min 1
active-defrag-cycle-max 25
```
CPU percentage bounds for defrag cycles. Defrag scales between 1% and 25% CPU usage based on fragmentation severity.

```text
active-defrag-max-scan-fields 1000
```
Maximum number of set, hash, zset, or list fields that will be processed from the main dictionary scan.

## Monitoring Defragmentation Progress

Check whether defrag is active through INFO memory:

```bash
redis-cli INFO memory | grep active_defrag_running
```

- `active_defrag_running`: 0 if idle, or the CPU percentage defrag intends to utilize

Check defrag statistics through INFO stats:

```bash
redis-cli INFO stats | grep defrag
```

Key fields:

```text
active_defrag_hits:1234
active_defrag_misses:56
active_defrag_key_hits:890
active_defrag_key_misses:12
```

- `active_defrag_hits`: Allocations successfully moved to less fragmented pages
- `active_defrag_misses`: Number of aborted value reallocations started by the active defragmentation process
- `active_defrag_key_hits`: Number of keys that were actively defragmented
- `active_defrag_key_misses`: Number of keys that were skipped by the active defragmentation process

Monitor fragmentation ratio over time:

```bash
watch -n 5 'redis-cli INFO memory | grep -E "used_memory_human|used_memory_rss_human|mem_fragmentation_ratio"'
```

## Tuning for Production Workloads

For write-heavy workloads, be conservative with CPU:

```bash
redis-cli CONFIG SET active-defrag-cycle-max 10
```

For memory-critical environments where fragmentation must be aggressively controlled:

```bash
redis-cli CONFIG SET active-defrag-cycle-max 50
redis-cli CONFIG SET active-defrag-threshold-lower 5
```

Script to monitor and auto-adjust defrag aggressiveness:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def adjust_defrag():
    info = r.info('memory')
    frag_ratio = info.get('mem_fragmentation_ratio', 1.0)

    if frag_ratio > 2.0:
        # High fragmentation - increase defrag effort
        r.config_set('active-defrag-cycle-max', 50)
        r.config_set('active-defrag-threshold-lower', 5)
        print(f"High fragmentation ({frag_ratio:.2f}) - increased defrag effort")
    elif frag_ratio > 1.5:
        # Moderate - standard settings
        r.config_set('active-defrag-cycle-max', 25)
        r.config_set('active-defrag-threshold-lower', 10)
        print(f"Moderate fragmentation ({frag_ratio:.2f}) - standard defrag")
    else:
        # Low - minimal defrag
        r.config_set('active-defrag-cycle-max', 5)
        print(f"Low fragmentation ({frag_ratio:.2f}) - minimal defrag")

while True:
    adjust_defrag()
    time.sleep(300)
```

## When Active Defrag Is Not Enough

If fragmentation remains very high even with activedefrag enabled, consider:

1. Rolling restart: Restart replicas one at a time, allowing them to rebuild from the primary. The fresh process starts with clean memory.

```bash
# On a replica
redis-cli DEBUG RELOAD
# Or restart the process via systemd
systemctl restart redis
```

2. CONFIG RESETSTAT to reset defrag statistics (hits, misses, key_hits, key_misses) for a fresh baseline:

```bash
redis-cli CONFIG RESETSTAT
```

3. For extreme cases, triggering an RDB save and reload:

```bash
redis-cli DEBUG RELOAD
```

## Requirements and Limitations

- Active defragmentation requires jemalloc allocator (the default on Linux)
- Requires Redis 4.0 or newer
- Not available when Redis is compiled with libc malloc or tcmalloc
- Has small CPU overhead; tune cycle-max conservatively on CPU-constrained hosts

Verify jemalloc is in use:

```bash
redis-cli INFO memory | grep mem_allocator
# mem_allocator:jemalloc-5.3.0
```

## Summary

Redis active defragmentation (activedefrag) lets you reclaim fragmented memory online without restarting the server. Enable it with activedefrag yes and tune the threshold and cycle parameters based on your workload's fragmentation level and CPU budget. Monitor the mem_fragmentation_ratio and active_defrag_hits metrics to confirm defragmentation is working effectively. For persistent high fragmentation, combine activedefrag with periodic rolling restarts of replica nodes.
