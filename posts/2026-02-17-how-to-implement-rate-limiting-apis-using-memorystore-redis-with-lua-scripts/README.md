# How to Implement Rate Limiting APIs Using Memorystore Redis with Lua Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Memorystore, Redis, Rate Limiting, Lua Scripts

Description: Learn how to build robust API rate limiters using Memorystore Redis and Lua scripts for atomic, high-performance request throttling on Google Cloud.

---

Rate limiting is one of those things every API needs but few get right on the first try. The basic idea is simple - limit how many requests a client can make in a given time window. The tricky part is making it atomic and accurate under high concurrency. Redis on Memorystore is perfect for this because it is fast, supports atomic operations, and Lua scripts let you execute complex logic in a single round trip.

I have gone through a few iterations of rate limiters over the years. The naive approaches break under load, and the Redis-based approaches with multiple commands have race conditions. Lua scripts solve both problems because Redis executes them atomically - no other command can run in between steps.

## Why Lua Scripts for Rate Limiting

Without Lua scripts, a typical Redis rate limiter requires multiple commands: GET the counter, check if it exceeds the limit, INCR the counter, and SET the expiration. Between each command, another request from the same client could sneak in, causing the counter to go over the limit.

Lua scripts run atomically on the Redis server. You send the entire rate limiting logic as a single script, and Redis executes it without interruption. This eliminates race conditions and reduces network round trips from 3-4 to just 1.

## Setting Up Memorystore

Create a Memorystore instance for your rate limiter:

```bash
# Create a Memorystore Redis instance
# The BASIC tier is fine for rate limiting since losing the count
# during a failover is acceptable
gcloud redis instances create rate-limiter \
  --size=1 \
  --region=us-central1 \
  --tier=BASIC \
  --redis-version=redis_7_0 \
  --network=default

# Get the connection details
gcloud redis instances describe rate-limiter \
  --region=us-central1 \
  --format="value(host, port)"
```

## Fixed Window Rate Limiter

The simplest approach. Count requests in a fixed time window (like per minute) and reject when the count exceeds the limit.

```python
# fixed_window.py
# Fixed window rate limiter using a Lua script for atomicity
import redis
import time

r = redis.Redis(host='10.0.0.3', port=6379, decode_responses=True)

# Lua script for fixed window rate limiting
# KEYS[1] = rate limit key
# ARGV[1] = max requests allowed
# ARGV[2] = window size in seconds
FIXED_WINDOW_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

-- Get current count
local current = tonumber(redis.call('GET', key) or '0')

if current >= limit then
    -- Rate limit exceeded, return remaining TTL and 0 (denied)
    local ttl = redis.call('TTL', key)
    return {0, current, ttl}
end

-- Increment the counter
current = redis.call('INCR', key)

-- Set expiration only on the first request in the window
if current == 1 then
    redis.call('EXPIRE', key, window)
end

local ttl = redis.call('TTL', key)
return {1, current, ttl}
"""

# Register the script with Redis for repeated execution
fixed_window = r.register_script(FIXED_WINDOW_SCRIPT)

def check_rate_limit(client_id, max_requests=100, window_seconds=60):
    """Check if a client has exceeded their rate limit."""
    key = f"ratelimit:fixed:{client_id}:{int(time.time() / window_seconds)}"
    result = fixed_window(keys=[key], args=[max_requests, window_seconds])

    allowed = bool(result[0])
    current_count = result[1]
    retry_after = result[2]

    return {
        "allowed": allowed,
        "current": current_count,
        "limit": max_requests,
        "remaining": max(0, max_requests - current_count),
        "retry_after": retry_after if not allowed else 0,
    }

# Test it
for i in range(5):
    result = check_rate_limit("api_key_123", max_requests=3, window_seconds=60)
    print(f"Request {i+1}: allowed={result['allowed']}, remaining={result['remaining']}")
```

## Sliding Window Rate Limiter

The fixed window has a problem: a burst of requests at the end of one window and the start of the next can exceed the intended rate. The sliding window fixes this by using a sorted set to track individual request timestamps.

```python
# sliding_window.py
# Sliding window rate limiter - more accurate than fixed window
import redis
import time

r = redis.Redis(host='10.0.0.3', port=6379, decode_responses=True)

# Lua script for sliding window rate limiting
# Uses a sorted set where scores are timestamps
SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local request_id = ARGV[4]

-- Remove entries older than the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries in the window
local current = redis.call('ZCARD', key)

if current >= limit then
    -- Rate limited. Find when the oldest entry expires
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 0
    if oldest and #oldest > 0 then
        retry_after = window - (now - tonumber(oldest[2]))
    end
    return {0, current, math.ceil(retry_after)}
end

-- Add the new request with current timestamp as score
redis.call('ZADD', key, now, request_id)

-- Set expiration on the key to auto-cleanup
redis.call('EXPIRE', key, window + 1)

return {1, current + 1, 0}
"""

sliding_window = r.register_script(SLIDING_WINDOW_SCRIPT)

def check_sliding_rate_limit(client_id, max_requests=100, window_seconds=60):
    """Check rate limit using a sliding window approach."""
    now = time.time()
    # Use timestamp + random suffix as unique request ID
    request_id = f"{now}:{id(object())}"
    key = f"ratelimit:sliding:{client_id}"

    result = sliding_window(
        keys=[key],
        args=[max_requests, window_seconds, now, request_id]
    )

    allowed = bool(result[0])
    current_count = result[1]
    retry_after = result[2]

    return {
        "allowed": allowed,
        "current": current_count,
        "limit": max_requests,
        "remaining": max(0, max_requests - current_count),
        "retry_after": retry_after,
    }
```

