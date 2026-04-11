# How to Use Redis with Sanic in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sanic, Python, Caching, Async

Description: Learn how to integrate Redis with Sanic in Python for async caching, rate limiting, and session storage using redis.asyncio with practical examples.

---

Sanic is a high-performance async Python web framework designed for speed. It pairs naturally with Redis for caching, session management, and rate limiting. This guide shows how to set up Redis with Sanic using the async `redis.asyncio` API.

## Installing Dependencies

```bash
pip install sanic redis
```

## Connecting Redis on App Startup

Use Sanic's lifecycle hooks to connect and disconnect Redis alongside the app.

```python
from sanic import Sanic
from sanic.response import json as sanic_json
import redis.asyncio as aioredis

app = Sanic("myapp")

@app.before_server_start
async def setup_redis(app, loop):
    app.ctx.redis = aioredis.from_url(
        "redis://localhost:6379",
        decode_responses=True,
    )
    await app.ctx.redis.ping()
    print("Redis connected")

@app.after_server_stop
async def teardown_redis(app, loop):
    await app.ctx.redis.aclose()
    print("Redis disconnected")
```

## Caching Route Responses

```python
import json

@app.get("/products/<product_id>")
async def get_product(request, product_id):
    redis = request.app.ctx.redis
    cache_key = f"product:{product_id}"
    cached = await redis.get(cache_key)
    if cached:
        return sanic_json(json.loads(cached), headers={"X-Cache": "HIT"})

    product = {"id": product_id, "name": "Widget"}  # Simulate DB fetch
    await redis.setex(cache_key, 120, json.dumps(product))
    return sanic_json(product, headers={"X-Cache": "MISS"})
```

## Rate Limiting with Redis

A fixed window rate limiter using Redis `INCR` and `EXPIRE`.

```python
from sanic.response import text

@app.middleware("request")
async def rate_limit(request):
    redis = request.app.ctx.redis
    ip = request.ip
    key = f"ratelimit:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > 100:
        return text("Rate limit exceeded", status=429)
```

## Token-Based Session Storage

```python
import uuid

@app.post("/login")
async def login(request):
    redis = request.app.ctx.redis
    body = request.json
    session_id = str(uuid.uuid4())
    session_data = json.dumps({"user": body.get("username")})
    await redis.setex(f"session:{session_id}", 86400, session_data)
    response = sanic_json({"message": "Logged in"})
    response.add_cookie("session_id", session_id, httponly=True)
    return response

@app.get("/profile")
async def profile(request):
    redis = request.app.ctx.redis
    session_id = request.cookies.get("session_id")
    if not session_id:
        return sanic_json({"error": "Unauthorized"}, status=401)
    raw = await redis.get(f"session:{session_id}")
    if not raw:
        return sanic_json({"error": "Session expired"}, status=401)
    return sanic_json(json.loads(raw))
```

## Caching Decorator Pattern

For reusable caching logic, write a simple decorator.

```python
from functools import wraps

def cached(ttl=60):
    def decorator(handler):
        @wraps(handler)
        async def wrapper(request, *args, **kwargs):
            redis = request.app.ctx.redis
            key = f"cache:{request.path}"
            hit = await redis.get(key)
            if hit:
                return sanic_json(json.loads(hit))
            response = await handler(request, *args, **kwargs)
            await redis.setex(key, ttl, response.body.decode())
            return response
        return wrapper
    return decorator

@app.get("/stats")
@cached(ttl=30)
async def stats(request):
    return sanic_json({"requests": 12345})
```

## Summary

Sanic integrates with Redis through lifecycle hooks for connection management and `redis.asyncio` for all async operations. Use `setex` for TTL-based caching, `INCR` with `EXPIRE` for rate limiting, and JSON-serialized keys for session storage.
