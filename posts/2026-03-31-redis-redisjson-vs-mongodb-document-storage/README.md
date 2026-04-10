# RedisJSON vs MongoDB: Document Storage Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MongoDB, RedisJSON, Document Storage, Performance

Description: Compare RedisJSON and MongoDB for document storage: speed, query flexibility, persistence, and when to choose each for your application.

---

When you need to store and query JSON documents, two strong options are RedisJSON (a Redis module) and MongoDB. Both let you store nested documents and query individual fields, but they make very different tradeoffs around speed, durability, and query power.

## How RedisJSON Works

RedisJSON extends Redis with native JSON support. Documents live in RAM, and you can get or set any nested path without deserializing the whole document.

```bash
# Store a document
redis-cli JSON.SET user:1001 $ '{"name":"Alice","age":30,"address":{"city":"NYC"}}'

# Read a nested field
redis-cli JSON.GET user:1001 $.address.city

# Update one field in place
redis-cli JSON.SET user:1001 $.age 31

# Append to an array
redis-cli JSON.ARRAPPEND user:1001 $.tags '"admin"'
```

RedisSearch pairs with RedisJSON to provide secondary indexing and full-text search over your JSON documents.

```bash
# Create an index on JSON fields
redis-cli FT.CREATE idx:users ON JSON PREFIX 1 user: \
  SCHEMA $.name AS name TEXT $.age AS age NUMERIC

# Query the index
redis-cli FT.SEARCH idx:users "@age:[25 35]"
```

## How MongoDB Works

MongoDB stores documents in BSON format on disk, with a rich query language and aggregation pipeline.

```javascript
// Insert a document
db.users.insertOne({ name: "Alice", age: 30, address: { city: "NYC" } });

// Query with filter
db.users.find({ "address.city": "NYC", age: { $gte: 25 } });

// Update a nested field
db.users.updateOne({ _id: ObjectId("...") }, { $set: { age: 31 } });

// Aggregation pipeline
db.users.aggregate([
  { $match: { age: { $gte: 25 } } },
  { $group: { _id: "$address.city", count: { $sum: 1 } } }
]);
```

## Performance Comparison

| Factor | RedisJSON | MongoDB |
|---|---|---|
| Read latency | Sub-millisecond (in-memory) | 1-10ms (disk-backed) |
| Write latency | Sub-millisecond | 1-5ms |
| Dataset size | Limited by RAM | Scales to terabytes |
| Query language | RediSearch (limited) | Full MQL + aggregation |
| Joins | Not supported | $lookup aggregation |
| Transactions | Single-key or MULTI | ACID multi-document |

## Persistence and Durability

RedisJSON inherits Redis persistence: RDB snapshots and AOF logging. If Redis crashes between writes and the last AOF fsync, you can lose data. MongoDB writes to the journal before acknowledging, giving stronger durability guarantees by default.

```bash
# Redis: enable AOF for stronger durability
# In redis.conf
appendonly yes
appendfsync everysec
```

## When to Choose RedisJSON

- You need sub-millisecond document retrieval by key
- Documents serve as a cache layer in front of another database
- Dataset fits comfortably in RAM
- Query patterns are simple (mostly key-based access)

## When to Choose MongoDB

- You need complex queries, aggregations, or joins across documents
- Dataset is large and cannot fit in RAM
- You need strong ACID guarantees across multiple documents
- Rich secondary indexes and full-text search are critical

## Hybrid Pattern

Many teams use both: MongoDB as the system of record and RedisJSON as a hot cache for frequently read documents.

```python
import redis
import pymongo

r = redis.Redis()
mongo = pymongo.MongoClient()["mydb"]

def get_user(user_id):
    cached = r.json().get(f"user:{user_id}")
    if cached:
        return cached
    doc = mongo.users.find_one({"_id": user_id})
    if doc:
        r.json().set(f"user:{user_id}", "$", doc)
        r.expire(f"user:{user_id}", 300)
    return doc
```

## Summary

RedisJSON wins on raw speed and is ideal for hot-path lookups where data fits in memory. MongoDB wins on storage capacity, query expressiveness, and durability. The best architectures often use both together, with Redis as a fast cache layer and MongoDB as the authoritative store.
