# How to Handle Redis Downtime in Django Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Resilience, Fallback, Error Handling

Description: Learn how to make Django applications resilient to Redis downtime using fallback cache backends, graceful degradation, and circuit breaker patterns.

---

Redis downtime should not take your Django application down with it. By combining fallback backends, graceful exception handling, and a circuit breaker, you can degrade gracefully rather than serve errors.

## Configure a Fallback Cache

django-redis can silently ignore connection errors when Redis is unavailable, allowing your application to continue without caching:

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {"max_connections": 50},
            "SOCKET_CONNECT_TIMEOUT": 2,
            "SOCKET_TIMEOUT": 2,
            "RETRY_ON_TIMEOUT": True,
            "IGNORE_EXCEPTIONS": True,  # return None instead of raising
        },
    }
}
```

With `IGNORE_EXCEPTIONS = True`, cache operations return `None` on connection errors and sets are silently dropped. Views continue working, just without caching.

## Graceful Degradation in Views

```python
from django.core.cache import cache
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)

def get_products(request):
    try:
        cached = cache.get("products:all")
        if cached is not None:
            return JsonResponse(cached, safe=False)
    except Exception as e:
        logger.warning("Redis unavailable: %s", e)

    # Always fall back to database
    products = list(Product.objects.values("id", "name", "price"))

    try:
        cache.set("products:all", products, timeout=300)
    except Exception as e:
        logger.warning("Could not cache response: %s", e)

    return JsonResponse(products, safe=False)
```

## Session Fallback

If sessions are stored in Redis and Redis goes down, users get logged out. Use `cached_db` to fall back to the database:

```python
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
SESSION_CACHE_ALIAS = "default"
```

`cached_db` writes sessions to the database AND the cache. On Redis downtime, sessions are served from the database.

## Health Check Endpoint

Expose a health check that reports Redis status:

```python
from django.http import JsonResponse
from django_redis import get_redis_connection

def health_check(request):
    status = {"app": "ok", "redis": "ok"}
    http_status = 200

    try:
        redis_conn = get_redis_connection("default")
        redis_conn.ping()
    except Exception as e:
        status["redis"] = f"unavailable: {e}"
        http_status = 503

    return JsonResponse(status, status=http_status)
```

## Simple Circuit Breaker

Prevent hammering a down Redis with repeated connection attempts:

```python
import time
from threading import Lock

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failures = 0
        self.threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.opened_at = None
        self._lock = Lock()

    def is_open(self):
        if self.opened_at and (time.time() - self.opened_at) > self.recovery_timeout:
            with self._lock:
                self.failures = 0
                self.opened_at = None
        return self.opened_at is not None

    def record_failure(self):
        with self._lock:
            self.failures += 1
            if self.failures >= self.threshold:
                self.opened_at = time.time()

    def record_success(self):
        with self._lock:
            self.failures = 0
            self.opened_at = None

redis_breaker = CircuitBreaker()

def safe_cache_get(key):
    if redis_breaker.is_open():
        return None
    try:
        value = cache.get(key)
        redis_breaker.record_success()
        return value
    except Exception:
        redis_breaker.record_failure()
        return None
```

## Summary

Handle Redis downtime in Django by setting `IGNORE_EXCEPTIONS: True` in cache options for silent fallback, using `SESSION_ENGINE = "cached_db"` to keep sessions alive via the database, and adding try/except blocks around cache calls so business logic continues without Redis. Add a health check endpoint so your load balancer or monitoring tool can detect Redis failures early.
