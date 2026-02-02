# How to Implement Caching with Redis in Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Redis, Caching, Performance

Description: Learn how to implement Redis caching in Express.js applications for improved performance, including cache strategies, TTL, and cache invalidation.

---

Your Express API is getting hit hard. Database queries are running on every request, response times are creeping up, and your users are noticing. Adding Redis as a caching layer can dramatically reduce database load and speed up response times - often by an order of magnitude for read-heavy endpoints.

This guide covers practical Redis caching patterns in Express, from basic key-value caching to middleware-based solutions with proper cache invalidation.

## Why Redis for Caching?

Redis stores data in memory, making reads incredibly fast - typically sub-millisecond. It supports expiration times out of the box, handles concurrent access well, and persists data to disk if you need durability. For caching API responses or database query results, Redis is the go-to choice in the Node.js ecosystem.

## Setting Up Redis with Express

Install the required packages:

```bash
npm install express redis
```

Create a Redis client module:

```javascript
// redis.js
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Connect when the module loads
redisClient.connect();

module.exports = redisClient;
```

## Basic Cache-Aside Pattern

The cache-aside pattern is the most common caching strategy. Your application checks the cache first, returns cached data if available, or fetches from the database and stores the result in the cache.

```javascript
// routes/products.js
const express = require('express');
const redis = require('../redis');
const Product = require('../models/Product');
const router = express.Router();

router.get('/:id', async (req, res) => {
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;

  try {
    // Step 1: Check the cache first
    const cached = await redis.get(cacheKey);

    if (cached) {
      // Cache hit - parse JSON and return
      console.log('Cache hit for:', cacheKey);
      return res.json(JSON.parse(cached));
    }

    // Step 2: Cache miss - fetch from database
    console.log('Cache miss for:', cacheKey);
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Step 3: Store in cache with 1 hour TTL (3600 seconds)
    await redis.setEx(cacheKey, 3600, JSON.stringify(product));

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

## Caching Middleware

For cleaner code, wrap the caching logic in middleware. This keeps your route handlers focused on business logic.

```javascript
// middleware/cache.js
const redis = require('../redis');

// Cache middleware factory - returns middleware with custom TTL
const cacheMiddleware = (ttlSeconds = 3600) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Build cache key from the full URL (including query params)
    const cacheKey = `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        // Return cached response
        return res.json(JSON.parse(cached));
      }

      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Cache the response before sending
        redis.setEx(cacheKey, ttlSeconds, JSON.stringify(body))
          .catch(err => console.error('Cache write error:', err));

        return originalJson(body);
      };

      next();
    } catch (error) {
      // If Redis fails, continue without caching
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = { cacheMiddleware };
```

Use the middleware on specific routes:

```javascript
// routes/api.js
const express = require('express');
const { cacheMiddleware } = require('../middleware/cache');
const router = express.Router();

// Cache product list for 5 minutes
router.get('/products', cacheMiddleware(300), async (req, res) => {
  const products = await Product.find({ active: true });
  res.json(products);
});

// Cache individual products for 1 hour
router.get('/products/:id', cacheMiddleware(3600), async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.json(product);
});

// No caching on user-specific data
router.get('/me', async (req, res) => {
  res.json(req.user);
});
```

## Cache Invalidation

Caching is easy. Invalidation is hard. When data changes, you need to remove or update stale cache entries. Here are common approaches:

### Invalidate on Write

Delete cache entries when the underlying data changes:

```javascript
// routes/products.js
router.put('/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.findByIdAndUpdate(
      productId,
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Invalidate the cache for this product
    await redis.del(`product:${productId}`);

    // Also invalidate the product list cache
    await redis.del('cache:/api/products');

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const productId = req.params.id;

  await Product.findByIdAndDelete(productId);

  // Clean up all related cache entries
  await redis.del(`product:${productId}`);
  await redis.del('cache:/api/products');

  res.json({ message: 'Product deleted' });
});
```

### Pattern-Based Invalidation

When you need to invalidate multiple related keys, use pattern matching:

