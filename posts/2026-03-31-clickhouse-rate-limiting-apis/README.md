# How to Implement Rate Limiting for ClickHouse APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rate Limiting, API Design, Quota Management, Redis

Description: Protect ClickHouse from query overload by implementing rate limiting at the API layer using Redis and ClickHouse user quotas for multi-tenant API deployments.

---

## Why ClickHouse Needs Rate Limiting

ClickHouse is powerful but not infinitely scalable under concurrent heavy queries. Without rate limiting, a single misbehaving API client can saturate CPU and memory, degrading performance for all users. Rate limiting protects the database by controlling query frequency and resource consumption per client.

## Layer 1: API-Level Rate Limiting with Redis

Use a fixed window counter in Redis at the Express middleware level:

```javascript
// middleware/rateLimiter.js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect(); // connect once at startup

async function rateLimitMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.ip;
  const windowKey = `rate:${apiKey}:${Math.floor(Date.now() / 60000)}`; // per minute
  const LIMIT = 30; // 30 requests per minute

  try {
    const requests = await client.incr(windowKey);
    if (requests === 1) {
      await client.expire(windowKey, 120); // expire after 2 minutes
    }

    res.setHeader('X-RateLimit-Limit', LIMIT);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT - requests));

    if (requests > LIMIT) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retry_after_seconds: 60,
      });
    }
    next();
  } catch (err) {
    // Fail open if Redis is unavailable
    next();
  }
}

module.exports = rateLimitMiddleware;
```

## Layer 2: ClickHouse User Quotas

Even with API-level rate limiting, apply database-level quotas as a backstop:

```sql
-- Create quota for API users
CREATE QUOTA api_user_quota
    FOR INTERVAL 1 MINUTE MAX queries = 60, read_rows = 1000000000
    FOR INTERVAL 1 HOUR MAX queries = 1000, result_rows = 10000000
    TO api_user;
```

```sql
-- Check quota usage
SELECT
    quota_name,
    quota_key,
    queries,
    max_queries,
    read_rows,
    result_rows
FROM system.quota_usage;
```

## Layer 3: Query Complexity Limits

Block queries that would scan too much data:

```sql
-- Per-user settings to cap resource usage
ALTER USER api_user SETTINGS
    max_rows_to_read = 500000000,
    max_bytes_to_read = 10737418240,  -- 10GB
    max_execution_time = 30,
    max_result_rows = 100000,
    result_overflow_mode = 'break';
```

## Applying the Middleware

```javascript
// app.js
const express = require('express');
const rateLimitMiddleware = require('./middleware/rateLimiter');

const app = express();

// Apply rate limiting to all API routes
app.use('/api/', rateLimitMiddleware);

app.get('/api/events', async (req, res) => {
  // Query handler
});
```

## Per-Client Rate Limits

For tiered API plans with different limits:

```javascript
const TIER_LIMITS = {
  free: 10,
  basic: 60,
  pro: 300,
  enterprise: 1000,
};

async function tieredRateLimit(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const tier = await getTierForKey(apiKey); // lookup from DB
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // Apply limit...
}
```

## Summary

Rate limiting for ClickHouse APIs should be implemented at two layers: the API layer (Redis-based fixed window per API key) and the database layer (ClickHouse user quotas and per-user settings). The API layer handles normal rate limiting with client-friendly error messages, while the database layer acts as a safety net to prevent runaway queries from overwhelming the cluster.
