# How to Implement Counting with Expiration in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Counter, Expiration, TTL, Rate Limiting

Description: Build self-expiring counters in Redis for use cases like rate limiting, trial quotas, and rolling windows using INCR with EXPIRE.

---

Many counting use cases need automatic reset: a trial user gets 100 API calls per day, a login attempt counter resets after lockout expires, a rate limiter window rolls over. Redis TTL-based counting makes all of these trivial without a scheduler.

## Counter with Automatic Reset

The INCR + EXPIRE combination is the canonical pattern. The key expires and effectively resets to zero:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def increment_with_ttl(key: str, ttl: int, amount: int = 1) -> int:
    pipe = r.pipeline()
    pipe.incrby(key, amount)
    pipe.expire(key, ttl)
    count, _ = pipe.execute()
    return count
```

## Trial Quota Counter

Track API usage against a daily quota that resets at midnight:

```python
def seconds_until_midnight() -> int:
    now = time.time()
    midnight = (now // 86400 + 1) * 86400
    return int(midnight - now)

def consume_trial_quota(user_id: str, limit: int = 100) -> dict:
    key = f"trial:{user_id}:daily"
    ttl = seconds_until_midnight()

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, ttl)
    count, _ = pipe.execute()

    remaining = max(0, limit - count)
    return {
        "used": count,
        "remaining": remaining,
        "resets_in": r.ttl(key),
        "allowed": count <= limit,
    }
```

## Sliding Window Counter

For a true sliding window (not aligned to clock boundaries), use a timestamp-based approach:

```python
def sliding_window_count(key: str, window_seconds: int) -> int:
    now = int(time.time() * 1000)
    window_start = now - window_seconds * 1000

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window_seconds + 1)
    _, _, count, _ = pipe.execute()
    return count
```

## Login Attempt Lockout

Reset attempt counter after lockout expires:

```python
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 300  # 5 minutes

def check_login_attempts(username: str) -> dict:
    key = f"login_attempts:{username}"
    attempts = int(r.get(key) or 0)
    ttl = r.ttl(key)
    return {
        "attempts": attempts,
        "locked": attempts >= MAX_ATTEMPTS,
        "retry_in": ttl if attempts >= MAX_ATTEMPTS else 0,
    }

def record_failed_login(username: str):
    key = f"login_attempts:{username}"
    count = r.incr(key)
    if count == 1:
        r.expire(key, LOCKOUT_SECONDS)
    return count

def clear_login_attempts(username: str):
    r.delete(f"login_attempts:{username}")
```

## Conditional Increment with Lua

Atomically increment only if the count is below a limit:

```lua
-- conditional_incr.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call("GET", key) or 0)
if current < limit then
    local new_val = redis.call("INCR", key)
    if new_val == 1 then
        redis.call("EXPIRE", key, ttl)
    end
    return new_val
end
return -1
```

```python
conditional_incr = r.register_script(open("conditional_incr.lua").read())

def try_consume(resource: str, limit: int, ttl: int) -> int:
    result = conditional_incr(
        keys=[f"quota:{resource}"],
        args=[limit, ttl]
    )
    return result  # -1 means limit reached
```

## Summary

Redis INCR combined with EXPIRE creates self-resetting counters that power rate limiting, trial quotas, and lockout systems without cron jobs or external schedulers. Lua scripts enable atomic conditional increments so limits are never exceeded even under concurrent access. Sliding window counters using sorted sets provide accuracy without clock-boundary artifacts.
