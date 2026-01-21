# How to Implement Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, API, Security, Token Bucket, Sliding Window

Description: A comprehensive guide to implementing rate limiting with Redis using token bucket, sliding window, and fixed window algorithms with practical code examples for protecting APIs and services.

---

Rate limiting is essential for protecting APIs and services from abuse, ensuring fair resource usage, and maintaining system stability. Redis provides the perfect foundation for implementing distributed rate limiters due to its atomic operations, high performance, and support for expiring keys. This guide covers multiple rate limiting algorithms with production-ready implementations.

## Rate Limiting Algorithms Overview

| Algorithm | Accuracy | Memory | Complexity | Use Case |
|-----------|----------|--------|------------|----------|
| Fixed Window | Low | Low | Simple | Basic rate limiting |
| Sliding Window Log | High | High | Medium | Precise limiting |
| Sliding Window Counter | Medium | Low | Medium | Balanced approach |
| Token Bucket | High | Low | Medium | Burst handling |
| Leaky Bucket | High | Low | Medium | Smooth rate output |

## Fixed Window Rate Limiter

The simplest approach - count requests in fixed time windows.

```python
import redis
import time

class FixedWindowRateLimiter:
    """Simple fixed window rate limiter."""

    def __init__(self, redis_url='redis://localhost:6379',
                 limit=100, window_seconds=60):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.limit = limit
        self.window_seconds = window_seconds

    def is_allowed(self, key: str) -> tuple[bool, dict]:
        """Check if request is allowed."""
        # Get current window
        current_window = int(time.time() / self.window_seconds)
        redis_key = f"ratelimit:{key}:{current_window}"

        # Increment counter
        current = self.redis.incr(redis_key)

        # Set expiry on first request
        if current == 1:
            self.redis.expire(redis_key, self.window_seconds)

        # Get TTL for reset time
        ttl = self.redis.ttl(redis_key)

        allowed = current <= self.limit

        return allowed, {
            'limit': self.limit,
            'remaining': max(0, self.limit - current),
            'reset': int(time.time()) + ttl,
            'current': current
        }


# Usage
limiter = FixedWindowRateLimiter(limit=100, window_seconds=60)

# Test
for i in range(105):
    allowed, info = limiter.is_allowed('user:123')
    if not allowed:
        print(f"Request {i+1} blocked. Info: {info}")
        break
```

## Sliding Window Log Rate Limiter

More accurate - tracks individual request timestamps.

```python
import redis
import time
from typing import Tuple, Dict

class SlidingWindowLogRateLimiter:
    """Sliding window log rate limiter using sorted sets."""

    def __init__(self, redis_url='redis://localhost:6379',
                 limit=100, window_seconds=60):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.limit = limit
        self.window_seconds = window_seconds

    def is_allowed(self, key: str) -> Tuple[bool, Dict]:
        """Check if request is allowed."""
        now = time.time()
        window_start = now - self.window_seconds
        redis_key = f"ratelimit:swl:{key}"

        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(redis_key, '-inf', window_start)

        # Count current entries
        pipe.zcard(redis_key)

        # Add current request (will be rolled back if not allowed)
        pipe.zadd(redis_key, {f"{now}:{id(now)}": now})

        # Set expiry
        pipe.expire(redis_key, self.window_seconds)

        results = pipe.execute()
        current_count = results[1]

        if current_count >= self.limit:
            # Remove the entry we just added
            self.redis.zremrangebyscore(redis_key, now, now)
            allowed = False
        else:
            allowed = True

        # Get oldest entry for reset calculation
        oldest = self.redis.zrange(redis_key, 0, 0, withscores=True)
        reset_at = int(oldest[0][1] + self.window_seconds) if oldest else int(now + self.window_seconds)

        return allowed, {
            'limit': self.limit,
            'remaining': max(0, self.limit - current_count - (1 if allowed else 0)),
            'reset': reset_at,
            'current': current_count + (1 if allowed else 0)
        }


# Usage
limiter = SlidingWindowLogRateLimiter(limit=10, window_seconds=60)

for i in range(15):
    allowed, info = limiter.is_allowed('user:123')
    print(f"Request {i+1}: {'Allowed' if allowed else 'Blocked'} - {info}")
    time.sleep(0.1)
```

## Sliding Window Counter Rate Limiter

Balanced approach - uses weighted counters for two windows.

