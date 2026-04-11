# How to Build Express.js Rate Limiting Middleware with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Express, Rate Limiting, Node.js, Middleware

Description: Build Express.js rate limiting middleware backed by Redis to enforce per-IP or per-user request quotas across multiple Node.js instances.

---

In-memory rate limiters break when you run multiple Node.js processes because each process has its own counter. A Redis-backed rate limiter shares state across all instances, making it the correct choice for production deployments.

## Install Dependencies

```bash
npm install express redis express-rate-limit rate-limit-redis
```

## Simple Setup with rate-limit-redis

```javascript
const express = require("express");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");

const app = express();
const redisClient = createClient({ url: "redis://localhost:6379" });
await redisClient.connect();

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,               // 60 requests per window
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

app.use("/api", limiter);
```

## Custom Middleware with Sliding Window

For more control, implement a sliding window using a sorted set:

```javascript
async function slidingWindowLimit(req, res, next) {
  const key = `rl:${req.ip}`;
  const now = Date.now();
  const windowMs = 60000;
  const limit = 60;

  // Remove expired entries
  await redisClient.zRemRangeByScore(key, 0, now - windowMs);

  const count = await redisClient.zCard(key);
  if (count >= limit) {
    return res.status(429).json({
      error: "Too many requests",
      retryAfter: Math.ceil(windowMs / 1000),
    });
  }

  // Add this request
  await redisClient.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
  await redisClient.expire(key, Math.ceil(windowMs / 1000));

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", limit - count - 1);
  next();
}

app.use("/api", slidingWindowLimit);
```

## Per-User Rate Limiting

Use an authenticated user ID instead of IP for authenticated routes:

```javascript
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

app.use("/api/protected", authenticate, userLimiter);
```

## Test Rate Limiting

```bash
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" http://localhost:3000/api/data
done
```

Requests beyond the limit return `429`.

## Check Redis Keys

```bash
redis-cli keys "rl:*"
redis-cli ttl "rl:127.0.0.1"
```

## Summary

Redis-backed rate limiting in Express.js enforces consistent quotas across all Node.js processes. The `rate-limit-redis` package integrates with `express-rate-limit` in under ten lines, while a custom sliding window sorted set implementation provides burst-safe limiting. Per-user key generators apply tighter limits to authenticated users without penalising shared IP addresses from NAT networks.
