# How to Implement Request Collapsing (Coalescing) with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Request Collapsing, Coalescing, Performance

Description: Learn how to use Redis to collapse duplicate in-flight requests for the same resource so only one backend call is made under high concurrency.

---

## What Is Request Collapsing

Request collapsing (also called request coalescing) is a technique that prevents multiple concurrent requests for the same uncached resource from each independently hitting the backend. Instead, the first request acquires a lock and fetches the data while subsequent requests wait and share the result.

Without this pattern, a cache miss under high traffic can cause a "thundering herd" where hundreds of requests simultaneously query a slow database or external API.

## Basic Pattern Using SETNX

The simplest approach uses `SET key value NX EX` to act as a lock. The first request wins the lock, fetches the data, and stores it. Other requests poll until the value appears.

```python
import redis
import time
import json

r = redis.Redis(decode_responses=True)

LOCK_TTL = 10      # seconds to hold the lock
POLL_INTERVAL = 0.05  # 50ms between polls
POLL_TIMEOUT = 5   # max seconds to wait

def fetch_with_coalescing(cache_key: str, fetch_fn, ttl: int = 300):
    # Check cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:{cache_key}"
    acquired = r.set(lock_key, "1", nx=True, ex=LOCK_TTL)

    if acquired:
        try:
            data = fetch_fn()
            r.set(cache_key, json.dumps(data), ex=ttl)
            return data
        finally:
            r.delete(lock_key)
    else:
        # Wait for the lock holder to populate the cache
        deadline = time.time() + POLL_TIMEOUT
        while time.time() < deadline:
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            time.sleep(POLL_INTERVAL)
        # Fallback: fetch directly if the lock holder failed
        return fetch_fn()
```

## Using Redis Pub/Sub for Instant Notification

Polling adds latency. A cleaner approach publishes a notification when the result is ready, so waiters wake up immediately.

```python
def fetch_with_pubsub(cache_key: str, fetch_fn, ttl: int = 300):
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:{cache_key}"
    notify_channel = f"notify:{cache_key}"
    acquired = r.set(lock_key, "1", nx=True, ex=LOCK_TTL)

    if acquired:
        try:
            data = fetch_fn()
            r.set(cache_key, json.dumps(data), ex=ttl)
            r.publish(notify_channel, "ready")
            return data
        finally:
            r.delete(lock_key)
    else:
        pubsub = r.pubsub()
        pubsub.subscribe(notify_channel)
        try:
            # Re-check cache after subscribing to avoid race condition
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            deadline = time.time() + POLL_TIMEOUT
            while time.time() < deadline:
                message = pubsub.get_message(timeout=1)
                if message and message["type"] == "message":
                    cached = r.get(cache_key)
                    if cached:
                        return json.loads(cached)
            # Fallback: fetch directly if notification was not received
            return fetch_fn()
        finally:
            pubsub.unsubscribe(notify_channel)
            pubsub.close()
```

## Handling Lock Expiry and Failures

If the lock holder crashes, the lock will eventually expire but waiters may time out first. Add a fallback that re-attempts the fetch:

```python
def safe_fetch(cache_key: str, fetch_fn, ttl: int = 300):
    for attempt in range(3):
        result = fetch_with_coalescing(cache_key, fetch_fn, ttl)
        if result is not None:
            return result
        time.sleep(0.1 * (2 ** attempt))
    return fetch_fn()
```

## Async Version with asyncio

```python
import asyncio
from redis.asyncio import Redis
import json

async def fetch_coalesced(r, cache_key: str, async_fetch_fn, ttl: int = 300):
    cached = await r.get(cache_key)
    if cached:
        return json.loads(cached)

    lock_key = f"lock:{cache_key}"
    acquired = await r.set(lock_key, "1", nx=True, ex=10)

    if acquired:
        try:
            data = await async_fetch_fn()
            await r.set(cache_key, json.dumps(data), ex=ttl)
            return data
        finally:
            await r.delete(lock_key)
    else:
        for _ in range(100):  # poll up to 5 seconds
            await asyncio.sleep(0.05)
            cached = await r.get(cache_key)
            if cached:
                return json.loads(cached)
        return await async_fetch_fn()
```

## Practical Example - Product Detail API

```python
import httpx

def get_product(product_id: int):
    def fetch():
        response = httpx.get(f"https://api.example.com/products/{product_id}")
        return response.json()

    return fetch_with_coalescing(
        cache_key=f"product:{product_id}",
        fetch_fn=fetch,
        ttl=600
    )

# Under 500 concurrent requests for product 42,
# only one HTTP call is made to the upstream API.
```

## Summary

Request collapsing with Redis uses a distributed lock (`SET NX EX`) so only one request fetches the backing data on a cache miss while others wait for the result. Using Pub/Sub instead of polling reduces latency for waiters and eliminates busy-wait overhead. Adding retry logic and fallback fetches ensures resilience when lock holders fail.