```python
import redis
import time
from typing import Tuple, Dict

class SlidingWindowCounterRateLimiter:
    """Sliding window counter rate limiter."""

    def __init__(self, redis_url='redis://localhost:6379',
                 limit=100, window_seconds=60):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.limit = limit
        self.window_seconds = window_seconds

    def is_allowed(self, key: str) -> Tuple[bool, Dict]:
        """Check if request is allowed using sliding window counter."""
        now = time.time()
        current_window = int(now / self.window_seconds)
        previous_window = current_window - 1

        # Calculate position in current window (0.0 to 1.0)
        window_position = (now % self.window_seconds) / self.window_seconds

        current_key = f"ratelimit:swc:{key}:{current_window}"
        previous_key = f"ratelimit:swc:{key}:{previous_window}"

        pipe = self.redis.pipeline()
        pipe.get(current_key)
        pipe.get(previous_key)
        results = pipe.execute()

        current_count = int(results[0] or 0)
        previous_count = int(results[1] or 0)

        # Weighted count: previous window weight decreases as we move through current window
        weighted_count = previous_count * (1 - window_position) + current_count

        if weighted_count >= self.limit:
            return False, {
                'limit': self.limit,
                'remaining': 0,
                'reset': int((current_window + 1) * self.window_seconds),
                'current': int(weighted_count)
            }

        # Increment current window counter
        pipe = self.redis.pipeline()
        pipe.incr(current_key)
        pipe.expire(current_key, self.window_seconds * 2)
        pipe.execute()

        return True, {
            'limit': self.limit,
            'remaining': max(0, int(self.limit - weighted_count - 1)),
            'reset': int((current_window + 1) * self.window_seconds),
            'current': int(weighted_count + 1)
        }
```

## Token Bucket Rate Limiter

Allows bursts while maintaining average rate.

```python
import redis
import time
from typing import Tuple, Dict

class TokenBucketRateLimiter:
    """Token bucket rate limiter using Redis."""

    def __init__(self, redis_url='redis://localhost:6379',
                 capacity=100, refill_rate=10, refill_interval=1):
        """
        Initialize token bucket.

        Args:
            capacity: Maximum tokens in bucket
            refill_rate: Tokens added per refill
            refill_interval: Seconds between refills
        """
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.refill_interval = refill_interval

        # Lua script for atomic token bucket operation
        self.lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local refill_interval = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        local tokens_requested = tonumber(ARGV[5])

        -- Get current state
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])

        -- Initialize if not exists
        if tokens == nil then
            tokens = capacity
            last_refill = now
        end

        -- Calculate refill
        local time_passed = now - last_refill
        local refills = math.floor(time_passed / refill_interval)
        if refills > 0 then
            tokens = math.min(capacity, tokens + (refills * refill_rate))
            last_refill = last_refill + (refills * refill_interval)
        end

        -- Check if we have enough tokens
        local allowed = 0
        if tokens >= tokens_requested then
            tokens = tokens - tokens_requested
            allowed = 1
        end

        -- Save state
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
        redis.call('EXPIRE', key, capacity / refill_rate * refill_interval * 2)

        return {allowed, tokens, last_refill}
        """
        self.script = self.redis.register_script(self.lua_script)

    def is_allowed(self, key: str, tokens: int = 1) -> Tuple[bool, Dict]:
        """Check if request is allowed."""
        redis_key = f"ratelimit:tb:{key}"
        now = time.time()

        result = self.script(
            keys=[redis_key],
            args=[
                self.capacity,
                self.refill_rate,
                self.refill_interval,
                now,
                tokens
            ]
        )

        allowed = bool(result[0])
        remaining_tokens = int(result[1])
        last_refill = float(result[2])

        # Calculate when bucket will be full
        tokens_needed = self.capacity - remaining_tokens
        time_to_full = (tokens_needed / self.refill_rate) * self.refill_interval

        return allowed, {
            'limit': self.capacity,
            'remaining': remaining_tokens,
            'reset': int(now + time_to_full),
            'refill_rate': self.refill_rate,
            'refill_interval': self.refill_interval
        }

    def consume(self, key: str, tokens: int = 1) -> Tuple[bool, Dict]:
        """Alias for is_allowed with custom token count."""
        return self.is_allowed(key, tokens)


# Usage
limiter = TokenBucketRateLimiter(
    capacity=100,      # Max 100 tokens
    refill_rate=10,    # Add 10 tokens
    refill_interval=1  # Every second
)

# Burst of requests
for i in range(20):
    allowed, info = limiter.is_allowed('user:123')
    print(f"Request {i+1}: {'OK' if allowed else 'Blocked'} - tokens: {info['remaining']}")
```

## Leaky Bucket Rate Limiter

Provides smooth output rate.

