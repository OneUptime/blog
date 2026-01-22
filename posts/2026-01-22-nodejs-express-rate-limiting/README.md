# How to Create Rate Limiting in Express.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Rate Limiting, Security, API

Description: Learn how to implement rate limiting in Express.js applications to prevent abuse, protect APIs, and handle traffic spikes with various strategies.

---

Rate limiting controls how many requests a client can make within a time window. It protects your API from abuse, prevents DDoS attacks, and ensures fair usage among clients.

## Quick Setup with express-rate-limit

```bash
npm install express-rate-limit
```

### Basic Usage

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();

// Apply to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // Limit each IP to 100 requests per window
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,       // Disable X-RateLimit-* headers
});

app.use(limiter);

app.get('/api/data', (req, res) => {
  res.json({ data: 'Hello!' });
});

app.listen(3000);
```

### Different Limits for Different Routes

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();

// Strict limit for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  message: { error: 'Too many login attempts' },
  skipSuccessfulRequests: true,  // Don't count successful logins
});

// Moderate limit for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,               // 60 requests per minute
});

// Lenient limit for public endpoints
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
});

// Apply different limiters
app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);
app.use('/public/', publicLimiter);
```

## Using Redis Store for Distributed Systems

```bash
npm install rate-limit-redis ioredis
```

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  
  // Use Redis store
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});

app.use('/api/', limiter);
```

## Custom Rate Limiting Implementation

### Fixed Window Counter

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function fixedWindowLimit(key, limit, windowSeconds) {
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  return {
    allowed: current <= limit,
    current,
    remaining: Math.max(0, limit - current),
    resetAt: await redis.ttl(key),
  };
}

// Express middleware
function rateLimitMiddleware(options = {}) {
  const {
    limit = 100,
    window = 60,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests',
  } = options;
  
  return async (req, res, next) => {
    const key = `ratelimit:${keyGenerator(req)}`;
    const result = await fixedWindowLimit(key, limit, window);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Date.now() + (result.resetAt * 1000),
    });
    
    if (!result.allowed) {
      return res.status(429).json({
        error: message,
        retryAfter: result.resetAt,
      });
    }
    
    next();
  };
}

// Usage
app.use('/api/', rateLimitMiddleware({
  limit: 100,
  window: 60,  // 1 minute
}));
```

### Sliding Window Log

More accurate than fixed window:

```javascript
async function slidingWindowLimit(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Use Redis transaction
  const pipeline = redis.pipeline();
  
  // Remove old entries
  pipeline.zremrangebyscore(key, '-inf', windowStart);
  
  // Count current entries
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  
  // Set expiration
  pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);
  
  const results = await pipeline.exec();
  const currentCount = results[1][1];
  
  return {
    allowed: currentCount < limit,
    current: currentCount,
    remaining: Math.max(0, limit - currentCount - 1),
  };
}
```

### Token Bucket Algorithm

Allows bursts while maintaining average rate:

```javascript
class TokenBucket {
  constructor(redis) {
    this.redis = redis;
  }
  
  async consume(key, options = {}) {
    const {
      capacity = 10,      // Max tokens
      refillRate = 1,     // Tokens per second
      tokens = 1,         // Tokens to consume
    } = options;
    
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local tokensRequested = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      
      local bucket = redis.call('hmget', key, 'tokens', 'lastRefill')
      local currentTokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      -- Calculate token refill
      local elapsed = (now - lastRefill) / 1000
      local refilled = math.min(capacity, currentTokens + (elapsed * refillRate))
      
      -- Try to consume tokens
      local allowed = refilled >= tokensRequested
      local newTokens = allowed and (refilled - tokensRequested) or refilled
      
      -- Update bucket
      redis.call('hmset', key, 'tokens', newTokens, 'lastRefill', now)
      redis.call('expire', key, math.ceil(capacity / refillRate) + 1)
      
      return {allowed and 1 or 0, newTokens, capacity}
    `;
    
    const result = await this.redis.eval(
      script,
      1,
      key,
      capacity,
      refillRate,
      tokens,
      Date.now()
    );
    
    return {
      allowed: result[0] === 1,
      remaining: Math.floor(result[1]),
      capacity: result[2],
    };
  }
}

