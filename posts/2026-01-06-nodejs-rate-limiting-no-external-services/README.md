# How to Implement Rate Limiting in Node.js Without External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Security, API, Performance, DevOps

Description: Learn to implement rate limiting in Node.js using sliding window and token bucket algorithms without Redis or external dependencies.

---

Rate limiting protects your APIs from abuse, prevents resource exhaustion, and ensures fair usage among clients. While Redis-based solutions are popular, you don't always need external services. This guide covers implementing rate limiting algorithms directly in Node.js.

## Why Rate Limit?

| Threat | Rate Limiting Impact |
|--------|---------------------|
| DDoS attacks | Limits requests per IP |
| Brute force auth | Limits login attempts |
| API abuse | Enforces usage quotas |
| Scraping | Slows down automated access |
| Cost control | Prevents expensive operations |

## Algorithm Overview

| Algorithm | Best For | Characteristics |
|-----------|----------|-----------------|
| **Fixed Window** | Simple use cases | Easy to implement, bursty at edges |
| **Sliding Window** | Most APIs | Smoother distribution, more accurate |
| **Token Bucket** | Variable burst | Allows controlled bursts |
| **Leaky Bucket** | Constant rate | Processes at fixed rate |

## Fixed Window Counter

The simplest approach: count requests in fixed time windows.

```javascript
class FixedWindowRateLimiter {
  constructor(options) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.windows = new Map();
  }

  getWindowKey(identifier) {
    const windowStart = Math.floor(Date.now() / this.windowMs);
    return `${identifier}:${windowStart}`;
  }

  isAllowed(identifier) {
    const key = this.getWindowKey(identifier);
    const current = this.windows.get(key) || 0;

    if (current >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    this.windows.set(key, current + 1);

    // Clean old windows periodically
    this.cleanup();

    return {
      allowed: true,
      remaining: this.maxRequests - current - 1,
    };
  }

  cleanup() {
    const now = Date.now();
    const currentWindow = Math.floor(now / this.windowMs);

    for (const [key] of this.windows) {
      const [, windowNum] = key.split(':');
      if (parseInt(windowNum) < currentWindow - 1) {
        this.windows.delete(key);
      }
    }
  }
}

// Express middleware
function createRateLimitMiddleware(options) {
  const limiter = new FixedWindowRateLimiter(options);

  return (req, res, next) => {
    const identifier = req.ip;
    const result = limiter.isAllowed(identifier);

    res.set('X-RateLimit-Limit', options.maxRequests);
    res.set('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    }

    next();
  };
}
```

**Problem**: Fixed windows allow bursts at window boundaries. A client could make 100 requests at 0:59 and another 100 at 1:00.

## Sliding Window Log

Tracks exact timestamps of all requests for precise rate limiting:

```javascript
class SlidingWindowLogLimiter {
  constructor(options) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
    this.requestLogs = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or initialize request log
    let requests = this.requestLogs.get(identifier) || [];

    // Remove old requests
    requests = requests.filter(timestamp => timestamp > windowStart);

    if (requests.length >= this.maxRequests) {
      this.requestLogs.set(identifier, requests);
      return {
        allowed: false,
        remaining: 0,
        resetAt: requests[0] + this.windowMs,
      };
    }

    // Add current request
    requests.push(now);
    this.requestLogs.set(identifier, requests);

    return {
      allowed: true,
      remaining: this.maxRequests - requests.length,
    };
  }

  // Periodic cleanup to prevent memory growth
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, requests] of this.requestLogs) {
      const valid = requests.filter(ts => ts > windowStart);
      if (valid.length === 0) {
        this.requestLogs.delete(identifier);
      } else {
        this.requestLogs.set(identifier, valid);
      }
    }
  }
}
```

**Problem**: Stores every request timestamp, high memory usage for many clients.

## Sliding Window Counter

Combines fixed windows with interpolation for accuracy without high memory:

```javascript
class SlidingWindowCounterLimiter {
  constructor(options) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
    this.windows = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const currentWindowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const previousWindowStart = currentWindowStart - this.windowMs;

    const currentKey = `${identifier}:${currentWindowStart}`;
    const previousKey = `${identifier}:${previousWindowStart}`;

    const currentCount = this.windows.get(currentKey) || 0;
    const previousCount = this.windows.get(previousKey) || 0;

    // Calculate weighted count based on position in current window
    const elapsedInCurrentWindow = now - currentWindowStart;
    const previousWindowWeight = 1 - (elapsedInCurrentWindow / this.windowMs);

    const weightedCount = currentCount + (previousCount * previousWindowWeight);

    if (weightedCount >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        currentCount: Math.ceil(weightedCount),
      };
    }

    // Increment current window
    this.windows.set(currentKey, currentCount + 1);

    // Cleanup old windows
    this.cleanup(currentWindowStart);

    return {
      allowed: true,
      remaining: Math.floor(this.maxRequests - weightedCount - 1),
    };
  }

  cleanup(currentWindowStart) {
    const oldestValidWindow = currentWindowStart - this.windowMs;

    for (const [key] of this.windows) {
      const [, windowStart] = key.split(':');
      if (parseInt(windowStart) < oldestValidWindow) {
        this.windows.delete(key);
      }
    }
  }
}
```

