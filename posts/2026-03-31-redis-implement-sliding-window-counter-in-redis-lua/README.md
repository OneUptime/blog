# How to Implement Sliding Window Counter in Redis Lua

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Rate Limiting, Sliding Window, Counter

Description: Build an accurate sliding window counter in Redis using Lua and sorted sets to track request rates without fixed-window boundary spikes.

---

A sliding window counter tracks events within a rolling time period. Unlike fixed windows that reset at regular intervals, sliding windows provide accurate rate limiting without allowing bursts at window boundaries.

## The Problem with Fixed Windows

With a fixed window (e.g., 100 requests per minute), a client can send 100 requests at 00:59 and 100 more at 01:01, making 200 requests in 2 seconds. Sliding windows prevent this.

## Sorted Set Approach

Use a sorted set where each member is a request timestamp and the score is also the timestamp. This enables fast range queries:

```lua
-- sliding_window.lua
-- KEYS[1]: the rate limit key (e.g., "ratelimit:user:123")
-- ARGV[1]: current timestamp in milliseconds
-- ARGV[2]: window size in milliseconds
-- ARGV[3]: maximum requests allowed in the window
-- ARGV[4]: unique request identifier

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Remove entries outside the window
local window_start = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- Count current requests in window
local count = tonumber(redis.call('ZCARD', key))

if count >= limit then
    -- Set TTL and reject
    redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
    return {0, count, limit}
end

-- Add current request
redis.call('ZADD', key, now, now .. '-' .. ARGV[4])
redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)

return {1, count + 1, limit}
```

## Using the Script

```python
import redis
import time
import secrets

r = redis.Redis()

SLIDING_WINDOW_SCRIPT = open("sliding_window.lua").read()

def is_allowed(user_id: str, limit: int = 100, window_ms: int = 60000) -> bool:
    key = f"ratelimit:user:{user_id}"
    now_ms = int(time.time() * 1000)
    request_id = secrets.token_hex(8)  # Unique ID for this request

    result = r.eval(
        SLIDING_WINDOW_SCRIPT,
        1,
        key,
        now_ms,
        window_ms,
        limit,
        request_id
    )

    allowed, current, max_allowed = result
    return allowed == 1
```

## Read-Only Sliding Window Check

Check the current count without adding a request:

```lua
-- check_window.lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local window_start = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

local count = tonumber(redis.call('ZCARD', key))
local remaining = math.max(0, limit - count)

return {count, remaining, limit}
```

## Memory Considerations

Each request stored in the sorted set takes approximately 100-150 bytes. For 1000 requests per minute per user, that is about 100-150KB per active user. Limit memory usage:

```lua
-- After adding the request, trim to limit (belt-and-suspenders)
redis.call('ZREMRANGEBYRANK', key, 0, -(limit + 2))
```

## Multiple Windows

Apply rate limits at multiple granularities simultaneously:

```python
def multi_window_check(user_id: str) -> dict:
    windows = {
        "per_second": (10, 1000),
        "per_minute": (100, 60000),
        "per_hour": (1000, 3600000)
    }

    now_ms = int(time.time() * 1000)
    request_id = secrets.token_hex(8)

    results = {}
    for name, (limit, window_ms) in windows.items():
        key = f"ratelimit:{user_id}:{name}"
        result = r.eval(SLIDING_WINDOW_SCRIPT, 1, key, now_ms, window_ms, limit, request_id)
        results[name] = {"allowed": result[0] == 1, "count": result[1], "limit": limit}

    return results
```

## Summary

A Redis sliding window counter uses a sorted set to track request timestamps within a rolling time period. The Lua script atomically removes expired entries, checks the count, and adds new requests in a single operation. This prevents race conditions and ensures accurate rate limiting without the burst problem that affects fixed window approaches. Use unique request IDs as sorted set members to avoid score collisions.
