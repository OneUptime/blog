# How to Implement Read-Through Cache with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cache, State Management, Read-Through, Pattern

Description: Learn how to implement the read-through cache pattern using Dapr state management so your application automatically populates the cache on cache misses.

---

## What is Read-Through Caching?

In a read-through cache, the application always reads from the cache. On a cache miss, the cache layer fetches the data from the origin (database or external API), stores it in the cache, and returns it to the caller. Subsequent reads hit the cache. Dapr state management with a Redis backend provides the cache layer; your application code implements the miss handler.

## Setting Up the State Store

Configure a Redis-backed Dapr state store for caching:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cache
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
```

## Implementing Read-Through Cache in Python

```python
import httpx
from typing import Optional

DAPR_HTTP_PORT = 3500
CACHE_STORE = "cache"

async def get_from_cache(key: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/{CACHE_STORE}/{key}"
        )
        if resp.status_code == 200 and resp.text:
            return resp.json()
    return None

async def set_in_cache(key: str, value: dict, ttl_seconds: int = 300):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/{CACHE_STORE}",
            json=[{
                "key": key,
                "value": value,
                "metadata": {"ttlInSeconds": str(ttl_seconds)}
            }]
        )

async def fetch_product_from_db(product_id: str) -> dict:
    # Simulate a database call
    return {"product_id": product_id, "name": "Widget", "price": 9.99}

async def get_product(product_id: str) -> dict:
    cache_key = f"product:{product_id}"

    # Try cache first
    cached = await get_from_cache(cache_key)
    if cached:
        return {**cached, "source": "cache"}

    # Cache miss - fetch from origin
    product = await fetch_product_from_db(product_id)

    # Populate cache for future reads
    await set_in_cache(cache_key, product, ttl_seconds=300)

    return {**product, "source": "database"}
```

## Handling Cache Miss Concurrency

Under high load, multiple requests may hit the cache simultaneously on a miss and all try to populate it. Use Dapr's distributed lock to prevent the thundering herd.

First, configure a Redis-backed lock component (separate from the state store):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-lock
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
```

Then implement the lock-protected cache miss handler:

```python
import asyncio
import uuid

LOCK_STORE = "redis-lock"

async def get_product_with_lock(product_id: str) -> dict:
    cache_key = f"product:{product_id}"
    lock_key = f"lock:product:{product_id}"
    lock_owner = str(uuid.uuid4())

    cached = await get_from_cache(cache_key)
    if cached:
        return cached

    # Acquire lock before fetching from origin
    async with httpx.AsyncClient() as client:
        lock_resp = await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/lock/{LOCK_STORE}",
            json={"resourceId": lock_key, "lockOwner": lock_owner, "expiryInSeconds": 10}
        )
        if lock_resp.json().get("success"):
            try:
                product = await fetch_product_from_db(product_id)
                await set_in_cache(cache_key, product, ttl_seconds=300)
                return product
            finally:
                await client.post(
                    f"http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/unlock/{LOCK_STORE}",
                    json={"resourceId": lock_key, "lockOwner": lock_owner}
                )

    # Another instance is populating the cache - wait and retry
    await asyncio.sleep(0.1)
    return await get_from_cache(cache_key) or await fetch_product_from_db(product_id)
```

## Monitoring Cache Effectiveness

Track cache hit and miss rates using Dapr metrics. Expose a counter in your application:

```python
from prometheus_client import Counter

cache_hits = Counter("cache_hits_total", "Total cache hits", ["entity"])
cache_misses = Counter("cache_misses_total", "Total cache misses", ["entity"])

async def get_product(product_id: str) -> dict:
    cached = await get_from_cache(f"product:{product_id}")
    if cached:
        cache_hits.labels(entity="product").inc()
        return cached
    cache_misses.labels(entity="product").inc()
    # ... fetch and cache
```

## Summary

Read-through caching with Dapr state management keeps your data access layer clean - the application always calls one function, and that function handles cache population transparently. Using Dapr's TTL metadata prevents stale data from accumulating, and combining the pattern with Dapr distributed locks prevents thundering herd problems under high concurrency.
