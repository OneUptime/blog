# How to Implement Approximate Counting with Redis HyperLogLog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HyperLogLog, Cardinality, Analytics, Approximation

Description: Count unique visitors, devices, or events at massive scale with Redis HyperLogLog using just 12KB of memory per counter regardless of cardinality.

---

Counting distinct values at scale is expensive with exact methods - storing every unique user ID for billions of visits requires gigabytes of memory. HyperLogLog is a probabilistic algorithm that estimates cardinality within 0.81% error using only 12KB of memory, regardless of how many distinct values you've seen.

## Adding Elements

`PFADD` adds one or more elements to a HyperLogLog and returns 1 if the internal representation changed:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def track_unique_visitor(page: str, user_id: str) -> bool:
    key = f"uv:{page}"
    changed = r.pfadd(key, user_id)
    return bool(changed)

def track_unique_device(session_id: str, device_fingerprint: str):
    r.pfadd(f"devices:{session_id}", device_fingerprint)
```

## Counting Distinct Values

`PFCOUNT` returns the estimated cardinality:

```python
def get_unique_visitors(page: str) -> int:
    return r.pfcount(f"uv:{page}")

# Pass multiple keys to get the union cardinality
def get_unique_across_pages(pages: list) -> int:
    keys = [f"uv:{p}" for p in pages]
    return r.pfcount(*keys)
```

## Daily and Weekly Unique Counts

Combine with time-bucketed keys for time-window unique counting:

```python
import time

def track_daily_unique(metric: str, user_id: str):
    day = time.strftime("%Y%m%d", time.gmtime())
    key = f"daily_uv:{metric}:{day}"
    r.pfadd(key, user_id)
    r.expire(key, 30 * 86400)

def get_daily_unique(metric: str, day: str = None) -> int:
    day = day or time.strftime("%Y%m%d", time.gmtime())
    return r.pfcount(f"daily_uv:{metric}:{day}")

def get_weekly_unique(metric: str) -> int:
    now = time.time()
    keys = []
    for i in range(7):
        day = time.strftime("%Y%m%d", time.gmtime(now - i * 86400))
        keys.append(f"daily_uv:{metric}:{day}")
    return r.pfcount(*keys)
```

## Merging HyperLogLogs

`PFMERGE` combines multiple HyperLogLogs into one without double-counting:

```python
def compute_monthly_unique(metric: str, year_month: str):
    # year_month format: "202603"
    year = int(year_month[:4])
    month = int(year_month[4:])
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    source_keys = [
        f"daily_uv:{metric}:{year_month}{d:02d}"
        for d in range(1, days_in_month + 1)
    ]
    dest_key = f"monthly_uv:{metric}:{year_month}"
    r.pfmerge(dest_key, *source_keys)
    r.expire(dest_key, 365 * 86400)
    return r.pfcount(dest_key)
```

## Memory Comparison

```text
Exact set with 1M users:   ~50MB (~50 bytes per entry with Redis overhead)
HyperLogLog with 1M users: 12KB (fixed size)
Savings:                    ~4000x
```

## When to Use HyperLogLog vs Sets

```text
Use HyperLogLog when:
- You only need the count, not the member list
- Cardinality > 10,000
- Memory is a constraint

Use Sets when:
- You need to check membership (SISMEMBER)
- Cardinality < 10,000
- You need exact counts without error margin
```

## Summary

Redis HyperLogLog provides approximate cardinality counting with 0.81% error and a fixed 12KB memory footprint per counter. PFADD, PFCOUNT, and PFMERGE handle ingestion, querying, and aggregation across time windows. For analytics use cases where exact uniqueness is not critical, HyperLogLog is orders of magnitude more memory-efficient than storing actual member sets.
