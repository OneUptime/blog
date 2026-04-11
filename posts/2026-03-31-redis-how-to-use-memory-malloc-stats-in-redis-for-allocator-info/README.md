# How to Use MEMORY MALLOC-STATS in Redis for Allocator Info

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Allocator, Jemalloc, Performance

Description: Learn how to use MEMORY MALLOC-STATS in Redis to retrieve detailed memory allocator statistics for diagnosing fragmentation and allocation patterns.

---

## What Is MEMORY MALLOC-STATS?

`MEMORY MALLOC-STATS` returns a human-readable report generated directly by the memory allocator used by Redis (typically jemalloc). This report includes low-level details about memory arenas, bins, allocations, and fragmentation that are not available through standard `INFO memory` output.

It is primarily used for deep memory diagnostics and troubleshooting fragmentation issues.

## Basic Usage

```bash
MEMORY MALLOC-STATS
```

This returns a multi-line string. The exact format depends on the allocator - jemalloc output looks like:

```text
___ Begin jemalloc statistics ___
Version: 5.3.0-0-g54eaed1d8b56b1aa528be3bdd1877e59c56fa90c
Build-time option settings
  config.cache_oblivious: true
  config.debug: false
  ...
Run-time option settings
  opt.abort: false
  opt.narenas: 8
  opt.lg_extent_max_active_fit: 6
Arenas: 8
...
```

## Understanding the Output Sections

### Version and Build Options

```text
Version: 5.3.0
config.tcache: true
config.prof: false
```

Identifies the allocator version and compile-time options.

### Arena Statistics

Each arena in jemalloc handles memory independently, reducing contention in multi-threaded environments:

```text
Merged arena stats:
assigned threads: 8
uptime: 604800
dss: N/A
dirty decay time: 10000
muzzy decay time: 10000
pactive: 2048
pdirty: 128
pmuzzy: 64
mapped: 8388608
retained: 1048576
base: 425984
internal: 122880
tcache: 204800
resident: 8519680
```

Key fields:
- `pactive` - number of active pages
- `pdirty` - dirty pages not yet returned to OS
- `pmuzzy` - pages in lazy purge state
- `mapped` - total memory mapped from OS
- `resident` - physical memory usage

### Bin Statistics

Bins represent size classes for small allocations:

```text
bins: bin  size ind  allocated      nmalloc      ndalloc ...
         0    8   0      24576         3073         0 ...
         1   16   1      32768         2050         1 ...
```

## Using MEMORY MALLOC-STATS for Fragmentation Diagnosis

Compare jemalloc stats with Redis's own metrics:

```bash
# Get Redis memory view
redis-cli INFO memory | grep -E "(used_memory|mem_fragmentation)"
```

```text
used_memory:8500000
used_memory_rss:12000000
mem_fragmentation_ratio:1.41
```

```bash
# Get allocator's view
redis-cli MEMORY MALLOC-STATS | grep -E "(mapped|retained|resident)"
```

High fragmentation (ratio > 1.5) alongside high `pdirty` or `retained` in malloc-stats suggests memory is not being returned to the OS efficiently.

## Comparing with MEMORY DOCTOR

For a high-level diagnosis, use `MEMORY DOCTOR` first, then drill into `MEMORY MALLOC-STATS` for details:

```bash
# High-level diagnosis
MEMORY DOCTOR
# "Hi Sam, I can't find any memory issues in your instance. I am Lorenzo, Redis' internal memory monitoring tool. Nice to meet you."

# If fragmentation is reported, get details
MEMORY MALLOC-STATS
```

## Python Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Get malloc stats
stats = r.memory_malloc_stats()
print(stats)

# Parse key metrics from the output
lines = stats.split('\n')
for line in lines:
    if any(keyword in line for keyword in ['mapped:', 'retained:', 'resident:', 'pdirty:']):
        print(line.strip())
```

## When to Use MEMORY MALLOC-STATS

| Situation | Use This |
|---|---|
| Quick memory overview | `INFO memory` |
| High-level memory health | `MEMORY DOCTOR` |
| Key-level memory usage | `MEMORY USAGE key` |
| Allocator internals / fragmentation | `MEMORY MALLOC-STATS` |
| Release fragmented memory | `MEMORY PURGE` |

## Triggering Active Defragmentation

If `MEMORY MALLOC-STATS` shows high fragmentation and many dirty pages:

```bash
# Enable active defragmentation
CONFIG SET activedefrag yes

# Or manually purge allocator memory
MEMORY PURGE
```

## Summary

`MEMORY MALLOC-STATS` exposes the raw allocator-level view of Redis memory usage, providing details on arenas, bins, dirty pages, and retained memory that standard metrics do not capture. It is most valuable when diagnosing memory fragmentation issues, understanding allocator behavior under specific workloads, or correlating jemalloc-reported usage with OS-level resident memory. Use it alongside `INFO memory` and `MEMORY DOCTOR` for comprehensive memory health analysis.
