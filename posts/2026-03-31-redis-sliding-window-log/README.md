# How to Implement a Sliding Window Log in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sliding Window, Rate Limit

Description: Implement a precise sliding window log rate limiter in Redis using sorted sets to track exact request timestamps within a rolling time window.

---

The fixed-window counter rate limiter has a boundary problem: a user can make twice the allowed requests by timing them around the window boundary. The sliding window log solves this by tracking exact timestamps - every request is checked against a true rolling window.

## How the Sliding Window Log Works

Store each request timestamp as a member of a sorted set. To check rate limits, count members within the last N seconds:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def is_allowed(user_id: str, limit: int, window_seconds: int) -> bool:
    now = time.time()
    window_start = now - window_seconds
    key = f"swlog:{user_id}"

    pipe = r.pipeline()
    # Remove entries outside the window
    pipe.zremrangebyscore(key, 0, window_start)
    # Count remaining entries (within window)
    pipe.zcard(key)
    results = pipe.execute()
    count_in_window = results[1]

    if count_in_window < limit:
        # Add current request timestamp and refresh TTL
        r.zadd(key, {str(now): now})
        r.expire(key, window_seconds + 1)
        return True

    return False
```

## Atomic Version with Lua

For strict consistency, use a Lua script so check and update happen atomically:

```lua
-- sliding_window_log.lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_start = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, ttl)
    return 1  -- allowed
end
return 0  -- rejected
```

```python
sliding_window_script = r.register_script("""
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_start = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, ttl)
    return 1
end
return 0
""")

def check_rate_limit(user_id: str, limit: int = 100, window_seconds: int = 60) -> bool:
    now = time.time()
    window_start = now - window_seconds
    result = sliding_window_script(
        keys=[f"swlog:{user_id}"],
        args=[now, window_start, limit, window_seconds + 1]
    )
    return bool(result)
```

## Getting Remaining Quota

```python
def get_quota(user_id: str, limit: int, window_seconds: int) -> dict:
    now = time.time()
    window_start = now - window_seconds
    key = f"swlog:{user_id}"

    r.zremrangebyscore(key, 0, window_start)
    used = r.zcard(key)
    remaining = max(0, limit - used)

    # Find when the oldest request in the window will expire
    oldest = r.zrange(key, 0, 0, withscores=True)
    reset_at = oldest[0][1] + window_seconds if oldest else now

    return {
        "limit": limit,
        "used": used,
        "remaining": remaining,
        "reset_at": reset_at
    }
```

## HTTP Middleware Example

```python
from functools import wraps

def rate_limit(limit: int = 100, window: int = 60):
    def decorator(f):
        @wraps(f)
        def wrapper(user_id: str, *args, **kwargs):
            if not check_rate_limit(user_id, limit, window):
                raise Exception("Rate limit exceeded. Try again later.")
            return f(user_id, *args, **kwargs)
        return wrapper
    return decorator

@rate_limit(limit=10, window=60)
def call_api(user_id: str, payload: dict):
    # Handle API call
    pass
```

## Tradeoffs vs. Fixed Window

```text
Fixed Window Counter:
- Memory: O(1) per user
- Accuracy: boundary burst possible
- Best for: simple rate limiting

Sliding Window Log:
- Memory: O(requests per window) per user
- Accuracy: exact, no boundary bursts
- Best for: precise API rate limiting
```

## Summary

The sliding window log is the most accurate rate limiting algorithm available. Using a Redis sorted set to store timestamps, you get exact enforcement of request quotas within any rolling time window. The Lua script version ensures atomicity under concurrent load, while TTL-based expiration keeps memory usage bounded.
