# How to Implement DataLoader Caching with Redis in GraphQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GraphQL, DataLoader

Description: Learn how to back GraphQL DataLoader with Redis to share batched query results across requests and reduce database load in multi-instance deployments.

---

GraphQL DataLoader batches and deduplicates database calls within a single request. But by default its cache is in-memory and per-request - it does not help across requests or server instances. Adding Redis as a backing cache for DataLoader allows shared caching across the entire fleet.

## The Default DataLoader Problem

```javascript
// Standard DataLoader - cache only lives for one request
const userLoader = new DataLoader(async (ids) => {
  return fetchUsersByIds(ids);
});
```

On the next request, a new DataLoader is created and the cache is empty again.

## Redis-Backed DataLoader Cache

DataLoader's `cacheMap` interface expects synchronous returns from `get()`, so plugging Redis in directly as a `cacheMap` will not correctly signal cache misses. Instead, check Redis inside the batch function and let DataLoader keep its default in-memory map for per-request deduplication.

First, set up the Redis client:

```javascript
const DataLoader = require('dataloader');
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const CACHE_PREFIX = 'dl:';
const CACHE_TTL = 300;
```

## Building the DataLoader with Redis Cache

```javascript
function createUserLoader() {
  return new DataLoader(
    async (ids) => {
      // Check Redis for cached values
      const cacheKeys = ids.map(id => `${CACHE_PREFIX}${String(id)}`);
      const cached = await redis.mGet(cacheKeys);

      const results = new Array(ids.length);
      const uncachedIds = [];
      const uncachedIndices = [];

      ids.forEach((id, i) => {
        if (cached[i] !== null) {
          results[i] = JSON.parse(cached[i]);
        } else {
          uncachedIds.push(id);
          uncachedIndices.push(i);
        }
      });

      // Only query DB for IDs not found in Redis
      if (uncachedIds.length > 0) {
        const users = await db.query(
          'SELECT * FROM users WHERE id = ANY($1)',
          [uncachedIds]
        );
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));

        const pipeline = redis.multi();
        uncachedIds.forEach((id, idx) => {
          const user = userMap[id] || null;
          results[uncachedIndices[idx]] = user;
          if (user) {
            pipeline.setEx(
              `${CACHE_PREFIX}${String(id)}`,
              CACHE_TTL,
              JSON.stringify(user)
            );
          }
        });
        await pipeline.exec();
      }

      return results;
    },
    {
      cacheKeyFn: (key) => String(key)
    }
  );
}
```

## GraphQL Context Setup

```javascript
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const server = new ApolloServer({ typeDefs, resolvers });

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => ({
    // Create per-request loader but backed by shared Redis cache
    userLoader: createUserLoader(),
    req
  })
}));
```

## Using the Loader in Resolvers

```javascript
const resolvers = {
  Post: {
    author: async (post, _, { userLoader }) => {
      // First call: checks Redis, falls back to DB
      // Second call for same ID: served from Redis
      return userLoader.load(post.authorId);
    }
  }
};
```

## Invalidating Cached Entries

When a user is updated, remove the cache entry:

```javascript
async function updateUser(id, data) {
  await db.query('UPDATE users SET ... WHERE id = $1', [id, ...data]);
  await redis.del(`dl:${id}`);
}
```

## Summary

Backing GraphQL DataLoader with Redis extends its deduplication benefits beyond a single request to the entire server fleet. Checking Redis in the batch function is straightforward using mGet for bulk lookups and multi/exec pipelines for writes. This pattern is especially valuable in horizontally scaled GraphQL APIs where repeated queries for the same objects - like post authors or product categories - would otherwise hit the database on every instance.
