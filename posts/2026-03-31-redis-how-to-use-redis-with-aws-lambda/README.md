# How to Use Redis with AWS Lambda

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AWS Lambda, Serverless, Caching, Node.js

Description: Learn how to connect Redis to AWS Lambda functions for caching and session management while handling cold starts and connection reuse effectively.

---

## Why Use Redis with AWS Lambda

AWS Lambda functions are stateless and ephemeral, but many applications need shared state, caching, or fast data access. Redis provides a low-latency data store that Lambda functions can connect to for:

- Caching database query results
- Sharing session data across Lambda invocations
- Rate limiting API calls
- Storing temporary computation results

## Setting Up Redis for Lambda

The best approach is to use a managed Redis service like Amazon ElastiCache or Upstash. ElastiCache runs inside your VPC, while Upstash offers a REST API that avoids connection overhead.

### Option 1: ElastiCache (VPC-based)

Configure your Lambda function inside the same VPC as your ElastiCache cluster.

```bash
# Install the ioredis client
npm install ioredis
```

```javascript
const Redis = require('ioredis');

// Initialize outside the handler to reuse across warm invocations
let redis;

function getRedisClient() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }
  return redis;
}

exports.handler = async (event) => {
  const client = getRedisClient();
  const key = `user:${event.userId}`;

  const cached = await client.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const data = await fetchFromDatabase(event.userId);
  await client.setex(key, 300, JSON.stringify(data));

  return data;
};
```

### Option 2: Upstash REST API (no VPC required)

```bash
npm install @upstash/redis
```

```javascript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const handler = async (event) => {
  const cacheKey = `product:${event.pathParameters.id}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return {
      statusCode: 200,
      body: JSON.stringify(cached),
      headers: { 'X-Cache': 'HIT' },
    };
  }

  const product = await fetchProduct(event.pathParameters.id);
  await redis.setex(cacheKey, 600, JSON.stringify(product));

  return {
    statusCode: 200,
    body: JSON.stringify(product),
    headers: { 'X-Cache': 'MISS' },
  };
};
```

## Lambda Environment Variables

```bash
# Set environment variables via AWS CLI
aws lambda update-function-configuration \
  --function-name my-function \
  --environment "Variables={REDIS_HOST=my-cluster.abc123.ng.0001.use1.cache.amazonaws.com,REDIS_PORT=6379}"
```

## Handling Connection Pooling

Lambda reuses execution environments for warm invocations. Store the Redis client outside the handler to avoid reconnecting on every call.

```javascript
const Redis = require('ioredis');

// Module-level singleton - persists across warm invocations
let redisClient = null;

function getClient() {
  if (!redisClient || redisClient.status === 'end') {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: 6379,
      // Limit retries to avoid blocking Lambda during transient Redis failures
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      redisClient = null; // Force reconnect on next call
    });
  }
  return redisClient;
}
```

## VPC Configuration for ElastiCache

```bash
# Attach Lambda to VPC via AWS CLI
aws lambda update-function-configuration \
  --function-name my-function \
  --vpc-config SubnetIds=subnet-abc123,subnet-def456,SecurityGroupIds=sg-xyz789
```

Ensure the Lambda security group allows outbound TCP on port 6379 to the ElastiCache security group.

## Cold Start Considerations

Cold starts add latency when a new Lambda instance initializes. Minimize this with:

```javascript
const Redis = require('ioredis');

// Use lazyConnect to avoid blocking during cold start initialization
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  lazyConnect: true,
  connectTimeout: 5000,
  retryStrategy: (times) => Math.min(times * 50, 500),
});

// Pre-warm the connection on first command
exports.handler = async (event) => {
  // This ensures the connection is ready before processing
  await redis.ping();

  // Your logic here
};
```

## Graceful Shutdown

Lambda does not always call cleanup code, but you can handle SIGTERM:

```javascript
process.on('SIGTERM', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});
```

## Summary

Connecting Redis to AWS Lambda requires storing the client at module scope to reuse connections across warm invocations. For VPC-based setups, use ElastiCache with proper security group configuration. For simpler deployments without VPC complexity, Upstash's REST API is an excellent alternative that works with any Lambda setup.
