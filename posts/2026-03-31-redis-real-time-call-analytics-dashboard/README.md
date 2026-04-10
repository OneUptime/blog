# How to Build a Real-Time Call Analytics Dashboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Telecom, Analytics

Description: Build a real-time call analytics dashboard with Redis using atomic counters, sorted sets for rankings, and Pub/Sub to push live KPI updates to operators.

---

Telecom operations teams need live dashboards showing active calls, answer rates, average handle time, and call volumes by region - all refreshing in real time. Redis atomic counters, sorted sets, and Pub/Sub make this possible without a dedicated time-series database.

## Key Metrics

- Active calls (in progress right now)
- Calls per minute / hour
- Answer rate (answered / total)
- Average handle time (AHT)
- Call distribution by region/queue
- Top destinations

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

METRICS_PREFIX = "callanalytics"
ACTIVE_CALLS_KEY = "callanalytics:active"
BROADCAST_CHANNEL = "callanalytics:dashboard"
```

## Tracking Active Calls

```python
def call_started(call_id: str, region: str, queue: str, destination: str):
    now = int(time.time())
    pipe = r.pipeline()

    # Track active call
    pipe.hset(f"{METRICS_PREFIX}:call:{call_id}", mapping={
        "region": region,
        "queue": queue,
        "destination": destination,
        "started_at": now
    })
    pipe.sadd(ACTIVE_CALLS_KEY, call_id)

    # Increment counters
    minute_bucket = time.strftime("%Y%m%d%H%M")
    pipe.hincrby(f"{METRICS_PREFIX}:calls:m:{minute_bucket}", region, 1)
    pipe.hincrby(f"{METRICS_PREFIX}:calls:m:{minute_bucket}", "total", 1)
    pipe.expire(f"{METRICS_PREFIX}:calls:m:{minute_bucket}", 7200)  # 2 hours

    # Top destinations ranking
    pipe.zincrby(f"{METRICS_PREFIX}:top_dest:h:{time.strftime('%Y%m%d%H')}", 1, destination)

    # Region distribution
    pipe.hincrby(f"{METRICS_PREFIX}:regions:h:{time.strftime('%Y%m%d%H')}", region, 1)

    pipe.execute()
    _broadcast_dashboard_update()

def call_ended(call_id: str, answered: bool, duration_seconds: int):
    call_data = r.hgetall(f"{METRICS_PREFIX}:call:{call_id}")
    region = call_data.get("region", "unknown")
    now = int(time.time())

    pipe = r.pipeline()
    pipe.srem(ACTIVE_CALLS_KEY, call_id)

    hour_bucket = time.strftime("%Y%m%d%H")
    stats_key = f"{METRICS_PREFIX}:stats:h:{hour_bucket}"

    pipe.hincrby(stats_key, "total_calls", 1)
    if answered:
        pipe.hincrby(stats_key, "answered", 1)
        pipe.hincrby(stats_key, "total_duration", duration_seconds)
    pipe.expire(stats_key, 86400 * 7)

    pipe.delete(f"{METRICS_PREFIX}:call:{call_id}")
    pipe.execute()
    _broadcast_dashboard_update()
```

## Computing Dashboard KPIs

```python
def get_dashboard_kpis() -> dict:
    now = time.time()
    hour_bucket = time.strftime("%Y%m%d%H")
    stats_key = f"{METRICS_PREFIX}:stats:h:{hour_bucket}"

    stats = r.hgetall(stats_key)
    total = int(stats.get("total_calls", 0))
    answered = int(stats.get("answered", 0))
    total_duration = int(stats.get("total_duration", 0))

    active_count = r.scard(ACTIVE_CALLS_KEY)

    # Calls in last 5 minutes
    recent_calls = 0
    for i in range(5):
        ts = now - (i * 60)
        bucket = time.strftime("%Y%m%d%H%M", time.localtime(ts))
        val = r.hget(f"{METRICS_PREFIX}:calls:m:{bucket}", "total")
        recent_calls += int(val or 0)

    # Top destinations this hour
    top_dests = r.zrange(
        f"{METRICS_PREFIX}:top_dest:h:{hour_bucket}",
        0, 4, desc=True, withscores=True
    )

    # Region distribution this hour
    regions = r.hgetall(f"{METRICS_PREFIX}:regions:h:{hour_bucket}")

    return {
        "active_calls": active_count,
        "calls_last_5min": recent_calls,
        "hourly_total": total,
        "answer_rate_pct": round(answered / total * 100, 1) if total > 0 else 0,
        "avg_handle_time_sec": int(total_duration / answered) if answered > 0 else 0,
        "top_destinations": [{"dest": d, "count": int(c)} for d, c in top_dests],
        "by_region": {k: int(v) for k, v in regions.items()},
        "as_of": int(now)
    }
```

## Broadcasting Updates

```python
def _broadcast_dashboard_update():
    kpis = get_dashboard_kpis()
    r.publish(BROADCAST_CHANNEL, json.dumps({"event": "kpi_update", **kpis}))

import threading

def stream_to_dashboard():
    sub = r.pubsub()
    sub.subscribe(BROADCAST_CHANNEL)

    for message in sub.listen():
        if message["type"] != "message":
            continue
        data = json.loads(message["data"])
        print(f"Active: {data['active_calls']}  "
              f"Answer rate: {data['answer_rate_pct']}%  "
              f"AHT: {data['avg_handle_time_sec']}s")
```

## Historical Trend

```python
def get_hourly_call_trend(hours: int = 24) -> list:
    now = time.time()
    trend = []
    for i in range(hours):
        ts = now - (i * 3600)
        bucket = time.strftime("%Y%m%d%H", time.localtime(ts))
        stats = r.hgetall(f"{METRICS_PREFIX}:stats:h:{bucket}")
        total = int(stats.get("total_calls", 0))
        answered = int(stats.get("answered", 0))
        trend.append({
            "hour": bucket,
            "total": total,
            "answer_rate": round(answered / total * 100, 1) if total > 0 else 0
        })
    return list(reversed(trend))
```

## Summary

A Redis call analytics dashboard uses atomic counters in time-bucketed hash keys for call volumes, a live set for active call tracking, sorted sets for top-destination rankings, and Pub/Sub to push KPI snapshots to all connected dashboard clients after each call event. The architecture supports sub-second refresh rates without any batch processing pipeline.
