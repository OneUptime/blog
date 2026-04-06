# How to Design a Rate Limiter Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Rate Limiter, Interview, Lua

Description: A step-by-step guide to designing a Redis-backed rate limiter in a system design interview, covering fixed window, sliding window, and token bucket.

---

Rate limiter design is a classic system design interview question. Redis is almost always the right answer for the storage layer. This post walks through the algorithms and how to explain your design clearly in an interview.

## Define Requirements First

Ask the interviewer:
- What is the limit? (e.g., 100 requests per minute per user)
- What happens when the limit is exceeded? (HTTP 429, queue, or drop)
- Is the rate limit per user, per IP, or per API key?
- Do we need global rate limiting across multiple servers?

## Algorithm 1: Fixed Window Counter

Simple but has a burst problem at window boundaries:

```bash
# Key: ratelimit:{user_id}:{minute_timestamp}
INCR ratelimit:user1:1711900000
EXPIRE ratelimit:user1:1711900000 60
```

If the count exceeds the limit, reject the request. The issue: a user can make 100 requests at second 59 and 100 more at second 61 - 200 requests in 2 seconds.

## Algorithm 2: Sliding Window Log

Uses a sorted set to track exact request timestamps:

```bash
# Add current timestamp
ZADD ratelimit:user1 1711900045.123 "req_unique_id"

# Remove timestamps older than 60 seconds
ZREMRANGEBYSCORE ratelimit:user1 0 1711899985.123

# Count requests in window
ZCARD ratelimit:user1
```

Accurate but memory-intensive for high-traffic APIs.

## Algorithm 3: Token Bucket (via Lua Script)

Most production-grade algorithm. Atomically check and consume tokens:

```lua
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

local elapsed = now - last_refill
local new_tokens = math.min(capacity, tokens + elapsed * refill_rate)

if new_tokens < 1 then
    return 0  -- rate limited
end

redis.call('HSET', key, 'tokens', new_tokens - 1, 'last_refill', now)
redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
return 1  -- allowed
```

## Distributed Rate Limiting

For multiple API servers to share the same rate limit, all servers must talk to the same Redis instance or cluster. A single Redis node can handle millions of operations per second, which is sufficient for most use cases.

For global rate limiting across regions, use Redis Cluster or a central Redis with geographic routing.

## What to Say in an Interview

Structure your answer:

1. "I'll use Redis for O(1) atomic increments..."
2. "For simplicity, I'll start with a fixed window counter..."
3. "To avoid burst issues, I can upgrade to a sliding window using sorted sets..."
4. "For high accuracy with low memory, token bucket implemented in Lua gives atomicity..."
5. "For distributed rate limiting, all app servers share one Redis node/cluster..."

## Summary

Redis rate limiter design shows interviewers you understand atomic operations, Lua scripting for multi-step atomicity, and the trade-offs between algorithm complexity and accuracy. Always discuss the fixed window burst problem and offer sliding window or token bucket as the production solution.
