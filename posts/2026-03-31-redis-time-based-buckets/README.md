# How to Implement Time-Based Buckets with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Time Series, Bucket, Analytics, Counter

Description: Design flexible time-based bucket strategies in Redis to support arbitrary resolutions from seconds to months in a single consistent pattern.

---

A robust time-series system needs to answer queries at multiple resolutions: the last 5 minutes of per-second data, the last hour by minute, the last 30 days by day. A consistent bucket key pattern lets you support all resolutions with the same code structure.

## Universal Bucket Key Function

Parameterize resolution rather than hard-coding it:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

RESOLUTIONS = {
    "1s":   1,
    "10s":  10,
    "1m":   60,
    "5m":   300,
    "1h":   3600,
    "1d":   86400,
}

TTLS = {
    "1s":   3600,       # 1 hour
    "10s":  86400,      # 24 hours
    "1m":   7 * 86400,  # 7 days
    "5m":   30 * 86400, # 30 days
    "1h":   90 * 86400, # 90 days
    "1d":   365 * 86400,# 1 year
}

def bucket_key(metric: str, resolution: str, ts: float = None) -> str:
    ts = ts or time.time()
    interval = RESOLUTIONS[resolution]
    bucket_ts = int(ts // interval) * interval
    return f"bucket:{metric}:{resolution}:{bucket_ts}"
```

## Recording Events at Multiple Resolutions

Write to multiple resolutions atomically with a pipeline:

```python
def record_event(metric: str, value: int = 1, resolutions: list = None):
    resolutions = resolutions or ["1m", "1h", "1d"]
    now = time.time()
    pipe = r.pipeline()
    for res in resolutions:
        key = bucket_key(metric, res, now)
        pipe.incrby(key, value)
        pipe.expire(key, TTLS[res])
    pipe.execute()
```

## Reading a Time Range

Given a resolution and time range, compute the expected bucket keys and fetch them:

```python
def get_range(metric: str, resolution: str, start_ts: float, end_ts: float) -> list:
    interval = RESOLUTIONS[resolution]
    start = int(start_ts // interval) * interval
    buckets = []
    ts = start
    while ts <= end_ts:
        buckets.append(ts)
        ts += interval

    pipe = r.pipeline()
    for b in buckets:
        pipe.get(f"bucket:{metric}:{resolution}:{b}")

    values = pipe.execute()
    return [
        {
            "ts": b,
            "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(b)),
            "value": int(v or 0),
        }
        for b, v in zip(buckets, values)
    ]
```

## Downsampling On Read

When you don't have pre-rolled lower resolutions, downsample on the fly by aggregating higher-resolution data:

```python
def downsample(metric: str, source_res: str, target_interval: int,
               start_ts: float, end_ts: float) -> list:
    fine = get_range(metric, source_res, start_ts, end_ts)
    buckets = {}
    for point in fine:
        bucket_ts = (point["ts"] // target_interval) * target_interval
        buckets.setdefault(bucket_ts, 0)
        buckets[bucket_ts] += point["value"]
    return [
        {"ts": k, "value": v}
        for k, v in sorted(buckets.items())
    ]
```

## Key Count Estimation

Estimate how many keys you'll need before choosing TTLs:

```text
1s resolution, 1h TTL:   3600 keys/metric
1m resolution, 7d TTL:   10080 keys/metric
1h resolution, 90d TTL:  2160 keys/metric
1d resolution, 1y TTL:   365 keys/metric
```

For 100 metrics at all 4 resolutions, that's roughly 1.6M keys - well within Redis capacity.

## Summary

A parameterized bucket key pattern unifies all time resolutions under the same data model. Recording events at multiple resolutions simultaneously with pipelines is cheap, and reading arbitrary time ranges is O(n) pipeline calls with no computation on the Redis side. This approach forms the foundation for custom time-series storage without a dedicated TSDB.
