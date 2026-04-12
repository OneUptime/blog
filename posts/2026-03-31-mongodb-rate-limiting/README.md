# How to Implement Rate Limiting with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rate Limiting, API, Security, Express

Description: Learn how to implement API rate limiting using MongoDB as the backing store with sliding window and fixed window algorithms using atomic operations.

---

Rate limiting protects your API from abuse and overload. MongoDB's atomic `findOneAndUpdate` with `$inc` makes it a capable backing store for rate limiters, especially when you need per-user limits with dynamic configuration stored in the database.

## Fixed Window Rate Limiter

The fixed window approach counts requests per user within a fixed time bucket (e.g., per minute):

```javascript
const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true },     // e.g. "user:123:2026-03-31T10:05"
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ key: 1 }, { unique: true });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit = mongoose.model('RateLimit', rateLimitSchema);
```

```javascript
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

async function checkRateLimit(userId) {
  const windowStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  const key = `user:${userId}:${windowStart}`;

  const record = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        key,
        expiresAt: new Date(windowStart + WINDOW_MS * 2),
      },
    },
    { upsert: true, new: true }
  );

  return {
    allowed: record.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - record.count),
    resetAt: new Date(windowStart + WINDOW_MS),
  };
}
```

## Express Middleware

```javascript
async function rateLimitMiddleware(req, res, next) {
  const userId = req.user?.id || req.ip;

  const { allowed, remaining, resetAt } = await checkRateLimit(userId);

  res.set({
    'X-RateLimit-Limit': MAX_REQUESTS,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000),
  });

  if (!allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    });
  }

  next();
}

app.use('/api', rateLimitMiddleware);
```

## Sliding Window Rate Limiter

More accurate than fixed windows - counts requests in the trailing N seconds:

```javascript
const requestLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
});

requestLogSchema.index({ userId: 1, timestamp: -1 });
requestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 300 }); // 5 min TTL

const RequestLog = mongoose.model('RequestLog', requestLogSchema);

async function slidingWindowRateLimit(userId, windowMs = 60000, maxRequests = 100) {
  const windowStart = new Date(Date.now() - windowMs);

  await RequestLog.create({ userId });
  const count = await RequestLog.countDocuments({ userId, timestamp: { $gte: windowStart } });

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
  };
}
```

## Per-Endpoint Rate Limits

Apply different limits to different routes:

```javascript
function createRateLimiter(maxRequests, windowMs) {
  return async (req, res, next) => {
    const key = `${req.user?.id || req.ip}:${req.path}`;
    const result = await checkRateLimitByKey(key, maxRequests, windowMs);

    if (!result.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    next();
  };
}

// Strict limit on auth endpoints
app.post('/api/auth/login', createRateLimiter(10, 60000), authController.login);
// Generous limit on read endpoints
app.get('/api/posts', createRateLimiter(1000, 60000), postController.list);
```

## Querying Rate Limit Statistics

```javascript
// Find top users by request count in the current window
db.ratelimits.find({ expiresAt: { $gt: new Date() } })
  .sort({ count: -1 })
  .limit(10)
```

## Summary

MongoDB's atomic `findOneAndUpdate` with `$inc` and `$setOnInsert` makes it easy to implement rate limiting without race conditions. Use fixed window for simplicity, sliding window for accuracy. Add TTL indexes to auto-expire records, include rate limit headers in responses so clients can self-throttle, and create separate middleware functions for different endpoint groups with appropriate limits.
