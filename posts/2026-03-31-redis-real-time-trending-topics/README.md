# How to Build a Real-Time Trending Topics System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Trending, Sorted Set, Real-Time, Analytics

Description: Build a real-time trending topics system with Redis Sorted Sets that surfaces the fastest-growing topics using time-decay scoring.

---

Trending topics are not just the most-discussed topics - they are the ones gaining momentum right now. A naive "most mentioned" approach surfaces the same popular topics forever. Redis Sorted Sets with time-decay scoring make topics trend based on velocity, not just volume.

## Basic Trending with Score Decay

```python
import redis
import time
import math

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

DECAY_FACTOR = 0.1  # Controls how fast scores decay

def record_mention(topic: str):
    now = time.time()
    day_bucket = int(now // 86400)
    key = f"trending:topics:{day_bucket}"
    # Weight by position in the day - a simple daily decay cycle
    hours_elapsed = (now % 86400) / 3600
    decay_score = math.exp(-DECAY_FACTOR * hours_elapsed)
    r.zincrby(key, decay_score, topic)
    r.expire(key, 86400 * 2)  # Auto-cleanup after 2 days

def get_trending(n: int = 10) -> list:
    day_bucket = int(time.time() // 86400)
    key = f"trending:topics:{day_bucket}"
    return r.zrevrange(key, 0, n - 1, withscores=True)
```

## Windowed Trending

Track trending over specific time windows using multiple sorted sets:

```python
WINDOWS = {
    "1h": 3600,
    "6h": 21600,
    "24h": 86400,
}

def record_topic_mention(topic: str):
    now = int(time.time())
    pipe = r.pipeline()

    for window_name, window_seconds in WINDOWS.items():
        bucket = now // window_seconds
        key = f"trending:{window_name}:{bucket}"
        pipe.zincrby(key, 1, topic)
        pipe.expire(key, window_seconds * 3)

    pipe.execute()

def get_trending_in_window(window: str = "1h", n: int = 10) -> list:
    now = int(time.time())
    bucket = now // WINDOWS[window]
    key = f"trending:{window}:{bucket}"
    return r.zrevrange(key, 0, n - 1, withscores=True)
```

## Velocity-Based Trending

Surface topics accelerating the fastest by comparing recent vs previous window:

```python
def get_trending_by_velocity(n: int = 10) -> list:
    now = int(time.time())
    window = 3600

    curr_bucket = now // window
    prev_bucket = curr_bucket - 1

    curr_key = f"trending:1h:{curr_bucket}"
    prev_key = f"trending:1h:{prev_bucket}"

    # Get scores from both windows
    curr_scores = dict(r.zrange(curr_key, 0, -1, withscores=True))
    prev_scores = dict(r.zrange(prev_key, 0, -1, withscores=True))

    velocity = {}
    for topic, curr_score in curr_scores.items():
        prev_score = prev_scores.get(topic, 0)
        velocity[topic] = curr_score - prev_score

    # Sort by velocity
    return sorted(velocity.items(), key=lambda x: x[1], reverse=True)[:n]
```

## Hashtag Extraction and Recording

```python
import re

def process_post(content: str):
    hashtags = re.findall(r"#(\w+)", content.lower())
    for tag in hashtags:
        record_topic_mention(tag)
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your trending service endpoints and set alerts if the sorted set grows beyond expected cardinality bounds.

```bash
redis-cli ZCARD "trending:1h:$(date +%s | awk '{print int($1/3600)}')"
```

## Summary

Redis Sorted Sets with time-bucketed keys let you build velocity-aware trending topics. By comparing current and previous window scores, you surface accelerating topics rather than just high-volume ones. Decay scoring provides a continuous alternative when exact window boundaries are less important than smooth trend lines.
