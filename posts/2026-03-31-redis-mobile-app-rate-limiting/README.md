# How to Implement Mobile App Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Mobile, API, Security

Description: Implement per-device and per-user rate limiting for mobile APIs using Redis counters and Lua scripts to prevent abuse.

---

Mobile apps generate unpredictable traffic. A buggy retry loop or a viral feature can spike requests well beyond what your backend can handle. Redis-based rate limiting lets you enforce per-device and per-user quotas at the API gateway or middleware layer.

## Choosing a Key Strategy

For mobile apps, rate limit on multiple dimensions: device ID, user ID, and endpoint. This prevents a single compromised device from flooding your API while keeping limits fair across users.

```text
rate:device:{device_id}:{endpoint}
rate:user:{user_id}:{endpoint}
```

## Fixed Window Counter

The simplest approach increments a counter and sets an expiry matching the window size:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def is_rate_limited(device_id: str, endpoint: str, limit: int, window: int) -> bool:
    key = f"rate:device:{device_id}:{endpoint}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    results = pipe.execute()
    current = results[0]
    return current > limit
```

## Sliding Window with Lua

A Lua script prevents race conditions and implements a true sliding window:

```lua
-- sliding_window.lua
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call("ZREMRANGEBYSCORE", key, 0, now - window * 1000)
local count = redis.call("ZCARD", key)
if count < limit then
    redis.call("ZADD", key, now, now)
    redis.call("PEXPIRE", key, window * 1000)
    return 0
end
return 1
```

Load and call it from Python:

```python
import time

with open("sliding_window.lua") as f:
    lua_script = f.read()

sliding_window = r.register_script(lua_script)

def check_rate_limit(device_id: str, limit: int = 100, window: int = 60) -> bool:
    key = f"rate:device:{device_id}"
    now_ms = int(time.time() * 1000)
    result = sliding_window(keys=[key], args=[window, limit, now_ms])
    return bool(result)  # True means rate limited
```

## Token Bucket for Burst Tolerance

Mobile apps often burst briefly then go quiet. A token bucket allows short bursts:

```python
TOKEN_BUCKET_SCRIPT = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local tokens = tonumber(redis.call("HGET", key, "tokens") or capacity)
local last = tonumber(redis.call("HGET", key, "last") or now)
local elapsed = (now - last) / 1000
tokens = math.min(capacity, tokens + elapsed * refill_rate)
if tokens >= 1 then
    tokens = tokens - 1
    redis.call("HMSET", key, "tokens", tokens, "last", now)
    redis.call("EXPIRE", key, 3600)
    return 1
end
return 0
"""

token_bucket = r.register_script(TOKEN_BUCKET_SCRIPT)

def consume_token(device_id: str, capacity: int = 20, refill_rate: float = 0.5) -> bool:
    key = f"bucket:{device_id}"
    now_ms = int(time.time() * 1000)
    allowed = token_bucket(keys=[key], args=[capacity, refill_rate, now_ms])
    return bool(allowed)
```

## Returning Rate Limit Headers

Always communicate quota status to clients so they can back off gracefully:

```python
def get_rate_limit_headers(device_id: str, endpoint: str, limit: int, window: int) -> dict:
    key = f"rate:device:{device_id}:{endpoint}"
    current = int(r.get(key) or 0)
    ttl = r.ttl(key)
    return {
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": str(max(0, limit - current)),
        "X-RateLimit-Reset": str(int(time.time()) + max(ttl, 0)),
    }
```

## Summary

Redis enables precise, low-latency rate limiting for mobile APIs using fixed windows, sliding windows, or token buckets depending on your burst tolerance. Lua scripts ensure atomic operations so counters are accurate even under high concurrency. Returning rate limit headers helps mobile clients respect quotas without hard failures.
