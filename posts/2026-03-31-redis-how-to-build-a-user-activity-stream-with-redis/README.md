# How to Build a User Activity Stream with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Activity Stream, Stream, Social Features, Backend

Description: Learn how to build a user activity stream in Redis using Sorted Sets and Redis Streams to track and display recent user actions in real time.

---

## What Is a User Activity Stream

A user activity stream records actions a user has taken - likes, comments, follows, purchases - and displays them in reverse chronological order on their profile page. Think Twitter's activity feed or GitHub's contribution history.

## Choosing the Right Data Structure

Two Redis structures suit activity streams:
- Sorted Sets: Simple, score = timestamp, O(log n) insert/query. Best for fixed-size recent history.
- Redis Streams: Append-only log, built-in consumer groups, message IDs encode timestamps. Best for event sourcing and multiple consumers.

## Sorted Set Approach

```python
from redis import Redis
import time
import json

r = Redis(decode_responses=True)

MAX_ACTIVITIES = 500  # Keep last 500 activities per user

def record_activity(user_id: int, activity_type: str, metadata: dict):
    key = f"activity:{user_id}"
    event = json.dumps({
        "type": activity_type,
        "timestamp": int(time.time()),
        **metadata
    })
    score = time.time()
    r.zadd(key, {event: score})
    r.zremrangebyrank(key, 0, -(MAX_ACTIVITIES + 1))

def get_activity_stream(user_id: int, page: int = 0, page_size: int = 20) -> list:
    key = f"activity:{user_id}"
    start = page * page_size
    raw = r.zrevrange(key, start, start + page_size - 1, withscores=True)
    return [
        {**json.loads(event), "event_time": score}
        for event, score in raw
    ]

def get_activity_since(user_id: int, since_timestamp: float) -> list:
    key = f"activity:{user_id}"
    raw = r.zrangebyscore(key, since_timestamp, "+inf", withscores=True)
    return [
        {**json.loads(event), "event_time": score}
        for event, score in raw
    ]
```

## Redis Streams Approach

Redis Streams provide an append-only log with automatic ID generation and consumer group support:

```python
def record_activity_stream(user_id: int, activity_type: str, metadata: dict):
    stream_key = f"stream:activity:{user_id}"
    r.xadd(stream_key, {
        "type": activity_type,
        "user_id": user_id,
        **{k: str(v) for k, v in metadata.items()}
    }, maxlen=1000, approximate=True)

def read_activity_stream(user_id: int, count: int = 20,
                         since_id: str = "0") -> list:
    stream_key = f"stream:activity:{user_id}"
    messages = r.xrevrange(stream_key, min=since_id, count=count)
    return [
        {"id": msg_id, **fields}
        for msg_id, fields in messages
    ]

def subscribe_to_activity(user_id: int, last_id: str = "$"):
    stream_key = f"stream:activity:{user_id}"
    while True:
        messages = r.xread({stream_key: last_id}, count=10, block=5000)
        if messages:
            for stream_name, stream_messages in messages:
                for msg_id, fields in stream_messages:
                    last_id = msg_id
                    yield {"id": msg_id, **fields}
```

## Recording Common Activity Types

```python
def on_user_liked_post(user_id: int, post_id: str, post_title: str):
    record_activity(user_id, "liked_post", {
        "post_id": post_id,
        "post_title": post_title[:100]
    })

def on_user_followed(user_id: int, followed_id: int, followed_name: str):
    record_activity(user_id, "followed_user", {
        "followed_id": followed_id,
        "followed_name": followed_name
    })

def on_user_commented(user_id: int, post_id: str, comment_preview: str):
    record_activity(user_id, "commented", {
        "post_id": post_id,
        "preview": comment_preview[:100]
    })

def on_purchase(user_id: int, order_id: str, amount: float):
    record_activity(user_id, "purchase", {
        "order_id": order_id,
        "amount": amount
    })
```

## Aggregated Activity for Notifications

Roll up multiple similar events to avoid notification spam:

```python
def get_aggregated_activities(user_id: int, window_minutes: int = 60) -> list:
    since = time.time() - window_minutes * 60
    activities = get_activity_since(user_id, since)

    aggregated = {}
    for act in activities:
        act_type = act["type"]
        if act_type not in aggregated:
            aggregated[act_type] = {"type": act_type, "count": 0, "latest": act}
        aggregated[act_type]["count"] += 1

    return list(aggregated.values())
```

## FastAPI Endpoint

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}/activity")
def user_activity(user_id: int, page: int = 0, page_size: int = 20):
    return get_activity_stream(user_id, page, page_size)
```

## Summary

Redis Sorted Sets provide a simple, TTL-free activity log with score-based time ordering and efficient range retrieval by recency or time window. Redis Streams add persistent event sourcing, consumer group support, and blocking reads for real-time activity subscriptions. Recording activities as structured JSON events enables flexible rendering and aggregation on read.
