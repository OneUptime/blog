# How to Monitor Redis RSS vs Used Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Monitoring, Operation

Description: Monitor the difference between Redis used_memory and RSS to detect fragmentation, swap usage, and OS-level memory pressure before they cause incidents.

---

`used_memory` and `used_memory_rss` are two different views of Redis memory. Tracking both, and their ratio, reveals fragmentation, swap usage, and copy-on-write pressure during RDB saves.

## The Two Memory Metrics

```bash
redis-cli INFO memory | grep -E "^used_memory"
```

```text
used_memory:           102400000   # bytes Redis allocated for data
used_memory_rss:       157286400   # bytes OS says the process uses (RSS)
used_memory_peak:      115000000   # highest used_memory ever recorded
used_memory_overhead:   5242880    # server baseline (not user data)
used_memory_dataset:   97157120    # used_memory minus overhead
```

Key relationship:

```text
used_memory_rss >= used_memory        (usually)
used_memory_rss < used_memory         (means Redis is swapping)
```

## Why RSS Exceeds Used Memory

Three main causes:

1. **Fragmentation** - freed memory returned to allocator but not OS
2. **Copy-on-write during BGSAVE** - forked child gets shared pages; any write causes a copy, increasing RSS of the parent
3. **OS page table overhead** - kernel tracks huge numbers of small allocations

```bash
# See all memory breakdown components
redis-cli MEMORY STATS
```

## Setting Up Continuous Monitoring

```python
import redis
import time
import csv
import sys

def monitor_rss_vs_used(r, duration_seconds=3600, interval=10):
    writer = csv.writer(sys.stdout)
    writer.writerow(["timestamp", "used_mb", "rss_mb", "ratio", "peak_mb"])

    end = time.time() + duration_seconds
    while time.time() < end:
        info = r.info("memory")
        used = info["used_memory"] / 1024 / 1024
        rss = info["used_memory_rss"] / 1024 / 1024
        peak = info["used_memory_peak"] / 1024 / 1024
        ratio = info.get("mem_fragmentation_ratio", rss / used if used > 0 else 0)

        writer.writerow([
            time.strftime("%Y-%m-%dT%H:%M:%S"),
            f"{used:.1f}", f"{rss:.1f}",
            f"{ratio:.2f}", f"{peak:.1f}"
        ])
        sys.stdout.flush()
        time.sleep(interval)

r = redis.Redis(decode_responses=True)
monitor_rss_vs_used(r, duration_seconds=300, interval=5)
```

## Detecting RDB BGSAVE RSS Spike

During `BGSAVE`, the forked child holds a copy-on-write snapshot. Heavy writes during the save window increase RSS:

```bash
# Watch RSS during a BGSAVE
redis-cli BGSAVE
watch -n 2 'redis-cli INFO | grep -E "used_memory_rss|rdb_bgsave_in_progress"'
```

Expected behavior: RSS jumps by up to `write_rate * save_duration * avg_object_size` bytes.

```python
def estimate_bgsave_rss_spike(r):
    info = r.info("memory")
    info_stats = r.info("stats")
    info_persistence = r.info("persistence")

    used_mb = info["used_memory"] / 1024 / 1024
    writes_per_sec = (
        info_stats.get("instantaneous_ops_per_sec", 0) * 0.3  # assume 30% writes
    )
    rdb_saves = info_persistence.get("rdb_last_bgsave_time_sec", 30)

    cow_estimate_mb = (writes_per_sec * rdb_saves * 200) / 1024 / 1024
    print(f"Used: {used_mb:.0f} MB")
    print(f"Estimated COW spike: {cow_estimate_mb:.0f} MB")
    print(f"Recommended maxmemory buffer: {used_mb + cow_estimate_mb:.0f} MB")
```

## Alerting Thresholds

```text
Metric                    Warning    Critical
mem_fragmentation_ratio   > 1.5      > 2.5
used_memory_rss           > 80% RAM  > 90% RAM
used_memory               > maxmemory * 0.85  >  maxmemory * 0.95
swap usage (VmSwap)       > 0        > 100 MB
```

```python
def check_memory_health(r):
    info = r.info("memory")
    ratio = info.get("mem_fragmentation_ratio", 1.0)
    rss_mb = info["used_memory_rss"] / 1024 / 1024
    used_mb = info["used_memory"] / 1024 / 1024

    alerts = []
    if ratio < 1.0:
        alerts.append(f"CRITICAL: Redis is swapping (ratio={ratio:.2f})")
    elif ratio > 2.5:
        alerts.append(f"CRITICAL: Severe fragmentation (ratio={ratio:.2f})")
    elif ratio > 1.5:
        alerts.append(f"WARNING: High fragmentation (ratio={ratio:.2f})")

    return alerts

for alert in check_memory_health(r):
    print(alert)
```

## Interpreting Memory Trend Patterns

```text
Pattern                              Diagnosis
used_memory growing, rss stable      Normal data growth
used_memory stable, rss growing      Fragmentation accumulating
both growing proportionally          Normal write-heavy load
rss drops suddenly                   Redis freed pages back to OS (rare)
used_memory spikes during BGSAVE     Normal COW overhead
ratio < 1.0                          Swap in use - urgent
```

## Summary

Monitor both `used_memory` and `used_memory_rss` together. The ratio reveals fragmentation (> 1.5) or swap usage (< 1.0). RSS spikes during BGSAVE are normal copy-on-write behavior - size your server with enough headroom for the peak. Set up alerting on the fragmentation ratio and absolute RSS as a percentage of available RAM.
