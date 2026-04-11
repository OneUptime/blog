# How to Cache Express.js API Responses with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Express.js, Caching, Node.js, Performance

Description: Cache Express.js API responses in Redis to dramatically reduce response times and database load with practical examples using ioredis.

---

## Introduction

Caching API responses eliminates redundant database queries for data that does not change frequently. Redis is an excellent cache store for Express.js because it is fast, supports TTL-based expiration, and is accessible across all application instances. This guide shows multiple practical caching patterns for Express.js APIs.

## Installation

```bash
npm install express ioredis
```

## Redis Client

```javascript
// redis.js
const Redis = require("ioredis");

const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

client.on("connect", () => console.log("Redis connected"));
client.on("error", (err) => console.error("Redis error:", err.message));

module.exports = client;
```

## Basic Route-Level Caching

```javascript
const express = require("express");
const redis = require("./redis");
const app = express();

app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product:${id}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json({
      source: "cache",
      data: JSON.parse(cached),
    });
  }

  // Fetch from database
  const product = await db.products.findById(id);
  if (!product) return res.status(404).json({ error: "Not found" });

  // Store in cache for 10 minutes
  await redis.setex(cacheKey, 600, JSON.stringify(product));

  res.json({ source: "database", data: product });
});
```

## Caching List Endpoints with Pagination

```javascript
app.get("/api/products", async (req, res) => {
  const { page = 1, limit = 20, category } = req.query;
  const cacheKey = `products:page:${page}:limit:${limit}:cat:${category || "all"}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(JSON.parse(cached));
  }

  const products = await db.products.findAll({ page, limit, category });
  const response = {
    data: products,
    page: parseInt(page),
    limit: parseInt(limit),
  };

  await redis.setex(cacheKey, 300, JSON.stringify(response));
  res.setHeader("X-Cache", "MISS");
  res.json(response);
});
```

## Cache-Aside with Helper Function

Encapsulate the cache-aside pattern in a reusable helper:

```javascript
async function withCache(key, ttl, fetchFn) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetchFn();
  if (data !== null && data !== undefined) {
    await redis.setex(key, ttl, JSON.stringify(data));
  }
  return data;
}

app.get("/api/categories", async (req, res) => {
  const categories = await withCache(
    "categories:all",
    3600, // 1 hour
    () => db.categories.findAll()
  );
  res.json(categories);
});
```

## Cache Invalidation on Write Operations

```javascript
app.put("/api/products/:id", express.json(), async (req, res) => {
  const { id } = req.params;

  // Update in database
  const updated = await db.products.update(id, req.body);

  // Invalidate specific product cache
  await redis.del(`product:${id}`);

  // Invalidate list caches
  const listKeys = await redis.keys("products:page:*");
  if (listKeys.length > 0) {
    await redis.del(...listKeys);
  }

  res.json(updated);
});

app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  await db.products.delete(id);
  await redis.del(`product:${id}`);
  const listKeys = await redis.keys("products:page:*");
  if (listKeys.length > 0) {
    await redis.del(...listKeys);
  }
  res.status(204).send();
});
```

## Conditional Caching Based on Response

```javascript
app.get("/api/stats/live", async (req, res) => {
  const stats = await fetchLiveStats();

  // Cache only if data is complete and non-empty
  if (stats && stats.total > 0) {
    await redis.setex("stats:live", 30, JSON.stringify(stats));
  }

  res.json(stats);
});
```

## Monitoring Cache Performance

```javascript
let cacheHits = 0;
let cacheMisses = 0;

function trackCache(hit) {
  if (hit) cacheHits++;
  else cacheMisses++;
}

app.get("/api/cache/stats", async (req, res) => {
  const info = await redis.info("stats");
  res.json({
    appHits: cacheHits,
    appMisses: cacheMisses,
    hitRate: cacheHits / (cacheHits + cacheMisses || 1),
    redisInfo: info,
  });
});
```

## Summary

Caching Express.js API responses with Redis follows the cache-aside pattern: check the cache first, fall back to the database on a miss, and store the result for subsequent requests. Using a helper function like `withCache` keeps route handlers clean and consistent. Always implement cache invalidation on write operations to prevent stale data, and monitor hit rates to tune TTL values for optimal performance.
