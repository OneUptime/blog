# How to Implement Sliding Window Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, Sliding Window, API Security, Performance, Lua Scripts

Description: Learn how to implement sliding window rate limiting with Redis to protect your APIs from abuse. This guide covers the algorithm, Lua script implementation, and production-ready code examples in Python and Node.js.

---

> Rate limiting is essential for protecting your APIs from abuse, ensuring fair usage, and preventing system overload. The sliding window algorithm provides a smooth, accurate approach that avoids the burst problems of fixed window rate limiting.

Traditional fixed window rate limiting has a flaw: users can make double the allowed requests by timing them at the boundary between two windows. Sliding window rate limiting solves this by considering a continuously moving time window, providing a more accurate and fair distribution of requests.

---

## Understanding Sliding Window Rate Limiting

The sliding window algorithm calculates the request count based on a weighted combination of the current and previous time windows:

```
Weighted Count = (Previous Window Count * Overlap Percentage) + Current Window Count
```

For example, if we are 30% into the current minute:
- Previous minute had 80 requests
- Current minute has 20 requests
- Weighted count = (80 * 0.7) + 20 = 76 requests

This approach prevents the boundary problem while being memory-efficient.

```
Time Windows:

Previous Window          Current Window
[--------------------]  [-------..............]
                             ^
                             |
                         Current time (30% into window)

Overlap = 70% of previous window
```

---

## Basic Implementation with Sorted Sets

Redis sorted sets provide an elegant way to implement sliding window rate limiting. Each request is stored with its timestamp as the score:

```bash
# Add a request timestamp to the sorted set
ZADD rate_limit:user:123 1706180400000 "request_1706180400000_abc123"

# Remove old entries outside the window
ZREMRANGEBYSCORE rate_limit:user:123 0 1706180340000

# Count requests in the current window
ZCARD rate_limit:user:123
```

---

## Lua Script for Atomic Rate Limiting

For production use, you need atomic operations. This Lua script handles everything in a single call:

```lua
-- sliding_window_rate_limit.lua
-- Implements sliding window rate limiting with Redis sorted sets

-- Keys: rate_limit_key
-- Args: window_size_ms, max_requests, current_timestamp_ms, request_id

local key = KEYS[1]
local window_size = tonumber(ARGV[1])
local max_requests = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local request_id = ARGV[4]

-- Calculate the start of our sliding window
local window_start = now - window_size

-- Remove entries older than our window
-- This keeps the sorted set from growing unbounded
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count current requests in the window
local current_count = redis.call('ZCARD', key)

-- Check if we would exceed the limit
if current_count >= max_requests then
    -- Calculate time until the oldest request expires
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 0
    if #oldest > 0 then
        retry_after = math.ceil((tonumber(oldest[2]) + window_size - now) / 1000)
    end

    return {0, current_count, retry_after}
end

-- Add the new request to the sorted set
-- Using timestamp as score and unique request_id as member
redis.call('ZADD', key, now, request_id)

-- Set expiration on the key to auto-cleanup
-- Add a small buffer to the window size
redis.call('PEXPIRE', key, window_size + 1000)

-- Return success with current count
return {1, current_count + 1, 0}
```

---

## Python Implementation

Here is a complete Python implementation with the Lua script:

