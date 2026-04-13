# How to Implement a Read-Through Cache for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Redis, Cache, Read-Through, Pattern

Description: Implement a read-through cache pattern for MongoDB where the cache layer automatically fetches and stores data from the database on cache misses.

---

## Introduction

In the read-through cache pattern, the cache itself is responsible for loading data from the database when a miss occurs. Unlike cache-aside, the application always talks only to the cache, and the cache handles the MongoDB interaction. This encapsulates caching logic and simplifies application code.

## How Read-Through Differs from Cache-Aside

```text
Cache-Aside:   App -> Redis (miss) -> App -> MongoDB -> App -> Redis (store)
Read-Through:  App -> Cache Layer (miss) -> Cache Layer -> MongoDB -> Cache Layer (store) -> App
```

## Implementing a Read-Through Cache Class in Node.js

```javascript
const Redis = require("ioredis")
const { MongoClient, ObjectId } = require("mongodb")

class ReadThroughCache {
  constructor({ redisUrl, mongoUri, dbName, defaultTTL = 300 }) {
    this.redis = new Redis(redisUrl)
    this.mongo = new MongoClient(mongoUri)
    this.dbName = dbName
    this.defaultTTL = defaultTTL
  }

  async connect() {
    await this.mongo.connect()
    this.db = this.mongo.db(this.dbName)
  }

  async get(collection, id, ttl = this.defaultTTL) {
    const cacheKey = `${collection}:${id}`

    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Read-through: cache fetches from MongoDB automatically
    const doc = await this.db
      .collection(collection)
      .findOne({ _id: new ObjectId(id) })

    if (doc) {
      await this.redis.setex(cacheKey, ttl, JSON.stringify(doc))
    }

    return doc
  }

  async getMany(collection, query, cacheKey, ttl = this.defaultTTL) {
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const docs = await this.db.collection(collection).find(query).toArray()
    await this.redis.setex(cacheKey, ttl, JSON.stringify(docs))
    return docs
  }

  async invalidate(collection, id) {
    await this.redis.del(`${collection}:${id}`)
  }
}

module.exports = ReadThroughCache
```

## Using the Cache in Application Code

```javascript
const ReadThroughCache = require("./ReadThroughCache")

const cache = new ReadThroughCache({
  redisUrl: process.env.REDIS_URL,
  mongoUri: process.env.MONGODB_URI,
  dbName: "myapp",
  defaultTTL: 600
})

await cache.connect()

// Application never calls MongoDB directly
const user = await cache.get("users", "507f1f77bcf86cd799439011")
const products = await cache.getMany(
  "products",
  { category: "electronics", active: true },
  "products:electronics:active",
  120
)

// On write, invalidate the cache
await db.users.updateOne({ _id: userId }, { $set: { name: "New Name" } })
await cache.invalidate("users", userId.toString())
```

## Python Read-Through Implementation

```python
import json
import redis
from pymongo import MongoClient

class ReadThroughCache:
    def __init__(self, redis_url, mongo_uri, db_name, default_ttl=300):
        self.redis = redis.Redis.from_url(redis_url)
        self.mongo = MongoClient(mongo_uri)
        self.db = self.mongo[db_name]
        self.default_ttl = default_ttl

    def get(self, collection, doc_id, ttl=None):
        ttl = ttl or self.default_ttl
        key = f"{collection}:{doc_id}"

        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)

        doc = self.db[collection].find_one({"_id": doc_id})
        if doc:
            self.redis.setex(key, ttl, json.dumps(doc, default=str))
        return doc
```

## Summary

The read-through cache pattern centralizes cache-filling logic in a dedicated layer rather than scattering it across application code. This improves consistency and reduces the chance of forgetting to populate the cache after a miss. The trade-off is a slightly more complex cache abstraction layer. Use this pattern when multiple application modules access the same MongoDB collections, as the single cache class becomes the only place cache TTLs and key formats are defined.
