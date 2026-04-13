# How to Implement API Caching with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cache, API, Redis, Performance

Description: Learn how to implement API response caching for MongoDB-backed APIs using Redis and in-memory strategies to reduce database load.

---

## Why Cache MongoDB API Responses

MongoDB queries can be expensive for read-heavy workloads. Caching API responses reduces database round-trips, lowers latency, and allows your application to handle more concurrent users. A layered caching strategy uses Redis for shared caching across instances and application-level caching for frequently accessed data.

## Strategy Overview

The most common pattern is cache-aside (lazy loading): check the cache first, return if found, otherwise query MongoDB and populate the cache. For write operations, invalidate related cache keys so stale data is not served.

## Setting Up Redis with Node.js and Express

```bash
npm install express mongoose redis
```

## Redis Cache Middleware

```javascript
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

client.connect().catch(console.error);

function cacheMiddleware(ttlSeconds = 60) {
    return async (req, res, next) => {
        const key = `cache:${req.originalUrl}`;
        try {
            const cached = await client.get(key);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
        } catch (err) {
            console.error('Redis error:', err);
        }

        res.sendCached = async (data) => {
            try {
                await client.setEx(key, ttlSeconds, JSON.stringify(data));
            } catch (err) {
                console.error('Redis cache write error:', err);
            }
            res.json(data);
        };

        next();
    };
}

module.exports = { cacheMiddleware, client };
```

## Applying Cache to Routes

```javascript
const express = require('express');
const mongoose = require('mongoose');
const { cacheMiddleware, client } = require('./cache');
const Product = require('./models/Product');

const app = express();
app.use(express.json());

// GET with caching - cache for 5 minutes
app.get('/api/products', cacheMiddleware(300), async (req, res) => {
    try {
        const products = await Product.find().lean();
        await res.sendCached(products);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/products/:id', cacheMiddleware(300), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) return res.status(404).json({ error: 'Not found' });
        await res.sendCached(product);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});
```

## Cache Invalidation on Writes

When a product is updated or deleted, invalidate related cache keys:

```javascript
async function invalidateProductCache(id) {
    const keys = await client.keys('cache:/api/products*');
    if (keys.length > 0) {
        await client.del(keys);
    }
}

app.post('/api/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        await invalidateProductCache();
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        await invalidateProductCache(req.params.id);
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});
```

## Setting Cache Headers for HTTP Clients

In addition to server-side caching, set HTTP cache headers so browsers and CDNs can cache responses:

```javascript
app.get('/api/products', cacheMiddleware(300), async (req, res) => {
    const products = await Product.find().lean();
    res.set('Cache-Control', 'public, max-age=300');
    await res.sendCached(products);
});
```

## Monitoring Cache Hit Rate

Track cache effectiveness by instrumenting hits and misses:

```javascript
let cacheHits = 0;
let cacheMisses = 0;

// In cacheMiddleware, increment cacheHits when cache returns data
// and cacheMisses when cache is empty

app.get('/api/cache-stats', (req, res) => {
    const total = cacheHits + cacheMisses;
    res.json({
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: total > 0 ? (cacheHits / total * 100).toFixed(2) + '%' : '0%'
    });
});
```

## Summary

API caching with Redis significantly reduces MongoDB load for read-heavy workloads. The cache-aside pattern is easy to implement and flexible enough to support various TTL policies per endpoint. Pairing server-side caching with HTTP cache headers and proper invalidation on writes ensures clients always receive fresh data while benefiting from fast cached responses.