```python
import redis
import time
import uuid
from typing import Tuple, Optional

class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter using Redis sorted sets.
    Provides accurate rate limiting without the boundary problem
    of fixed windows.
    """

    # Lua script for atomic rate limiting operations
    LUA_SCRIPT = """
    local key = KEYS[1]
    local window_size = tonumber(ARGV[1])
    local max_requests = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local request_id = ARGV[4]

    local window_start = now - window_size
    redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

    local current_count = redis.call('ZCARD', key)

    if current_count >= max_requests then
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local retry_after = 0
        if #oldest > 0 then
            retry_after = math.ceil((tonumber(oldest[2]) + window_size - now) / 1000)
        end
        return {0, current_count, retry_after}
    end

    redis.call('ZADD', key, now, request_id)
    redis.call('PEXPIRE', key, window_size + 1000)

    return {1, current_count + 1, 0}
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        window_seconds: int = 60,
        max_requests: int = 100,
        key_prefix: str = "ratelimit"
    ):
        """
        Initialize the rate limiter.

        Args:
            redis_client: Redis connection
            window_seconds: Size of the sliding window in seconds
            max_requests: Maximum requests allowed per window
            key_prefix: Prefix for Redis keys
        """
        self.redis = redis_client
        self.window_ms = window_seconds * 1000
        self.max_requests = max_requests
        self.key_prefix = key_prefix

        # Register the Lua script for efficient execution
        self.rate_limit_script = self.redis.register_script(self.LUA_SCRIPT)

    def _get_key(self, identifier: str) -> str:
        """Generate Redis key for the rate limit bucket."""
        return f"{self.key_prefix}:{identifier}"

    def is_allowed(self, identifier: str) -> Tuple[bool, dict]:
        """
        Check if a request is allowed under the rate limit.

        Args:
            identifier: Unique identifier (user ID, IP address, API key)

        Returns:
            Tuple of (allowed: bool, metadata: dict)
            metadata contains: remaining, retry_after, limit
        """
        key = self._get_key(identifier)
        now_ms = int(time.time() * 1000)
        request_id = f"{now_ms}:{uuid.uuid4().hex[:8]}"

        # Execute the Lua script atomically
        result = self.rate_limit_script(
            keys=[key],
            args=[self.window_ms, self.max_requests, now_ms, request_id]
        )

        allowed = result[0] == 1
        current_count = result[1]
        retry_after = result[2]

        return allowed, {
            "allowed": allowed,
            "limit": self.max_requests,
            "remaining": max(0, self.max_requests - current_count),
            "retry_after": retry_after,
            "reset_at": int(time.time()) + (self.window_ms // 1000)
        }

    def get_usage(self, identifier: str) -> dict:
        """
        Get current usage without consuming a request.

        Args:
            identifier: Unique identifier

        Returns:
            Dictionary with usage information
        """
        key = self._get_key(identifier)
        now_ms = int(time.time() * 1000)
        window_start = now_ms - self.window_ms

        # Remove old entries and count remaining
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, '-inf', window_start)
        pipe.zcard(key)
        results = pipe.execute()

        current_count = results[1]

        return {
            "limit": self.max_requests,
            "used": current_count,
            "remaining": max(0, self.max_requests - current_count),
            "window_seconds": self.window_ms // 1000
        }

    def reset(self, identifier: str) -> bool:
        """
        Reset the rate limit for an identifier.

        Args:
            identifier: Unique identifier

        Returns:
            True if the key was deleted
        """
        key = self._get_key(identifier)
        return self.redis.delete(key) > 0


# Flask middleware example
from functools import wraps
from flask import Flask, request, jsonify, g

app = Flask(__name__)
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Create rate limiters with different limits
api_limiter = SlidingWindowRateLimiter(
    redis_client,
    window_seconds=60,
    max_requests=100,
    key_prefix="api_rate"
)

auth_limiter = SlidingWindowRateLimiter(
    redis_client,
    window_seconds=300,  # 5 minutes
    max_requests=5,       # 5 login attempts
    key_prefix="auth_rate"
)

def rate_limit(limiter: SlidingWindowRateLimiter, key_func=None):
    """
    Decorator for rate limiting Flask routes.

    Args:
        limiter: The rate limiter to use
        key_func: Function to extract identifier from request
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Get identifier (default to IP address)
            if key_func:
                identifier = key_func()
            else:
                identifier = request.headers.get('X-Forwarded-For', request.remote_addr)

            allowed, metadata = limiter.is_allowed(identifier)

            # Add rate limit headers to response
            g.rate_limit_headers = {
                'X-RateLimit-Limit': str(metadata['limit']),
                'X-RateLimit-Remaining': str(metadata['remaining']),
                'X-RateLimit-Reset': str(metadata['reset_at'])
            }

            if not allowed:
                response = jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': metadata['retry_after']
                })
                response.status_code = 429
                response.headers['Retry-After'] = str(metadata['retry_after'])
                return response

            return f(*args, **kwargs)
        return wrapped
    return decorator

@app.after_request
def add_rate_limit_headers(response):
    """Add rate limit headers to all responses."""
    if hasattr(g, 'rate_limit_headers'):
        for header, value in g.rate_limit_headers.items():
            response.headers[header] = value
    return response

@app.route('/api/data')
@rate_limit(api_limiter)
def get_data():
    return jsonify({'data': 'Your API response'})

@app.route('/auth/login', methods=['POST'])
@rate_limit(auth_limiter, key_func=lambda: request.json.get('email', request.remote_addr))
def login():
    # Login logic here
    return jsonify({'status': 'success'})
```

---

## Node.js Implementation

Here is the equivalent implementation in Node.js:

