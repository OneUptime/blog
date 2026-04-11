# How to Cache GraphQL Schema Introspection with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GraphQL, Caching

Description: Learn how to cache GraphQL schema introspection results in Redis to eliminate repeated schema parsing overhead and reduce server load from tooling and clients.

---

GraphQL introspection queries ask the server for its complete schema. They are expensive - the server must traverse the entire type system and serialize a large JSON response. Client tools like GraphiQL, Apollo Studio, and code generators fire introspection queries frequently. Caching the result in Redis turns this from a recurring cost into a one-time computation.

## Why Introspection Caching Matters

A typical introspection response is 50-200KB of JSON. In a scaled deployment:
- Every restart triggers new introspection requests from connected clients
- CI pipelines running codegen can hammer the introspection endpoint
- Multiple server replicas each pay the serialization cost independently

## Implementing Introspection Caching

Intercept introspection queries before they reach the resolver layer:

```javascript
const { ApolloServer } = require('@apollo/server');
const { graphql, getIntrospectionQuery } = require('graphql');
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const INTROSPECTION_CACHE_KEY = 'graphql:introspection:v1';
const INTROSPECTION_TTL = 3600; // 1 hour

async function getCachedIntrospection(schema) {
  const cached = await redis.get(INTROSPECTION_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const result = await graphql({ schema, source: getIntrospectionQuery() });
  await redis.setEx(INTROSPECTION_CACHE_KEY, INTROSPECTION_TTL, JSON.stringify(result));
  return result;
}
```

## Apollo Server Plugin for Introspection Caching

```javascript
const { HeaderMap } = require('@apollo/server');

function introspectionCachePlugin(redis) {
  return {
    async requestDidStart({ request }) {
      const isIntrospection = request.query?.includes('__schema') ||
                               request.query?.includes('__type');

      if (!isIntrospection) return {};

      return {
        async responseForOperation({ schema, request }) {
          const cacheKey = `graphql:introspection:${schema.description || 'default'}`;
          const cached = await redis.get(cacheKey);

          if (cached) {
            const headers = new HeaderMap();
            headers.set('x-cache', 'HIT');
            return {
              http: { headers },
              body: { kind: 'single', singleResult: JSON.parse(cached) }
            };
          }

          return null; // Let normal execution proceed
        },

        async willSendResponse({ response, schema }) {
          const cacheKey = `graphql:introspection:${schema.description || 'default'}`;
          const isCached = await redis.exists(cacheKey);

          if (!isCached && response.body?.singleResult) {
            await redis.setEx(
              cacheKey,
              3600,
              JSON.stringify(response.body.singleResult)
            );
          }
        }
      };
    }
  };
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [introspectionCachePlugin(redis)]
});
```

## Versioning the Cache Key

When you deploy a schema change, invalidate the old cache:

```javascript
const { printSchema } = require('graphql');

const schemaHash = require('crypto')
  .createHash('sha256')
  .update(printSchema(schema))
  .digest('hex')
  .slice(0, 8);

const INTROSPECTION_CACHE_KEY = `graphql:introspection:${schemaHash}`;
```

Old keys auto-expire after the TTL. No manual cleanup needed.

## Manual Invalidation

```bash
redis-cli keys "graphql:introspection:*"
redis-cli del "graphql:introspection:v1"
```

## Summary

Caching GraphQL introspection results in Redis reduces repeated schema serialization work and protects the server from being overloaded by client tooling. Version the cache key using a schema hash so deployments automatically invalidate stale responses. A one-hour TTL works well for most use cases - short enough to reflect schema updates, long enough to absorb heavy codegen traffic.
