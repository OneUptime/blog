# How to Use Redis with Azure Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Serverless

Description: Learn how to connect Azure Functions to Redis for caching, rate limiting, and session storage while handling connection reuse correctly in a serverless context.

---

Azure Functions are short-lived compute units. Connecting to Redis on every invocation is wasteful and slow. The correct pattern is to create a Redis client once at module load time so it is reused across warm invocations.

## Create an Azure Cache for Redis Instance

```bash
az redis create \
  --name my-redis-cache \
  --resource-group my-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

Retrieve the connection string:

```bash
az redis list-keys --name my-redis-cache --resource-group my-rg
```

## Install the Redis Client

For Node.js Azure Functions:

```bash
npm install redis
```

## Reuse the Connection Across Invocations

Create a shared client module at `shared/redisClient.js`:

```javascript
const { createClient } = require('redis');

let client;

async function getRedisClient() {
  if (!client || !client.isOpen) {
    client = createClient({
      url: process.env.REDIS_CONNECTION_STRING
    });
    client.on('error', (err) => console.error('Redis error', err));
    await client.connect();
  }
  return client;
}

module.exports = { getRedisClient };
```

## Azure Function - Caching Example

```javascript
const { app } = require('@azure/functions');
const { getRedisClient } = require('../shared/redisClient');

app.http('getProduct', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'products/{id}',
  handler: async (request, context) => {
    const id = request.params.id;
    const redis = await getRedisClient();
    const cacheKey = `product:${id}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return { jsonBody: JSON.parse(cached), headers: { 'X-Cache': 'HIT' } };
    }

    // Fetch from database
    const product = await fetchProductFromDb(id);
    await redis.setEx(cacheKey, 300, JSON.stringify(product));

    return {
      jsonBody: product,
      headers: { 'X-Cache': 'MISS' }
    };
  }
});
```

## Set Environment Variables

In `local.settings.json` for local development:

```text
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "REDIS_CONNECTION_STRING": "rediss://:your-key@my-redis-cache.redis.cache.windows.net:6380"
  }
}
```

For production, set the app setting via CLI:

```bash
az functionapp config appsettings set \
  --name my-func-app \
  --resource-group my-rg \
  --settings "REDIS_CONNECTION_STRING=rediss://:key@host:6380"
```

## Rate Limiting in Azure Functions

```javascript
async function checkRateLimit(userId, redis) {
  const key = `ratelimit:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count <= 100;
}
```

## Summary

Using Redis with Azure Functions requires careful connection management. By initializing the client outside the handler and reusing it across warm instances, you avoid expensive reconnections on every invocation. Azure Cache for Redis supports TLS connections with the `rediss://` protocol, and environment variables keep connection strings out of source code.
