# How to Build a Real-Time Feature Pipeline with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Machine Learning, Feature Pipeline, Stream, Real-Time

Description: Build a real-time ML feature pipeline using Redis Streams and aggregation commands to compute and serve features with millisecond freshness for online inference.

---

Batch feature pipelines run hourly or daily, leaving models with stale features. A real-time pipeline computes features as events arrive, storing results in Redis for immediate use. Redis Streams handle event ingestion and aggregation commands maintain rolling statistics.

## Architecture

```text
Event Source --> Redis Stream --> Feature Processor --> Redis Hash (Features)
                                        |
                                  (aggregates on write)
                                        |
                            Inference Service <-- HGETALL
```

## Ingesting Raw Events

```python
import redis
import json
import time

r = redis.Redis(host="redis", port=6379, decode_responses=True)

def ingest_event(event_type: str, entity_id: str, payload: dict):
    r.xadd(f"events:{event_type}", {
        "entity_id": entity_id,
        "payload": json.dumps(payload),
        "ts": str(int(time.time() * 1000))
    })
```

```python
# Example: user page view event
ingest_event("page_view", "user:42", {
    "page": "product:789",
    "category": "electronics",
    "session_id": "sess-abc"
})
```

## Feature Processor: Consuming and Aggregating

```python
def process_page_view_events():
    try:
        r.xgroup_create("events:page_view", "feature-processor", id="0",
                        mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise

    while True:
        messages = r.xreadgroup(
            groupname="feature-processor",
            consumername="processor-1",
            streams={"events:page_view": ">"},
            count=50,
            block=1000
        )

        if not messages:
            continue

        pipeline = r.pipeline()
        for stream, entries in messages:
            for msg_id, data in entries:
                entity_id = data["entity_id"]
                payload = json.loads(data["payload"])
                update_view_features(entity_id, payload, pipeline)
                pipeline.xack("events:page_view", "feature-processor", msg_id)

        pipeline.execute()

def update_view_features(entity_id: str, payload: dict, pipeline):
    key = f"features:{entity_id}"
    now = int(time.time())

    pipeline.hincrby(key, "total_views", 1)
    pipeline.hincrby(key, f"views_cat_{payload['category']}", 1)
    pipeline.hset(key, "last_view_ts", str(now))
    pipeline.expire(key, 86400)
```

## Rolling Window Features with Sorted Sets

Track events in a sliding window:

```python
def record_purchase(user_id: int, amount: float):
    ts = time.time()
    key = f"purchases:{user_id}"
    r.zadd(key, {f"{ts}:{amount}": ts})
    r.expire(key, 86400)

def get_purchases_last_hour(user_id: int) -> tuple:
    cutoff = time.time() - 3600
    members = r.zrange(f"purchases:{user_id}", cutoff, "+inf", byscore=True)
    amounts = [float(m.split(":")[1]) for m in members]
    return len(amounts), sum(amounts)
```

Incorporate into feature hash:

```python
def refresh_purchase_features(user_id: int):
    count, total = get_purchases_last_hour(user_id)
    r.hset(f"features:user:{user_id}", mapping={
        "purchases_1h": str(count),
        "spend_1h": str(round(total, 2))
    })
```

## Feature Freshness Tracking

```python
def write_feature_with_timestamp(entity_id: str, features: dict):
    r.hset(f"features:{entity_id}", mapping={
        **features,
        "updated_at": str(int(time.time()))
    })

def is_feature_fresh(entity_id: str, max_age_s: int = 60) -> bool:
    updated = r.hget(f"features:{entity_id}", "updated_at")
    if not updated:
        return False
    return (time.time() - int(updated)) < max_age_s
```

## Monitoring Pipeline Lag

```bash
XINFO GROUPS events:page_view
# lag: 0      -- processor is keeping up
# pending: 2  -- 2 messages in flight
```

```bash
XLEN events:page_view  # total stream length
```

## Summary

A Redis real-time feature pipeline uses Streams for event ingestion, consumer groups to process events as they arrive, and Hash increments plus Sorted Set time-windowed aggregations to maintain fresh feature values. Features are ready in Redis within milliseconds of the event, so inference services always read current signals rather than day-old batch values.
