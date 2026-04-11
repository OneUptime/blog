# Validation Summary: How to Cache GraphQL Query Results with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (via ioredis)
- GraphQL
- Apollo Server v4 (`@apollo/server`, `@apollo/server/express4`)
- Apollo Server Response Cache Plugin (`@apollo/server-plugin-response-cache`)
- Keyv with Redis adapter (`keyv`, `@keyv/redis`, `@apollo/utils.keyvadapter`)
- DataLoader (`dataloader`)
- Express.js
- Node.js crypto module

## Sources Consulted
- Apollo Server v4 documentation: https://www.apollographql.com/docs/apollo-server/
- Apollo Server `expressMiddleware` API: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server context function documentation: https://www.apollographql.com/docs/apollo-server/data/context
- Apollo Server Response Cache Plugin: https://www.apollographql.com/docs/apollo-server/performance/caching/#caching-with-responsecacheplugin
- ioredis API documentation: https://github.com/redis/ioredis
- DataLoader documentation: https://github.com/graphql/dataloader

## Issues Found

### 1. Response-Level Caching via Context Function (Critical)
**What was wrong:** The original code placed cache-checking logic inside Apollo Server's `context` function and set a `cachedResponse` property on the context object, with a comment claiming it would "Return cached response directly." This is incorrect — the `context` function in Apollo Server returns a context object that is passed to resolvers; it cannot short-circuit GraphQL execution or send a response to the client. The resolvers would still execute regardless of the cached response being present in context.

**What was changed:** Replaced the context-based approach with Express middleware (`graphqlCacheMiddleware`) that runs before Apollo Server's `expressMiddleware`. The middleware checks Redis for a cached response and returns it via `res.json()` if found, properly short-circuiting the request. For cache misses, it intercepts `res.json` to cache the response after Apollo Server processes it, only caching responses without errors.

**Why:** The original code would never actually serve cached responses. The middleware approach correctly intercepts the HTTP request/response cycle and can return early before GraphQL execution begins.

## Review Notes
- The `ApolloServerPluginResponseCache` example is syntactically correct, but the blog does not mention that this plugin requires cache control hints (via `@cacheControl` directive or `info.cacheControl.setCacheHint()`) on types/fields to actually cache anything. Without hints, the plugin will not cache responses. A future improvement could add a note about this.
- The DataLoader example checks Redis for all IDs via `mget` (good), but falls back to individual `db.products.findById()` calls for cache misses rather than batching the uncached IDs into a single database query. This is functionally correct but defeats DataLoader's batching benefit for uncached items. A future improvement could batch the uncached lookups.
- The `withUserCache` function uses `JSON.stringify(args)` in the cache key. `JSON.stringify` does not guarantee consistent key ordering for objects, so `{a:1, b:2}` and `{b:2, a:1}` could produce different cache keys. In practice, GraphQL variable parsing preserves order from the incoming JSON, so this is unlikely to cause issues, but a deterministic serialization (e.g., sorted keys) would be more robust.