```javascript
// sliding-window-rate-limiter.js
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class SlidingWindowRateLimiter {
    constructor(options = {}) {
        this.redis = options.redis || new Redis();
        this.windowMs = (options.windowSeconds || 60) * 1000;
        this.maxRequests = options.maxRequests || 100;
        this.keyPrefix = options.keyPrefix || 'ratelimit';

        // Define the Lua script
        this.luaScript = `
            local key = KEYS[1]
            local window_size = tonumber(ARGV[1])
            local max_requests = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            local request_id = ARGV[4]

            local window_start = now - window_size
            redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

            local current_count = redis.call('ZCARD', key)

            if current_count >= max_requests then
                local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
                local retry_after = 0
                if #oldest > 0 then
                    retry_after = math.ceil((tonumber(oldest[2]) + window_size - now) / 1000)
                end
                return {0, current_count, retry_after}
            end

            redis.call('ZADD', key, now, request_id)
            redis.call('PEXPIRE', key, window_size + 1000)

            return {1, current_count + 1, 0}
        `;

        // Load the script into Redis
        this.scriptSha = null;
        this._loadScript();
    }

    async _loadScript() {
        this.scriptSha = await this.redis.script('LOAD', this.luaScript);
    }

    _getKey(identifier) {
        return `${this.keyPrefix}:${identifier}`;
    }

    async isAllowed(identifier) {
        const key = this._getKey(identifier);
        const nowMs = Date.now();
        const requestId = `${nowMs}:${uuidv4().substring(0, 8)}`;

        // Ensure script is loaded
        if (!this.scriptSha) {
            await this._loadScript();
        }

        try {
            const result = await this.redis.evalsha(
                this.scriptSha,
                1,
                key,
                this.windowMs,
                this.maxRequests,
                nowMs,
                requestId
            );

            const allowed = result[0] === 1;
            const currentCount = result[1];
            const retryAfter = result[2];

            return {
                allowed,
                limit: this.maxRequests,
                remaining: Math.max(0, this.maxRequests - currentCount),
                retryAfter,
                resetAt: Math.floor(Date.now() / 1000) + Math.floor(this.windowMs / 1000)
            };
        } catch (error) {
            // Script might have been flushed, reload it
            if (error.message.includes('NOSCRIPT')) {
                await this._loadScript();
                return this.isAllowed(identifier);
            }
            throw error;
        }
    }
}

// Express middleware
function rateLimitMiddleware(limiter, options = {}) {
    const keyGenerator = options.keyGenerator || ((req) => {
        return req.headers['x-forwarded-for'] || req.ip;
    });

    return async (req, res, next) => {
        try {
            const identifier = keyGenerator(req);
            const result = await limiter.isAllowed(identifier);

            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': result.limit,
                'X-RateLimit-Remaining': result.remaining,
                'X-RateLimit-Reset': result.resetAt
            });

            if (!result.allowed) {
                res.set('Retry-After', result.retryAfter);
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: result.retryAfter
                });
            }

            next();
        } catch (error) {
            console.error('Rate limiter error:', error);
            // Fail open in case of Redis issues
            next();
        }
    };
}

// Usage with Express
const express = require('express');
const app = express();

const apiLimiter = new SlidingWindowRateLimiter({
    windowSeconds: 60,
    maxRequests: 100,
    keyPrefix: 'api_rate'
});

app.use('/api', rateLimitMiddleware(apiLimiter));

app.get('/api/data', (req, res) => {
    res.json({ data: 'Your API response' });
});

module.exports = { SlidingWindowRateLimiter, rateLimitMiddleware };
```

---

## Distributed Rate Limiting

For multi-region deployments, you may want region-aware rate limiting:

```python
class DistributedRateLimiter:
    """
    Rate limiter that works across multiple regions.
    Uses Redis with region-specific quotas.
    """

    def __init__(self, redis_clients: dict, total_limit: int = 1000):
        """
        Args:
            redis_clients: Dict mapping region names to Redis clients
            total_limit: Total requests allowed globally per window
        """
        self.regions = redis_clients
        self.total_limit = total_limit

        # Distribute quota across regions
        self.region_limits = {
            region: total_limit // len(redis_clients)
            for region in redis_clients
        }

    def is_allowed(self, identifier: str, region: str) -> Tuple[bool, dict]:
        """
        Check rate limit for a specific region.
        Falls back to other regions if local quota is exhausted.
        """
        limiter = SlidingWindowRateLimiter(
            self.regions[region],
            max_requests=self.region_limits[region]
        )

        allowed, metadata = limiter.is_allowed(identifier)

        if not allowed:
            # Try to borrow quota from other regions
            for other_region, client in self.regions.items():
                if other_region != region:
                    other_limiter = SlidingWindowRateLimiter(
                        client,
                        max_requests=self.region_limits[other_region]
                    )
                    other_allowed, other_meta = other_limiter.is_allowed(
                        f"{identifier}:overflow"
                    )
                    if other_allowed:
                        return True, other_meta

        return allowed, metadata
```

---

## Best Practices

1. **Use Lua scripts**: They ensure atomic operations and reduce round trips to Redis

2. **Set appropriate windows**: Too small increases Redis load; too large allows bursts

3. **Include retry-after headers**: Help clients implement backoff strategies

4. **Fail open in emergencies**: If Redis is down, consider allowing requests rather than blocking all traffic

5. **Use different limits for different tiers**: Premium users might have higher limits

Sliding window rate limiting with Redis provides a fair, accurate, and scalable solution for protecting your APIs from abuse while ensuring legitimate users have a smooth experience.
