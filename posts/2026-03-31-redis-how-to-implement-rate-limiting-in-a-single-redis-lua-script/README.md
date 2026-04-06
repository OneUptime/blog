# How to Implement Rate Limiting in a Single Redis Lua Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lua, Rate Limiting, Scripting, Performance

Description: Build an atomic Redis rate limiter using a single Lua script that increments counters and sets expiry in one round-trip, preventing race conditions.

---

## Why Lua for Rate Limiting

A naive rate limiter requires two Redis commands: INCR to increment the counter and EXPIRE to set the TTL. Between these two calls, another process could read the counter, creating a race condition where the TTL is never set, leaking the counter forever.

A Lua script executes atomically - no other Redis command runs between lines. This makes Lua the ideal tool for correct, race-free rate limiting in a single round-trip.

## Basic Fixed Window Rate Limiter

```lua
-- keys: rate_limit_key
-- args: limit (max requests), window (seconds)
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)

if current == 1 then
    -- Key is new - set expiry on first increment
    redis.call('EXPIRE', key, window)
end

if current > limit then
    -- Return remaining TTL and 0 (denied)
    return {0, redis.call('TTL', key)}
end

-- Return remaining requests and TTL
return {limit - current, redis.call('TTL', key)}
```

Save this as `ratelimit.lua` and load it:

```bash
redis-cli SCRIPT LOAD "$(cat ratelimit.lua)"
```

## Calling the Script from Python

```python
import redis
import hashlib

r = redis.Redis(host='localhost', port=6379)

RATELIMIT_SCRIPT = open('ratelimit.lua').read()
RATELIMIT_SHA = hashlib.sha1(RATELIMIT_SCRIPT.encode()).hexdigest()
r.script_load(RATELIMIT_SCRIPT)

def check_rate_limit(identifier, limit, window_seconds):
    key = f'rl:{identifier}'
    try:
        remaining, ttl = r.evalsha(RATELIMIT_SHA, 1, key, limit, window_seconds)
    except Exception as e:
        if 'NOSCRIPT' in str(e):
            r.script_load(RATELIMIT_SCRIPT)
            remaining, ttl = r.evalsha(RATELIMIT_SHA, 1, key, limit, window_seconds)
        else:
            raise

    allowed = remaining >= 0
    return allowed, int(remaining), int(ttl)

# Example: 100 requests per 60 seconds per IP
allowed, remaining, reset_in = check_rate_limit('192.168.1.5', 100, 60)
if not allowed:
    print(f"Rate limited. Retry in {reset_in} seconds")
else:
    print(f"Allowed. {remaining} requests remaining")
```

## Sliding Window Rate Limiter Using Sorted Sets

The fixed window has a known edge case: a burst can happen at the boundary between windows. A sliding window is more accurate:

```lua
-- keys: rate_limit_key
-- args: limit, window_ms (milliseconds), current_time_ms
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cutoff = now - window

-- Remove entries outside the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- Count entries in the window
local count = redis.call('ZCARD', key)

if count >= limit then
    return {0, 0}
end

-- Add current request with timestamp as score
redis.call('ZADD', key, now, now .. '-' .. math.random(1, 1000000))

-- Set TTL slightly longer than the window
redis.call('PEXPIRE', key, window + 1000)

return {limit - count - 1, 1}
```

```python
import time
import redis
import hashlib

r = redis.Redis(host='localhost', port=6379)

SLIDING_SCRIPT = open('sliding_ratelimit.lua').read()
SLIDING_SHA = hashlib.sha1(SLIDING_SCRIPT.encode()).hexdigest()
r.script_load(SLIDING_SCRIPT)

def sliding_rate_limit(identifier, limit, window_ms):
    key = f'srl:{identifier}'
    now_ms = int(time.time() * 1000)
    remaining, allowed = r.evalsha(SLIDING_SHA, 1, key, limit, window_ms, now_ms)
    return bool(allowed), int(remaining)

allowed, remaining = sliding_rate_limit('user:123', 10, 60000)
```

## Token Bucket Rate Limiter

More flexible - allows bursting up to bucket capacity:

```lua
-- keys: rate_limit_key
-- args: capacity, refill_rate (tokens/second), tokens_requested, current_time
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local requested = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local last_refill = tonumber(data[2]) or now

-- Calculate refill
local elapsed = now - last_refill
local new_tokens = math.min(capacity, tokens + elapsed * refill_rate)

if new_tokens < requested then
    -- Update state but deny request
    redis.call('HSET', key, 'tokens', new_tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 10)
    return {0, math.ceil((requested - new_tokens) / refill_rate)}
end

-- Consume tokens
redis.call('HSET', key, 'tokens', new_tokens - requested, 'last_refill', now)
redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 10)
return {1, math.floor(new_tokens - requested)}
```

## Calling from a Flask Middleware

```python
from functools import wraps
from flask import request, jsonify
import time

def rate_limit(limit=100, window=60):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            ip = request.remote_addr
            allowed, remaining, reset_in = check_rate_limit(ip, limit, window)
            if not allowed:
                response = jsonify({'error': 'Rate limit exceeded'})
                response.status_code = 429
                response.headers['Retry-After'] = str(reset_in)
                return response
            return f(*args, **kwargs)
        return wrapped
    return decorator

@app.route('/api/data')
@rate_limit(limit=100, window=60)
def get_data():
    return jsonify({'data': 'ok'})
```

## Summary

A single Redis Lua script is the standard way to implement race-free rate limiting because Lua execution is atomic. The fixed window limiter (INCR + EXPIRE in one script) is the simplest and most performant; the sliding window (sorted set + ZREMRANGEBYSCORE) is more accurate but uses more memory. Load scripts at startup with `SCRIPT LOAD`, call with EVALSHA, and always handle NOSCRIPT errors with a reload-and-retry pattern.
