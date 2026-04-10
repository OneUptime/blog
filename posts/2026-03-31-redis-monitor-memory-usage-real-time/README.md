# How to Monitor Redis Memory Usage in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Memory, INFO, Performance

Description: Learn how to monitor Redis memory usage in real time using INFO memory, MEMORY STATS, and scripted polling to detect memory leaks and approaching limits.

---

Redis memory issues - slow eviction, OOM errors, or unexpected growth - are much easier to catch early with real-time monitoring. Redis exposes detailed memory metrics through several commands.

## INFO memory - Your Primary Tool

```bash
redis-cli INFO memory
```

Key fields to watch:

```text
used_memory:9126456832
used_memory_human:8.50G           <- total bytes allocated by Redis
used_memory_rss:10737418240
used_memory_rss_human:10.00G      <- OS-level memory (includes fragmentation)
used_memory_peak_human:11.20G     <- Highest ever reached
mem_fragmentation_ratio:1.18      <- RSS/used_memory; > 1.5 is problematic
maxmemory:12884901888
maxmemory_human:12.00G
maxmemory_policy:allkeys-lru
mem_allocator:libc
```

## Calculate Memory Headroom

```bash
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
```

If `used_memory` is above 80% of `maxmemory`, you're at risk of hitting the limit and triggering eviction or errors.

## Real-Time Polling Script

```python
import redis
import time

r = redis.Redis(host="127.0.0.1", port=6379)

def print_memory_stats():
    info = r.info("memory")
    used_mb = info["used_memory"] / 1024 / 1024
    rss_mb = info["used_memory_rss"] / 1024 / 1024
    max_mb = info.get("maxmemory", 0) / 1024 / 1024
    frag = info["mem_fragmentation_ratio"]
    pct = (used_mb / max_mb * 100) if max_mb > 0 else 0
    print(f"Used: {used_mb:.1f}MB | RSS: {rss_mb:.1f}MB | "
          f"Frag: {frag:.2f} | Limit: {pct:.1f}%")

while True:
    print_memory_stats()
    time.sleep(5)
```

## MEMORY STATS for Detailed Breakdown

```bash
redis-cli MEMORY STATS
```

This shows allocation by data type, overhead for the client list, replication buffers, and more.

```text
1) "peak.allocated"
2) (integer) 11205018160
3) "total.allocated"
4) (integer) 9126456832
5) "startup.allocated"
6) (integer) 868352
...
```

## Watch for Eviction Activity

```bash
redis-cli INFO stats | grep evict
```

```text
evicted_keys:42857
```

Rising `evicted_keys` means Redis is under memory pressure. Increase `maxmemory` or reduce data set size.

## Find Memory-Hungry Keys

```bash
# Show the largest keys
redis-cli --bigkeys

# Memory usage of a specific key
redis-cli MEMORY USAGE mykey
```

## Alert Thresholds

Set up alerts when:
- `used_memory / maxmemory > 0.85`
- `mem_fragmentation_ratio > 1.5`
- `evicted_keys` rate is increasing

## Summary

Monitor Redis memory in real time using `INFO memory` for key metrics including `used_memory`, `mem_fragmentation_ratio`, and memory usage as a percentage of `maxmemory`. Use `MEMORY STATS` for detailed allocator breakdown and `--bigkeys` to find the largest consumers. Alert when memory usage exceeds 85% of the configured limit or when eviction rates begin rising.
