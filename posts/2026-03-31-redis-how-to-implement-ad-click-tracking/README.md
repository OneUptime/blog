# How to Implement Ad Click Tracking with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ad Tracking, Counter

Description: Learn how to use Redis counters and sorted sets to build a fast, scalable ad click tracking system with real-time analytics.

---

Ad click tracking needs to be blazing fast - a slow tracker hurts page load times and skews your data. Redis is a natural fit because it can handle millions of increments per second with sub-millisecond latency.

## Data Model

For each ad, you need to track total clicks, unique clicks, and clicks over time. Use a combination of Redis data structures:

```bash
# Total click counter for an ad
INCR ad:clicks:{ad_id}

# Unique clicks using HyperLogLog (memory-efficient approximation)
PFADD ad:unique:{ad_id} {user_id}
PFCOUNT ad:unique:{ad_id}

# Store click metadata in a hash
HSET ad:meta:{ad_id} title "Summer Sale" campaign_id "camp_123"
```

## Recording a Click

When a user clicks an ad, record the event atomically using a Lua script or pipeline:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def record_click(ad_id: str, user_id: str, campaign_id: str):
    pipe = r.pipeline()

    # Increment total click counter
    pipe.incr(f"ad:clicks:{ad_id}")

    # Track unique users via HyperLogLog
    pipe.pfadd(f"ad:unique:{ad_id}", user_id)

    # Hourly bucket for time-series data
    hour_bucket = int(time.time() // 3600)
    pipe.incr(f"ad:clicks:{ad_id}:hour:{hour_bucket}")
    pipe.expire(f"ad:clicks:{ad_id}:hour:{hour_bucket}", 7 * 24 * 3600)  # 7 days TTL

    # Campaign-level aggregation
    pipe.incr(f"campaign:clicks:{campaign_id}")

    pipe.execute()
    return True
```

## Top Ads Leaderboard

Use a sorted set to maintain a real-time leaderboard of the most-clicked ads:

```python
def record_click_with_leaderboard(ad_id: str, user_id: str, campaign_id: str):
    pipe = r.pipeline()
    pipe.incr(f"ad:clicks:{ad_id}")
    pipe.pfadd(f"ad:unique:{ad_id}", user_id)

    # Add to daily sorted set for leaderboard (score = click count)
    today_key = f"ad:leaderboard:{time.strftime('%Y-%m-%d')}"
    pipe.zincrby(today_key, 1, ad_id)
    pipe.expire(today_key, 30 * 24 * 3600)  # 30 days

    pipe.execute()

def get_top_ads(n: int = 10) -> list:
    # Highest scores first
    today_key = f"ad:leaderboard:{time.strftime('%Y-%m-%d')}"
    return r.zrevrange(today_key, 0, n - 1, withscores=True)
```

## Retrieving Click Stats

```python
def get_ad_stats(ad_id: str) -> dict:
    pipe = r.pipeline()
    pipe.get(f"ad:clicks:{ad_id}")
    pipe.pfcount(f"ad:unique:{ad_id}")
    results = pipe.execute()

    return {
        "ad_id": ad_id,
        "total_clicks": int(results[0] or 0),
        "unique_clicks": results[1],
        "ctr_ratio": results[1] / max(int(results[0] or 1), 1)
    }
```

## Hourly Click Report

```python
def get_hourly_clicks(ad_id: str, hours: int = 24) -> list:
    now_bucket = int(time.time() // 3600)
    keys = [f"ad:clicks:{ad_id}:hour:{now_bucket - i}" for i in range(hours)]
    values = r.mget(keys)
    return [int(v or 0) for v in values]
```

## Preventing Click Fraud

Use a set with expiration to limit duplicate clicks from the same user within a time window:

```python
def is_duplicate_click(ad_id: str, user_id: str, window_seconds: int = 300) -> bool:
    key = f"ad:seen:{ad_id}:{user_id}"
    # SET NX returns True only if key was newly created
    return not r.set(key, 1, ex=window_seconds, nx=True)
```

## Summary

Redis counters, HyperLogLog, and sorted sets combine to give you a lightweight, high-throughput ad click tracking system. Using pipelines minimizes round-trips, hourly buckets enable time-series analysis, and NX-based deduplication guards against click fraud - all without a heavyweight database.
