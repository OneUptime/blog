# How Redis Memory Allocation Works (jemalloc)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Management, Jemalloc, Performance, Internal

Description: Understand how Redis uses jemalloc for memory allocation, why it was chosen over malloc, and how it affects memory usage and performance.

---

## Overview of Redis Memory Allocation

Redis manages memory with high efficiency because it relies on jemalloc, a general-purpose memory allocator originally created by Jason Evans for FreeBSD and later further developed at Facebook (Meta). Unlike the standard glibc malloc, jemalloc is designed to minimize fragmentation and improve performance for workloads with many small allocations - exactly the pattern Redis exhibits.

When you start a Redis instance, jemalloc is loaded as the default allocator on Linux. You can verify this by running:

```bash
redis-server --version
redis-cli INFO memory | grep mem_allocator
```

The output will show something like:

```text
mem_allocator:jemalloc-5.3.0
```

## Why Redis Chose jemalloc

Redis previously used libc malloc but switched to jemalloc for several reasons:

- Reduced memory fragmentation through size-class bucketing
- Better multi-threaded performance due to thread-local arenas
- Built-in memory profiling and statistics
- Predictable behavior under high allocation/deallocation rates

## How jemalloc Organizes Memory

jemalloc 5.x divides memory into two allocation categories based on size:

- Small allocations: up to approximately 14 KB, handled via thread-local caches and slab allocations (bins)
- Large allocations: above 14 KB, each managed as an individual extent within arenas

Note: jemalloc versions prior to 5.0 had a third "huge" category for allocations above 4 MB. This was merged into the large category in jemalloc 5.0.

Each arena maintains independent free lists, reducing lock contention in multi-threaded environments. jemalloc creates multiple arenas by default, typically four per CPU core.

```text
jemalloc Arena Layout:
  Arena 0  --> small bins --> large extents
  Arena 1  --> small bins --> large extents
  ...
```

## Monitoring jemalloc Memory Stats in Redis

Redis exposes jemalloc statistics through the INFO command:

```bash
redis-cli INFO memory
```

Key fields to watch:

```text
used_memory:1048576          # Memory allocated by Redis (jemalloc reported)
used_memory_rss:2097152      # RSS as reported by the OS
used_memory_peak:1200000     # Peak memory usage
mem_fragmentation_ratio:2.0  # RSS / used_memory - indicates fragmentation
```

A fragmentation ratio above 1.5 is a warning sign. The ratio reflects external fragmentation - memory held by the OS but not actively used by Redis data.

## Fragmentation and jemalloc Arenas

jemalloc can produce fragmentation in two forms:

1. Internal fragmentation - wasted space within allocated chunks due to size rounding
2. External fragmentation - memory returned by Redis to jemalloc but not released to the OS

You can inspect fragmentation detail using:

```bash
redis-cli MEMORY DOCTOR
redis-cli MEMORY STATS
```

Example output from MEMORY STATS:

```text
1) "peak.allocated"
2) (integer) 1234567
3) "total.allocated"
4) (integer) 987654
5) "active"
6) (integer) 1048576
7) "resident"
8) (integer) 2097152
```

## Tuning jemalloc Behavior

You can influence jemalloc behavior through Redis configuration and environment variables.

Enable active defragmentation to let Redis identify fragmented allocations using jemalloc APIs and reallocate them to reduce fragmentation:

```bash
CONFIG SET activedefrag yes
CONFIG SET active-defrag-ignore-bytes 100mb
CONFIG SET active-defrag-threshold-lower 10
CONFIG SET active-defrag-threshold-upper 100
```

For production environments, you can also set jemalloc-specific tuning via the `MALLOC_CONF` environment variable before launching Redis:

```bash
export MALLOC_CONF="narenas:4,dirty_decay_ms:1000,muzzy_decay_ms:0"
redis-server /etc/redis/redis.conf
```

Common tuning parameters:

```text
narenas:4              # Limit arena count to reduce memory overhead
dirty_decay_ms:1000    # Time before dirty pages are purged (ms)
muzzy_decay_ms:0       # Disable muzzy decay for faster memory return
```

## Inspecting jemalloc with redis-cli

Redis exposes detailed jemalloc stats via the MALLOC-STATS subcommand:

```bash
redis-cli MEMORY MALLOC-STATS
```

This prints a full jemalloc report including arena-level stats, bin sizes, and allocation counts. It is useful for diagnosing fragmentation patterns in long-running instances.

## jemalloc vs. Other Allocators

| Allocator | Fragmentation | Thread Safety | Redis Support |
|-----------|--------------|---------------|---------------|
| jemalloc  | Low          | High          | Default       |
| tcmalloc  | Medium       | High          | Optional      |
| libc malloc | High       | Medium        | Not recommended |

To build Redis with tcmalloc instead:

```bash
make MALLOC=tcmalloc
```

For most production deployments, jemalloc is the right choice and requires no changes from the default.

## Summary

Redis uses jemalloc as its default memory allocator because it minimizes fragmentation, scales well across CPU cores, and provides rich introspection. Understanding how jemalloc organizes memory into arenas and size classes helps you interpret Redis memory metrics accurately. Use the MEMORY STATS, MEMORY DOCTOR, and MEMORY MALLOC-STATS commands to monitor allocator behavior, and enable active defragmentation when fragmentation ratios become problematic.
