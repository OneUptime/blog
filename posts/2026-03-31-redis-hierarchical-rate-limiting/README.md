# How to Implement Hierarchical Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Hierarchical, API, Lua Script

Description: Learn how to implement hierarchical rate limiting in Redis that enforces limits at multiple levels - per user, per organization, and globally - using a single atomic Lua script.

---

Hierarchical rate limiting enforces multiple rate limits simultaneously: a user may have a 100 req/min limit, their organization may have a 1000 req/min limit, and the global API may have a 10000 req/min limit. All three must pass for a request to proceed.

## Why Hierarchical Rate Limiting?

Single-level rate limiting leaves gaps:
- A user at 100 req/min limit won't trigger the org limit even if 50 users each hit 100 req/min = 5000 req/min
- Fair usage requires both per-entity and aggregate limits

## Architecture

Each level has its own sliding window counter in Redis:
- `rl:user:{user_id}` - per-user limit
- `rl:org:{org_id}` - per-organization limit
- `rl:global` - global API limit

## Core Implementation

A Lua script checks and increments all levels atomically:

```lua
-- hierarchical_rate_limit.lua
-- KEYS[1..N]: rate limit keys (user, org, global)
-- ARGV[1..N]: max allowed per window for each key
-- ARGV[N+1]: window size in seconds
-- Returns: 0 if allowed, or the index of the first exceeded limit

local window = tonumber(ARGV[#KEYS + 1])
local now = tonumber(redis.call('TIME')[1])
local window_start = now - window

-- First pass: clean old entries and check all limits
for i = 1, #KEYS do
    local key = KEYS[i]
    local limit = tonumber(ARGV[i])

    -- Remove old entries outside the window
    redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

    -- Count requests in the current window
    local count = redis.call('ZCARD', key)

    if count >= limit then
        return i  -- Return which level was exceeded
    end
end

-- Second pass: all limits passed, add the request to all levels
for i = 1, #KEYS do
    local key = KEYS[i]
    redis.call('ZADD', key, now, now .. '-' .. math.random(1, 1000000))
    redis.call('EXPIRE', key, window)
end

return 0  -- All levels passed
```

## Python Implementation

```python
import redis
import time

class HierarchicalRateLimiter:
    def __init__(self, r: redis.Redis):
        self.r = r
        with open('hierarchical_rate_limit.lua', 'r') as f:
            self.script = f.read()

    def check(self, user_id: str, org_id: str, limits: dict) -> tuple[bool, str]:
        """
        limits = {
            'user': (100, 60),    # 100 per 60 seconds
            'org': (1000, 60),    # 1000 per 60 seconds
            'global': (10000, 60) # 10000 per 60 seconds
        }
        Returns (allowed: bool, reason: str)
        """
        keys = [
            f"rl:user:{user_id}",
            f"rl:org:{org_id}",
            "rl:global",
        ]
        max_counts = [limits['user'][0], limits['org'][0], limits['global'][0]]
        window = limits['user'][1]  # Use same window for all tiers

        args = max_counts + [window]
        result = self.r.eval(self.script, len(keys), *keys, *args)

        if result == 0:
            return True, "allowed"
        elif result == 1:
            return False, f"user:{user_id} rate limit exceeded"
        elif result == 2:
            return False, f"org:{org_id} rate limit exceeded"
        elif result == 3:
            return False, "global rate limit exceeded"
        return False, "unknown"
```

## Flask Middleware Example

```python
import redis
from flask import Flask, request, jsonify

app = Flask(__name__)
r = redis.Redis(host='localhost', decode_responses=True)
limiter = HierarchicalRateLimiter(r)

LIMITS = {
    'user': (100, 60),
    'org': (1000, 60),
    'global': (10000, 60),
}

@app.before_request
def check_rate_limits():
    user_id = request.headers.get('X-User-ID', 'anonymous')
    org_id = request.headers.get('X-Org-ID', 'default')

    allowed, reason = limiter.check(user_id, org_id, LIMITS)
    if not allowed:
        return jsonify({"error": "Rate limit exceeded", "detail": reason}), 429

@app.route('/api/data')
def get_data():
    return jsonify({"data": "response"})
```

## Checking Current Usage

```python
def get_usage(r: redis.Redis, user_id: str, org_id: str, window_seconds: int = 60) -> dict:
    now = int(time.time())
    window_start = now - window_seconds

    def count_requests(key: str) -> int:
        r.zremrangebyscore(key, '-inf', window_start)
        return r.zcard(key)

    return {
        "user_requests": count_requests(f"rl:user:{user_id}"),
        "org_requests": count_requests(f"rl:org:{org_id}"),
        "global_requests": count_requests("rl:global"),
        "window_seconds": window_seconds,
    }
```

## Summary

Hierarchical rate limiting enforces limits at multiple levels simultaneously using a single Lua script that checks and increments all counters atomically. This prevents scenarios where users individually comply with their per-user limit but collectively exceed the organization or global limit. The sliding window approach using Redis sorted sets provides smooth rate limiting without the cliff effect of fixed windows.