## Token Bucket Algorithm

Allows controlled bursts while enforcing average rate:

```javascript
class TokenBucketLimiter {
  constructor(options) {
    this.bucketSize = options.bucketSize || 10;      // Max tokens (burst capacity)
    this.refillRate = options.refillRate || 1;       // Tokens per second
    this.buckets = new Map();
  }

  getBucket(identifier) {
    if (!this.buckets.has(identifier)) {
      this.buckets.set(identifier, {
        tokens: this.bucketSize,
        lastRefill: Date.now(),
      });
    }
    return this.buckets.get(identifier);
  }

  refillBucket(bucket) {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    bucket.tokens = Math.min(this.bucketSize, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  consume(identifier, tokens = 1) {
    const bucket = this.getBucket(identifier);
    this.refillBucket(bucket);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfter: 0,
      };
    }

    const tokensNeeded = tokens - bucket.tokens;
    const waitTime = tokensNeeded / this.refillRate;

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(waitTime),
    };
  }

  // Cleanup idle buckets
  cleanup(maxIdleMs = 3600000) {
    const now = Date.now();
    for (const [identifier, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxIdleMs) {
        this.buckets.delete(identifier);
      }
    }
  }
}

// Usage with different costs per endpoint
const limiter = new TokenBucketLimiter({
  bucketSize: 100,
  refillRate: 10, // 10 tokens per second
});

app.get('/api/simple', (req, res, next) => {
  const result = limiter.consume(req.ip, 1); // 1 token
  if (!result.allowed) {
    return res.status(429).json({ retryAfter: result.retryAfter });
  }
  next();
});

app.get('/api/expensive', (req, res, next) => {
  const result = limiter.consume(req.ip, 10); // 10 tokens
  if (!result.allowed) {
    return res.status(429).json({ retryAfter: result.retryAfter });
  }
  next();
});
```

## Production-Ready Implementation

A complete rate limiter with multiple strategies and key types:

