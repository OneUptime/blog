# Validation Summary: How to Implement GraphQL Persisted Queries with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store for persisted query cache)
- GraphQL (query language)
- Apollo Server 4 (`@apollo/server`)
- Apollo Client (`@apollo/client`, `@apollo/client/link/persisted-queries`)
- ioredis (Node.js Redis client)
- `@apollo/utils.keyvadapter` (KeyValueCache adapter for Keyv)
- `@keyv/redis` (Redis store for Keyv)
- `crypto-hash` (SHA-256 hashing for client-side)
- Express.js (manual implementation example)
- Node.js `crypto` module

## Sources Consulted
- Apollo Server APQ Documentation — https://www.apollographql.com/docs/apollo-server/performance/apq
- Apollo Server Cache Backends — https://www.apollographql.com/docs/apollo-server/performance/cache-backends
- Apollo `KeyValueCache` interface documentation — https://www.apollographql.com/docs/apollo-server/migration/#keyvaluecache
- `@apollo/utils.keyvadapter` on npm — https://www.npmjs.com/package/@apollo/utils.keyvadapter
- `@keyv/redis` on npm — https://www.npmjs.com/package/@keyv/redis
- Apollo Client Persisted Queries Link — https://www.apollographql.com/docs/react/api/link/persisted-queries
- `crypto-hash` on npm — https://www.npmjs.com/package/crypto-hash
- ioredis documentation — https://github.com/redis/ioredis

## Issues Found
1. **Custom `redisQueryStore` missing `delete` method**: Apollo Server's `KeyValueCache` interface requires `get`, `set`, and `delete` methods. The original code only implemented `get` and `set`. Added the missing `async delete(key)` method that calls `redis.del()`.

2. **Custom `redisQueryStore.set` did not handle TTL options**: The `KeyValueCache.set` method signature accepts an optional `options` parameter with a `ttl` field. Apollo Server passes TTL values from the `persistedQueries.ttl` config to `cache.set()`. Updated the `set` method to accept `options` and use Redis `EX` flag when a TTL is provided.

## Review Notes
- The Keyv example uses the Keyv v4 API (`new Keyv({ store: new KeyvRedis(url) })`). In Keyv v5, the constructor changed to `new Keyv(new KeyvRedis(url))`. The code works with Keyv v4 + `@apollo/utils.keyvadapter` v3, but readers installing the latest versions may need to adjust.
- The `crypto-hash` package is ESM-only. The blog correctly uses `import` syntax for the client-side code where it is used, so this is not an issue, but readers should be aware it cannot be `require()`'d.
- The blog mixes CommonJS (`require`) for server code and ESM (`import`) for client code. This is standard practice (Node.js servers commonly use CJS, while client bundlers handle ESM), but could confuse beginners.
- The APQ protocol description, manual implementation logic, SCAN-based listing, and pre-registration script are all technically correct.
