# How to Use Redis as a Cache for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MongoDB, Caching, Cache-Aside Pattern, Performance

Description: Learn how to implement a Redis cache layer in front of MongoDB using the cache-aside pattern, with serialization, TTL management, and cache invalidation strategies.

---

## Why Cache MongoDB with Redis

MongoDB is a capable document store, but some access patterns benefit greatly from Redis caching:
- Frequently read documents (user profiles, product listings)
- Aggregation pipeline results that are expensive to compute
- Documents accessed by many concurrent users
- Session data and authentication tokens

Redis serves cached documents in under 1ms vs. 5-50ms+ for MongoDB queries.

## Setup and Dependencies

```bash
pip install redis pymongo
```

## Basic Cache-Aside Implementation

```python
import redis
import pymongo
import json
from bson import ObjectId
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
mongo = pymongo.MongoClient("mongodb://localhost:27017")
db = mongo.myapp

def serialize_doc(doc: dict) -> str:
    """Convert MongoDB document to JSON string, handling ObjectId."""
    if doc is None:
        return json.dumps(None)
    serializable = {k: str(v) if isinstance(v, ObjectId) else v for k, v in doc.items()}
    return json.dumps(serializable, default=str)

def get_product(product_id: str) -> Optional[dict]:
    cache_key = f"product:{product_id}"

    # 1. Try cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Cache miss - query MongoDB
    doc = db.products.find_one({"_id": ObjectId(product_id)})

    if doc is None:
        # Cache negative results briefly to reduce DB load
        r.setex(cache_key, 60, json.dumps(None))
        return None

    # 3. Cache the result
    serialized = serialize_doc(doc)
    r.setex(cache_key, 3600, serialized)
    return json.loads(serialized)
```

## Cache Invalidation

Invalidate cache entries when documents are modified:

```python
def update_product(product_id: str, updates: dict) -> bool:
    result = db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": updates}
    )

    if result.modified_count > 0:
        # Invalidate cache
        r.delete(f"product:{product_id}")
        # Also invalidate any list caches that might include this product
        invalidate_pattern("products:list:*")
        return True
    return False

def invalidate_pattern(pattern: str):
    """Delete all keys matching a pattern using SCAN (safe for production)."""
    keys = list(r.scan_iter(pattern))
    if keys:
        r.delete(*keys)

def delete_product(product_id: str) -> bool:
    result = db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count > 0:
        r.delete(f"product:{product_id}")
        return True
    return False
```

## Caching MongoDB Aggregation Results

```python
def get_category_stats(category: str) -> dict:
    cache_key = f"stats:category:{category}"

    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Expensive aggregation pipeline
    pipeline = [
        {"$match": {"category": category, "active": True}},
        {"$group": {
            "_id": "$category",
            "total_products": {"$sum": 1},
            "avg_price": {"$avg": "$price"},
            "min_price": {"$min": "$price"},
            "max_price": {"$max": "$price"},
            "total_reviews": {"$sum": "$review_count"}
        }}
    ]

    results = list(db.products.aggregate(pipeline))
    stats = results[0] if results else {}
    stats.pop('_id', None)

    # Cache aggregation results for 5 minutes
    r.setex(cache_key, 300, json.dumps(stats, default=str))
    return stats
```

## Caching Query Lists

```python
def get_products_by_category(category: str, page: int = 1, limit: int = 20) -> list:
    cache_key = f"products:category:{category}:page:{page}:limit:{limit}"

    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    skip = (page - 1) * limit
    docs = list(db.products.find(
        {"category": category, "active": True},
        {"name": 1, "price": 1, "sku": 1, "thumbnail": 1}
    ).sort("created_at", -1).skip(skip).limit(limit))

    serializable_docs = [json.loads(serialize_doc(d)) for d in docs]
    serialized = json.dumps(serializable_docs)
    # Short TTL for paginated lists (data changes more frequently)
    r.setex(cache_key, 120, serialized)
    return serializable_docs
```

## Node.js Implementation

```javascript
const { MongoClient, ObjectId } = require('mongodb');
const Redis = require('ioredis');

const redis = new Redis({ host: 'localhost', port: 6379 });
const mongo = new MongoClient('mongodb://localhost:27017');
let db;

async function connect() {
  await mongo.connect();
  db = mongo.db('myapp');
}

async function getProduct(productId) {
  const cacheKey = `product:${productId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const product = await db.collection('products').findOne(
    { _id: new ObjectId(productId) },
    { projection: { name: 1, price: 1, category: 1, description: 1 } }
  );

  if (!product) {
    await redis.set(cacheKey, JSON.stringify(null), 'EX', 60);
    return null;
  }

  const serialized = JSON.stringify({ ...product, _id: product._id.toString() });
  await redis.set(cacheKey, serialized, 'EX', 3600);
  return JSON.parse(serialized);
}

async function updateProduct(productId, updates) {
  await db.collection('products').updateOne(
    { _id: new ObjectId(productId) },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  await redis.del(`product:${productId}`);
}

module.exports = { connect, getProduct, updateProduct };
```

## Batch Loading with Pipeline

```python
def get_products_bulk(product_ids: list) -> dict:
    cache_keys = [f"product:{pid}" for pid in product_ids]

    # Batch cache lookup
    pipe = r.pipeline()
    for key in cache_keys:
        pipe.get(key)
    cached_values = pipe.execute()

    result = {}
    missing_ids = []

    for pid, cached in zip(product_ids, cached_values):
        if cached:
            result[pid] = json.loads(cached)
        else:
            missing_ids.append(pid)

    if missing_ids:
        # Batch MongoDB query
        docs = list(db.products.find(
            {"_id": {"$in": [ObjectId(pid) for pid in missing_ids]}}
        ))

        pipe = r.pipeline()
        for doc in docs:
            pid = str(doc['_id'])
            serialized = serialize_doc(doc)
            result[pid] = json.loads(serialized)
            pipe.setex(f"product:{pid}", 3600, serialized)
        pipe.execute()

    return result
```

## Write-Through Caching

For data that must always be fresh in cache after writes:

```python
def create_product(product_data: dict) -> dict:
    # Write to MongoDB
    result = db.products.insert_one(product_data)
    product_data['_id'] = result.inserted_id

    # Write to cache simultaneously
    product_id = str(result.inserted_id)
    serialized = serialize_doc(product_data)
    r.setex(f"product:{product_id}", 3600, serialized)

    return json.loads(serialized)
```

## Summary

Using Redis as a cache for MongoDB reduces query latency and database load by serving frequently accessed documents from memory. Implement the cache-aside pattern for reads and always invalidate or update the cache on writes to maintain consistency. Use pipeline operations for batch cache lookups to avoid per-document round-trips, and set appropriate TTLs based on data change frequency. For aggregation results, use shorter TTLs (5-15 minutes) since computed aggregates become stale faster than individual documents. Serialize ObjectId fields to strings before storing in Redis, and cache negative results briefly to prevent repeated MongoDB lookups for non-existent documents.
