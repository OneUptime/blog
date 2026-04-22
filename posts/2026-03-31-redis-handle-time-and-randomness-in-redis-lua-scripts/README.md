# How to Handle Time and Randomness in Redis Lua Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Scripting, Time, Determinism

Description: Learn how to safely use time and randomness in Redis Lua scripts using redis.call('TIME') and pre-generated values passed as arguments.

---

Redis requires Lua scripts to be deterministic - the same script with the same inputs must always produce the same output. This restriction prevents data divergence between primary and replicas. However, you can still work with time and random values using approved patterns.

## Why Random and Time Are Restricted

In Redis versions before 7.0, `math.random()` inside a Lua script is seeded with a fixed value before each execution, so it always returns the same sequence of numbers:

```bash
redis-cli EVAL "return math.random()" 0
# Always returns the same value (e.g., 0.17082803611217)
```

Starting with Redis 7.0, `math.random()` is seeded with random data per invocation, so it produces different results each time. However, passing randomness as script arguments remains a best practice for explicit control and testability.

`os.time()` is not available in the Redis Lua sandbox - the `os` library is removed entirely to maintain the sandboxed environment.

## Getting Time with redis.call('TIME')

The approved way to get the current time inside a script:

```lua
local time = redis.call('TIME')
local seconds = tonumber(time[1])
local microseconds = tonumber(time[2])

-- Combine for a high-resolution timestamp
local timestamp_ms = seconds * 1000 + math.floor(microseconds / 1000)
return timestamp_ms
```

`TIME` returns a two-element array: `[unix_seconds, microseconds]`.

## Storing Timestamps in Data

```lua
-- Set a value with a creation timestamp
local now = redis.call('TIME')
local created_at = tonumber(now[1])

redis.call('HSET', KEYS[1],
    'value', ARGV[1],
    'created_at', created_at
)
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
return created_at
```

## Expiry Based on Current Time

Use `TIME` to compute dynamic TTLs:

```lua
-- Expire at the end of the current hour
local now = redis.call('TIME')
local seconds = tonumber(now[1])
local seconds_until_next_hour = 3600 - (seconds % 3600)

redis.call('SET', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], seconds_until_next_hour)
return seconds_until_next_hour
```

## Passing Randomness as Arguments

For operations requiring randomness, generate the random value in your application and pass it as an argument:

```python
import redis
import secrets

r = redis.Redis()

# Generate random token outside Redis
token = secrets.token_hex(32)

script = """
-- Store the pre-generated token
redis.call('SET', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
return ARGV[1]
"""

stored_token = r.eval(script, 1, f"session:{user_id}", token, 3600)
```

This way the script is deterministic (always stores what it receives), while randomness is generated outside.

## Sliding Window with Time

Build a time-based sliding window using `TIME`:

```lua
local now = redis.call('TIME')
local current_time = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local window_ms = tonumber(ARGV[1])
local window_start = current_time - window_ms

-- Add current event
redis.call('ZADD', KEYS[1], current_time, current_time .. '-' .. ARGV[2])

-- Remove events outside the window
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, window_start)

-- Count events in window
local count = redis.call('ZCARD', KEYS[1])
redis.call('EXPIRE', KEYS[1], math.ceil(window_ms / 1000) + 1)

return count
```

## Idempotent Script Pattern with Timestamps

Use timestamps to make operations idempotent:

```lua
-- Only update if the new value is newer than stored
local stored = redis.call('HGET', KEYS[1], 'timestamp')
local stored_ts = tonumber(stored) or 0
local new_ts = tonumber(ARGV[1])

if new_ts <= stored_ts then
    return 0  -- Stale update, skip
end

redis.call('HSET', KEYS[1], 'value', ARGV[2], 'timestamp', new_ts)
return 1
```

## Summary

Redis Lua scripts historically required determinism for replication safety. In Redis versions before 7.0, `math.random()` is seeded with a fixed value making it predictable, while `os.time()` is unavailable in the sandbox. Use `redis.call('TIME')` to get the current Unix timestamp as `[seconds, microseconds]` for time-based operations. For randomness, generate values in your application and pass them as ARGV arguments. This keeps scripts explicit and testable while supporting dynamic behavior.
