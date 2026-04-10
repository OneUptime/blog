# What Is Redis Active Defragmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Defragmentation, Performance, Configuration, Optimization

Description: Learn what Redis active defragmentation is, how it reduces memory fragmentation at runtime, and how to configure it for production workloads.

---

## Overview

Redis stores data in memory using the jemalloc allocator. Over time, as keys are created and deleted at different sizes, the memory heap can become fragmented - meaning Redis holds more physical memory than the logical size of all stored data. Active defragmentation (activedefrag) is a Redis feature that compacts memory in the background without requiring a restart.

## What Is Memory Fragmentation?

Memory fragmentation occurs when free memory is scattered in small, non-contiguous chunks that cannot be efficiently reused. Redis reports fragmentation as a ratio:

```bash
redis-cli INFO memory | grep -E "mem_allocator|allocator_frag|mem_fragmentation"
```

```text
mem_allocator:jemalloc-5.3.0
allocator_frag_ratio:1.42
allocator_frag_bytes:15728640
mem_fragmentation_ratio:1.55
mem_fragmentation_bytes:18874368
```

Key metrics:
- `mem_fragmentation_ratio`: ratio of RSS (physical memory) to used_memory (logical). Values above 1.5 indicate significant fragmentation.
- `allocator_frag_ratio`: fragmentation inside the allocator's own arenas.
- `allocator_frag_bytes`: wasted bytes due to allocator fragmentation.

## How Active Defragmentation Works

When enabled, Redis continuously scans the keyspace in the background and moves live allocations to contiguous memory regions. This consolidates fragmented free space, reducing `mem_fragmentation_ratio` without requiring a restart or BGSAVE.

The process runs incrementally to minimize CPU impact:

1. Redis scans a portion of the keyspace per cycle.
2. For each key whose allocation is fragmented, it reallocates the value to a fresh contiguous region.
3. The old fragmented region is freed, making it available as consolidated free space.
4. The cycle repeats, throttled by CPU usage thresholds.

## Enabling Active Defragmentation

Active defragmentation requires jemalloc (the default allocator in official Redis builds).

```bash
# Enable at runtime
redis-cli CONFIG SET activedefrag yes

# Or in redis.conf
# activedefrag yes
```

Verify it is running:

```bash
redis-cli INFO memory | grep active_defrag
```

```text
active_defrag_running:1
active_defrag_hits:12450
active_defrag_misses:340
active_defrag_key_hits:8920
active_defrag_key_misses:210
```

## Configuration Options

```bash
# Configure active defragmentation thresholds and CPU usage
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-threshold-upper 100
redis-cli CONFIG SET active-defrag-cycle-min 1
redis-cli CONFIG SET active-defrag-cycle-max 25
redis-cli CONFIG SET active-defrag-max-scan-fields 1000
```

Configuration reference:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `active-defrag-ignore-bytes` | 100mb | Minimum fragmented bytes before starting |
| `active-defrag-threshold-lower` | 10 | Min fragmentation % to activate (10 = 10%) |
| `active-defrag-threshold-upper` | 100 | Max fragmentation % for max CPU usage |
| `active-defrag-cycle-min` | 1 | Min CPU % to use for defrag |
| `active-defrag-cycle-max` | 25 | Max CPU % to use for defrag |
| `active-defrag-max-scan-fields` | 1000 | Max hash/set/zset fields to scan per cycle |

## When to Enable Active Defragmentation

Enable active defragmentation when:
- `mem_fragmentation_ratio` consistently exceeds 1.5
- You have large numbers of short-lived keys
- Your workload involves frequent updates to variable-length values
- Memory pressure is causing evictions but actual data fits in RAM

Do not enable it when:
- Your Redis build does not use jemalloc
- CPU is already saturated (defrag adds CPU overhead)
- Fragmentation ratio is below 1.1 (defrag adds no value)

## Monitoring Defragmentation Progress

```python
import redis
import time

def monitor_defrag(host='localhost', port=6379, interval=30):
    r = redis.Redis(host=host, port=port, decode_responses=True)

    while True:
        mem = r.info('memory')

        frag_ratio = mem.get('mem_fragmentation_ratio', 0)
        frag_bytes = mem.get('mem_fragmentation_bytes', 0)
        defrag_running = mem.get('active_defrag_running', 0)
        defrag_hits = mem.get('active_defrag_hits', 0)

        print(f"Fragmentation ratio: {frag_ratio:.2f}")
        print(f"Fragmentation bytes: {frag_bytes / 1024 / 1024:.1f} MB")
        print(f"Defrag running: {defrag_running}")
        print(f"Defrag hits: {defrag_hits}")
        print("---")

        time.sleep(interval)
```

## Checking Defragmentation Effectiveness

```bash
# Before enabling defrag
redis-cli INFO memory | grep mem_fragmentation_ratio
# mem_fragmentation_ratio:1.82

# Enable defrag
redis-cli CONFIG SET activedefrag yes

# After 10-30 minutes on a busy instance
redis-cli INFO memory | grep mem_fragmentation_ratio
# mem_fragmentation_ratio:1.18
```

Fragmentation reduction is gradual and depends on write activity. On idle instances, defrag has nothing to move and the ratio will not change quickly.

## Summary

Redis active defragmentation reclaims wasted memory caused by allocator fragmentation by continuously moving live key data to contiguous memory regions in the background. It is especially useful for workloads with high key churn or variable-size values. Enable it when `mem_fragmentation_ratio` exceeds 1.5, and tune `active-defrag-cycle-max` to balance memory recovery against CPU overhead.
