# How to Implement a Write-Through Cache for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Redis, Cache, Write-Through, Pattern

Description: Implement a write-through cache for MongoDB where every write updates both Redis and MongoDB synchronously, ensuring cache and database consistency.

---

## Introduction

In the write-through cache pattern, every write operation updates both the cache and the database simultaneously. This keeps the cache always up to date and eliminates stale reads, at the cost of slightly higher write latency. It pairs well with read-through caching for a fully cache-consistent data layer.

## How Write-Through Works

```text
Write-Through write: App -> Cache Layer -> Redis (update) + MongoDB (update) -> App
Write-Through read:  App -> Redis (always fresh) -> App
```

Unlike cache-aside where writes only update MongoDB (and invalidate cache), write-through writes update both stores in the same operation.

## Node.js Write-Through Cache

```javascript
const Redis = require("ioredis")
const { MongoClient, ObjectId } = require("mongodb")

class WriteThroughCache {
  constructor({ redisUrl, mongoUri, dbName, defaultTTL = 600 }) {
    this.redis = new Redis(redisUrl)
    this.mongo = new MongoClient(mongoUri)
    this.dbName = dbName
    this.defaultTTL = defaultTTL
  }

  async connect() {
    await this.mongo.connect()
    this.db = this.mongo.db(this.dbName)
  }

  async write(collection, id, document, ttl = this.defaultTTL) {
    const cacheKey = `${collection}:${id}`
    const docWithId = { ...document, _id: new ObjectId(id) }

    // Write to both stores concurrently (best-effort)
    const [mongoResult] = await Promise.all([
      this.db.collection(collection).replaceOne(
        { _id: new ObjectId(id) },
        docWithId,
        { upsert: true }
      ),
      this.redis.setex(cacheKey, ttl, JSON.stringify(docWithId))
    ])

    return mongoResult
  }

  async update(collection, id, updates, ttl = this.defaultTTL) {
    const cacheKey = `${collection}:${id}`

    // Update MongoDB
    await this.db.collection(collection).updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    )

    // Re-fetch and cache the updated document
    const updated = await this.db
      .collection(collection)
      .findOne({ _id: new ObjectId(id) })

    if (updated) {
      await this.redis.setex(cacheKey, ttl, JSON.stringify(updated))
    }

    return updated
  }

  async read(collection, id) {
    const cacheKey = `${collection}:${id}`
    const cached = await this.redis.get(cacheKey)
    return cached ? JSON.parse(cached) : null
  }
}
```

## Using the Write-Through Cache

```javascript
const cache = new WriteThroughCache({
  redisUrl: process.env.REDIS_URL,
  mongoUri: process.env.MONGODB_URI,
  dbName: "myapp"
})

await cache.connect()

// Write updates both Redis and MongoDB
await cache.write("users", userId, {
  name: "Alice",
  email: "alice@example.com",
  role: "admin"
})

// Reads from Redis (always fresh due to write-through)
const user = await cache.read("users", userId)
```

## Python Implementation

```python
import json
import redis
from pymongo import MongoClient

class WriteThroughCache:
    def __init__(self, redis_url, mongo_uri, db_name, default_ttl=600):
        self.redis = redis.Redis.from_url(redis_url)
        self.mongo = MongoClient(mongo_uri)
        self.db = self.mongo[db_name]
        self.default_ttl = default_ttl

    def write(self, collection, doc_id, document, ttl=None):
        ttl = ttl or self.default_ttl
        key = f"{collection}:{doc_id}"
        doc_with_id = {**document, "_id": doc_id}

        self.db[collection].replace_one(
            {"_id": doc_id}, doc_with_id, upsert=True
        )
        self.redis.setex(key, ttl, json.dumps(doc_with_id, default=str))

    def read(self, collection, doc_id):
        key = f"{collection}:{doc_id}"
        cached = self.redis.get(key)
        return json.loads(cached) if cached else None
```

## Handling Partial Failures

Write-through requires both writes to succeed. Use a compensating transaction if Redis fails:

```javascript
async function safeWrite(collection, id, document) {
  try {
    await Promise.all([
      mongo.db().collection(collection).replaceOne({ _id: id }, document, { upsert: true }),
      redis.setex(`${collection}:${id}`, 600, JSON.stringify(document))
    ])
  } catch (err) {
    // If either write fails, delete the cache key to prevent stale data
    await redis.del(`${collection}:${id}`).catch(() => {})
    throw err
  }
}
```

## Summary

Write-through caching guarantees that Redis always reflects the latest MongoDB state, eliminating stale reads at the cost of double-write latency. This pattern works best for entities with high read frequency and moderate write frequency, such as user profiles, product catalogs, and configuration objects. Always handle partial failures by deleting the cache key if the Redis write fails, preventing stale data from accumulating.
