# How to Implement Network Usage Tracking with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Telecom, Analytics

Description: Track network usage in real time with Redis using atomic counters, sliding windows, and time series patterns to enforce data caps and detect anomalies.

---

Network usage tracking needs to be fast (every packet event updates counters), accurate (billing depends on it), and queryable at multiple time granularities (per-hour, per-day, per-billing-cycle). Redis atomic increment operations and time-bucketed keys make this straightforward.

## Data Model

Usage data is stored in time-bucketed hash keys. The bucket granularity depends on the query pattern:

```bash
# Per-subscriber hourly usage: bytes_up, bytes_down, sessions
HSET usage:sub:+15551234567:2026040109 bytes_up 104857600 bytes_down 524288000 sessions 3

# Global network segment hourly stats
HSET usage:segment:sector-7:2026040109 bytes_total 10737418240 subscribers 2845
```

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

USAGE_PREFIX = "usage:sub"
SEGMENT_PREFIX = "usage:segment"
CAP_PREFIX = "cap:sub"
ALERT_CHANNEL = "network:alerts"
```

## Recording Usage Events

```python
def record_usage(subscriber_id: str, bytes_up: int, bytes_down: int, segment_id: str = "default"):
    now = time.gmtime()
    hour_bucket = time.strftime("%Y%m%d%H", now)
    day_bucket = time.strftime("%Y%m%d", now)
    month_bucket = time.strftime("%Y%m", now)

    sub_hour_key = f"{USAGE_PREFIX}:{subscriber_id}:{hour_bucket}"
    sub_day_key = f"{USAGE_PREFIX}:{subscriber_id}:d:{day_bucket}"
    sub_month_key = f"{USAGE_PREFIX}:{subscriber_id}:m:{month_bucket}"
    segment_key = f"{SEGMENT_PREFIX}:{segment_id}:{hour_bucket}"

    pipe = r.pipeline()

    # Hourly granularity (kept 48 hours)
    pipe.hincrby(sub_hour_key, "bytes_up", bytes_up)
    pipe.hincrby(sub_hour_key, "bytes_down", bytes_down)
    pipe.hincrby(sub_hour_key, "total", bytes_up + bytes_down)
    pipe.expire(sub_hour_key, 172800)  # 48 hours

    # Daily granularity (kept 90 days)
    pipe.hincrby(sub_day_key, "total", bytes_up + bytes_down)
    pipe.expire(sub_day_key, 7776000)  # 90 days

    # Monthly granularity (kept 13 months for billing)
    pipe.hincrby(sub_month_key, "total", bytes_up + bytes_down)
    pipe.expire(sub_month_key, 34560000)  # 400 days

    # Segment-level stats
    pipe.hincrby(segment_key, "bytes_total", bytes_up + bytes_down)
    pipe.expire(segment_key, 172800)

    pipe.execute()

    # Check cap asynchronously
    _check_data_cap(subscriber_id, bytes_up + bytes_down)
```

## Checking Data Caps

```python
def _check_data_cap(subscriber_id: str, bytes_added: int):
    now = time.gmtime()
    month_bucket = time.strftime("%Y%m", now)
    sub_month_key = f"{USAGE_PREFIX}:{subscriber_id}:m:{month_bucket}"

    total_bytes = int(r.hget(sub_month_key, "total") or 0)
    cap_key = f"{CAP_PREFIX}:{subscriber_id}"
    cap_bytes = int(r.get(cap_key) or 0)

    if cap_bytes <= 0:
        return  # No cap configured

    usage_pct = (total_bytes / cap_bytes) * 100

    if usage_pct >= 100:
        r.publish(ALERT_CHANNEL, json.dumps({
            "type": "cap_exceeded",
            "subscriber_id": subscriber_id,
            "usage_bytes": total_bytes,
            "cap_bytes": cap_bytes
        }))
    elif usage_pct >= 80:
        # Only alert once per day for 80% threshold
        alert_key = f"alert:80pct:{subscriber_id}:{time.strftime('%Y%m%d', now)}"
        if r.set(alert_key, 1, ex=86400, nx=True):
            r.publish(ALERT_CHANNEL, json.dumps({
                "type": "cap_warning_80pct",
                "subscriber_id": subscriber_id,
                "usage_pct": round(usage_pct, 1)
            }))
```

## Querying Usage

```python
def get_current_month_usage(subscriber_id: str) -> dict:
    month_bucket = time.strftime("%Y%m", time.gmtime())
    key = f"{USAGE_PREFIX}:{subscriber_id}:m:{month_bucket}"
    total = int(r.hget(key, "total") or 0)
    return {
        "subscriber_id": subscriber_id,
        "month": month_bucket,
        "total_bytes": total,
        "total_gb": round(total / 1073741824, 3)
    }

def get_hourly_usage_range(subscriber_id: str, hours: int = 24) -> list:
    now = time.time()
    results = []
    for i in range(hours):
        bucket_ts = now - (i * 3600)
        bucket = time.strftime("%Y%m%d%H", time.gmtime(bucket_ts))
        key = f"{USAGE_PREFIX}:{subscriber_id}:{bucket}"
        data = r.hgetall(key)
        results.append({
            "hour": bucket,
            "bytes_up": int(data.get("bytes_up", 0)),
            "bytes_down": int(data.get("bytes_down", 0)),
            "total": int(data.get("total", 0))
        })
    return list(reversed(results))
```

## Network Segment Analytics

```python
def get_segment_load(segment_id: str) -> list:
    now = time.time()
    hours = []
    for i in range(24):
        bucket_ts = now - (i * 3600)
        bucket = time.strftime("%Y%m%d%H", time.gmtime(bucket_ts))
        key = f"{SEGMENT_PREFIX}:{segment_id}:{bucket}"
        data = r.hgetall(key)
        hours.append({
            "hour": bucket,
            "bytes_total": int(data.get("bytes_total", 0)),
            "gbps_avg": round(int(data.get("bytes_total", 0)) / 3600 / 125000000, 4)
        })
    return list(reversed(hours))
```

## Summary

Redis network usage tracking uses time-bucketed hash keys at hourly, daily, and monthly granularities with `HINCRBY` for atomic increments. Cap enforcement runs after each event using the monthly aggregate, and deduplication logic prevents duplicate threshold alerts. Segment-level aggregates provide network operations teams with real-time load data per geographic or logical segment.
