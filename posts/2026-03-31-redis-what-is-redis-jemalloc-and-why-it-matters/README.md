# What Is Redis Jemalloc and Why It Matters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Jemalloc, Memory, Performance, Allocator, Internal

Description: Understand why Redis uses jemalloc as its default memory allocator, how it reduces fragmentation, and what it means for your Redis deployment's memory efficiency.

---

## Overview

Redis uses jemalloc as its default memory allocator instead of the system's standard malloc (glibc malloc on Linux). This choice directly impacts memory efficiency, fragmentation behavior, and overall performance. Understanding jemalloc helps you interpret Redis memory metrics and make better capacity planning decisions.

## What Is jemalloc?

jemalloc (Jason Evans malloc) is a general-purpose memory allocator originally created by Jason Evans for FreeBSD and later further developed at Facebook (Meta). It was designed with several goals:

- Reduce heap fragmentation in long-running processes
- Scale efficiently across multiple CPU threads
- Provide detailed memory usage statistics

Redis bundles jemalloc and compiles it in by default. You can verify this:

```bash
redis-cli INFO server | grep mem_allocator
```

```text
mem_allocator:jemalloc-5.3.0
```

## Why Redis Chose jemalloc Over glibc malloc

### Problem: Fragmentation with glibc malloc

glibc malloc uses a segregated free list approach that can accumulate fragmentation over time. In a Redis workload with millions of keys being created and deleted at different sizes, glibc malloc tends to hold onto freed memory in small, non-contiguous chunks that are inefficient to reuse.

### How jemalloc Reduces Fragmentation

jemalloc organizes memory into size classes and arenas:

- **Size classes**: Allocations are rounded up to predetermined size classes (e.g., 8, 16, 32, 48, 64, 80, 96... bytes). This limits internal fragmentation.
- **Arenas**: Multiple independent memory pools (arenas) are maintained (typically 4x the number of CPUs), and threads are distributed across them. This reduces lock contention.
- **Extents**: Large contiguous memory regions managed within each arena.

```text
jemalloc size class examples (small bins):
8, 16, 32, 48, 64, 80, 96, 112, 128 bytes
160, 192, 224, 256 bytes
320, 384, 448, 512 bytes
...
```

When Redis allocates a 100-byte string, jemalloc rounds it to 112 bytes (the nearest size class). The 12 bytes of internal fragmentation is predictable and bounded.

## How jemalloc Affects Redis Memory Metrics

```bash
redis-cli INFO memory
```

```text
used_memory:52428800
used_memory_human:50.00M
used_memory_rss:65011712
used_memory_rss_human:62.00M
mem_fragmentation_ratio:1.24
mem_fragmentation_bytes:12582912
allocator_allocated:51380224
allocator_active:54525952
allocator_resident:65011712
allocator_frag_ratio:1.06
allocator_frag_bytes:3145728
allocator_rss_ratio:1.19
allocator_rss_bytes:10485760
```

Understanding these fields:

| Metric | Meaning |
|--------|---------|
| `used_memory` | Bytes Redis logically allocated |
| `used_memory_rss` | Physical memory Redis occupies (from OS) |
| `allocator_allocated` | Bytes jemalloc allocated to Redis |
| `allocator_active` | Bytes jemalloc has in active pages |
| `allocator_resident` | Bytes jemalloc holds from the OS (including cached) |
| `allocator_frag_ratio` | Internal jemalloc fragmentation |
| `mem_fragmentation_ratio` | Total ratio of RSS to used_memory |

## jemalloc's Role in Active Defragmentation

Redis's active defragmentation feature (activedefrag) relies on jemalloc-specific APIs to identify fragmented allocations and move them to less fragmented regions. This is why active defragmentation only works with jemalloc builds:

```bash
# Check if active defrag is supported
redis-cli CONFIG GET activedefrag

# Enable (requires jemalloc)
redis-cli CONFIG SET activedefrag yes
```

If Redis was compiled with a different allocator, attempting to enable activedefrag will fail.

## jemalloc Debugging and Statistics

jemalloc exposes detailed statistics accessible through Redis:

```bash
# Dump detailed jemalloc stats to Redis log
redis-cli MEMORY MALLOC-STATS
```

```text
___ Begin jemalloc statistics ___
Version: 5.3.0-0-g54eaed1d8b56b1aa528be3bdd1877e59c56fa90c
Build-time option settings
  config.malloc_conf: ""
Run-time option settings
  opt.abort: false
  opt.abort_conf: false
  opt.metadata_thp: disabled
  opt.retain: true
  opt.narenas: 8
  opt.lg_extent_max_active_fit: 6
  opt.junk: false
  opt.zero: false
  opt.tcache: true
  ...
```

## Memory Sizing Impact

Because jemalloc rounds allocations to size classes, the actual memory used is slightly higher than the sum of stored value sizes. For capacity planning:

```python
def estimate_redis_memory(num_keys: int, avg_key_size: int, avg_value_size: int) -> dict:
    """
    Estimate Redis memory usage accounting for jemalloc overhead.
    """
    JEMALLOC_OVERHEAD_FACTOR = 1.10  # Approximately 10% internal fragmentation
    REDIS_KEY_OVERHEAD = 64  # Bytes per key for Redis metadata (dict, expiry, etc.)

    raw_data_bytes = num_keys * (avg_key_size + avg_value_size)
    key_overhead_bytes = num_keys * REDIS_KEY_OVERHEAD

    logical_bytes = raw_data_bytes + key_overhead_bytes
    jemalloc_bytes = logical_bytes * JEMALLOC_OVERHEAD_FACTOR

    # Add typical 20-30% RSS overhead from jemalloc page caching
    rss_bytes = jemalloc_bytes * 1.25

    return {
        "logical_mb": logical_bytes / 1024 / 1024,
        "jemalloc_mb": jemalloc_bytes / 1024 / 1024,
        "estimated_rss_mb": rss_bytes / 1024 / 1024,
    }

result = estimate_redis_memory(
    num_keys=1_000_000,
    avg_key_size=30,
    avg_value_size=200
)
print(f"Logical: {result['logical_mb']:.0f} MB")
print(f"Estimated RSS: {result['estimated_rss_mb']:.0f} MB")
```

## Monitoring jemalloc Fragmentation

```bash
# Quick fragmentation check
redis-cli INFO memory | grep -E "mem_fragmentation_ratio|allocator_frag_ratio"

# If mem_fragmentation_ratio > 1.5, enable active defrag
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-cycle-max 25
```

## Summary

Redis uses jemalloc because its size-class-based allocation strategy produces predictable, bounded fragmentation compared to glibc malloc's tendency to accumulate fragmentation over time. jemalloc also enables Redis's active defragmentation feature, which reclaims fragmented memory without restarts. Understanding `mem_fragmentation_ratio` and the allocator metrics in `INFO memory` helps you diagnose memory inefficiency and decide when to enable defragmentation or resize your instance.
