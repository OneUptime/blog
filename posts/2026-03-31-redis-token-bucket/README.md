# How to Implement a Token Bucket in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Token Bucket, Rate Limit

Description: Implement the token bucket algorithm in Redis using Lua scripts for burst-tolerant, smooth rate limiting across distributed application servers.

---

The token bucket algorithm allows controlled bursting: a bucket holds up to N tokens, fills at a constant rate, and each request consumes one token. This is ideal for APIs that want to allow occasional spikes while enforcing an average rate. Redis Lua scripts make it atomic and distributed.

## The Token Bucket Algorithm

```text
- Bucket capacity: max tokens (burst limit)
- Refill rate: tokens added per second
- On request: if tokens >= 1, consume 1 token and allow. Otherwise, reject.
- Tokens are calculated lazily based on elapsed time since last refill.
```

## Lua Implementation

The entire logic runs atomically in Lua to avoid race conditions between distributed servers:

```lua
-- token_bucket.lua
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])  -- tokens per second
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local last_refill = tonumber(data[2]) or now

-- Calculate tokens to add since last refill
local elapsed = now - last_refill
local new_tokens = math.min(capacity, tokens + elapsed * refill_rate)

if new_tokens < requested then
    -- Update last_refill time but do not consume tokens
    redis.call('HSET', key, 'tokens', new_tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
    return 0  -- rejected
end

-- Consume tokens
new_tokens = new_tokens - requested
redis.call('HSET', key, 'tokens', new_tokens, 'last_refill', now)
redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
return 1  -- allowed
```

## Python Integration

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

with open('token_bucket.lua', 'r') as f:
    token_bucket_script = r.register_script(f.read())

def consume_token(
    identifier: str,
    capacity: int = 100,
    refill_rate: float = 10.0,  # tokens per second
    tokens_requested: int = 1
) -> bool:
    result = token_bucket_script(
        keys=[f"bucket:{identifier}"],
        args=[capacity, refill_rate, time.time(), tokens_requested]
    )
    return bool(result)
```

## Usage Examples

```python
# Basic per-user rate limiting: 100 burst, 10/sec sustained
def handle_api_request(user_id: str, request_data: dict) -> dict:
    if not consume_token(user_id, capacity=100, refill_rate=10):
        return {"error": "rate_limit_exceeded", "retry_after": 1}
    return process_request(request_data)

# Weighted cost: a search costs 5 tokens, a simple read costs 1
def search_api(user_id: str, query: str) -> dict:
    if not consume_token(user_id, capacity=100, refill_rate=10, tokens_requested=5):
        return {"error": "insufficient_tokens"}
    return execute_search(query)

# Per-IP rate limiting for unauthenticated endpoints
def rate_limit_ip(ip_address: str) -> bool:
    return consume_token(f"ip:{ip_address}", capacity=20, refill_rate=2)
```

## Checking Remaining Tokens

```python
def get_bucket_state(identifier: str) -> dict:
    data = r.hgetall(f"bucket:{identifier}")
    if not data:
        return {"tokens": None, "status": "no_bucket"}
    return {
        "tokens": float(data.get("tokens", 0)),
        "last_refill": float(data.get("last_refill", 0))
    }
```

## Comparing Token Bucket vs. Sliding Window Log

```text
Token Bucket:
- Allows bursts up to capacity
- Memory: O(1) per user
- Best for: API clients that occasionally spike

Sliding Window Log:
- No burst allowance beyond limit
- Memory: O(requests per window)
- Best for: strict per-second enforcement
```

## Summary

The token bucket algorithm is the right choice when you want to tolerate bursts while enforcing a sustainable average rate. Implementing it in a Redis Lua script makes it atomic and eliminates race conditions in distributed deployments, giving you a single consistent rate limiter across all application servers.
