# How to Implement CDR (Call Detail Record) Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Telecom, Cache

Description: Cache CDR lookups and aggregate telecom billing data in Redis to reduce database pressure and deliver fast billing inquiries and fraud detection queries.

---

Call Detail Records (CDRs) are generated for every call, SMS, and data session in a telecom network - often millions per day. Billing systems, fraud detection engines, and customer portals all query this data. Caching recent CDRs and aggregated usage in Redis dramatically reduces database load.

## What to Cache

- **Recent call history** (last 30 days) for customer portal queries
- **Hourly/daily usage aggregates** for real-time billing and limit enforcement
- **Fraud signals** (call frequency, destination patterns) for alerting

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

CDR_PREFIX = "cdr"
USAGE_PREFIX = "usage"
FRAUD_PREFIX = "fraud"
CDR_TTL = 2592000   # 30 days
USAGE_TTL = 86400   # 1 day for hourly aggregates
```

## Writing a CDR to the Cache

```python
def cache_cdr(cdr: dict):
    subscriber_id = cdr["subscriber_id"]
    call_ts = int(cdr["start_time"])
    cdr_id = cdr["id"]

    # Store CDR as JSON string with TTL
    r.setex(f"{CDR_PREFIX}:{cdr_id}", CDR_TTL, json.dumps(cdr))

    # Add to subscriber's call list sorted set (score = timestamp)
    r.zadd(f"{CDR_PREFIX}:sub:{subscriber_id}", {cdr_id: call_ts})

    # Update usage aggregates
    hour_key = time.strftime("%Y%m%d%H", time.gmtime(call_ts))
    day_key = time.strftime("%Y%m%d", time.gmtime(call_ts))

    duration = int(cdr.get("duration_seconds", 0))
    pipe = r.pipeline()
    pipe.hincrby(f"{USAGE_PREFIX}:sub:{subscriber_id}:h:{hour_key}", "calls", 1)
    pipe.hincrby(f"{USAGE_PREFIX}:sub:{subscriber_id}:h:{hour_key}", "duration", duration)
    pipe.expire(f"{USAGE_PREFIX}:sub:{subscriber_id}:h:{hour_key}", USAGE_TTL * 7)

    pipe.hincrby(f"{USAGE_PREFIX}:sub:{subscriber_id}:d:{day_key}", "calls", 1)
    pipe.hincrby(f"{USAGE_PREFIX}:sub:{subscriber_id}:d:{day_key}", "duration", duration)
    pipe.expire(f"{USAGE_PREFIX}:sub:{subscriber_id}:d:{day_key}", CDR_TTL)
    pipe.execute()
```

## Fetching Recent Call History

```python
def get_recent_calls(subscriber_id: str, limit: int = 50) -> list:
    # Get most recent CDR IDs from sorted set
    cdr_ids = r.zrange(f"{CDR_PREFIX}:sub:{subscriber_id}", 0, limit - 1, rev=True)

    if not cdr_ids:
        return []

    # Batch fetch CDRs
    keys = [f"{CDR_PREFIX}:{cid}" for cid in cdr_ids]
    raw_cdrs = r.mget(keys)

    calls = []
    for raw in raw_cdrs:
        if raw:
            calls.append(json.loads(raw))
    return calls
```

## Usage Aggregates for Billing

```python
def get_daily_usage(subscriber_id: str, date_str: str) -> dict:
    day_key = date_str.replace("-", "")
    key = f"{USAGE_PREFIX}:sub:{subscriber_id}:d:{day_key}"

    cached = r.hgetall(key)
    if cached:
        return {
            "date": date_str,
            "calls": int(cached.get("calls", 0)),
            "duration_seconds": int(cached.get("duration", 0))
        }

    # Cache miss - fetch from data warehouse
    usage = fetch_usage_from_db(subscriber_id, date_str)
    if usage:
        r.hset(key, mapping={"calls": usage["calls"], "duration": usage["duration_seconds"]})
        r.expire(key, CDR_TTL)
    return usage

def get_hourly_usage_today(subscriber_id: str) -> list:
    today = time.strftime("%Y%m%d")
    results = []
    for hour in range(24):
        hour_key = f"{today}{hour:02d}"
        key = f"{USAGE_PREFIX}:sub:{subscriber_id}:h:{hour_key}"
        data = r.hgetall(key)
        results.append({
            "hour": hour,
            "calls": int(data.get("calls", 0)),
            "duration_seconds": int(data.get("duration", 0))
        })
    return results
```

## Fraud Detection Signal

```python
def record_call_for_fraud_check(subscriber_id: str, destination: str, call_ts: int):
    window_key = f"{FRAUD_PREFIX}:sub:{subscriber_id}:window"
    dest_key = f"{FRAUD_PREFIX}:sub:{subscriber_id}:dests"

    pipe = r.pipeline()
    # Sliding 1-hour window of call count
    pipe.zadd(window_key, {f"{call_ts}:{destination}": call_ts})
    pipe.zremrangebyscore(window_key, 0, call_ts - 3600)

    # Track unique destinations in last hour
    pipe.sadd(dest_key, destination)
    pipe.expire(dest_key, 3600)
    pipe.execute()

    call_count = r.zcard(window_key)
    unique_dests = r.scard(dest_key)

    if call_count > 100 or unique_dests > 50:
        r.publish("fraud:alerts", json.dumps({
            "subscriber_id": subscriber_id,
            "calls_last_hour": call_count,
            "unique_destinations": unique_dests,
            "ts": call_ts
        }))

def fetch_usage_from_db(subscriber_id: str, date_str: str) -> dict:
    return {"date": date_str, "calls": 42, "duration_seconds": 8400}
```

## Summary

A Redis CDR caching layer stores individual records with 30-day TTLs, maintains per-subscriber sorted sets of call IDs for fast history queries, and keeps rolling hourly and daily usage aggregates for instant billing and limit checks. A sliding-window fraud signal runs entirely in Redis without touching the data warehouse.
