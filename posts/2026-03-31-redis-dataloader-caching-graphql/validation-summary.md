# Validation Summary: How to Implement DataLoader Caching with Redis in GraphQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL DataLoader (npm `dataloader`)
- Redis (via npm `redis` v4+ / node-redis)
- Apollo Server v4 (`@apollo/server`)
- Express.js (via `@apollo/server/express4`)
- PostgreSQL (query syntax with `ANY($1)`)

## Sources Consulted
- DataLoader GitHub repository and source code — https://github.com/graphql/dataloader
- DataLoader cacheMap async support discussion — https://github.com/graphql/dataloader/issues/24
- node-redis v4 documentation (setEx, mGet, multi) — https://redis.io/docs/latest/develop/clients/nodejs/
- Apollo Server v4 expressMiddleware API reference — https://www.apollographql.com/docs/apollo-server/api/express-middleware

## Issues Found

### 1. Critical: RedisDataLoaderCache class does not work with DataLoader's cacheMap interface
- **What was wrong:** The `RedisDataLoaderCache` class implemented `get(key)` by returning `redis.get(...).then(...)`, which always returns a Promise. DataLoader's `cacheMap.get()` contract expects a synchronous return — either the cached value or `undefined`. Because the return was always a Promise (never `undefined`), DataLoader treated every lookup as a cache hit. For keys not in Redis, the caller received `undefined` instead of actual data from the database, since DataLoader never fell through to the batch function.
- **What was changed:** Removed the broken `RedisDataLoaderCache` class. Restructured the implementation to check Redis inside the DataLoader batch function using `redis.mGet()` for bulk lookups. Only IDs not found in Redis are queried from the database. Results are written back to Redis using a `redis.multi()` pipeline. DataLoader's default in-memory Map is retained for per-request deduplication.
- **Why:** DataLoader's cacheMap interface is designed for synchronous stores (like `Map`). Async stores like Redis cannot conform to the synchronous `get()` contract.

### 2. Minor: Missing expressMiddleware import
- **What was wrong:** The GraphQL Context Setup code used `expressMiddleware` without importing it. In Apollo Server v4, this function is exported from `@apollo/server/express4`, not from `@apollo/server`.
- **What was changed:** Added `const { expressMiddleware } = require('@apollo/server/express4');` to the import block.
- **Why:** Without this import, the code would throw a `ReferenceError` at runtime.

### 3. Minor: Summary text referenced broken approach
- **What was wrong:** The summary mentioned "custom cacheMap interface" which no longer applied after the fix.
- **What was changed:** Updated to reference the actual approach: "Checking Redis in the batch function is straightforward using mGet for bulk lookups and multi/exec pipelines for writes."

## Review Notes
- The invalidation example (`redis.del('dl:${id}')`) correctly matches the `CACHE_PREFIX` used in the batch function.
- The `await redis.connect()` at the top-level requires the surrounding code to be in an async context (e.g., an async IIFE or top-level await in ESM). This is acceptable for a tutorial but worth noting.
- The `db.query` call assumes the result is the rows array directly. With the `pg` library, the result object has a `.rows` property. The post abstracts this away which is fine for a tutorial.
- Apollo Server v5 moved Express integration to `@as-integrations/express4`. The v4 import shown is still correct and widely used.
