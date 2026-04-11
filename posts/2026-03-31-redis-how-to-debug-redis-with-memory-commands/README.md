# How to Debug Redis with MEMORY Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Debugging, MEMORY USAGE, MEMORY DOCTOR, Performance

Description: Use Redis MEMORY commands to diagnose memory issues, identify large keys, detect fragmentation, and optimize memory consumption in your Redis instance.

---

## Redis MEMORY Command Family

Redis 4.0+ provides a suite of MEMORY subcommands for deep memory introspection:

| Command | Purpose |
|---------|---------|
| `MEMORY USAGE key` | Memory used by a specific key |
| `MEMORY DOCTOR` | Diagnose memory issues |
| `MEMORY STATS` | Detailed memory statistics |
| `MEMORY MALLOC-STATS` | Raw allocator statistics |
| `MEMORY PURGE` | Release unused memory to the OS |

## MEMORY USAGE - Inspecting Individual Keys

```bash
# Check memory for a specific key (in bytes)
redis-cli MEMORY USAGE mykey

# Check with SAMPLES for nested structures (0 = entire structure)
redis-cli MEMORY USAGE myhash SAMPLES 0
```

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def check_key_memory(key: str) -> int:
    """Returns memory used by a key in bytes."""
    return r.memory_usage(key, samples=5) or 0

# Compare sizes
keys_to_check = ['session:abc123', 'product:catalog', 'leaderboard']
for key in keys_to_check:
    size = check_key_memory(key)
    print(f"{key}: {size:,} bytes ({size / 1024:.1f} KB)")
```

## Finding the Largest Keys

Scan the keyspace to find memory-hungry keys:

```python
import redis
import heapq

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def find_top_memory_keys(top_n=20, match='*', count=100):
    """Scan all keys and return the top N by memory usage."""
    key_sizes = []
    cursor = 0

    while True:
        cursor, keys = r.scan(cursor, match=match, count=count)
        for key in keys:
            size = r.memory_usage(key, samples=3) or 0
            if len(key_sizes) < top_n:
                heapq.heappush(key_sizes, (size, key))
            elif size > key_sizes[0][0]:
                heapq.heapreplace(key_sizes, (size, key))

        if cursor == 0:
            break

    return sorted(key_sizes, reverse=True)

top_keys = find_top_memory_keys(top_n=10)
print("Top 10 keys by memory usage:")
for size, key in top_keys:
    key_type = r.type(key)
    print(f"  {size / 1024:.1f} KB | {key_type} | {key}")
```

## MEMORY DOCTOR - Diagnosing Memory Problems

```bash
redis-cli MEMORY DOCTOR
```

Sample outputs and what they mean:

```text
"Sam, I have detected a few problems with your Redis instance memory consumption:
 * Peak memory: In the past this server used more than 150% the memory it is using now.
   The allocator is normally not able to release memory after a peak, so you
   can expect to see a big fragmentation ratio, however this is actually harmless
   and is a common and known behavior of the Redis allocator.
 * High allocator fragmentation: This instance has an allocator (libc) fragmentation
   ratio above 1.5."
```

Diagnosis codes:

```text
"jemalloc"    - Using jemalloc (good - lower fragmentation)
"High RSS"    - Resident Set Size much higher than used memory (fragmentation)
"Peak memory" - Memory was higher in the past (freed but not released to OS)
```

## MEMORY STATS - Full Memory Breakdown

```bash
redis-cli MEMORY STATS
```

```python
stats = r.memory_stats()
important_fields = {
    'total.allocated': 'Total memory allocated',
    'peak.allocated': 'Peak memory allocated',
    'startup.allocated': 'Startup memory allocated',
    'overhead.total': 'Total overhead',
    'dataset.bytes': 'Dataset size',
    'allocator-fragmentation.ratio': 'Allocator fragmentation ratio',
    'rss-overhead.ratio': 'RSS overhead ratio',
    'fragmentation': 'Overall fragmentation ratio',
}

for field, description in important_fields.items():
    value = stats.get(field, 'N/A')
    if isinstance(value, float):
        print(f"{description}: {value:.2f}")
    elif isinstance(value, int):
        print(f"{description}: {value / 1024 / 1024:.1f} MB")
    else:
        print(f"{description}: {value}")
```

## Interpreting Fragmentation Ratio

```bash
redis-cli INFO memory | grep fragmentation
```

```text
mem_fragmentation_ratio:1.92
```

| Ratio | Interpretation |
|-------|---------------|
| 1.0 - 1.5 | Normal |
| 1.5 - 2.0 | Elevated - consider MEMORY PURGE |
| > 2.0 | High - investigate allocator settings |
| < 1.0 | Memory swapping - serious performance issue |

## Triggering Memory Defragmentation

```bash
# Release unused memory to the OS (Redis 4.0+, jemalloc only)
redis-cli MEMORY PURGE

# Enable active defragmentation automatically
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-threshold-upper 50
```

## Monitoring Memory Over Time

```python
import time
import redis

r = redis.Redis(host='localhost', port=6379)

def monitor_memory(interval_seconds=60):
    while True:
        info = r.info('memory')
        used_mb = info['used_memory'] / 1024 / 1024
        rss_mb = info['used_memory_rss'] / 1024 / 1024
        frag = info.get('mem_fragmentation_ratio', 0)
        peak_mb = info['used_memory_peak'] / 1024 / 1024

        print(f"Used: {used_mb:.1f}MB | RSS: {rss_mb:.1f}MB | "
              f"Peak: {peak_mb:.1f}MB | Frag: {frag:.2f}")

        if frag > 2.0:
            print("WARNING: High fragmentation ratio!")

        time.sleep(interval_seconds)
```

## Summary

Redis MEMORY commands provide deep visibility into memory consumption at both the global and per-key level. Use `MEMORY USAGE` and scanning to identify large keys, `MEMORY DOCTOR` for guided diagnostics, and `MEMORY STATS` for a full breakdown of memory categories. Monitor fragmentation ratio regularly and enable active defragmentation if it climbs above 1.5. The most effective optimizations usually come from finding and right-sizing the largest keys.
