# How to Implement Concurrent Request Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Concurrency, Semaphore, API

Description: Learn how to limit the number of concurrent in-flight requests per user or globally using Redis as a distributed semaphore, preventing resource exhaustion from parallel requests.

---

Concurrent request limiting is different from rate limiting: instead of limiting requests per time window, it limits how many requests from a user can be actively processing at the same time. This prevents a single user from consuming all server resources with parallel requests.

## The Problem

A user rate-limited to 100 req/min could still send 100 requests simultaneously. If each request does expensive database work, this can overwhelm your server even though the per-minute limit is respected.

## Redis Semaphore Implementation

Use a Redis counter to track in-flight requests. Increment on entry, decrement on exit:

```lua
-- acquire_semaphore.lua
-- KEYS[1]: semaphore key
-- ARGV[1]: max concurrent requests
-- ARGV[2]: TTL in seconds (safety valve)
-- Returns: 1 if acquired, 0 if at limit

local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key)) or 0
if current >= limit then
    return 0
end

redis.call('INCR', key)
redis.call('EXPIRE', key, ttl)
return 1
```

```python
import redis
import contextlib
import uuid

ACQUIRE_SCRIPT = """
local current = tonumber(redis.call('GET', KEYS[1])) or 0
if current >= tonumber(ARGV[1]) then
    return 0
end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
"""

RELEASE_SCRIPT = """
local current = tonumber(redis.call('GET', KEYS[1])) or 0
if current > 0 then
    redis.call('DECR', KEYS[1])
end
return 1
"""

class ConcurrentLimiter:
    def __init__(self, r: redis.Redis, max_concurrent: int, ttl_seconds: int = 30):
        self.r = r
        self.max_concurrent = max_concurrent
        self.ttl = ttl_seconds

    def acquire(self, identifier: str) -> bool:
        key = f"concurrent:{identifier}"
        result = self.r.eval(ACQUIRE_SCRIPT, 1, key, self.max_concurrent, self.ttl)
        return result == 1

    def release(self, identifier: str):
        key = f"concurrent:{identifier}"
        self.r.eval(RELEASE_SCRIPT, 1, key)

    @contextlib.contextmanager
    def limit(self, identifier: str):
        if not self.acquire(identifier):
            raise Exception(f"Too many concurrent requests for {identifier}")
        try:
            yield
        finally:
            self.release(identifier)

    def get_active(self, identifier: str) -> int:
        key = f"concurrent:{identifier}"
        return int(self.r.get(key) or 0)
```

## Using the Concurrent Limiter

```python
r = redis.Redis(host='localhost', decode_responses=True)
# Allow max 5 concurrent requests per user
limiter = ConcurrentLimiter(r, max_concurrent=5, ttl_seconds=60)

def handle_request(user_id: str, data: dict):
    with limiter.limit(f"user:{user_id}"):
        # Expensive operation runs here
        result = process_data(data)
        return result
```

## FastAPI Dependency Example

```python
from fastapi import FastAPI, Depends, HTTPException, Request

app = FastAPI()
r = redis.Redis(host='localhost', decode_responses=True)
limiter = ConcurrentLimiter(r, max_concurrent=3)

async def check_concurrent_limit(request: Request):
    user_id = request.headers.get("X-User-ID", "anonymous")
    key = f"user:{user_id}"

    if not limiter.acquire(key):
        active = limiter.get_active(key)
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Too many concurrent requests",
                "active": active,
                "limit": limiter.max_concurrent,
            }
        )
    return user_id

@app.post("/api/process")
async def process_endpoint(user_id: str = Depends(check_concurrent_limit)):
    try:
        result = await do_expensive_work()
        return {"result": result}
    finally:
        limiter.release(f"user:{user_id}")
```

## Handling Request Timeouts

The TTL acts as a safety valve if a request crashes without releasing:

```python
def acquire_with_tracking(r: redis.Redis, identifier: str, max_concurrent: int, ttl: int) -> str | None:
    """Track each in-flight request with a unique ID for precise control."""
    request_id = str(uuid.uuid4())
    key = f"inflight:{identifier}"

    TRACKED_ACQUIRE = """
    if redis.call('SCARD', KEYS[1]) >= tonumber(ARGV[1]) then
        return 0
    end
    redis.call('SADD', KEYS[1], ARGV[2])
    redis.call('EXPIRE', KEYS[1], ARGV[3])
    return 1
    """
    result = r.eval(TRACKED_ACQUIRE, 1, key, max_concurrent, request_id, ttl)
    return request_id if result == 1 else None

def release_tracked(r: redis.Redis, identifier: str, request_id: str):
    r.srem(f"inflight:{identifier}", request_id)
```

## Monitoring Active Requests

```bash
# Check active concurrent requests per user
redis-cli get concurrent:user:123

# List all concurrent keys
redis-cli keys "concurrent:user:*"

# Monitor for limit rejections
redis-cli monitor | grep "concurrent:"
```

## Summary

Concurrent request limiting uses a Redis counter as a distributed semaphore. Increment on request entry, decrement on exit (always in a finally block), and reject if the counter reaches the maximum. Set a TTL as a safety valve to auto-release stuck semaphores from crashed processes. For precise tracking, use a Redis set with unique request IDs instead of a plain counter.
