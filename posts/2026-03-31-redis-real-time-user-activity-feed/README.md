# How to Build a Real-Time User Activity Feed with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Activity Feed, Real-Time, List, Social

Description: Learn to build a real-time user activity feed using Redis Lists and Sorted Sets that delivers instant updates at scale.

---

Activity feeds - "Alice liked your post", "Bob followed you" - need to be fast to read and easy to paginate. Redis Lists are perfect because prepending an event with LPUSH is O(1), and Sorted Sets offer O(log N + M) range queries for score-based ordering.

## Storing Activity Events

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def push_activity(user_id: str, event: dict, max_feed_size: int = 100):
    key = f"feed:{user_id}"
    event["ts"] = time.time()
    # Push to front of list
    pipe = r.pipeline()
    pipe.lpush(key, json.dumps(event))
    # Trim to keep only recent events
    pipe.ltrim(key, 0, max_feed_size - 1)
    pipe.execute()

def get_activity_feed(user_id: str, page: int = 0, page_size: int = 20) -> list:
    key = f"feed:{user_id}"
    start = page * page_size
    end = start + page_size - 1
    raw = r.lrange(key, start, end)
    return [json.loads(item) for item in raw]
```

## Fan-Out on Write

When one user does something, push to all their followers' feeds:

```python
def fan_out_activity(actor_id: str, event: dict):
    follower_key = f"followers:{actor_id}"
    followers = r.smembers(follower_key)

    pipe = r.pipeline()
    for follower_id in followers:
        feed_key = f"feed:{follower_id}"
        event_copy = dict(event)
        event_copy["actor"] = actor_id
        event_copy["ts"] = time.time()
        pipe.lpush(feed_key, json.dumps(event_copy))
        pipe.ltrim(feed_key, 0, 99)
    pipe.execute()
```

## Sorted Set Feed for Score-Based Ordering

For feeds ranked by relevance score rather than time:

```python
def push_scored_activity(user_id: str, event_id: str, score: float):
    key = f"feed:scored:{user_id}"
    r.zadd(key, {event_id: score})
    # Keep top 200 events
    r.zremrangebyrank(key, 0, -201)

def get_top_activities(user_id: str, n: int = 20) -> list:
    key = f"feed:scored:{user_id}"
    return r.zrevrange(key, 0, n - 1, withscores=True)
```

## Unread Count

```python
def mark_feed_read(user_id: str):
    r.set(f"feed:{user_id}:last_read", time.time())

def get_unread_count(user_id: str) -> int:
    last_read = float(r.get(f"feed:{user_id}:last_read") or 0)
    feed = get_activity_feed(user_id, page_size=100)
    return sum(1 for e in feed if e.get("ts", 0) > last_read)
```

## Monitoring

Monitor feed latency and Redis memory with [OneUptime](https://oneuptime.com) to catch slowdowns before users notice.

```bash
redis-cli LLEN feed:user_123
redis-cli MEMORY USAGE feed:user_123
```

## Summary

Redis Lists give you O(1) prepend for new events and efficient paging with LRANGE. Fan-out on write scales well when follower counts are moderate; for large followings, consider fan-out on read. Use LTRIM to cap feed size and avoid unbounded memory growth.
