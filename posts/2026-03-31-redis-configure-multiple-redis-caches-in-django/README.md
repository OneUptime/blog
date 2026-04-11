# How to Configure Multiple Redis Caches in Django

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Caching, Configuration, django-redis

Description: Learn how to configure multiple Redis cache backends in Django to separate sessions, rate limiting, and application caches with different TTLs and databases.

---

A single Redis cache backend works for small apps, but larger Django projects benefit from separating concerns: sessions in one database, API response cache in another, rate limit counters in a third. Each can have different TTLs, eviction policies, and server locations.

## Configuring Multiple Cache Backends

```python
# settings.py
CACHES = {
    # Default cache for general use
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "default",
        "TIMEOUT": 300,
    },
    # Dedicated session cache
    "sessions": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "sess",
        "TIMEOUT": 86400,  # 24 hours
    },
    # API response cache
    "api": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/2",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "api",
        "TIMEOUT": 60,
    },
    # Rate limiting counters
    "rate_limit": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/3",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "rl",
        "TIMEOUT": 3600,
    },
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "sessions"
```

## Accessing Specific Caches in Code

```python
from django.core.cache import caches

# Use the default cache
default_cache = caches["default"]
default_cache.set("key", "value", timeout=60)

# Use the API cache explicitly
api_cache = caches["api"]
api_cache.set("response:products", data, timeout=120)

# Use the rate limit cache
rl_cache = caches["rate_limit"]
rl_cache.incr("hits:user:42")
```

## Applying Specific Cache to a View

```python
from django.views.decorators.cache import cache_page

@cache_page(300, cache="api")
def product_list(request):
    ...
```

For manual control with a named cache:

```python
from django.core.cache import caches

def product_list(request):
    cache = caches["api"]
    data = cache.get("products:all")
    if data is None:
        data = list(Product.objects.values())
        cache.set("products:all", data, timeout=300)
    return JsonResponse(data, safe=False)
```

## Pointing to Different Redis Servers

```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis-primary:6379/0",
        ...
    },
    "replica": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis-replica:6379/0",
        ...
    },
}
```

## Sentinel Support

```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://mymaster/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.SentinelClient",
            "SENTINELS": [
                ("sentinel-1", 26379),
                ("sentinel-2", 26379),
            ],
            "SENTINEL_SERVICE_NAME": "mymaster",
        },
    }
}
```

## Summary

Multiple Redis cache backends in Django are configured as separate entries in `CACHES`, each pointing to a different Redis database or server. Use `caches["name"]` to access a specific backend in code, set `SESSION_CACHE_ALIAS` to point sessions at a dedicated backend, and assign different `TIMEOUT` defaults per cache type. This prevents busy caches from evicting critical session data.
