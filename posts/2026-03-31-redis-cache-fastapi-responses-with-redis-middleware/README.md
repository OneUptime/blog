# How to Cache FastAPI Responses with Redis Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FastAPI, Middleware, Caching, Python

Description: Implement Redis-backed response caching in FastAPI using custom middleware to automatically cache and serve API responses with configurable TTL.

---

## Introduction

Caching API responses reduces database load and improves response times for read-heavy endpoints. FastAPI does not ship with built-in HTTP response caching, but you can implement it cleanly with custom middleware backed by Redis. This guide shows how to build a reusable caching middleware for FastAPI.

## Installation

```bash
pip install fastapi uvicorn redis
```

## Redis Client Setup

```python
# redis_client.py
import redis.asyncio as aioredis

_redis: aioredis.Redis = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            "redis://localhost:6379",
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis
```

## Cache Middleware Implementation

```python
# cache_middleware.py
import json
import hashlib
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from redis_client import get_redis

class RedisCacheMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        default_ttl: int = 300,
        cache_prefix: str = "cache:",
        cacheable_paths: list = None,
    ):
        super().__init__(app)
        self.default_ttl = default_ttl
        self.cache_prefix = cache_prefix
        self.cacheable_paths = cacheable_paths or []

    def _should_cache(self, request: Request) -> bool:
        if request.method != "GET":
            return False
        if self.cacheable_paths:
            return any(request.url.path.startswith(p) for p in self.cacheable_paths)
        return True

    def _cache_key(self, request: Request) -> str:
        path_with_query = str(request.url)
        key_hash = hashlib.md5(path_with_query.encode()).hexdigest()
        return f"{self.cache_prefix}{key_hash}"

    async def dispatch(self, request: Request, call_next):
        if not self._should_cache(request):
            return await call_next(request)

        redis = await get_redis()
        cache_key = self._cache_key(request)

        # Try to return cached response
        cached = await redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return Response(
                content=data["body"],
                status_code=data["status_code"],
                headers={**data["headers"], "X-Cache": "HIT"},
                media_type=data.get("media_type", "application/json"),
            )

        # Call the actual route handler
        response = await call_next(request)

        # Only cache successful responses
        if response.status_code == 200:
            body = b""
            async for chunk in response.body_iterator:
                body += chunk

            await redis.setex(
                cache_key,
                self.default_ttl,
                json.dumps({
                    "body": body.decode("utf-8"),
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "media_type": response.media_type,
                })
            )

            return Response(
                content=body,
                status_code=response.status_code,
                headers={**dict(response.headers), "X-Cache": "MISS"},
                media_type=response.media_type,
            )

        return response
```

## Applying the Middleware to FastAPI

```python
# main.py
from fastapi import FastAPI
from cache_middleware import RedisCacheMiddleware

app = FastAPI()

app.add_middleware(
    RedisCacheMiddleware,
    default_ttl=300,
    cacheable_paths=["/api/products", "/api/categories", "/api/public"],
)

@app.get("/api/products")
async def get_products():
    # Simulate database query
    return [
        {"id": 1, "name": "Widget", "price": 9.99},
        {"id": 2, "name": "Gadget", "price": 19.99},
    ]

@app.get("/api/categories")
async def get_categories():
    return [{"id": 1, "name": "Electronics"}, {"id": 2, "name": "Clothing"}]
```

## Per-Route Caching with a Decorator

For more granular control, use a decorator:

```python
import json
import functools
from redis_client import get_redis

def cache_response(ttl: int = 60):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            redis = await get_redis()
            cache_key = f"route:{func.__name__}:{str(kwargs)}"
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)

            result = await func(*args, **kwargs)
            await redis.setex(cache_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@app.get("/api/stats")
@cache_response(ttl=120)
async def get_stats():
    return {"users": 1000, "orders": 5000}
```

## Cache Invalidation

```python
@app.post("/api/products")
async def create_product(product: dict):
    # ... save to database ...
    redis = await get_redis()
    # Invalidate cached product list
    pattern = "cache:*"
    async for key in redis.scan_iter(pattern):
        await redis.delete(key)
    return {"id": 3, **product}
```

## Summary

A Redis-backed middleware for FastAPI intercepts GET requests, checks for a cached response by hashing the request URL, and returns the cached response with an `X-Cache: HIT` header. On a cache miss, it calls the route handler, stores the response in Redis with a configurable TTL, and returns it with `X-Cache: MISS`. This approach centralizes caching logic without modifying individual route handlers.
