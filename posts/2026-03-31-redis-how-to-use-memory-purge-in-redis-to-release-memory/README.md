# How to Use MEMORY PURGE in Redis to Release Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Performance, Jemalloc, Optimization

Description: Learn how to use MEMORY PURGE in Redis to instruct the allocator to release unused memory pages back to the operating system, reducing RSS usage.

---

## What Is MEMORY PURGE?

`MEMORY PURGE` attempts to purge dirty pages from the memory allocator (typically jemalloc) and return them to the operating system. This can reduce the Resident Set Size (RSS) of the Redis process when there is fragmented or unused memory that the allocator is holding but Redis is not actively using.

It is a manual trigger for what the allocator would eventually do automatically (based on decay configuration), useful when you need to reclaim memory immediately.

## Basic Usage

```bash
MEMORY PURGE
# Returns: OK
```

The command returns immediately after instructing the allocator to purge. The actual memory release may take a moment to reflect in OS-level metrics.

## When Memory Purge Is Useful

Redis's RSS (reported by the OS) can be higher than its logical memory usage due to:

1. Memory fragmentation - allocator holding pages with sparse usage
2. Recent key deletions - memory returned to allocator but not yet to OS
3. After FLUSHDB/FLUSHALL - large amounts of memory freed but not released

```bash
# Check RSS before purge
redis-cli INFO memory | grep used_memory_rss
# used_memory_rss:52428800  (50 MB)

redis-cli INFO memory | grep used_memory:
# used_memory:20971520  (20 MB logical)

# Fragmentation ratio = 52428800 / 20971520 = 2.5 (high)

# Purge memory
redis-cli MEMORY PURGE

# Check RSS after purge
redis-cli INFO memory | grep used_memory_rss
# used_memory_rss:22020096  (21 MB - much closer to logical)
```

## Measuring the Effect

```bash
#!/bin/bash

echo "Before MEMORY PURGE:"
redis-cli INFO memory | grep -E "(used_memory:|used_memory_rss:|mem_fragmentation_ratio)"

redis-cli MEMORY PURGE

echo ""
echo "After MEMORY PURGE:"
redis-cli INFO memory | grep -E "(used_memory:|used_memory_rss:|mem_fragmentation_ratio)"
```

## MEMORY PURGE vs Active Defragmentation

| Feature | MEMORY PURGE | Active Defragmentation |
|---|---|---|
| Mechanism | Returns dirty pages to OS | Reorganizes allocations |
| Triggered | Manually | Automatically (background) |
| Fixes fragmentation | Partially | More thoroughly |
| Performance impact | Brief spike | Ongoing background cost |
| Config required | None | `activedefrag yes` |

For sustained fragmentation, enable active defragmentation:

```bash
CONFIG SET activedefrag yes
CONFIG SET active-defrag-ignore-bytes 100mb
CONFIG SET active-defrag-threshold-lower 10
CONFIG SET active-defrag-threshold-upper 100
```

## Allocator Decay Configuration

jemalloc automatically returns dirty pages to the OS based on a decay timer. You can configure this:

```bash
# Check current decay settings
CONFIG GET jemalloc-bg-thread

# Background jemalloc thread for proactive purging
CONFIG SET jemalloc-bg-thread yes
```

The decay time is typically set at compile time (10 seconds by default). `MEMORY PURGE` bypasses this timer for immediate effect.

## Python Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_memory_stats(r):
    info = r.info('memory')
    return {
        'used_memory': info['used_memory'],
        'used_memory_rss': info['used_memory_rss'],
        'fragmentation_ratio': info['mem_fragmentation_ratio'],
    }

# Before purge
before = get_memory_stats(r)
print(f"Before: RSS={before['used_memory_rss']:,} bytes, "
      f"Logical={before['used_memory']:,} bytes, "
      f"Fragmentation={before['fragmentation_ratio']:.2f}")

# Purge
r.memory_purge()

# After purge
after = get_memory_stats(r)
print(f"After:  RSS={after['used_memory_rss']:,} bytes, "
      f"Logical={after['used_memory']:,} bytes, "
      f"Fragmentation={after['fragmentation_ratio']:.2f}")

rss_saved = before['used_memory_rss'] - after['used_memory_rss']
print(f"RSS reduced by: {rss_saved:,} bytes ({rss_saved / 1024 / 1024:.1f} MB)")
```

## Automated Memory Purge on High Fragmentation

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

FRAGMENTATION_THRESHOLD = 1.5

while True:
    info = r.info('memory')
    ratio = info['mem_fragmentation_ratio']

    if ratio > FRAGMENTATION_THRESHOLD:
        print(f"High fragmentation detected: {ratio:.2f}. Purging...")
        r.memory_purge()

    time.sleep(60)
```

## Summary

`MEMORY PURGE` is a maintenance command that instructs Redis's memory allocator to release unused dirty pages back to the operating system, helping reduce RSS when fragmentation is high or after large data deletions. While it provides immediate relief, it does not reorganize internal allocations - for persistent fragmentation, enable active defragmentation with `activedefrag yes`. Use `MEMORY PURGE` as a targeted intervention after bulk operations like `FLUSHDB` or large key expirations.
