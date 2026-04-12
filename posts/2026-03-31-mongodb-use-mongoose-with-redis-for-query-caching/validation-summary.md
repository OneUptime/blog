# Validation Summary: How to Use Mongoose with Redis for Query Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- Redis
- ioredis (Node.js Redis client)
- Node.js

## Sources Consulted
- Mongoose Model API docs — https://mongoosejs.com/docs/api/model.html (hydrate method, isNew behavior)
- Mongoose Query API docs — https://mongoosejs.com/docs/api/query.html (mongooseOptions(), lean detection)
- Mongoose Document API docs — https://mongoosejs.com/docs/api/document.html ($isNew property)
- ioredis Redis class API docs — https://redis.github.io/ioredis/classes/Redis.html (del, setex signatures)
- ioredis GitHub issue #1593 — del type regarding string vs array arguments

## Issues Found

### 1. `new this.model(doc)` should be `this.model.hydrate(doc)`
**What was wrong:** The cache hit code used `new this.model(doc)` to reconstruct Mongoose documents from cached plain objects. `new Model(doc)` sets `isNew: true` on the document, meaning any subsequent `.save()` call would attempt an `insertOne()` instead of an `updateOne()`, causing a duplicate key error.
**What was changed:** Replaced `new this.model(doc)` with `this.model.hydrate(doc)` in both the array and single-document branches. `hydrate()` creates a document with `isNew: false`, correctly representing that the document already exists in the database.

### 2. Lean queries return hydrated documents on cache hit
**What was wrong:** The post claims "Lean queries also work" with `.lean().cache()`, but the cache hit path always hydrated results with `new this.model(doc)`, returning full Mongoose document instances. This broke the `.lean()` contract, which should return plain JavaScript objects (POJOs). The first call would work correctly (lean exec returns POJOs, which get cached), but subsequent cache hits would incorrectly return Mongoose documents.
**What was changed:** Added a check for `this.mongooseOptions().lean` before hydration. When lean is set, the parsed JSON is returned directly as plain objects without hydration.

### 3. `redis.del(keys)` should use spread syntax
**What was wrong:** The cache invalidation code called `redis.del(keys)` passing an array directly. While this works at runtime due to ioredis internals, the documented API signature expects variadic arguments (`del(...keys)`), and passing an array directly causes TypeScript type errors.
**What was changed:** Changed `redis.del(keys)` to `redis.del(...keys)` in all three occurrences.

## Review Notes
- The `redis.keys()` command used for cache invalidation is documented by Redis as O(N) and should not be used in production with large key spaces. The Redis docs explicitly warn: "Don't use KEYS in your regular application code." For production use, `SCAN` with a cursor or a Redis Set tracking cached keys per collection would be more appropriate. This is a design limitation rather than a bug, and the post's "Considerations and Limitations" section could mention it in the future.
- The `JSON.stringify` approach for cache keys can produce different strings for objects with the same properties in different insertion order. The post correctly notes this limitation and suggests hashing as an alternative.
- The `this.options` property used in the cache key includes query options like sort, limit, and skip, which is correct for differentiating queries. However, it may also include internal Mongoose options that could vary between identical logical queries, potentially reducing cache hit rates.