```python
import redis
import time
from typing import Tuple, Dict

class LeakyBucketRateLimiter:
    """Leaky bucket rate limiter."""

    def __init__(self, redis_url='redis://localhost:6379',
                 capacity=100, leak_rate=10):
        """
        Initialize leaky bucket.

        Args:
            capacity: Maximum requests in bucket
            leak_rate: Requests processed per second
        """
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.capacity = capacity
        self.leak_rate = leak_rate

        self.lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local leak_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        -- Get current state
        local bucket = redis.call('HMGET', key, 'water', 'last_leak')
        local water = tonumber(bucket[1]) or 0
        local last_leak = tonumber(bucket[2]) or now

        -- Calculate leaked water
        local time_passed = now - last_leak
        local leaked = time_passed * leak_rate
        water = math.max(0, water - leaked)
        last_leak = now

        -- Check if bucket can accept more
        local allowed = 0
        if water < capacity then
            water = water + 1
            allowed = 1
        end

        -- Save state
        redis.call('HMSET', key, 'water', water, 'last_leak', last_leak)
        redis.call('EXPIRE', key, math.ceil(capacity / leak_rate) * 2)

        return {allowed, water, capacity - water}
        """
        self.script = self.redis.register_script(self.lua_script)

    def is_allowed(self, key: str) -> Tuple[bool, Dict]:
        """Check if request is allowed."""
        redis_key = f"ratelimit:lb:{key}"
        now = time.time()

        result = self.script(
            keys=[redis_key],
            args=[self.capacity, self.leak_rate, now]
        )

        allowed = bool(result[0])
        current_water = float(result[1])
        remaining = int(result[2])

        return allowed, {
            'limit': self.capacity,
            'remaining': remaining,
            'current': int(current_water),
            'leak_rate': self.leak_rate
        }
```

## Node.js Rate Limiting Implementation

```javascript
const Redis = require('ioredis');

class TokenBucketRateLimiter {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.capacity = options.capacity || 100;
        this.refillRate = options.refillRate || 10;
        this.refillInterval = options.refillInterval || 1;

        this.luaScript = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local refill_interval = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        local tokens_requested = tonumber(ARGV[5])

        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1])
        local last_refill = tonumber(bucket[2])

        if tokens == nil then
            tokens = capacity
            last_refill = now
        end

        local time_passed = now - last_refill
        local refills = math.floor(time_passed / refill_interval)
        if refills > 0 then
            tokens = math.min(capacity, tokens + (refills * refill_rate))
            last_refill = last_refill + (refills * refill_interval)
        end

        local allowed = 0
        if tokens >= tokens_requested then
            tokens = tokens - tokens_requested
            allowed = 1
        end

        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
        redis.call('EXPIRE', key, math.ceil(capacity / refill_rate * refill_interval * 2))

        return {allowed, tokens, last_refill}
        `;
    }

    async isAllowed(key, tokens = 1) {
        const redisKey = `ratelimit:tb:${key}`;
        const now = Date.now() / 1000;

        const result = await this.redis.eval(
            this.luaScript,
            1,
            redisKey,
            this.capacity,
            this.refillRate,
            this.refillInterval,
            now,
            tokens
        );

        const allowed = result[0] === 1;
        const remaining = Math.floor(result[1]);

        return {
            allowed,
            limit: this.capacity,
            remaining,
            reset: Math.floor(now + (this.capacity - remaining) / this.refillRate * this.refillInterval)
        };
    }

    async close() {
        await this.redis.quit();
    }
}

class SlidingWindowRateLimiter {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.limit = options.limit || 100;
        this.windowSeconds = options.windowSeconds || 60;
    }

    async isAllowed(key) {
        const now = Date.now() / 1000;
        const windowStart = now - this.windowSeconds;
        const redisKey = `ratelimit:sw:${key}`;

        const pipe = this.redis.pipeline();
        pipe.zremrangebyscore(redisKey, '-inf', windowStart);
        pipe.zcard(redisKey);
        pipe.zadd(redisKey, now, `${now}:${Math.random()}`);
        pipe.expire(redisKey, this.windowSeconds);

        const results = await pipe.exec();
        const currentCount = results[1][1];

        if (currentCount >= this.limit) {
            // Remove the entry we just added
            await this.redis.zremrangebyscore(redisKey, now, now);
            return {
                allowed: false,
                limit: this.limit,
                remaining: 0,
                reset: Math.floor(now + this.windowSeconds)
            };
        }

        return {
            allowed: true,
            limit: this.limit,
            remaining: this.limit - currentCount - 1,
            reset: Math.floor(now + this.windowSeconds)
        };
    }

    async close() {
        await this.redis.quit();
    }
}

// Express middleware
function rateLimitMiddleware(limiter, keyExtractor) {
    return async (req, res, next) => {
        const key = keyExtractor(req);
        const result = await limiter.isAllowed(key);

        res.set({
            'X-RateLimit-Limit': result.limit,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': result.reset
        });

        if (!result.allowed) {
            res.status(429).json({
                error: 'Too Many Requests',
                retryAfter: result.reset - Math.floor(Date.now() / 1000)
            });
            return;
        }

        next();
    };
}

// Usage with Express
const express = require('express');
const app = express();

