# How to Implement GraphQL Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GraphQL, Rate Limiting, Apollo Server, Security

Description: Implement per-user, per-operation, and query-complexity-based rate limiting for GraphQL APIs using Redis atomic counters and sliding windows.

---

## Why GraphQL Needs Rate Limiting

GraphQL APIs are particularly vulnerable to abuse because a single request can trigger hundreds of resolver calls. Rate limiting with Redis helps protect against:

- Introspection abuse
- Deeply nested query attacks
- Automated scraping
- Denial of service from expensive queries

## Simple Per-User Request Rate Limiting

Use Redis `INCR` and `EXPIRE` to implement a fixed window rate limiter:

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST });

async function checkRateLimit(userId, limit = 100, windowSeconds = 60) {
  const key = `ratelimit:${userId}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds);
  const [[, count]] = await pipeline.exec();

  if (count > limit) {
    throw new Error(`Rate limit exceeded. Try again in ${windowSeconds} seconds.`);
  }

  return { count, limit, remaining: limit - count };
}
```

## Apollo Server Plugin for Rate Limiting

```javascript
const rateLimitPlugin = {
  async requestDidStart({ contextValue }) {
    return {
      async didResolveOperation({ request, document, contextValue }) {
        const userId = contextValue.user?.id ?? contextValue.ip;
        const { remaining } = await checkRateLimit(userId, 100, 60);

        // Store remaining in context for use in response headers
        contextValue.rateLimitRemaining = remaining;
      },

      async willSendResponse({ contextValue, response }) {
        if (contextValue.rateLimitRemaining !== undefined) {
          response.http.headers.set(
            'X-RateLimit-Remaining',
            contextValue.rateLimitRemaining.toString()
          );
        }
      },
    };
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [rateLimitPlugin],
});
```

## Sliding Window Rate Limiter

A sliding window is more accurate than a fixed window because it prevents burst requests at window boundaries:

```javascript
async function slidingWindowRateLimit(userId, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const key = `sliding:${userId}`;

  const pipeline = redis.pipeline();
  // Remove old entries outside the window
  pipeline.zremrangebyscore(key, 0, now - windowMs);
  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  // Count requests in window
  pipeline.zcard(key);
  // Set expiry
  pipeline.expire(key, Math.ceil(windowMs / 1000));

  const results = await pipeline.exec();
  const count = results[2][1];

  if (count > limit) {
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = oldest[1] ? parseInt(oldest[1]) + windowMs : now + windowMs;

    throw Object.assign(new Error('Rate limit exceeded'), {
      extensions: {
        code: 'RATE_LIMITED',
        resetAt: new Date(resetAt).toISOString(),
        limit,
        count,
      },
    });
  }

  return { count, limit, remaining: limit - count };
}
```

## Query Complexity Rate Limiting

Limit based on query complexity rather than just request count:

```javascript
const { getComplexity, simpleEstimator, fieldExtensionsEstimator } = require('graphql-query-complexity');

const complexityPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation({ request, document, schema, contextValue }) {
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });

        const userId = contextValue.user?.id ?? contextValue.ip;
        const complexityKey = `complexity:${userId}`;
        const limit = 10000;

        const current = await redis.incrby(complexityKey, complexity);

        if (current === complexity) {
          // First request in window - set expiry
          await redis.expire(complexityKey, 60);
        }

        if (current > limit) {
          throw new Error(
            `Query complexity limit exceeded. Current: ${current}, Limit: ${limit}`
          );
        }
      },
    };
  },
};
```

## Per-Operation Rate Limiting

Different rate limits for different GraphQL operations:

```javascript
const operationLimits = {
  IntrospectionQuery: { limit: 5, window: 60 },
  SearchProducts: { limit: 30, window: 60 },
  CreateOrder: { limit: 10, window: 60 },
  default: { limit: 100, window: 60 },
};

const perOperationPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation({ request, contextValue }) {
        const operation = request.operationName ?? 'default';
        const config = operationLimits[operation] ?? operationLimits.default;
        const userId = contextValue.user?.id ?? contextValue.ip;

        await checkRateLimit(
          `${userId}:${operation}`,
          config.limit,
          config.window
        );
      },
    };
  },
};
```

## Redis Lua Script for Atomic Rate Limiting

```javascript
const rateLimitScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local count = redis.call('INCR', key)
if count == 1 then
  redis.call('EXPIRE', key, window)
end

if count > limit then
  local ttl = redis.call('TTL', key)
  return {0, count, ttl}
end

return {1, count, window}
`;

async function atomicRateLimit(userId, limit, windowSeconds) {
  const key = `ratelimit:${userId}`;
  const [allowed, count, ttl] = await redis.eval(
    rateLimitScript,
    1,
    key,
    limit,
    windowSeconds,
    Math.floor(Date.now() / 1000)
  );

  return { allowed: allowed === 1, count, ttl };
}
```

## Summary

GraphQL rate limiting with Redis requires a multi-layer approach: per-user request limits using sliding windows, query complexity budgets to prevent expensive nested queries, and per-operation limits for sensitive operations like mutations and introspection. Use Lua scripts for atomic operations that prevent race conditions in high-concurrency scenarios.
