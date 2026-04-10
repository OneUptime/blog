# How to Implement Rate Limiting with Burst Allowance in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Token Bucket, Burst, API

Description: Learn how to implement rate limiting with burst allowance in Redis using the token bucket algorithm, allowing short traffic spikes while maintaining sustainable average rates.

---

A burst allowance lets clients exceed the normal rate limit briefly, then throttles them back. This is ideal for APIs that expect occasional spikes from legitimate users without allowing sustained abuse. The token bucket algorithm is the standard approach.

## Token Bucket Algorithm

The token bucket works as follows:
- A bucket holds up to `capacity` tokens
- Tokens are added at `refill_rate` tokens per second
- Each request consumes one token
- Requests are allowed if tokens are available, rejected otherwise

This allows bursting up to `capacity` requests instantly, then sustaining `refill_rate` requests per second.

## Redis Token Bucket Implementation

```lua
-- token_bucket.lua
-- KEYS[1]: bucket key
-- ARGV[1]: max bucket capacity
-- ARGV[2]: refill rate (tokens per second)
-- ARGV[3]: current timestamp (milliseconds)
-- ARGV[4]: tokens to consume (usually 1)
-- Returns: {allowed (0/1), remaining_tokens, retry_after_ms}

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local consume = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now_ms

-- Calculate tokens to add since last refill
local elapsed_ms = now_ms - last_refill
local new_tokens = elapsed_ms * refill_rate / 1000
tokens = math.min(capacity, tokens + new_tokens)

if tokens >= consume then
    tokens = tokens - consume
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now_ms)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 10)
    return {1, math.floor(tokens), 0}
else
    -- Calculate when enough tokens will be available
    local needed = consume - tokens
    local retry_after_ms = math.ceil(needed / refill_rate * 1000)
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now_ms)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 10)
    return {0, math.floor(tokens), retry_after_ms}
end
```

## Python Implementation

```python
import redis
import time

class TokenBucketRateLimiter:
    def __init__(self, r: redis.Redis, capacity: int, refill_rate: float):
        """
        capacity: Max tokens (burst size)
        refill_rate: Tokens added per second (sustained rate)
        """
        self.r = r
        self.capacity = capacity
        self.refill_rate = refill_rate
        with open('token_bucket.lua') as f:
            self.script = f.read()

    def check(self, identifier: str, consume: int = 1) -> dict:
        key = f"tbucket:{identifier}"
        now_ms = int(time.time() * 1000)
        result = self.r.eval(
            self.script, 1, key,
            self.capacity, self.refill_rate, now_ms, consume
        )
        allowed, remaining, retry_after_ms = int(result[0]), int(result[1]), int(result[2])
        return {
            "allowed": bool(allowed),
            "remaining_tokens": remaining,
            "retry_after_ms": retry_after_ms,
            "capacity": self.capacity,
        }
```

## FastAPI Middleware Example

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()
r = redis.Redis(host='localhost', decode_responses=True)

# Allow 10 burst requests, sustained at 2 per second
limiter = TokenBucketRateLimiter(r, capacity=10, refill_rate=2.0)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    user_id = request.headers.get("X-User-ID", "anonymous")
    result = limiter.check(user_id)

    if not result["allowed"]:
        retry_after_s = result["retry_after_ms"] / 1000
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retry_after_seconds": retry_after_s},
            headers={
                "Retry-After": str(int(retry_after_s)),
                "X-RateLimit-Remaining": "0",
            }
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Remaining"] = str(result["remaining_tokens"])
    return response
```

## Comparing Burst Configurations

| Scenario | capacity | refill_rate | Behavior |
|----------|----------|-------------|---------|
| Strict limit | 10 | 10 | Minimal burst - only 1 second of burst capacity |
| Small burst | 20 | 10 | Brief 2x burst, then 10/s sustained |
| Generous burst | 100 | 10 | Large initial burst, 10/s sustained |

```bash
# Test burst behavior - first 10 requests should succeed instantly
for i in $(seq 1 15); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "X-User-ID: user1" http://localhost:8000/api/data)
    echo "Request $i: HTTP $STATUS"
done
```

Expected output:

```text
Request 1: HTTP 200
Request 2: HTTP 200
...
Request 10: HTTP 200
Request 11: HTTP 429
```

## Summary

The token bucket algorithm in Redis enables rate limiting with burst allowance by tracking available tokens and refill timestamps in a Redis hash. Clients can consume all tokens instantly (burst), then requests are throttled to the sustained refill rate. Use `capacity` to control the burst size and `refill_rate` for the sustainable throughput. Always return `Retry-After` headers so clients know when to retry.