const limiter = new TokenBucketRateLimiter({
    capacity: 100,
    refillRate: 10,
    refillInterval: 1
});

app.use('/api', rateLimitMiddleware(limiter, (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'anonymous';
}));

app.get('/api/data', (req, res) => {
    res.json({ message: 'Success!' });
});

// Test
async function test() {
    const limiter = new TokenBucketRateLimiter({ capacity: 10, refillRate: 2 });

    for (let i = 0; i < 15; i++) {
        const result = await limiter.isAllowed('test-user');
        console.log(`Request ${i + 1}:`, result.allowed ? 'OK' : 'Blocked',
                    `remaining: ${result.remaining}`);
    }

    await limiter.close();
}

test().catch(console.error);
```

## HTTP Rate Limiting Headers

Implement standard rate limit headers:

```python
from flask import Flask, request, jsonify, make_response
from functools import wraps

app = Flask(__name__)
limiter = TokenBucketRateLimiter(capacity=100, refill_rate=10)

def rate_limit(key_func=None):
    """Rate limiting decorator."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get rate limit key
            if key_func:
                key = key_func()
            else:
                key = request.remote_addr

            # Check rate limit
            allowed, info = limiter.is_allowed(key)

            # Create response
            if allowed:
                response = make_response(f(*args, **kwargs))
            else:
                response = make_response(
                    jsonify({
                        'error': 'Too Many Requests',
                        'message': 'Rate limit exceeded',
                        'retry_after': info['reset'] - int(time.time())
                    }),
                    429
                )

            # Add rate limit headers
            response.headers['X-RateLimit-Limit'] = str(info['limit'])
            response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
            response.headers['X-RateLimit-Reset'] = str(info['reset'])

            if not allowed:
                response.headers['Retry-After'] = str(info['reset'] - int(time.time()))

            return response
        return decorated_function
    return decorator


@app.route('/api/data')
@rate_limit(key_func=lambda: request.headers.get('X-API-Key', request.remote_addr))
def get_data():
    return jsonify({'data': 'Hello, World!'})
```

## Multi-Tier Rate Limiting

Implement different limits for different tiers:

```python
from enum import Enum
from dataclasses import dataclass

class Tier(Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

@dataclass
class TierLimits:
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_capacity: int

TIER_LIMITS = {
    Tier.FREE: TierLimits(10, 100, 1000, 20),
    Tier.BASIC: TierLimits(60, 1000, 10000, 100),
    Tier.PRO: TierLimits(300, 10000, 100000, 500),
    Tier.ENTERPRISE: TierLimits(1000, 50000, 500000, 2000),
}

class MultiTierRateLimiter:
    """Rate limiter with multiple time windows and tiers."""

    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.limiters = {
            'minute': SlidingWindowCounterRateLimiter(redis_url, limit=1, window_seconds=60),
            'hour': SlidingWindowCounterRateLimiter(redis_url, limit=1, window_seconds=3600),
            'day': SlidingWindowCounterRateLimiter(redis_url, limit=1, window_seconds=86400),
        }

    def is_allowed(self, key: str, tier: Tier) -> Tuple[bool, Dict]:
        """Check all rate limits for a tier."""
        limits = TIER_LIMITS[tier]

        # Check each time window
        self.limiters['minute'].limit = limits.requests_per_minute
        self.limiters['hour'].limit = limits.requests_per_hour
        self.limiters['day'].limit = limits.requests_per_day

        results = {}
        all_allowed = True

        for window, limiter in self.limiters.items():
            allowed, info = limiter.is_allowed(f"{key}:{window}")
            results[window] = info
            if not allowed:
                all_allowed = False

        # Find the most restrictive limit
        min_remaining = min(r['remaining'] for r in results.values())
        min_reset = min(r['reset'] for r in results.values())

        return all_allowed, {
            'allowed': all_allowed,
            'tier': tier.value,
            'remaining': min_remaining,
            'reset': min_reset,
            'limits': results
        }
```

## Best Practices

1. **Choose the right algorithm**: Token bucket for APIs with bursts, sliding window for strict limits

2. **Use Lua scripts**: Ensure atomic operations for accuracy

3. **Set appropriate limits**: Balance user experience with protection

4. **Include headers**: Return rate limit info in HTTP headers

5. **Handle Redis failures gracefully**: Default to allowing or blocking based on risk

6. **Monitor and alert**: Track rate limit hits for abuse detection

7. **Consider distributed scenarios**: Use consistent key naming across services

8. **Implement graceful degradation**: Allow some overflow during Redis issues

## Conclusion

Redis provides excellent primitives for building rate limiters. The choice of algorithm depends on your specific needs: token bucket for burst tolerance, sliding window for accuracy, or fixed window for simplicity. By implementing proper rate limiting, you protect your services from abuse while ensuring fair access for legitimate users.