## Token Bucket Rate Limiter

The token bucket algorithm is the most flexible. It allows bursts up to a maximum bucket size while maintaining a steady average rate.

```python
# token_bucket.py
# Token bucket rate limiter - allows controlled bursts
import redis
import time

r = redis.Redis(host='10.0.0.3', port=6379, decode_responses=True)

# Lua script for token bucket rate limiting
# Tokens refill at a constant rate up to the bucket capacity
TOKEN_BUCKET_SCRIPT = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])    -- Max tokens in the bucket
local refill_rate = tonumber(ARGV[2])  -- Tokens added per second
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])    -- Tokens to consume (usually 1)

-- Get current bucket state
local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

-- Initialize bucket if it does not exist
if tokens == nil then
    tokens = capacity
    last_refill = now
end

-- Calculate tokens to add based on elapsed time
local elapsed = now - last_refill
local new_tokens = elapsed * refill_rate
tokens = math.min(capacity, tokens + new_tokens)

-- Check if enough tokens are available
if tokens < requested then
    -- Not enough tokens, calculate wait time
    local deficit = requested - tokens
    local wait_time = deficit / refill_rate

    -- Update the bucket state even when denied (to track refill time)
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)

    return {0, math.floor(tokens * 100) / 100, math.ceil(wait_time)}
end

-- Consume tokens
tokens = tokens - requested

-- Update the bucket
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)

return {1, math.floor(tokens * 100) / 100, 0}
"""

token_bucket = r.register_script(TOKEN_BUCKET_SCRIPT)

def check_token_bucket(client_id, capacity=100, refill_rate=10, tokens_needed=1):
    """
    Check rate limit using token bucket.
    capacity: max burst size
    refill_rate: tokens per second
    """
    key = f"ratelimit:bucket:{client_id}"
    now = time.time()

    result = token_bucket(
        keys=[key],
        args=[capacity, refill_rate, now, tokens_needed]
    )

    allowed = bool(result[0])
    remaining_tokens = result[1]
    retry_after = result[2]

    return {
        "allowed": allowed,
        "remaining_tokens": remaining_tokens,
        "capacity": capacity,
        "retry_after": retry_after,
    }

# Example: 100 request burst capacity, refills at 10 requests/second
result = check_token_bucket("api_key_456", capacity=100, refill_rate=10)
print(f"Allowed: {result['allowed']}, Tokens left: {result['remaining_tokens']}")
```

## Integrating with a FastAPI Application

Here is how to integrate the rate limiter into a web application:

```python
# app.py
# FastAPI application with Redis rate limiting middleware
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import redis

app = FastAPI()
r = redis.Redis(host='10.0.0.3', port=6379, decode_responses=True)

# Register the token bucket script
token_bucket = r.register_script(TOKEN_BUCKET_SCRIPT)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Apply rate limiting to all API requests."""
    # Identify the client by API key or IP address
    client_id = request.headers.get("X-API-Key", request.client.host)

    result = check_token_bucket(client_id, capacity=100, refill_rate=10)

    # Add rate limit headers to every response
    if not result["allowed"]:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
            headers={
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(result["retry_after"]),
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = str(int(result["remaining_tokens"]))
    return response

@app.get("/api/data")
async def get_data():
    return {"message": "Here is your data"}
```

## Monitoring Rate Limit Activity

Track rate limiting patterns to detect abuse and tune your limits:

```python
# monitor.py
# Track rate limit hits and blocks for monitoring
import redis

r = redis.Redis(host='10.0.0.3', port=6379, decode_responses=True)

def get_rate_limit_stats():
    """Get aggregated rate limiting statistics."""
    # Count total rate-limited keys
    cursor = 0
    total_keys = 0
    while True:
        cursor, keys = r.scan(cursor, match="ratelimit:*", count=100)
        total_keys += len(keys)
        if cursor == 0:
            break

    info = r.info("stats")
    print(f"Active rate limit keys: {total_keys}")
    print(f"Total commands processed: {info.get('total_commands_processed', 0)}")
    print(f"Connected clients: {r.info('clients').get('connected_clients', 0)}")

get_rate_limit_stats()
```

## Summary

Redis Lua scripts on Memorystore give you atomic, high-performance rate limiting for your APIs. The fixed window approach is simplest, the sliding window is more accurate, and the token bucket provides the most flexibility with burst control. All three patterns execute in a single Redis round trip thanks to Lua scripts, eliminating race conditions under concurrent load. Add the appropriate HTTP headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) so clients can adapt their behavior, and monitor your rate limit keys to tune the thresholds over time.
