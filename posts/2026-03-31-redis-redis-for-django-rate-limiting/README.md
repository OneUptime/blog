# How to Use Redis for Django Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Rate Limiting, API, Security

Description: Learn how to implement Redis-backed rate limiting in Django using django-ratelimit and custom sliding window middleware to protect API endpoints.

---

Rate limiting protects your Django application from abuse and ensures fair resource usage. Redis is the ideal backend because it stores counters in memory and supports atomic increments with TTLs.

## Using django-ratelimit

```bash
pip install django-ratelimit django-redis
```

Add Redis as the cache backend first, then use `@ratelimit`:

```python
from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
@ratelimit(key="ip", rate="60/m", block=True)
def product_list(request):
    return Response({"products": []})

@api_view(["POST"])
@ratelimit(key="user_or_ip", rate="10/h", block=True)
def create_order(request):
    return Response({"status": "created"}, status=201)
```

Rate keys can be `ip`, `user`, `user_or_ip`, or a custom callable.

## Custom Sliding Window Rate Limiter

For full control, implement a sliding window counter using Redis sorted sets:

```python
import time
import redis
from django.conf import settings

redis_client = redis.Redis.from_url(settings.CACHES["default"]["LOCATION"])

def is_rate_limited(identifier: str, limit: int, window_seconds: int) -> bool:
    """Returns True if the identifier has exceeded the limit."""
    now = time.time()
    key = f"ratelimit:{identifier}"
    window_start = now - window_seconds

    pipe = redis_client.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)  # remove old entries
    pipe.zadd(key, {str(now): now})               # add current request
    pipe.zcard(key)                                # count requests in window
    pipe.expire(key, window_seconds)               # auto-expire the key
    _, _, count, _ = pipe.execute()

    return count > limit
```

## Middleware for Global API Rate Limiting

```python
# middleware.py
from django.http import JsonResponse
from .utils import is_rate_limited

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/"):
            # Identify by user ID or IP
            if request.user.is_authenticated:
                identifier = f"user:{request.user.id}"
                limit, window = 1000, 3600  # 1000/hour for logged in
            else:
                identifier = f"ip:{request.META.get('REMOTE_ADDR')}"
                limit, window = 100, 3600   # 100/hour for anonymous

            if is_rate_limited(identifier, limit, window):
                return JsonResponse(
                    {"error": "Rate limit exceeded. Try again later."},
                    status=429
                )

        return self.get_response(request)
```

Add to `settings.py`:

```python
MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "myapp.middleware.RateLimitMiddleware",
    ...
]
```

## Adding Rate Limit Headers

```python
import time
import redis
from django.http import JsonResponse

def get_rate_limit_info(identifier: str, limit: int, window: int) -> dict:
    redis_client = redis.Redis.from_url("redis://localhost:6379/0")
    key = f"ratelimit:{identifier}"
    now = time.time()

    count = redis_client.zcount(key, now - window, now)
    remaining = max(0, limit - count)

    return {"limit": limit, "remaining": remaining, "reset": int(now) + window}

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        info = get_rate_limit_info(f"ip:{request.META['REMOTE_ADDR']}", 100, 3600)
        response = self.get_response(request)
        response["X-RateLimit-Limit"] = info["limit"]
        response["X-RateLimit-Remaining"] = info["remaining"]
        response["X-RateLimit-Reset"] = info["reset"]
        return response
```

## Summary

Redis-backed rate limiting in Django uses sorted sets for sliding windows or `django-ratelimit` for decorator-based limits. The sliding window approach atomically removes expired entries, adds the current timestamp, and counts - all in one pipeline call. Add `X-RateLimit-*` headers to help clients understand their quota and backoff appropriately.
