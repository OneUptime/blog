# How to Use Mongoose with Redis for Query Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoose, Redis, Cache, Node.js

Description: Add Redis query caching to Mongoose by patching the exec function to cache query results, reducing MongoDB load for repeated identical queries.

---

## Introduction

Mongoose does not ship with built-in query caching, but it is extensible enough to add Redis caching by patching the `Query.prototype.exec` method. This approach is transparent to application code - you simply chain `.cache()` on any Mongoose query to opt into caching.

## Setting Up the Cache Module

```javascript
// services/cache.js
const mongoose = require("mongoose")
const Redis = require("ioredis")

const redis = new Redis(process.env.REDIS_URL)
const DEFAULT_TTL = 300

const exec = mongoose.Query.prototype.exec

// Extend Query with a cache method
mongoose.Query.prototype.cache = function (ttl = DEFAULT_TTL) {
  this._cache = true
  this._ttl = ttl
  return this
}

// Patch exec to check Redis before hitting MongoDB
mongoose.Query.prototype.exec = async function () {
  if (!this._cache) {
    return exec.apply(this, arguments)
  }

  const cacheKey = JSON.stringify({
    collection: this.mongooseCollection.name,
    query: this.getQuery(),
    op: this.op,
    options: this.options
  })

  const cached = await redis.get(cacheKey)
  if (cached) {
    const parsed = JSON.parse(cached)
    // Return plain objects for lean queries
    if (this.mongooseOptions().lean) {
      return parsed
    }
    // Hydrate plain objects back to Mongoose model instances
    if (Array.isArray(parsed)) {
      return parsed.map(doc => this.model.hydrate(doc))
    }
    return this.model.hydrate(parsed)
  }

  const result = await exec.apply(this, arguments)

  if (result) {
    await redis.setex(cacheKey, this._ttl, JSON.stringify(result))
  }

  return result
}

module.exports = { redis }
```

## Using the Cache in Your Application

```javascript
// Require the cache module once at startup
require("./services/cache")

const User = require("./models/User")

// Without caching (always hits MongoDB)
const users = await User.find({ role: "admin" })

// With caching (hits Redis for 5 minutes)
const cachedUsers = await User.find({ role: "admin" }).cache(300)

// Cache for 1 hour
const product = await Product.findById(productId).cache(3600)

// Lean queries also work
const lean = await User.find({ active: true }).lean().cache(60)
```

## Clearing the Cache on Write

```javascript
const { redis } = require("./services/cache")

async function clearUserCache() {
  const keys = await redis.keys("*users*")
  if (keys.length) {
    await redis.del(...keys)
  }
}

// In your Mongoose post-save hook
UserSchema.post("save", async function () {
  await clearUserCache()
})

UserSchema.post("findOneAndUpdate", async function () {
  await clearUserCache()
})
```

## Model-Level Cache Key Prefix

For finer-grained invalidation, use model-aware keys:

```javascript
mongoose.Query.prototype.exec = async function () {
  if (!this._cache) return exec.apply(this, arguments)

  const collectionName = this.mongooseCollection.name
  const cacheKey = `query:${collectionName}:${JSON.stringify({
    filter: this.getQuery(),
    options: this.options
  })}`

  // ... rest of the cache logic
}

// Invalidate all cached queries for a collection
async function clearCollectionCache(collectionName) {
  const keys = await redis.keys(`query:${collectionName}:*`)
  if (keys.length) await redis.del(keys)
}
```

## Considerations and Limitations

```text
- Only use .cache() on queries where results are safe to serve slightly stale
- Don't cache queries with user-specific filters without user-scoped keys
- Mutation operations (save, remove, updateOne) should always clear relevant cache keys
- The JSON.stringify key approach can collide for complex query objects - consider hashing
```

## Summary

Patching `mongoose.Query.prototype.exec` is a clean way to add transparent Redis caching to any Mongoose query with a single `.cache()` call. Use it for expensive, frequently repeated queries like catalog listings and configuration lookups. Pair it with model-level `post` hooks to automatically clear stale cache entries after writes, and scope invalidation to the collection level to avoid tracking individual document keys.
