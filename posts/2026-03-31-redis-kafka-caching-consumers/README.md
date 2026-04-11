# How to Use Redis with Kafka for Caching Kafka Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kafka, Cache, Consumer, Performance

Description: Learn how to use Redis as a caching layer for Kafka consumers to reduce repeated database lookups during message processing and improve consumer throughput.

---

Kafka consumers often need to look up reference data for each message - user profiles, product details, configuration records. Without caching, each message triggers a database call. Redis as a consumer-side cache can eliminate 90%+ of those lookups.

## Architecture

```text
Kafka Topic --> Consumer --> Redis cache lookup --> (cache miss) --> Database
                                                --> (cache hit)  --> Skip DB call
```

## Basic Consumer with Redis Cache

```python
from kafka import KafkaConsumer
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

consumer = KafkaConsumer(
    "order-events",
    bootstrap_servers=["kafka:9092"],
    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    group_id="order-processor"
)

def get_user(user_id: str) -> dict:
    """Fetch user with Redis cache."""
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - fetch from DB
    user = fetch_user_from_db(user_id)
    r.set(cache_key, json.dumps(user), ex=600)  # 10 min TTL
    return user

def fetch_user_from_db(user_id: str) -> dict:
    # Simulate DB query
    return {"user_id": user_id, "name": "Alice", "tier": "premium"}

def process_order(event: dict):
    user_id = event["user_id"]
    user = get_user(user_id)  # Cached after first lookup
    print(f"Processing order for {user['name']} (tier: {user['tier']})")

for message in consumer:
    process_order(message.value)
```

## Batch Pre-Warming the Cache

Before starting the consumer, pre-populate the cache with frequently accessed reference data.

```python
def prewarm_user_cache(user_ids: list[str]):
    """Batch fetch users and pre-populate the cache."""
    uncached = [uid for uid in user_ids if not r.exists(f"user:{uid}")]

    if not uncached:
        return

    # Bulk fetch from DB
    users = bulk_fetch_users(uncached)  # Returns list of user dicts

    pipeline = r.pipeline()
    for user in users:
        key = f"user:{user['user_id']}"
        pipeline.set(key, json.dumps(user), ex=600)
    pipeline.execute()
    print(f"Pre-warmed {len(users)} users")

def bulk_fetch_users(user_ids: list) -> list:
    # Simulate bulk DB fetch
    return [{"user_id": uid, "name": f"User {uid}", "tier": "standard"} for uid in user_ids]
```

## Handling Cache Invalidation from Kafka

Listen on a separate topic for update events and evict stale cache entries.

```python
invalidation_consumer = KafkaConsumer(
    "user-updates",
    bootstrap_servers=["kafka:9092"],
    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    group_id="cache-invalidator"
)

import threading

def invalidation_listener():
    for message in invalidation_consumer:
        event = message.value
        user_id = event.get("user_id")
        if user_id:
            deleted = r.delete(f"user:{user_id}")
            print(f"Invalidated cache for user {user_id} (deleted={deleted})")

threading.Thread(target=invalidation_listener, daemon=True).start()
```

## Measuring Cache Effectiveness

```python
hit_count = 0
miss_count = 0

def get_user_tracked(user_id: str) -> dict:
    global hit_count, miss_count
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    if cached:
        hit_count += 1
        return json.loads(cached)
    miss_count += 1
    user = fetch_user_from_db(user_id)
    r.set(cache_key, json.dumps(user), ex=600)
    return user

def print_stats():
    total = hit_count + miss_count
    rate = hit_count / total * 100 if total else 0
    print(f"Hit rate: {rate:.1f}% ({hit_count} hits / {miss_count} misses)")
```

## Summary

Redis as a consumer-side cache for Kafka reduces database load by storing reference data looked up during message processing. Pre-warming the cache before consumer startup improves early hit rates. A separate invalidation consumer listening on a user-updates topic ensures the cache reflects recent changes without scheduled expiry alone.

