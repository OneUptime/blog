# How to Implement Calendar-Based Data with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Calendar, Scheduling, Data Modeling, Analytics

Description: Model calendar-based data in Redis for use cases like event scheduling, availability tracking, and date-range queries using sorted sets and hashes.

---

Calendar-aware data models appear in booking systems, on-call schedules, content calendars, and availability grids. Redis sorted sets and hashes offer a natural fit: store event timestamps as scores for range queries, and use hashes for per-day metadata.

## Storing Events by Date

Use a sorted set with Unix timestamp scores so you can query by date range:

```python
import redis
import time
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def add_event(calendar_id: str, event_id: str, event_ts: float, metadata: dict):
    # Add to sorted set for date-range queries
    r.zadd(f"calendar:{calendar_id}:events", {event_id: event_ts})
    # Store metadata in a hash
    r.hset(f"event:{event_id}", mapping={
        "ts": str(event_ts),
        "data": json.dumps(metadata),
    })

def get_events_in_range(calendar_id: str, start_ts: float, end_ts: float) -> list:
    event_ids = r.zrangebyscore(
        f"calendar:{calendar_id}:events",
        start_ts, end_ts
    )
    if not event_ids:
        return []

    pipe = r.pipeline()
    for eid in event_ids:
        pipe.hgetall(f"event:{eid}")
    results = pipe.execute()

    return [
        {
            "id": eid,
            "ts": float(result.get("ts", 0)),
            "data": json.loads(result.get("data", "{}")),
        }
        for eid, result in zip(event_ids, results)
    ]
```

## Day-Level Availability Bitmaps

Track availability per day using a compact string where each bit represents a time slot:

```python
def mark_slot_unavailable(resource_id: str, date_str: str, slot_index: int):
    key = f"avail:{resource_id}:{date_str}"
    r.setbit(key, slot_index, 0)
    r.expire(key, 90 * 86400)

def mark_slot_available(resource_id: str, date_str: str, slot_index: int):
    key = f"avail:{resource_id}:{date_str}"
    r.setbit(key, slot_index, 1)
    r.expire(key, 90 * 86400)

def is_slot_available(resource_id: str, date_str: str, slot_index: int) -> bool:
    key = f"avail:{resource_id}:{date_str}"
    return bool(r.getbit(key, slot_index))

def count_available_slots(resource_id: str, date_str: str) -> int:
    key = f"avail:{resource_id}:{date_str}"
    return r.bitcount(key)
```

## Daily Summary Hash

Store structured per-day data as a hash for quick dashboard reads:

```python
def update_day_summary(date_str: str, field: str, value):
    key = f"day:{date_str}"
    r.hset(key, field, value)
    r.expire(key, 365 * 86400)

def get_day_summary(date_str: str) -> dict:
    return r.hgetall(f"day:{date_str}")

# Example usage
def record_booking(date_str: str):
    pipe = r.pipeline()
    pipe.hincrby(f"day:{date_str}", "bookings", 1)
    pipe.hincrby(f"day:{date_str}", "revenue", 100)
    pipe.expire(f"day:{date_str}", 365 * 86400)
    pipe.execute()
```

## Querying Upcoming Events

List events in the next N days:

```python
def get_upcoming_events(calendar_id: str, days: int = 7) -> list:
    now = time.time()
    end = now + days * 86400
    return get_events_in_range(calendar_id, now, end)
```

## Summary

Redis sorted sets with Unix timestamp scores give you efficient calendar range queries, while per-day hashes store structured metadata. Bit arrays model availability grids compactly - 96 slots in a day use just 12 bytes. Together these patterns support booking systems, on-call calendars, and content scheduling without a relational database.
