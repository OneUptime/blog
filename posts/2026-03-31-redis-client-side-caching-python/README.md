# How to Implement Client-Side Caching in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Client-Side Caching, redis-py, Tracking

Description: Learn how to implement Redis client-side caching in Python using redis-py with CLIENT TRACKING, local cache management, and automatic invalidation handling.

---

Redis client-side caching lets Python applications maintain a local in-process cache that Redis automatically invalidates when keys change. This reduces round trips to Redis while keeping data consistent.

## Prerequisites

Install redis-py 4.2.0 or later:

```bash
pip install redis>=4.2.0
```

## Basic Client-Side Cache Implementation

```python
import redis
import threading
import time
from typing import Optional

class RedisClientSideCache:
    def __init__(self, host='localhost', port=6379, db=0):
        # Data connection for reads/writes
        self.r = redis.Redis(host=host, port=port, db=db, decode_responses=True)

        # Separate connection for invalidation messages
        self.inv_r = redis.Redis(host=host, port=port, db=db, decode_responses=True)

        self._cache: dict = {}
        self._lock = threading.Lock()
        self._setup_tracking()

    def _setup_tracking(self):
        """Enable CLIENT TRACKING and start invalidation listener"""
        pubsub = self.inv_r.pubsub()
        pubsub.subscribe('__redis__:invalidate')

        inv_client_id = self.inv_r.client_id()

        # Redirect invalidation messages to the inv_r connection
        self.r.execute_command(
            'CLIENT', 'TRACKING', 'ON',
            'REDIRECT', str(inv_client_id)
        )

        def listen_for_invalidations():
            for msg in pubsub.listen():
                if msg['type'] != 'message':
                    continue
                payload = msg['data']
                if payload is None:
                    with self._lock:
                        self._cache.clear()
                    continue

                keys = payload if isinstance(payload, list) else [payload]
                with self._lock:
                    for key in keys:
                        self._cache.pop(key, None)

        t = threading.Thread(target=listen_for_invalidations, daemon=True)
        t.start()

    def get(self, key: str) -> Optional[str]:
        """Get a value, using local cache when possible"""
        with self._lock:
            if key in self._cache:
                return self._cache[key]

        # Not in cache - fetch from Redis (registers key in tracking table)
        value = self.r.get(key)

        if value is not None:
            with self._lock:
                self._cache[key] = value

        return value

    def set(self, key: str, value: str, ex: int = None) -> None:
        """Set a value in Redis (invalidation handles local cache)"""
        self.r.set(key, value, ex=ex)

    def delete(self, key: str) -> None:
        """Delete a key from Redis (invalidation handles local cache)"""
        self.r.delete(key)

    def cache_size(self) -> int:
        with self._lock:
            return len(self._cache)

    def close(self):
        self.r.execute_command('CLIENT', 'TRACKING', 'OFF')
        self.r.close()
        self.inv_r.close()
```

## Usage Example

```python
import time

cache = RedisClientSideCache(host='localhost', port=6379)

# First read - fetches from Redis, caches locally
value = cache.get('user:42')
print(f"Value: {value}")  # Cache MISS

# Second read - served from local memory
value = cache.get('user:42')
print(f"Value: {value}")  # Cache HIT (no Redis round trip)

# Update from anywhere - local cache is automatically invalidated
r_other = redis.Redis(decode_responses=True)
r_other.set('user:42', '{"name":"Alice","role":"admin"}')

time.sleep(0.05)  # Wait for invalidation to propagate

# Next read fetches fresh data from Redis
value = cache.get('user:42')
print(f"Value: {value}")  # Cache MISS, fresh data
```

## Benchmarking Cache Effectiveness

```python
import time

def benchmark(cache, key, iterations=10000):
    r = redis.Redis(decode_responses=True)
    r.set(key, 'test_value')

    # Warm up the cache
    cache.get(key)

    # Measure cached reads
    start = time.perf_counter()
    for _ in range(iterations):
        cache.get(key)
    elapsed = time.perf_counter() - start
    cached_qps = iterations / elapsed

    # Measure uncached Redis reads
    start = time.perf_counter()
    for _ in range(iterations):
        r.get(key)
    elapsed = time.perf_counter() - start
    direct_qps = iterations / elapsed

    print(f"Cached: {cached_qps:,.0f} ops/sec")
    print(f"Direct Redis: {direct_qps:,.0f} ops/sec")
    print(f"Speedup: {cached_qps/direct_qps:.1f}x")

benchmark(cache, 'benchmark:key')
```

## Adding TTL-Based Expiry

```python
def get_with_ttl(self, key: str, max_age_seconds: int = 60) -> Optional[str]:
    """Get with TTL fallback for stale data protection"""
    with self._lock:
        if key in self._cache:
            value, ts = self._cache[key]
            if time.time() - ts < max_age_seconds:
                return value
            del self._cache[key]

    value = self.r.get(key)
    if value is not None:
        with self._lock:
            self._cache[key] = (value, time.time())

    return value
```

## Summary

Implement Redis client-side caching in Python using two connections: one for data operations and one dedicated to receiving invalidation messages via `CLIENT TRACKING`. Use a thread-safe local dictionary as the in-process cache, and listen for `__redis__:invalidate` Pub/Sub messages to evict stale entries. This pattern reduces Redis round trips by orders of magnitude for frequently read, infrequently changed keys.
