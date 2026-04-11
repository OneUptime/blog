# How to Cache GraphQL Query Results with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GraphQL, Caching, Apollo Server, Performance

Description: Cache GraphQL query results in Redis to reduce database load and improve API response times using response caching and field-level strategies.

---

## Why Cache GraphQL with Redis

GraphQL APIs often run multiple resolvers per query, each potentially hitting a database. Caching responses in Redis can:

- Reduce database load by 80-90% for read-heavy APIs
- Reduce response times from hundreds of milliseconds to single digits
- Enable response deduplication for identical queries

## Response-Level Caching with Apollo Server

The simplest approach is caching the full GraphQL response for a given query and variables hash. Use Express middleware before Apollo Server to intercept requests and return cached responses without running any resolvers.

```javascript
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const Redis = require('ioredis');
const { createHash } = require('crypto');

const redis = new Redis({ host: process.env.REDIS_HOST });

function hashQuery(query, variables) {
  return createHash('sha256')
    .update(JSON.stringify({ query, variables }))
    .digest('hex');
}

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

// Cache middleware - checks Redis before GraphQL execution
async function graphqlCacheMiddleware(req, res, next) {
  const { query, variables } = req.body;
  const cacheKey = `gql:${hashQuery(query, variables)}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Intercept the response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (!body.errors) {
      redis.setex(cacheKey, 300, JSON.stringify(body));
    }
    return originalJson(body);
  };

  next();
}

app.use('/graphql', graphqlCacheMiddleware, expressMiddleware(server));
```

## Apollo Server Plugin for Automatic Caching

```javascript
const { ApolloServerPluginResponseCache } = require('@apollo/server-plugin-response-cache');
const { KeyvAdapter } = require('@apollo/utils.keyvadapter');
const Keyv = require('keyv');
const KeyvRedis = require('@keyv/redis');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginResponseCache({
      cache: new KeyvAdapter(
        new Keyv({ store: new KeyvRedis('redis://localhost:6379') })
      ),
    }),
  ],
});
```

## Field-Level Caching with a Resolver Wrapper

Cache individual resolver results based on their arguments:

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST });

function withCache(resolver, keyFn, ttl = 300) {
  return async (parent, args, context, info) => {
    const cacheKey = keyFn(parent, args);
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await resolver(parent, args, context, info);

    if (result !== null && result !== undefined) {
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
    }

    return result;
  };
}

const resolvers = {
  Query: {
    product: withCache(
      async (_, { id }) => db.products.findById(id),
      (_, { id }) => `product:${id}`,
      600 // 10 minutes TTL
    ),
    products: withCache(
      async (_, { category }) => db.products.findByCategory(category),
      (_, { category }) => `products:category:${category}`,
      120 // 2 minutes TTL
    ),
  },
};
```

## Cache Invalidation on Mutation

```javascript
const resolvers = {
  Mutation: {
    updateProduct: async (_, { id, input }) => {
      const product = await db.products.update(id, input);

      // Invalidate related cache entries
      const pipeline = redis.pipeline();
      pipeline.del(`product:${id}`);
      pipeline.del('products:list');

      // Invalidate category-specific caches
      const categories = await db.products.getCategories();
      for (const cat of categories) {
        pipeline.del(`products:category:${cat}`);
      }

      await pipeline.exec();

      return product;
    },
  },
};
```

## Cache Key Strategy with User Context

For personalized queries, include user identity in the cache key:

```javascript
function withUserCache(resolver, ttl = 60) {
  return async (parent, args, context, info) => {
    const userId = context.user?.id ?? 'anonymous';
    const fieldName = info.fieldName;
    const argsHash = JSON.stringify(args);
    const cacheKey = `gql:user:${userId}:${fieldName}:${argsHash}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await resolver(parent, args, context, info);
    await redis.setex(cacheKey, ttl, JSON.stringify(result));
    return result;
  };
}

const resolvers = {
  Query: {
    myProfile: withUserCache(
      async (_, __, { user }) => db.users.findById(user.id),
      300
    ),
  },
};
```

## DataLoader Integration for Batch Caching

```javascript
const DataLoader = require('dataloader');

function createProductLoader() {
  return new DataLoader(async (ids) => {
    // Check Redis cache for all IDs at once
    const cacheKeys = ids.map((id) => `product:${id}`);
    const cached = await redis.mget(...cacheKeys);

    const results = await Promise.all(
      ids.map(async (id, i) => {
        if (cached[i]) return JSON.parse(cached[i]);

        const product = await db.products.findById(id);
        await redis.setex(`product:${id}`, 300, JSON.stringify(product));
        return product;
      })
    );

    return results;
  });
}
```

## Cache Metrics and Hit Rate

```javascript
let cacheHits = 0;
let cacheMisses = 0;

async function getCachedOrFetch(key, fetchFn, ttl) {
  const cached = await redis.get(key);
  if (cached) {
    cacheHits++;
    return JSON.parse(cached);
  }

  cacheMisses++;
  const result = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}

// Log hit rate every minute
setInterval(() => {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? ((cacheHits / total) * 100).toFixed(1) : 0;
  console.log(`Cache hit rate: ${hitRate}% (${cacheHits} hits, ${cacheMisses} misses)`);
  cacheHits = 0;
  cacheMisses = 0;
}, 60000);
```

## Summary

GraphQL query caching with Redis dramatically reduces database load and improves API latency. Implement response-level caching with a SHA-256 hash of the query and variables as the cache key, and use resolver-level wrappers for fine-grained control over TTLs. Always invalidate relevant cache keys in mutation resolvers to prevent stale data.
