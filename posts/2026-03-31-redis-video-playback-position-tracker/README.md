# How to Build a Video Playback Position Tracker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Video, Streaming

Description: Track video playback positions in Redis to enable resume-from-where-you-left-off across devices with sub-millisecond writes and multi-device sync.

---

"Continue watching" and "resume playback" are table-stakes features for any streaming platform. The challenge is that playback position updates arrive frequently (every 5-10 seconds while a video plays) and must be readable from any device instantly. Redis handles this with fast hash writes and cross-device sync.

## Design

Playback position is written to Redis on a heartbeat (every 10 seconds while playing). When a user opens a video on any device, the position is read from Redis first. If not in Redis (cold start or TTL expired), fall back to the database.

## Setup

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

POSITION_PREFIX = "playback:pos"
HISTORY_PREFIX = "playback:history"
POSITION_TTL = 7776000   # 90 days
HISTORY_MAX = 50         # Keep last 50 watched videos per user
```

## Recording Playback Position

```python
def update_position(user_id: str, content_id: str, position_seconds: float, duration_seconds: float):
    pos_key = f"{POSITION_PREFIX}:{user_id}:{content_id}"
    progress_pct = round((position_seconds / duration_seconds * 100), 1) if duration_seconds > 0 else 0

    pipe = r.pipeline()
    pipe.hset(pos_key, mapping={
        "position": position_seconds,
        "duration": duration_seconds,
        "progress_pct": progress_pct,
        "updated_at": int(time.time())
    })
    pipe.expire(pos_key, POSITION_TTL)

    # Track in watch history sorted set (score = last watched timestamp)
    history_key = f"{HISTORY_PREFIX}:{user_id}"
    pipe.zadd(history_key, {content_id: int(time.time())})
    pipe.zremrangebyrank(history_key, 0, -(HISTORY_MAX + 1))
    pipe.expire(history_key, POSITION_TTL)

    pipe.execute()

    # Mark as completed if >95% watched
    if progress_pct >= 95:
        r.hset(pos_key, "completed", 1)
```

## Getting Playback Position

```python
def get_position(user_id: str, content_id: str) -> dict:
    pos_key = f"{POSITION_PREFIX}:{user_id}:{content_id}"
    data = r.hgetall(pos_key)

    if not data:
        return {"position": 0, "progress_pct": 0, "completed": False}

    return {
        "position": float(data.get("position", 0)),
        "duration": float(data.get("duration", 0)),
        "progress_pct": float(data.get("progress_pct", 0)),
        "completed": bool(int(data.get("completed", 0))),
        "updated_at": int(data.get("updated_at", 0))
    }
```

## Getting Continue Watching List

```python
def get_continue_watching(user_id: str, limit: int = 20) -> list:
    history_key = f"{HISTORY_PREFIX}:{user_id}"
    # Get most recently watched, excluding completed
    content_ids = r.zrange(history_key, 0, limit * 2 - 1, rev=True)

    results = []
    for content_id in content_ids:
        if len(results) >= limit:
            break
        pos = get_position(user_id, content_id)
        # Include only started but not completed
        if 0 < pos["progress_pct"] < 95:
            results.append({
                "content_id": content_id,
                "position": pos["position"],
                "progress_pct": pos["progress_pct"],
                "last_watched": int(r.zscore(history_key, content_id))
            })

    return results
```

## Bulk Position Lookup for Homepage

```python
def get_positions_bulk(user_id: str, content_ids: list[str]) -> dict:
    keys = [f"{POSITION_PREFIX}:{user_id}:{cid}" for cid in content_ids]
    pipe = r.pipeline()
    for key in keys:
        pipe.hgetall(key)
    results = pipe.execute()

    return {
        cid: {
            "position": float(data.get("position", 0)),
            "progress_pct": float(data.get("progress_pct", 0)),
            "completed": bool(int(data.get("completed", 0)))
        } if data else {"position": 0, "progress_pct": 0, "completed": False}
        for cid, data in zip(content_ids, results)
    }
```

## Multi-Device Conflict Resolution

When a user has the same video open on multiple devices, take the more recent position:

```python
def sync_position(user_id: str, content_id: str, device_position: float, device_ts: int) -> float:
    pos_key = f"{POSITION_PREFIX}:{user_id}:{content_id}"
    cached = r.hgetall(pos_key)

    if not cached or int(cached.get("updated_at", 0)) < device_ts:
        # Device has newer position
        r.hset(pos_key, mapping={
            "position": device_position,
            "updated_at": device_ts
        })
        return device_position
    else:
        # Server has newer position - return it to device
        return float(cached.get("position", 0))
```

## Summary

A Redis video playback position tracker uses hashes to store per-user per-content position data, a sorted set for a watch history ordered by recency, and bulk pipeline reads to populate homepage continue-watching sections in a single round trip. Position writes are inexpensive enough to handle every 10-second heartbeat from millions of concurrent viewers.
