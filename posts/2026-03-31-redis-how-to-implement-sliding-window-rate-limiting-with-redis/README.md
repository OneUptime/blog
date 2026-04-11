# How to Implement Sliding Window Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Sliding Window, API, Security

Description: Learn how to implement a precise sliding window rate limiter in Redis using Sorted Sets to protect APIs from abuse without fixed window bias.

---

## Why Sliding Window Over Fixed Window

A fixed window counter resets every minute. A user can send 100 requests at 12:00:59 and another 100 at 12:01:01, effectively doubling the allowed rate at window boundaries. A sliding window considers only the requests in the last N seconds relative to the current timestamp, eliminating this spike.

## Sliding Window with Sorted Sets

Each request is stored as a member in a Sorted Set with the current timestamp as the score. To check the limit, count how many members fall within the last window period.

```bash
# Add a request at timestamp 1711900000
ZADD rate:user:42 1711900000.123 "req:1711900000.123"

# Count requests in the last 60 seconds
ZCOUNT rate:user:42 1711899940 +inf

# Remove requests older than the window
ZREMRANGEBYSCORE rate:user:42 -inf 1711899939
```

## Python Implementation

```python
import redis
import time

r = redis.Redis(decode_responses=True)

def is_allowed(identifier: str, limit: int, window_seconds: int) -> bool:
    now = time.time()
    window_start = now - window_seconds
    key = f"rate:{identifier}"

    pipe = r.pipeline()
    # Remove expired entries
    pipe.zremrangebyscore(key, "-inf", window_start)
    # Count remaining entries
    pipe.zcard(key)
    # Add current request with unique member (timestamp as both score and member)
    pipe.zadd(key, {str(now): now})
    # Set TTL to auto-clean the key
    pipe.expire(key, window_seconds + 1)
    results = pipe.execute()

    current_count = results[1]
    return current_count < limit
```

## Atomic Lua Implementation

The pipeline above has a race condition: between `ZCARD` and `ZADD`, another request could squeeze in. Use Lua for true atomicity:

```lua
-- sliding_window.lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local window_start = now - window

redis.call("ZREMRANGEBYSCORE", key, "-inf", window_start)
local count = redis.call("ZCARD", key)

if count < limit then
    redis.call("ZADD", key, now, now)
    redis.call("EXPIRE", key, window + 1)
    return 1
else
    return 0
end
```

```python
sliding_window_script = r.register_script("""
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local window_start = now - window

redis.call("ZREMRANGEBYSCORE", key, "-inf", window_start)
local count = redis.call("ZCARD", key)

if count < limit then
    redis.call("ZADD", key, now, now)
    redis.call("EXPIRE", key, window + 1)
    return 1
else
    return 0
end
""")

def check_rate_limit(identifier: str, limit: int = 100, window: int = 60) -> bool:
    now = time.time()
    result = sliding_window_script(
        keys=[f"rate:{identifier}"],
        args=[now, window, limit]
    )
    return bool(result)
```

## Returning Rate Limit Headers

APIs commonly return remaining request count and reset time in response headers:

```python
def get_rate_limit_info(identifier: str, limit: int = 100, window: int = 60) -> dict:
    now = time.time()
    window_start = now - window
    key = f"rate:{identifier}"

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, "-inf", window_start)
    pipe.zcard(key)
    pipe.zadd(key, {str(now): now})
    pipe.expire(key, window + 1)
    results = pipe.execute()

    count = results[1]
    allowed = count < limit
    remaining = max(0, limit - count - 1) if allowed else 0
    reset_at = int(now) + window

    return {
        "limit": limit,
        "remaining": remaining,
        "reset": reset_at,
        "allowed": allowed
    }
```

## FastAPI Middleware Integration

```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

app = FastAPI()

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    info = get_rate_limit_info(client_ip, limit=100, window=60)

    if not info["allowed"]:
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests"},
            headers={
                "X-RateLimit-Limit": str(info["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(info["reset"]),
                "Retry-After": str(info["reset"] - int(time.time()))
            }
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(info["limit"])
    response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
    response.headers["X-RateLimit-Reset"] = str(info["reset"])
    return response
```

## Summary

Sliding window rate limiting with Redis Sorted Sets stores each request as a timestamped entry and counts only those within the current window. A Lua script ensures atomicity so concurrent requests cannot bypass the limit. Returning rate limit headers gives API consumers visibility into their current quota and when it resets.
