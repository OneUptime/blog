# How to Build Express.js Caching Middleware with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Express.js, Middleware, Caching, Node.js

Description: Build reusable Express.js caching middleware backed by Redis to cache API responses and reduce backend load with configurable TTL and cache keys.

---

## Introduction

Writing caching logic inside every route handler leads to code duplication and maintenance headaches. Express middleware lets you centralize caching so routes stay clean. This guide builds a flexible Redis caching middleware for Express.js that is configurable per route.

## Installation

```bash
npm install express ioredis
```

## Redis Client Setup

```javascript
// redis.js
const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("error", (err) => console.error("Redis error:", err));

module.exports = redis;
```

## Cache Middleware Factory

```javascript
// cacheMiddleware.js
const redis = require("./redis");

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyFn - Optional custom key generator
 */
function cacheMiddleware(ttl = 300, keyFn = null) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const cacheKey = keyFn
      ? keyFn(req)
      : `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Key", cacheKey);
        return res.json(data);
      }

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        if (res.statusCode === 200) {
          await redis.setex(cacheKey, ttl, JSON.stringify(body));
        }
        res.setHeader("X-Cache", "MISS");
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      next(); // Fail open - continue without cache
    }
  };
}

module.exports = cacheMiddleware;
```

## Applying Cache Middleware to Routes

```javascript
// app.js
const express = require("express");
const cacheMiddleware = require("./cacheMiddleware");
const redis = require("./redis");

const app = express();

// Cache all /api/products requests for 5 minutes
app.get(
  "/api/products",
  cacheMiddleware(300),
  async (req, res) => {
    // Simulate DB query
    const products = await getProductsFromDB();
    res.json(products);
  }
);

// Cache with user-specific key
app.get(
  "/api/user/profile",
  cacheMiddleware(60, (req) => `user:${req.headers["x-user-id"]}:profile`),
  async (req, res) => {
    const profile = await getUserProfile(req.headers["x-user-id"]);
    res.json(profile);
  }
);

// Cache with query params in key
app.get(
  "/api/search",
  cacheMiddleware(120, (req) => `search:${JSON.stringify(req.query)}`),
  async (req, res) => {
    const results = await search(req.query.q);
    res.json(results);
  }
);
```

## Cache Invalidation Helper

```javascript
// cacheInvalidation.js
const redis = require("./redis");

async function invalidatePattern(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
  }
}

async function invalidateKey(key) {
  await redis.del(key);
}

module.exports = { invalidatePattern, invalidateKey };
```

```javascript
// Use in a POST/PUT/DELETE route
const { invalidatePattern } = require("./cacheInvalidation");

app.post("/api/products", async (req, res) => {
  const product = await createProduct(req.body);
  // Invalidate all product cache entries
  await invalidatePattern("cache:/api/products*");
  res.status(201).json(product);
});
```

## Global Cache Middleware

Apply caching globally with path-based exclusions:

```javascript
function globalCache(ttl = 300, excludePaths = []) {
  return async (req, res, next) => {
    const isExcluded = excludePaths.some((p) => req.path.startsWith(p));
    if (isExcluded || req.method !== "GET") return next();
    return cacheMiddleware(ttl)(req, res, next);
  };
}

// Apply to all routes except /auth and /admin
app.use(globalCache(300, ["/auth", "/admin"]));
```

## Testing the Middleware

```bash
# First request - cache MISS
curl -i http://localhost:3000/api/products
# X-Cache: MISS

# Second request - cache HIT
curl -i http://localhost:3000/api/products
# X-Cache: HIT
```

## Summary

A Redis caching middleware for Express.js intercepts `res.json` to capture the response body and store it in Redis with a configurable TTL. Subsequent identical requests receive the cached response without hitting the database or route handler. Custom key generator functions allow per-user or per-query caching, and invalidation helpers let you clear stale cache entries when data changes.
