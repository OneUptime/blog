# How to Track API Response Times in Real-Time with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, API, Latency, Performance, Real-Time

Description: Track API response time percentiles (p50, p95, p99) in real-time using Redis Sorted Sets and streaming histograms.

---

Tracking API latency is essential for SLA compliance. Redis Sorted Sets and Hashes give you the building blocks to compute real-time percentiles (p50, p95, p99) without heavy infrastructure.

## Recording Response Times

```python
import redis
import time
import uuid

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def record_response_time(endpoint: str, duration_ms: float):
    now = time.time()
    minute = int(now // 60)
    key = f"latency:{endpoint}:min:{minute}"

    pipe = r.pipeline()
    # Store with unique ID to allow duplicates
    pipe.zadd(key, {f"{duration_ms}:{uuid.uuid4()}": duration_ms})
    pipe.expire(key, 3600)
    pipe.execute()
```

## Computing Percentiles

```python
def get_percentile(endpoint: str, percentile: float,
                   window_minutes: int = 5) -> float:
    now = int(time.time())
    current_minute = now // 60

    # Merge recent minutes into a temp key
    keys = [f"latency:{endpoint}:min:{current_minute - i}"
            for i in range(window_minutes)]
    dest = f"latency:{endpoint}:merged_temp"

    pipe = r.pipeline()
    pipe.zunionstore(dest, keys)
    pipe.expire(dest, 60)
    pipe.zcard(dest)
    pipe.execute()

    total = r.zcard(dest)
    if total == 0:
        return 0.0

    idx = int(total * percentile / 100)
    idx = min(idx, total - 1)

    entries = r.zrange(dest, idx, idx, withscores=True)
    if entries:
        return entries[0][1]
    return 0.0

def get_latency_stats(endpoint: str) -> dict:
    return {
        "p50":  get_percentile(endpoint, 50),
        "p95":  get_percentile(endpoint, 95),
        "p99":  get_percentile(endpoint, 99),
        "p999": get_percentile(endpoint, 99.9),
    }
```

## Histogram Buckets for Dashboards

```python
BUCKETS_MS = [10, 25, 50, 100, 250, 500, 1000, 5000]

def record_histogram_bucket(endpoint: str, duration_ms: float):
    now = int(time.time())
    minute = now // 60
    bucket = next((b for b in BUCKETS_MS if duration_ms <= b), 9999)
    key = f"latency:{endpoint}:hist:min:{minute}"
    pipe = r.pipeline()
    pipe.hincrby(key, str(bucket), 1)
    pipe.expire(key, 3600)
    pipe.execute()

def get_histogram(endpoint: str) -> dict:
    now = int(time.time())
    minute = now // 60
    return r.hgetall(f"latency:{endpoint}:hist:min:{minute}")
```

## Detecting Latency Spikes

```python
def check_latency_sla(endpoint: str, sla_ms: float = 200.0) -> bool:
    p95 = get_percentile(endpoint, 95)
    return p95 <= sla_ms
```

## Monitoring

[OneUptime](https://oneuptime.com) integrates with custom metrics APIs - push your Redis-derived p99 latency values to OneUptime to trigger incidents when SLAs are breached.

```bash
redis-cli ZCARD "latency:api/checkout:min:$(date +%s | awk '{print int($1/60)}')"
```

## Summary

Redis Sorted Sets with response time as the score allow O(log N) percentile queries via ZRANGE. ZUNIONSTORE merges multiple minute keys into a rolling window for accurate percentiles. Histogram buckets in Hashes provide coarser but more memory-efficient latency distributions suitable for long-retention dashboards.
