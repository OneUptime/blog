# How to Implement Cache with Graceful Degradation in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Graceful Degradation, Resilience, Circuit Breaker

Description: Learn how to implement graceful cache degradation in Redis so your application continues to serve requests when Redis is unavailable, without crashing.

---

A cache dependency can become a single point of failure. If your application throws an exception whenever Redis is unreachable, a Redis outage brings down your entire service. Graceful degradation means the application falls back to the database (slower, but functional) when the cache is unavailable.

## Basic Pattern: Try Cache, Fall Back to Source

```python
import redis
import json
import logging
from typing import Optional, Callable, Any

logger = logging.getLogger(__name__)

r = redis.Redis(host="localhost", port=6379, decode_responses=True, socket_timeout=0.5)

def get_with_fallback(
    cache_key: str,
    fetch_fn: Callable[[], Any],
    ttl: int = 300
) -> Any:
    """Try Redis first; fall back to fetch_fn if Redis fails."""
    try:
        raw = r.get(cache_key)
        if raw is not None:
            return json.loads(raw)
    except redis.RedisError as e:
        logger.warning(f"Redis unavailable, using fallback: {e}")

    # Fetch from source of truth
    value = fetch_fn()

    # Try to populate the cache (best-effort, ignore failures)
    try:
        r.set(cache_key, json.dumps(value), ex=ttl)
    except redis.RedisError:
        pass  # Cache population failed - continue without it

    return value

# Usage
def get_user_from_db(user_id: str) -> dict:
    # Simulate database query
    return {"user_id": user_id, "name": "Alice"}

user = get_with_fallback(
    cache_key=f"user:{user_id}",
    fetch_fn=lambda: get_user_from_db(user_id),
    ttl=600
)
```

## Circuit Breaker for Redis

Open the circuit after N consecutive failures to avoid hammering a downed Redis instance.

```python
import time

class RedisCircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_time: int = 30):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time
        self.opened_at: Optional[float] = None

    def is_open(self) -> bool:
        if self.opened_at is None:
            return False
        if time.time() - self.opened_at > self.recovery_time:
            # Try to recover
            self.failure_count = 0
            self.opened_at = None
            return False
        return True

    def record_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.opened_at = time.time()
            logger.error("Redis circuit breaker opened")

    def record_success(self):
        self.failure_count = 0
        self.opened_at = None

_breaker = RedisCircuitBreaker()

def redis_get_safe(key: str) -> Optional[str]:
    if _breaker.is_open():
        return None  # Skip Redis entirely while circuit is open
    try:
        value = r.get(key)
        _breaker.record_success()
        return value
    except redis.RedisError as e:
        _breaker.record_failure()
        logger.warning(f"Redis error: {e}")
        return None
```

## Stale-While-Revalidate

Serve stale cached data while refreshing in the background.

```python
import threading

def get_stale_or_fresh(cache_key: str, fetch_fn: Callable, ttl: int = 300, stale_window: int = 60) -> Any:
    try:
        raw = r.get(cache_key)
        if raw:
            remaining_ttl = r.ttl(cache_key)
            # If within stale window, serve and refresh in background
            if remaining_ttl < stale_window:
                threading.Thread(
                    target=lambda: r.set(cache_key, json.dumps(fetch_fn()), ex=ttl),
                    daemon=True
                ).start()
            return json.loads(raw)
    except redis.RedisError:
        pass

    # Cache unavailable or miss - fetch synchronously
    value = fetch_fn()
    try:
        r.set(cache_key, json.dumps(value), ex=ttl)
    except redis.RedisError:
        pass
    return value
```

## Testing Degraded Behavior

```bash
# Simulate Redis being down
docker stop redis

# Run your application and verify it still serves requests (slower, from DB)

# Bring Redis back
docker start redis
```

## Summary

Graceful cache degradation wraps every Redis operation in a try/except and falls back to the source of truth on failure. A circuit breaker prevents repeated attempts against a downed Redis instance. The stale-while-revalidate pattern serves slightly old data from cache while refreshing in the background, avoiding synchronous latency spikes.

