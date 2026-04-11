# How to Implement Hourly Aggregation with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Aggregation, Time Series, Analytics, Counter

Description: Aggregate minute-level Redis counters into hourly summaries using scheduled rollup scripts to reduce memory usage and speed up trend queries.

---

Keeping 60 minute-level keys per metric per hour works fine short-term, but reading 720 keys to display the last 12 hours adds up. Hourly aggregation rolls up minute counters into a single key, making long-range queries fast and freeing memory from expired fine-grained data.

## Hourly Key Convention

Use a consistent key format that encodes the hour:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def hour_bucket(ts: float = None) -> str:
    ts = ts or time.time()
    return time.strftime("%Y%m%d%H", time.gmtime(ts))

def minute_bucket(ts: float = None) -> str:
    ts = ts or time.time()
    return time.strftime("%Y%m%d%H%M", time.gmtime(ts))
```

## Rolling Up Minutes to Hours

A rollup function sums all 60 minute buckets for a given hour:

```python
def rollup_hour_to_redis(metric: str, hour_ts: float) -> int:
    hour = hour_bucket(hour_ts)
    hour_key = f"hourly:{metric}:{hour}"

    # Only roll up if not already done
    if r.exists(hour_key):
        return int(r.get(hour_key) or 0)

    total = 0
    pipe = r.pipeline()
    for minute_offset in range(60):
        ts = hour_ts + (minute_offset * 60)
        mkey = f"counter:{metric}:{minute_bucket(ts)}"
        pipe.get(mkey)

    results = pipe.execute()
    total = sum(int(v or 0) for v in results)

    r.set(hour_key, total)
    r.expire(hour_key, 30 * 86400)  # keep 30 days of hourly data
    return total
```

## Scheduled Rollup Script

Run the rollup at the top of each hour using a cron job or scheduler:

```python
def run_hourly_rollup(metrics: list):
    # Roll up the previous complete hour
    last_hour_ts = time.time() - 3600
    last_hour_ts = (last_hour_ts // 3600) * 3600  # snap to hour boundary

    for metric in metrics:
        total = rollup_hour_to_redis(metric, last_hour_ts)
        hour = hour_bucket(last_hour_ts)
        print(f"Rolled up {metric}:{hour} = {total}")
```

Cron entry to run at minute 5 of each hour (giving minute counters time to finalize):

```bash
5 * * * * /usr/bin/python3 /opt/scripts/hourly_rollup.py >> /var/log/rollup.log 2>&1
```

## Reading Hourly Trends

Fetch multiple hours in one pipeline call:

```python
def get_last_n_hours(metric: str, n: int = 24) -> list:
    now = time.time()
    pipe = r.pipeline()
    hours = []
    for i in range(n):
        ts = now - (i * 3600)
        ts = (ts // 3600) * 3600
        hour = hour_bucket(ts)
        pipe.get(f"hourly:{metric}:{hour}")
        hours.append(time.strftime("%Y-%m-%d %H:00", time.gmtime(ts)))

    values = pipe.execute()
    return [
        {"hour": h, "count": int(v or 0)}
        for h, v in zip(reversed(hours), reversed(values))
    ]
```

## Storing Min, Max, and Average

Enrich hourly summaries with statistics using a hash:

```python
def rollup_hour_with_stats(metric: str, hour_ts: float):
    hour = hour_bucket(hour_ts)
    key = f"hourly_stats:{metric}:{hour}"

    values = []
    for m in range(60):
        ts = hour_ts + m * 60
        v = r.get(f"counter:{metric}:{minute_bucket(ts)}")
        if v:
            values.append(int(v))

    if values:
        r.hset(key, mapping={
            "sum": sum(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "count": len(values),
        })
        r.expire(key, 30 * 86400)
```

## Summary

Hourly aggregation in Redis reduces long-range query complexity from O(n*60) keys to O(n) keys. A scheduled rollup script sums minute buckets into hourly totals with a 30-day TTL. Enriching with min, max, and average statistics makes hourly data useful for trend analysis and capacity planning dashboards.
