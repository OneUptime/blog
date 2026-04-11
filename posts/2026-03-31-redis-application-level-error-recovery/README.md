# Redis Application-Level Error Recovery Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error Recovery, Resilience, Best Practice, Application

Description: Learn how to build application-level Redis error recovery - covering stale cache handling, fallback patterns, cache warming, and recovery from extended Redis outages.

---

Even with Redis Sentinel or Cluster for high availability, applications must be designed to recover gracefully from Redis failures. Network partitions, rolling upgrades, and unexpected crashes can cause temporary Redis unavailability. This guide covers application-level recovery patterns.

## Distinguish Cache Miss from Cache Error

Your application must treat a Redis error differently from a cache miss:

```python
def get_from_cache(key: str):
    try:
        value = redis_client.get(key)
        if value is None:
            return None, "miss"      # Key not found
        return value, "hit"
    except Exception as e:
        logger.warning(f"Redis error: {e}")
        return None, "error"          # Redis unavailable

def get_user(user_id: str):
    value, status = get_from_cache(f"user:{user_id}")

    if status == "hit":
        return json.loads(value)

    # Both miss and error fall through to database
    user = db.get_user(user_id)

    if status == "miss":
        # Only populate cache on clean miss, not on error
        try:
            redis_client.setex(f"user:{user_id}", 3600, json.dumps(user))
        except Exception:
            pass  # Cache write failure is non-critical

    return user
```

## Implement Cache Warmup After Recovery

When Redis comes back online after an outage, start with cold cache. Warm it proactively to avoid a database stampede:

```python
def warm_cache_for_hot_keys():
    hot_user_ids = db.get_most_active_users(limit=1000)

    for user_id in hot_user_ids:
        try:
            user = db.get_user(user_id)
            redis_client.setex(f"user:{user_id}", 3600, json.dumps(user))
        except Exception as e:
            logger.error(f"Cache warmup failed for {user_id}: {e}")
            break  # Stop warmup if Redis is still unavailable
```

Run this after deploying or after a Sentinel failover is detected.

## Use Stale-While-Revalidate Pattern

Serve stale cached data while refreshing in the background:

```python
import threading

def get_with_stale_allowed(key: str, ttl: int, fetch_fn):
    value = redis_client.get(key)
    remaining_ttl = redis_client.ttl(key)

    if value and remaining_ttl > 10:
        return json.loads(value)  # Fresh enough

    if value and remaining_ttl <= 10:
        # Serve stale but refresh in background
        threading.Thread(
            target=lambda: refresh_cache(key, ttl, fetch_fn),
            daemon=True
        ).start()
        return json.loads(value)

    # No cache - fetch synchronously
    fresh = fetch_fn()
    redis_client.setex(key, ttl, json.dumps(fresh))
    return fresh
```

## Handle Failover-Induced Client Errors

After a Sentinel failover, clients may briefly get `READONLY` errors (still pointing at old master now serving as replica) or connection errors:

```python
from redis.exceptions import ReadOnlyError, ConnectionError
import time

def resilient_write(key, value, max_retries=5):
    for i in range(max_retries):
        try:
            redis_client.set(key, value)
            return
        except ReadOnlyError:
            # Client still connected to old master - refresh
            logger.warning("Got READONLY, refreshing connection")
            redis_client.connection_pool.disconnect()
            time.sleep(1)
        except ConnectionError:
            time.sleep(2 ** i * 0.5)
    raise Exception("Redis write failed after retries")
```

## Track Recovery State in Metrics

Expose cache error rate as a metric for operational visibility:

```python
from prometheus_client import Counter

cache_hits = Counter('redis_cache_hits_total', 'Cache hits')
cache_misses = Counter('redis_cache_misses_total', 'Cache misses')
cache_errors = Counter('redis_cache_errors_total', 'Cache errors')

def get_from_cache(key: str):
    try:
        value = redis_client.get(key)
        if value is not None:
            cache_hits.inc()
            return value
        cache_misses.inc()
        return None
    except Exception:
        cache_errors.inc()
        return None
```

Alert when `cache_errors_total` rate increases sharply - it signals Redis instability.

## Summary

Application-level Redis error recovery requires distinguishing cache errors from misses, falling back to source-of-truth databases gracefully, and warming the cache after Redis comes back online. Handle failover-induced READONLY errors with connection refreshes and exponential backoff. Tracking cache error rates as metrics gives your operations team visibility into Redis health from the application's perspective.
