# How to Implement API Rate Limiting with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rate Limiting, API Security, Performance, Backend Development

Description: Learn how to implement sliding window and fixed window API rate limiting using MongoDB with TTL indexes and atomic findOneAndUpdate operations.

---

## Overview

MongoDB makes an effective rate limiting store because of:
- TTL indexes that automatically expire rate limit counters
- Atomic `findOneAndUpdate` with `upsert` to increment counters safely
- Flexible document structure for different rate limit strategies

## Fixed Window Rate Limiting

The fixed window approach counts requests within discrete time windows:

```javascript
// Node.js rate limiter using fixed windows
async function fixedWindowRateLimit(db, clientId, limit, windowSeconds) {
  const now = new Date();
  const windowStart = new Date(Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000);
  const windowKey = `${clientId}:${windowStart.toISOString()}`;

  const result = await db.collection('rate_limits').findOneAndUpdate(
    { key: windowKey },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        clientId,
        windowStart,
        expiresAt: new Date(windowStart.getTime() + windowSeconds * 1000 * 2),
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  const count = result.count;
  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(windowStart.getTime() + windowSeconds * 1000),
    limit,
  };
}
```

## TTL Index for Automatic Cleanup

```javascript
// Create TTL index to auto-delete expired rate limit documents
await db.collection('rate_limits').createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Create index for fast lookups
await db.collection('rate_limits').createIndex({ key: 1 }, { unique: true });
```

## Sliding Window Rate Limiting

The sliding window approach provides smoother limiting than fixed windows:

```javascript
async function slidingWindowRateLimit(db, clientId, limit, windowSeconds) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  // Remove old events outside the window and count recent ones atomically
  const result = await db.collection('request_events').findOneAndUpdate(
    { clientId },
    {
      $push: {
        timestamps: {
          $each: [now],
          $sort: 1,
        },
      },
      $set: {
        expiresAt: new Date(now.getTime() + windowSeconds * 1000),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Count timestamps within the current window
  const timestamps = (result?.timestamps || []).filter(
    ts => ts >= windowStart
  );

  // Trim old timestamps
  if (result?.timestamps?.length > timestamps.length) {
    await db.collection('request_events').updateOne(
      { clientId },
      { $set: { timestamps } }
    );
  }

  const count = timestamps.length;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    windowSeconds,
  };
}
```

## Express.js Middleware

```javascript
// middleware/rateLimiter.js
function createRateLimiter(db, options = {}) {
  const {
    limit = 100,
    windowSeconds = 60,
    keyGenerator = (req) => req.ip,
    onLimit = (req, res) => res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: windowSeconds,
    }),
  } = options;

  return async function rateLimiterMiddleware(req, res, next) {
    const clientId = keyGenerator(req);
    const result = await fixedWindowRateLimit(db, clientId, limit, windowSeconds);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000),
    });

    if (!result.allowed) {
      return onLimit(req, res);
    }

    next();
  };
}

module.exports = { createRateLimiter };
```

## Applying the Middleware

```javascript
const express = require('express');
const { MongoClient } = require('mongodb');
const { createRateLimiter } = require('./middleware/rateLimiter');

async function main() {
  const app = express();
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('myapp');

  // Global rate limit: 100 requests per minute per IP
  app.use(createRateLimiter(db, { limit: 100, windowSeconds: 60 }));

  // Stricter limit for auth endpoints
  app.use('/api/auth', createRateLimiter(db, {
    limit: 10,
    windowSeconds: 300,  // 10 attempts per 5 minutes
    keyGenerator: (req) => `auth:${req.ip}`,
  }));

  // Per-user rate limit for API endpoints
  app.use('/api/', createRateLimiter(db, {
    limit: 1000,
    windowSeconds: 3600,
    keyGenerator: (req) => `user:${req.user?.id || req.ip}`,
  }));

  app.listen(3000);
}

main();
```

## Monitoring Rate Limit Usage

```javascript
async function getRateLimitStats(db, clientId, windowSeconds) {
  const cutoff = new Date(Date.now() - windowSeconds * 1000);

  const stats = await db.collection('rate_limits').aggregate([
    {
      $match: {
        key: { $regex: `^${clientId}:` },
        windowStart: { $gte: cutoff },
      },
    },
    {
      $group: {
        _id: '$clientId',
        totalRequests: { $sum: '$count' },
        windows: { $sum: 1 },
      },
    },
  ]).toArray();

  return stats[0] || { totalRequests: 0, windows: 0 };
}
```

## Summary

MongoDB implements API rate limiting using atomic `findOneAndUpdate` with `$inc` for counter increments and TTL indexes for automatic expiry of old rate limit documents. The fixed window approach is simpler and lower in overhead, while the sliding window approach provides more consistent limiting at the cost of storing individual request timestamps. Always set rate limit response headers to help API clients implement proper retry logic.