```javascript
class RateLimiter {
  constructor(options = {}) {
    this.stores = new Map();
    this.defaultOptions = {
      windowMs: 60000,
      maxRequests: 100,
      algorithm: 'sliding-window',
      keyGenerator: (req) => req.ip,
      skip: () => false,
      onRateLimited: null,
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  createLimiter(name, options) {
    const config = { ...this.defaultOptions, ...options };
    this.stores.set(name, {
      config,
      data: new Map(),
    });

    return this.middleware(name);
  }

  middleware(name) {
    return async (req, res, next) => {
      const store = this.stores.get(name);
      if (!store) {
        return next(new Error(`Rate limiter "${name}" not found`));
      }

      const { config, data } = store;

      // Check if request should skip rate limiting
      if (config.skip(req)) {
        return next();
      }

      // Generate key for this request
      const key = config.keyGenerator(req);

      // Check rate limit
      const result = this.checkLimit(key, data, config);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests,
        'X-RateLimit-Remaining': Math.max(0, result.remaining),
        'X-RateLimit-Reset': Math.ceil((Date.now() + config.windowMs) / 1000),
      });

      if (!result.allowed) {
        res.set('Retry-After', Math.ceil(config.windowMs / 1000));

        if (config.onRateLimited) {
          config.onRateLimited(req, res);
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(config.windowMs / 1000)} seconds.`,
        });
      }

      next();
    };
  }

  checkLimit(key, data, config) {
    switch (config.algorithm) {
      case 'fixed-window':
        return this.fixedWindow(key, data, config);
      case 'sliding-window':
        return this.slidingWindow(key, data, config);
      case 'token-bucket':
        return this.tokenBucket(key, data, config);
      default:
        return this.slidingWindow(key, data, config);
    }
  }

  fixedWindow(key, data, config) {
    const windowStart = Math.floor(Date.now() / config.windowMs);
    const windowKey = `${key}:${windowStart}`;

    const current = data.get(windowKey) || 0;

    if (current >= config.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    data.set(windowKey, current + 1);
    return { allowed: true, remaining: config.maxRequests - current - 1 };
  }

  slidingWindow(key, data, config) {
    const now = Date.now();
    const currentWindowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const previousWindowStart = currentWindowStart - config.windowMs;

    const currentKey = `${key}:${currentWindowStart}`;
    const previousKey = `${key}:${previousWindowStart}`;

    const currentCount = data.get(currentKey) || 0;
    const previousCount = data.get(previousKey) || 0;

    const elapsedRatio = (now - currentWindowStart) / config.windowMs;
    const previousWeight = 1 - elapsedRatio;
    const weightedCount = currentCount + (previousCount * previousWeight);

    if (weightedCount >= config.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    data.set(currentKey, currentCount + 1);
    return { allowed: true, remaining: Math.floor(config.maxRequests - weightedCount - 1) };
  }

  tokenBucket(key, data, config) {
    const now = Date.now();
    let bucket = data.get(key);

    if (!bucket) {
      bucket = { tokens: config.maxRequests, lastRefill: now };
      data.set(key, bucket);
    }

    // Refill tokens
    const refillRate = config.maxRequests / (config.windowMs / 1000);
    const timePassed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + (timePassed * refillRate));
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return { allowed: false, remaining: 0 };
    }

    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  cleanup() {
    const now = Date.now();

    for (const [, store] of this.stores) {
      const { data, config } = store;
      const oldestValid = now - (config.windowMs * 2);

      for (const [key] of data) {
        // Extract timestamp from key if present
        const parts = key.split(':');
        if (parts.length > 1) {
          const timestamp = parseInt(parts[parts.length - 1]);
          if (timestamp < oldestValid / config.windowMs) {
            data.delete(key);
          }
        }
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Usage
const rateLimiter = new RateLimiter();

// Global API limit
app.use('/api', rateLimiter.createLimiter('api', {
  windowMs: 60000,
  maxRequests: 100,
}));

// Strict auth limit
app.use('/api/auth', rateLimiter.createLimiter('auth', {
  windowMs: 3600000, // 1 hour
  maxRequests: 5,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`,
}));

// Per-user limit (after authentication)
app.use('/api/user', rateLimiter.createLimiter('user', {
  windowMs: 60000,
  maxRequests: 1000,
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.user?.isPremium, // Skip for premium users
}));
```

## Distributed Rate Limiting (Cluster Mode)

For Node.js cluster deployments without external services:

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  // Master process maintains global state
  const globalCounts = new Map();

  cluster.on('message', (worker, message) => {
    if (message.type === 'rateLimit:check') {
      const { key, windowMs, maxRequests } = message;
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs);
      const windowKey = `${key}:${windowStart}`;

      const current = globalCounts.get(windowKey) || 0;
      const allowed = current < maxRequests;

      if (allowed) {
        globalCounts.set(windowKey, current + 1);
      }

      worker.send({
        type: 'rateLimit:result',
        requestId: message.requestId,
        allowed,
        remaining: Math.max(0, maxRequests - current - 1),
      });

      // Cleanup old windows
      for (const [k] of globalCounts) {
        const [, ws] = k.split(':');
        if (parseInt(ws) < windowStart - 1) {
          globalCounts.delete(k);
        }
      }
    }
  });
} else {
  // Worker processes
  const pendingRequests = new Map();

  process.on('message', (message) => {
    if (message.type === 'rateLimit:result') {
      const { requestId, allowed, remaining } = message;
      const pending = pendingRequests.get(requestId);
      if (pending) {
        pending.resolve({ allowed, remaining });
        pendingRequests.delete(requestId);
      }
    }
  });

  function checkRateLimit(key, options) {
    return new Promise((resolve, reject) => {
      const requestId = `${process.pid}:${Date.now()}:${Math.random()}`;

      pendingRequests.set(requestId, { resolve, reject });

      process.send({
        type: 'rateLimit:check',
        requestId,
        key,
        windowMs: options.windowMs,
        maxRequests: options.maxRequests,
      });

      // Timeout after 1 second
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          // Fail open - allow request if rate limit check times out
          resolve({ allowed: true, remaining: 0 });
        }
      }, 1000);
    });
  }
}
```

## Rate Limit Response Headers

Standard headers to include in responses:

```javascript
function setRateLimitHeaders(res, options, result) {
  res.set({
    // Standard headers
    'X-RateLimit-Limit': options.maxRequests,
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': Math.ceil((Date.now() + options.windowMs) / 1000),

    // Draft IETF standard headers
    'RateLimit-Limit': options.maxRequests,
    'RateLimit-Remaining': result.remaining,
    'RateLimit-Reset': Math.ceil(options.windowMs / 1000),
  });

  if (!result.allowed) {
    res.set('Retry-After', Math.ceil(options.windowMs / 1000));
  }
}
```

## Summary

| Algorithm | Memory | Accuracy | Burst Handling |
|-----------|--------|----------|----------------|
| Fixed Window | Low | Low | Allows 2x at edges |
| Sliding Log | High | High | Precise |
| Sliding Counter | Low | High | Smooth |
| Token Bucket | Low | Medium | Controlled bursts |

For most Node.js APIs, the **sliding window counter** provides the best balance of accuracy, memory efficiency, and implementation simplicity. Use **token bucket** when you need to allow controlled bursts for specific endpoints.
