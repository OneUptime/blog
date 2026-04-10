# How to Build a Real-Time Viewer Count System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Analytics, Real-Time

Description: Build accurate real-time viewer count systems with Redis using HyperLogLog for unique counts, sorted sets for trending, and Pub/Sub for instant updates.

---

Viewer count systems must answer two different questions: "how many concurrent viewers right now?" and "how many unique viewers have watched?" These require different Redis data structures - sets for precision, HyperLogLog for scale.

## Three Approaches

| Approach | Data Structure | Memory | Accuracy |
|----------|----------------|--------|----------|
| Exact concurrent count | Set (session IDs) | O(N) | Exact |
| Unique viewers (all-time) | HyperLogLog | ~12KB | ~0.8% error |
| Content trending | Sorted Set | O(N) | Exact |

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

ACTIVE_PREFIX = "viewers:active"
UNIQUE_PREFIX = "viewers:unique"
TRENDING_KEY = "content:trending"
CHANNEL_PREFIX = "viewcount"
HEARTBEAT_TTL = 35  # seconds
```

## Tracking Active Viewers (Exact)

```python
def viewer_join(content_id: str, session_id: str, user_id: str = None):
    active_key = f"{ACTIVE_PREFIX}:{content_id}"
    unique_key = f"{UNIQUE_PREFIX}:{content_id}"

    pipe = r.pipeline()
    # Add session to active set
    pipe.sadd(active_key, session_id)
    pipe.expire(active_key, HEARTBEAT_TTL * 2)

    # Track unique viewers with HyperLogLog (uses user_id if available, else session)
    identifier = user_id or session_id
    pipe.pfadd(unique_key, identifier)

    # Update trending score
    pipe.zincrby(TRENDING_KEY, 1, content_id)

    pipe.execute()

    count = r.scard(active_key)
    _broadcast_count(content_id, count)
    return count

def viewer_leave(content_id: str, session_id: str):
    active_key = f"{ACTIVE_PREFIX}:{content_id}"
    r.srem(active_key, session_id)
    count = r.scard(active_key)

    # Decrement trending (viewers leaving reduces score)
    r.zincrby(TRENDING_KEY, -0.5, content_id)
    r.publish(f"{CHANNEL_PREFIX}:{content_id}", json.dumps({
        "count": count, "event": "leave", "ts": int(time.time())
    }))
    return count

def viewer_heartbeat(content_id: str, session_id: str) -> bool:
    active_key = f"{ACTIVE_PREFIX}:{content_id}"
    if r.sismember(active_key, session_id):
        r.expire(active_key, HEARTBEAT_TTL * 2)
        return True
    return False
```

## Unique Viewer Counts

```python
def get_unique_viewers(content_id: str) -> int:
    return r.pfcount(f"{UNIQUE_PREFIX}:{content_id}")

def get_unique_viewers_bulk(content_ids: list[str]) -> dict:
    pipe = r.pipeline()
    for cid in content_ids:
        pipe.pfcount(f"{UNIQUE_PREFIX}:{cid}")
    counts = pipe.execute()
    return dict(zip(content_ids, counts))

def get_combined_unique_viewers(content_ids: list[str]) -> int:
    keys = [f"{UNIQUE_PREFIX}:{cid}" for cid in content_ids]
    temp_key = f"viewers:temp:union:{int(time.time())}"
    r.pfmerge(temp_key, *keys)
    count = r.pfcount(temp_key)
    r.delete(temp_key)
    return count
```

## Time-Windowed View Counts

```python
def record_view_event(content_id: str, user_id: str):
    now = int(time.time())
    minute_bucket = now - (now % 60)
    hour_bucket = now - (now % 3600)

    pipe = r.pipeline()
    # Minute-level HLL (last 60 minutes)
    min_key = f"viewers:min:{content_id}:{minute_bucket}"
    pipe.pfadd(min_key, user_id)
    pipe.expire(min_key, 3600 + 60)

    # Hour-level HLL (last 24 hours)
    hr_key = f"viewers:hr:{content_id}:{hour_bucket}"
    pipe.pfadd(hr_key, user_id)
    pipe.expire(hr_key, 86400 + 3600)
    pipe.execute()

def get_viewers_last_hour(content_id: str) -> int:
    now = int(time.time())
    keys = []
    for i in range(60):
        bucket = now - (now % 60) - (i * 60)
        keys.append(f"viewers:min:{content_id}:{bucket}")

    temp_key = f"viewers:temp:1h:{content_id}"
    r.pfmerge(temp_key, *keys)
    count = r.pfcount(temp_key)
    r.delete(temp_key)
    return count
```

## Trending Content

```python
def get_trending_content(top_n: int = 10) -> list:
    entries = r.zrange(TRENDING_KEY, 0, top_n - 1, desc=True, withscores=True)
    pipe = r.pipeline()
    for cid, _ in entries:
        pipe.scard(f"{ACTIVE_PREFIX}:{cid}")
    active_counts = pipe.execute()

    return [
        {"content_id": cid, "trending_score": score, "active_viewers": active}
        for (cid, score), active in zip(entries, active_counts)
    ]

def _broadcast_count(content_id: str, count: int):
    r.publish(f"{CHANNEL_PREFIX}:{content_id}", json.dumps({
        "count": count, "event": "join", "ts": int(time.time())
    }))
```

## Summary

A Redis viewer count system uses sets for exact concurrent viewer tracking, HyperLogLog for memory-efficient unique viewer estimation across time windows, and sorted sets for trending rankings. The HyperLogLog approach uses roughly 12KB regardless of how many unique viewers have watched, making it practical even for content with tens of millions of viewers.
