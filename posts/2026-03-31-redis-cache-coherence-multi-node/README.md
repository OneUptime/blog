# How to Implement Cache Coherence in Multi-Node Systems with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Coherence, Distributed System, Invalidation

Description: Learn how to maintain cache coherence across multiple application nodes using Redis Pub/Sub to broadcast invalidations when the underlying data changes.

---

When multiple application nodes each have local in-memory caches, a data update on one node leaves the others with stale copies. Cache coherence ensures all nodes reflect the latest data. Redis Pub/Sub is a lightweight broadcast bus for invalidation signals.

## The Problem

```text
Node A updates user u1 --> updates DB --> updates its own local cache
Node B still has old u1 in its local cache --> stale reads
```

## Solution: Redis Pub/Sub for Invalidation

When any node writes to the database, it publishes an invalidation event. All nodes (including the writer) subscribe and clear their local cache entry.

```python
import redis
import json
import threading
from typing import Optional

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Simple in-process cache (could be a more sophisticated TTL-based cache)
_local_cache: dict = {}
_cache_lock = threading.Lock()

INVALIDATION_CHANNEL = "cache:invalidations"

# --- Cache operations ---

def local_get(key: str) -> Optional[dict]:
    with _cache_lock:
        return _local_cache.get(key)

def local_set(key: str, value: dict):
    with _cache_lock:
        _local_cache[key] = value

def local_delete(key: str):
    with _cache_lock:
        _local_cache.pop(key, None)

# --- Invalidation broadcast ---

def publish_invalidation(key: str):
    r.publish(INVALIDATION_CHANNEL, json.dumps({"key": key}))

def subscribe_invalidations():
    pubsub = r.pubsub()
    pubsub.subscribe(INVALIDATION_CHANNEL)
    for message in pubsub.listen():
        if message["type"] == "message":
            payload = json.loads(message["data"])
            key = payload["key"]
            local_delete(key)
            print(f"Invalidated local cache for: {key}")

# Start the invalidation listener on startup
listener_thread = threading.Thread(target=subscribe_invalidations, daemon=True)
listener_thread.start()
```

## Reading with L1/L2 Cache

```python
def get_user(user_id: str) -> Optional[dict]:
    cache_key = f"user:{user_id}"

    # L1: local in-process cache
    cached = local_get(cache_key)
    if cached:
        return cached

    # L2: Redis (shared across nodes)
    raw = r.get(cache_key)
    if raw:
        value = json.loads(raw)
        local_set(cache_key, value)
        return value

    return None  # Cache miss - caller fetches from DB
```

## Writing with Coherence

```python
def update_user(user_id: str, data: dict, db_connection):
    cache_key = f"user:{user_id}"

    # 1. Write to database
    db_connection.execute(
        "UPDATE users SET data = %s WHERE id = %s",
        (json.dumps(data), user_id)
    )

    # 2. Update Redis L2 cache
    r.set(cache_key, json.dumps(data), ex=600)

    # 3. Broadcast invalidation to all nodes (including self)
    publish_invalidation(cache_key)
    print(f"Updated {cache_key} and broadcast invalidation")
```

## Testing Coherence

```bash
# Simulate an invalidation from another node
redis-cli PUBLISH cache:invalidations '{"key":"user:u123"}'

# Watch your subscriber pick it up
```

## Pattern for Multiple Key Types

```python
def publish_invalidation_batch(keys: list[str]):
    pipeline = r.pipeline()
    for key in keys:
        pipeline.publish(INVALIDATION_CHANNEL, json.dumps({"key": key}))
    pipeline.execute()
```

## Summary

Cache coherence across multiple nodes requires a broadcast mechanism. Redis Pub/Sub provides a simple invalidation bus: any node that modifies data publishes the affected cache key, and all subscribers evict it from their local caches. This two-tier (local + Redis) approach gives low-latency reads while keeping data consistent after writes.