```javascript
// utils/cache.js
const redis = require('../redis');

// Delete all keys matching a pattern
async function invalidatePattern(pattern) {
  let cursor = 0;
  do {
    // SCAN is safer than KEYS for production use
    const result = await redis.scan(cursor, {
      MATCH: pattern,
      COUNT: 100
    });

    cursor = result.cursor;
    const keys = result.keys;

    if (keys.length > 0) {
      await redis.del(keys);
    }
  } while (cursor !== 0);
}

// Usage: invalidate all product-related caches
await invalidatePattern('product:*');
await invalidatePattern('cache:/api/products*');
```

## TTL Strategies

Different data needs different cache durations. Here is a quick reference:

| Data Type | Recommended TTL | Reasoning |
|-----------|-----------------|-----------|
| Static config | 1-24 hours | Rarely changes, safe to cache long |
| Product catalog | 5-15 minutes | Balance between freshness and performance |
| User sessions | Match session timeout | Security requirement |
| Search results | 1-5 minutes | Users expect fresh results |
| API rate limits | Exact window size | Must be accurate for rate limiting |
| Real-time data | No cache or seconds | Freshness is critical |

Set TTL based on how stale the data can be without impacting users:

```javascript
const TTL = {
  SHORT: 60,         // 1 minute
  MEDIUM: 300,       // 5 minutes
  LONG: 3600,        // 1 hour
  DAY: 86400         // 24 hours
};

// Apply different TTLs based on the endpoint
router.get('/config', cacheMiddleware(TTL.DAY), getConfig);
router.get('/products', cacheMiddleware(TTL.MEDIUM), getProducts);
router.get('/trending', cacheMiddleware(TTL.SHORT), getTrending);
```

## Handling JSON Serialization

Redis stores strings. Complex objects need serialization. Watch out for these common pitfalls:

```javascript
// Dates become strings after JSON.parse
const user = { name: 'John', createdAt: new Date() };
await redis.setEx('user:1', 3600, JSON.stringify(user));

const cached = JSON.parse(await redis.get('user:1'));
// cached.createdAt is now a string, not a Date object

// Solution: revive dates manually or use a library
function parseWithDates(json) {
  return JSON.parse(json, (key, value) => {
    // ISO date pattern
    if (typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    return value;
  });
}
```

## Cache Strategies Comparison

| Strategy | Description | Best For |
|----------|-------------|----------|
| Cache-Aside | App manages cache reads/writes | General purpose, flexible |
| Write-Through | Write to cache and DB together | Data consistency priority |
| Write-Behind | Write to cache, async DB write | High write throughput |
| Read-Through | Cache fetches from DB on miss | Simpler application code |
| Refresh-Ahead | Proactively refresh before expiry | Predictable access patterns |

For most Express applications, cache-aside gives you the control and simplicity you need.

## Graceful Degradation

Redis should never take down your application. Always handle failures gracefully:

```javascript
// middleware/cache.js with fallback
const cacheMiddleware = (ttlSeconds = 3600) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const cacheKey = `cache:${req.originalUrl}`;

    try {
      // Check if Redis is connected
      if (!redis.isOpen) {
        console.warn('Redis not connected, skipping cache');
        return next();
      }

      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Fire and forget - don't await
        redis.setEx(cacheKey, ttlSeconds, JSON.stringify(body))
          .catch(() => {}); // Silently ignore cache write failures

        return originalJson(body);
      };

      next();
    } catch (error) {
      // Redis error - continue without caching
      next();
    }
  };
};
```

## Summary

Redis caching in Express boils down to a few key practices:

1. Use the cache-aside pattern for most scenarios
2. Build reusable middleware to keep routes clean
3. Invalidate aggressively when data changes
4. Set TTLs based on how stale data can be
5. Always handle Redis failures gracefully

Start with caching your slowest, most frequently accessed endpoints. Measure the impact, then expand. A well-placed cache can turn a 500ms database query into a 1ms Redis lookup - and your users will notice the difference.