// Express middleware
function tokenBucketMiddleware(bucket, options = {}) {
  return async (req, res, next) => {
    const key = `bucket:${req.ip}`;
    const result = await bucket.consume(key, options);
    
    res.set({
      'X-RateLimit-Limit': options.capacity,
      'X-RateLimit-Remaining': result.remaining,
    });
    
    if (!result.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    next();
  };
}

// Usage
const bucket = new TokenBucket(redis);

app.use('/api/', tokenBucketMiddleware(bucket, {
  capacity: 100,    // Max 100 tokens
  refillRate: 10,   // Refill 10 tokens/second
}));
```

## Per-User Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Rate limit by user ID instead of IP
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  
  // Use authenticated user ID
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  
  // Skip rate limiting for certain users
  skip: (req) => {
    return req.user?.role === 'admin';
  },
  
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});

// Apply after authentication middleware
app.use('/api/', authenticate, userLimiter);
```

## Tiered Rate Limits

Different limits for different user tiers:

```javascript
function tieredRateLimit() {
  const tiers = {
    free: { windowMs: 60000, max: 10 },
    basic: { windowMs: 60000, max: 100 },
    pro: { windowMs: 60000, max: 1000 },
    enterprise: { windowMs: 60000, max: 10000 },
  };
  
  return async (req, res, next) => {
    const tier = req.user?.tier || 'free';
    const { windowMs, max } = tiers[tier];
    
    const key = `ratelimit:${tier}:${req.user?.id || req.ip}`;
    const result = await fixedWindowLimit(key, max, windowMs / 1000);
    
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': result.resetAt,
    });
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        upgradeUrl: '/pricing',
      });
    }
    
    next();
  };
}

app.use('/api/', authenticate, tieredRateLimit());
```

## Cost-Based Rate Limiting

Different endpoints cost different amounts:

```javascript
const endpointCosts = {
  'GET /api/users': 1,
  'POST /api/users': 5,
  'GET /api/reports': 10,
  'POST /api/ai/generate': 50,
};

function costBasedRateLimit(dailyBudget = 1000) {
  return async (req, res, next) => {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const cost = endpointCosts[endpoint] || 1;
    
    const key = `budget:${req.user?.id || req.ip}`;
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${key}:${today}`;
    
    const current = await redis.incrby(dailyKey, cost);
    
    if (current === cost) {
      // First request today, set expiration
      await redis.expire(dailyKey, 86400);
    }
    
    const remaining = dailyBudget - current;
    
    res.set({
      'X-RateLimit-Limit': dailyBudget,
      'X-RateLimit-Remaining': Math.max(0, remaining),
      'X-RateLimit-Cost': cost,
    });
    
    if (current > dailyBudget) {
      return res.status(429).json({
        error: 'Daily API budget exceeded',
        used: current,
        limit: dailyBudget,
      });
    }
    
    next();
  };
}
```

## Handling Rate Limit Responses

### Client-Side Handling

```javascript
async function fetchWithRateLimit(url, options = {}) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const resetTime = response.headers.get('X-RateLimit-Reset');
    
    const waitTime = retryAfter 
      ? parseInt(retryAfter) * 1000
      : resetTime 
        ? parseInt(resetTime) - Date.now()
        : 60000;
    
    console.log(`Rate limited. Retrying in ${waitTime}ms`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return fetchWithRateLimit(url, options);
  }
  
  return response;
}
```

### Exponential Backoff

```javascript
async function fetchWithBackoff(url, options = {}, maxRetries = 5) {
  let retries = 0;
  
  while (retries < maxRetries) {
    const response = await fetch(url, options);
    
    if (response.status !== 429) {
      return response;
    }
    
    retries++;
    const delay = Math.min(1000 * Math.pow(2, retries), 30000);
    const jitter = Math.random() * 1000;
    
    console.log(`Rate limited. Retry ${retries} in ${delay + jitter}ms`);
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
  }
  
  throw new Error('Max retries exceeded');
}
```

## Bypass Mechanisms

### Allowlist IPs or Users

```javascript
const allowedIPs = ['10.0.0.1', '192.168.1.1'];
const allowedUsers = ['admin@example.com'];

const limiter = rateLimit({
  windowMs: 60000,
  max: 100,
  
  skip: (req) => {
    // Skip for allowed IPs
    if (allowedIPs.includes(req.ip)) {
      return true;
    }
    
    // Skip for allowed users
    if (allowedUsers.includes(req.user?.email)) {
      return true;
    }
    
    // Skip for internal requests
    if (req.headers['x-internal-request'] === process.env.INTERNAL_SECRET) {
      return true;
    }
    
    return false;
  },
});
```

## Monitoring and Logging

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60000,
  max: 100,
  
  handler: (req, res, next, options) => {
    // Log rate limit hit
    console.log({
      event: 'rate_limit_exceeded',
      ip: req.ip,
      user: req.user?.id,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    
    // Send response
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(options.windowMs / 1000),
    });
  },
  
  onLimitReached: (req, res, options) => {
    // First time reaching limit
    console.log(`Rate limit reached for ${req.ip}`);
  },
});
```

## Summary

| Algorithm | Best For |
|-----------|----------|
| Fixed Window | Simple, low overhead |
| Sliding Window | More accurate timing |
| Token Bucket | Allow bursts |
| Leaky Bucket | Smooth rate |

| Library | Features |
|---------|----------|
| express-rate-limit | Simple, Redis support |
| rate-limiter-flexible | Flexible algorithms |
| bottleneck | Job scheduling |

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Max requests allowed |
| X-RateLimit-Remaining | Requests remaining |
| X-RateLimit-Reset | Window reset time |
| Retry-After | Seconds to wait |

| Best Practice | Description |
|---------------|-------------|
| Use Redis | Distributed rate limiting |
| Per-user limits | Fairer than IP-based |
| Tiered limits | Different plans |
| Return headers | Help clients adapt |
