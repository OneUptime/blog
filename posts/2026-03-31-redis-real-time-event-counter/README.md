# How to Build a Real-Time Event Counter with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Counter, Event, Real-Time, Analytics

Description: Build a flexible real-time event counter with Redis that tracks any event type at multiple time granularities simultaneously.

---

Whether you need to count logins, purchases, errors, or custom business events, a Redis-backed event counter provides atomic increments with sub-millisecond latency across any time granularity you define.

## Multi-Granularity Event Counter

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

GRANULARITIES = {
    "minute": {"seconds": 60, "ttl": 3600},
    "hour":   {"seconds": 3600, "ttl": 86400 * 7},
    "day":    {"seconds": 86400, "ttl": 86400 * 90},
}

def record_event(event_type: str, value: int = 1):
    now = int(time.time())
    pipe = r.pipeline()

    for gran, cfg in GRANULARITIES.items():
        bucket = now // cfg["seconds"]
        key = f"events:{event_type}:{gran}:{bucket}"
        pipe.incrby(key, value)
        pipe.expire(key, cfg["ttl"])

    pipe.execute()
```

## Fetching Event Counts

```python
def get_events_in_range(event_type: str, granularity: str,
                        start_ts: int, end_ts: int) -> dict:
    cfg = GRANULARITIES[granularity]
    bucket_size = cfg["seconds"]
    start_bucket = start_ts // bucket_size
    end_bucket = end_ts // bucket_size

    pipe = r.pipeline()
    buckets = list(range(start_bucket, end_bucket + 1))
    for b in buckets:
        pipe.get(f"events:{event_type}:{granularity}:{b}")

    counts = pipe.execute()
    return {
        b * bucket_size: int(c or 0)
        for b, c in zip(buckets, counts)
    }

def get_events_last_n_hours(event_type: str, hours: int = 24) -> int:
    now = int(time.time())
    start = now - hours * 3600
    hourly = get_events_in_range(event_type, "hour", start, now)
    return sum(hourly.values())
```

## Multiple Event Types in One Call

```python
def record_events_batch(events: dict):
    """events = {"login": 1, "purchase": 2, "error": 1}"""
    now = int(time.time())
    pipe = r.pipeline()

    for event_type, value in events.items():
        for gran, cfg in GRANULARITIES.items():
            bucket = now // cfg["seconds"]
            key = f"events:{event_type}:{gran}:{bucket}"
            pipe.incrby(key, value)
            pipe.expire(key, cfg["ttl"])

    pipe.execute()
```

## Rate Limiting Based on Event Counts

```python
def is_rate_limited(event_type: str, limit: int, window_seconds: int) -> bool:
    now = int(time.time())
    bucket = now // window_seconds
    key = f"ratelimit:{event_type}:{bucket}"
    current = r.incr(key)
    if current == 1:
        r.expire(key, window_seconds * 2)
    return current > limit
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to create monitors that fire alerts when specific event counts breach thresholds - catching spikes in error events before they become incidents.

```bash
# Inspect all event keys for a type
redis-cli KEYS "events:login:hour:*"
```

## Summary

By combining granular time-bucketed keys with atomic INCR operations and automatic TTL expiry, you get a self-maintaining event counter system. Pipelines keep write overhead negligible even at high event rates, and the schema naturally supports any event type without schema changes.
