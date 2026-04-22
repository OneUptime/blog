# How to Build a Live Video Viewer Counter with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Video, Real-Time

Description: Track live video viewer counts accurately with Redis using sets for deduplication, sorted sets for trending streams, and Pub/Sub for real-time count updates.

---

Live streaming platforms need accurate, real-time viewer counts. A naive counter breaks under concurrent joins and leaves, over-counts reconnecting viewers, and cannot rank streams by popularity. Redis provides the right primitives to solve each problem.

## Why Not Just INCR/DECR?

A simple counter fails when:
- A viewer refreshes and the disconnect happens before the reconnect (count goes negative or double-counts)
- You need to show unique viewers, not connection events
- You want to rank streams by active viewers

Using a Redis Set per stream, where each member is a viewer's session ID, solves all three.

## Setup

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

VIEWERS_PREFIX = "viewers"
TRENDING_KEY = "streams:trending"
CHANNEL_PREFIX = "stream"
VIEWER_TTL = 35  # seconds - refresh every 30s to stay in set
```

## Joining a Stream

```python
def viewer_join(stream_id: str, session_id: str):
    viewers_key = f"{VIEWERS_PREFIX}:{stream_id}"
    pipe = r.pipeline()
    pipe.sadd(viewers_key, session_id)
    pipe.expire(viewers_key, VIEWER_TTL * 2)
    count = pipe.execute()[0]  # sadd returns 1 if new, 0 if existing

    # Update trending sorted set
    viewer_count = r.scard(viewers_key)
    r.zadd(TRENDING_KEY, {stream_id: viewer_count})

    # Broadcast updated count
    r.publish(f"{CHANNEL_PREFIX}:{stream_id}:viewers", json.dumps({
        "count": viewer_count,
        "event": "join",
        "ts": int(time.time())
    }))
    return viewer_count
```

## Leaving a Stream

```python
def viewer_leave(stream_id: str, session_id: str):
    viewers_key = f"{VIEWERS_PREFIX}:{stream_id}"
    r.srem(viewers_key, session_id)

    viewer_count = r.scard(viewers_key)
    r.zadd(TRENDING_KEY, {stream_id: viewer_count})

    r.publish(f"{CHANNEL_PREFIX}:{stream_id}:viewers", json.dumps({
        "count": viewer_count,
        "event": "leave",
        "ts": int(time.time())
    }))
    return viewer_count
```

## Heartbeat to Keep Session Alive

Viewers send a heartbeat every 30 seconds to refresh their presence:

```python
def viewer_heartbeat(stream_id: str, session_id: str):
    viewers_key = f"{VIEWERS_PREFIX}:{stream_id}"
    # Re-add to refresh (SADD is idempotent) and reset TTL
    if r.sismember(viewers_key, session_id):
        r.expire(viewers_key, VIEWER_TTL * 2)
        return True
    else:
        # Session expired - treat as fresh join
        return viewer_join(stream_id, session_id)
```

## Getting Current Viewer Count

```python
def get_viewer_count(stream_id: str) -> int:
    return r.scard(f"{VIEWERS_PREFIX}:{stream_id}")

def get_viewer_counts_bulk(stream_ids: list[str]) -> dict:
    pipe = r.pipeline()
    for sid in stream_ids:
        pipe.scard(f"{VIEWERS_PREFIX}:{sid}")
    counts = pipe.execute()
    return dict(zip(stream_ids, counts))
```

## Trending Streams

```python
def get_trending_streams(top_n: int = 10) -> list:
    streams = r.zrange(TRENDING_KEY, 0, top_n - 1, desc=True, withscores=True)
    return [
        {"stream_id": sid, "viewers": int(count)}
        for sid, count in streams
    ]
```

## Subscribing to Live Count Updates

```python
def watch_viewer_count(stream_id: str):
    sub = r.pubsub()
    sub.subscribe(f"{CHANNEL_PREFIX}:{stream_id}:viewers")

    for message in sub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            print(f"Viewers: {data['count']:,}  ({data['event']})")
```

## Peak Viewer Tracking

```python
def update_peak_viewers(stream_id: str, current_count: int):
    peak_key = f"peak:{stream_id}"
    current_peak = int(r.get(peak_key) or 0)
    if current_count > current_peak:
        r.set(peak_key, current_count)
```

## Summary

A Redis live viewer counter uses sets for per-stream session tracking (enabling accurate deduplication), sorted sets for a real-time trending ranking, and Pub/Sub for instant count broadcasts. Heartbeat-based presence refreshes the TTL on the entire set key, so the set expires only when all activity on a stream stops. Note that individual stale sessions within a set are not automatically removed - if a viewer disconnects without calling `viewer_leave`, their session ID remains until the whole set expires.
