# How to Use Redis Memory Fragmentation Ratio for Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Fragmentation, Diagnostic

Description: Interpret Redis mem_fragmentation_ratio values to diagnose memory fragmentation, distinguish it from real memory growth, and decide when to defragment.

---

The `mem_fragmentation_ratio` is one of the most important metrics in Redis `INFO memory`. It reveals the gap between how much memory Redis requested from the OS versus how much it is actually using for data.

## What the Fragmentation Ratio Means

```text
mem_fragmentation_ratio = used_memory_rss / used_memory
```

- `used_memory`: bytes Redis allocated for data (what jemalloc tracks)
- `used_memory_rss`: RSS (Resident Set Size) reported by the OS

```bash
redis-cli INFO memory | grep -E "used_memory:|mem_fragmentation"
```

Output:

```text
used_memory:102400000
used_memory_rss:157286400
mem_fragmentation_ratio:1.54
```

## Interpreting Ratio Values

```text
Ratio         Meaning
< 1.0         Redis is using swap memory (severe - check immediately)
1.0 - 1.1     Optimal - minimal fragmentation
1.1 - 1.5     Normal - moderate fragmentation, no action needed
1.5 - 2.0     Elevated - consider running activedefrag
> 2.0         High fragmentation - reclaim memory actively
> 3.0         Severe - restart or enable defrag with aggressive settings
```

## Detecting Real Memory Leak vs Fragmentation

This distinction is critical:

```python
import redis

r = redis.Redis(decode_responses=True)

def diagnose_memory(r):
    info = r.info("memory")
    used = info["used_memory"]
    rss = info["used_memory_rss"]
    keys = r.dbsize()
    ratio = info["mem_fragmentation_ratio"]

    print(f"Keys:              {keys:,}")
    print(f"Used memory:       {used / 1024 / 1024:.1f} MB")
    print(f"RSS:               {rss / 1024 / 1024:.1f} MB")
    print(f"Fragmentation:     {ratio:.2f}x")
    print(f"Wasted memory:     {(rss - used) / 1024 / 1024:.1f} MB")

    if ratio < 1.0:
        print("WARNING: Redis is swapping to disk")
    elif ratio > 2.0:
        print("ACTION: Enable activedefrag or schedule restart")
    elif ratio > 1.5:
        print("MONITOR: Fragmentation is elevated")
    else:
        print("OK: Normal fragmentation")

diagnose_memory(r)
```

## When Fragmentation Is Expected

High fragmentation is normal after:
- Bulk deletes that leave holes in the allocator's free lists
- AOF rewrite or RDB save that temporarily doubles memory
- Key eviction cycles that remove many small keys

```bash
# After bulk delete, fragmentation spikes
redis-cli DEL $(redis-cli KEYS "temp:*")
redis-cli INFO memory | grep mem_fragmentation_ratio
# Ratio jumps to 2.0+ - this is expected
```

## Enabling Active Defragmentation

```bash
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10   # start at 10% frag
redis-cli CONFIG SET active-defrag-threshold-upper 100  # max effort at 100%
```

Monitor defragmentation progress:

```bash
redis-cli INFO stats | grep active_defrag
```

Output:

```text
active_defrag_running:1
active_defrag_hits:1543
active_defrag_misses:12
active_defrag_key_hits:892
active_defrag_key_misses:3
```

## Tracking Fragmentation Over Time

```python
import time

def track_fragmentation(r, samples=10, interval=60):
    history = []
    for _ in range(samples):
        info = r.info("memory")
        history.append({
            "ts": time.time(),
            "ratio": info["mem_fragmentation_ratio"],
            "used_mb": info["used_memory"] / 1024 / 1024,
            "rss_mb": info["used_memory_rss"] / 1024 / 1024,
        })
        time.sleep(interval)

    ratios = [h["ratio"] for h in history]
    print(f"Min ratio: {min(ratios):.2f}")
    print(f"Max ratio: {max(ratios):.2f}")
    print(f"Avg ratio: {sum(ratios)/len(ratios):.2f}")
    return history
```

## Fragmentation vs Swap Detection

When the ratio is < 1.0, Redis is using swap, which is much worse than fragmentation:

```bash
# Check if Redis process is swapping
cat /proc/$(redis-cli INFO server | grep process_id | awk -F: '{print $2}' | tr -d '\r')/status | grep VmSwap
```

Swap causes dramatically higher latency. If you see ratio < 1.0:
1. Increase physical RAM
2. Reduce `maxmemory`
3. Disable swap: `swapoff -a`

## Summary

`mem_fragmentation_ratio` between 1.1 and 1.5 is normal. Above 1.5 means significant memory waste from fragmentation - enable `activedefrag` to reclaim it. Below 1.0 means Redis is using swap, which requires immediate attention. Track fragmentation after bulk deletes or eviction cycles as it predictably spikes in those scenarios.
