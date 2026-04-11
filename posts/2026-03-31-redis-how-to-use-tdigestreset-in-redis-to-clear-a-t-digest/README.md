# How to Use TDIGEST.RESET in Redis to Clear a T-Digest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, T-Digest, Reset, Data Management, Time Window

Description: Learn how to use TDIGEST.RESET in Redis to clear all samples from a T-Digest while preserving the structure, ideal for rolling time windows.

---

## What Is TDIGEST.RESET?

`TDIGEST.RESET` clears all data from a T-Digest structure, removing all samples and resetting counters to zero - while keeping the structure itself intact with its original compression setting. This is more efficient than deleting and recreating the key.

It is commonly used to implement rolling time windows, periodic resets, or to clear test data.

## Syntax

```text
TDIGEST.RESET key
```

## Basic Usage

```bash
TDIGEST.CREATE api:latency COMPRESSION 200
TDIGEST.ADD api:latency 45 52 38 61 44 55 48 67

# Check state before reset
TDIGEST.INFO api:latency
# Merged weight: 8, Merged nodes: 8

# Reset all data
TDIGEST.RESET api:latency
# Returns: OK

# Check state after reset
TDIGEST.INFO api:latency
# Merged weight: 0, Merged nodes: 0

# Queries return nan after reset
TDIGEST.QUANTILE api:latency 0.99
# Returns: "nan"
```

## Implementing Rolling Minute Windows

A common use case is resetting the T-Digest every minute for fresh per-minute statistics:

```bash
# Each minute, record metrics and then reset for the next window
TDIGEST.CREATE metrics:per_minute COMPRESSION 200

# ... add samples throughout the minute ...

# At end of minute: query, store results, then reset
TDIGEST.QUANTILE metrics:per_minute 0.5 0.95 0.99
# Store these results to a time series or monitoring system

# Reset for next minute
TDIGEST.RESET metrics:per_minute
```

## Python Example: Sliding Window Metrics Collection

```python
import redis
import time
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
r.execute_command("TDIGEST.CREATE", "realtime:latency", "COMPRESSION", 200)

def record_request_latency(latency_ms: float):
    """Record a request latency measurement."""
    r.execute_command("TDIGEST.ADD", "realtime:latency", str(latency_ms))

def flush_and_reset() -> dict:
    """Get current percentiles and reset for next window."""
    results = r.execute_command("TDIGEST.QUANTILE", "realtime:latency", "0.5", "0.95", "0.99")
    info = r.execute_command("TDIGEST.INFO", "realtime:latency")
    info_dict = dict(zip(info[::2], info[1::2]))
    total = float(info_dict.get("Merged weight", 0))

    snapshot = {
        "timestamp": time.time(),
        "count": total,
        "p50": float(results[0]) if results[0] else None,
        "p95": float(results[1]) if results[1] else None,
        "p99": float(results[2]) if results[2] else None,
    }

    # Reset the digest for the next window
    r.execute_command("TDIGEST.RESET", "realtime:latency")
    return snapshot

# Simulate recording some latencies
import random
for _ in range(100):
    latency = random.expovariate(0.03)
    record_request_latency(round(latency, 2))

# Flush window
stats = flush_and_reset()
print(f"Window stats: count={stats['count']}, p50={stats['p50']:.1f}ms, p99={stats['p99']:.1f}ms")

# Digest is now empty
sample_count_after = r.execute_command("TDIGEST.INFO", "realtime:latency")
```

## RESET vs DEL

| Operation | Effect | Structure Preserved |
|-----------|--------|-------------------|
| TDIGEST.RESET | Clears all samples, keeps compression | Yes |
| DEL key | Removes the key entirely | No |

```bash
# Use RESET when you want to reuse the structure
TDIGEST.RESET my_digest   # Structure remains with same compression

# Use DEL when you no longer need it
DEL my_digest             # Key is gone, must TDIGEST.CREATE again
```

## Multi-Key Reset for Multiple Metrics

```python
def reset_all_metrics(key_pattern: str):
    """Reset all T-Digest keys matching a pattern."""
    keys = r.keys(key_pattern)
    if not keys:
        return 0

    pipeline = r.pipeline()
    for key in keys:
        pipeline.execute_command("TDIGEST.RESET", key)
    pipeline.execute()
    return len(keys)

# Reset all per-endpoint latency trackers
count = reset_all_metrics("latency:endpoint:*")
print(f"Reset {count} T-Digest structures")
```

## Periodic Reset with Scheduling

```python
import threading

def periodic_reset(interval_seconds: int):
    """Periodically reset a T-Digest on a timer."""
    def _reset_loop():
        while True:
            time.sleep(interval_seconds)
            stats = flush_and_reset()
            # Persist stats to database or metrics system
            print(f"[{time.strftime('%H:%M:%S')}] Flushed: {stats}")

    thread = threading.Thread(target=_reset_loop, daemon=True)
    thread.start()
    return thread

# Reset every 60 seconds
reset_thread = periodic_reset(60)
```

## Summary

`TDIGEST.RESET` efficiently clears all samples from a Redis T-Digest while preserving the structure and its compression setting. It is the preferred method for implementing rolling time windows, periodic metric snapshots, and test data cleanup. Use it instead of DEL when you plan to reuse the same T-Digest key, avoiding the overhead of recreating the structure with `TDIGEST.CREATE`.
