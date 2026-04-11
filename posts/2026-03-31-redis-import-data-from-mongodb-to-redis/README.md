# How to Import Data from MongoDB to Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MongoDB, Import, Caching, ETL

Description: Learn how to import MongoDB documents into Redis as hashes, strings, or sorted sets using Python for cache warming and fast lookup patterns.

---

Importing MongoDB documents into Redis lets you build a fast in-memory cache in front of your document store. This is common for user sessions, profile caches, and frequently queried documents. Since both systems have flexible schemas, the import is straightforward.

## Setup

```python
import redis
import pymongo
import json

r = redis.Redis(host="localhost", port=6379, password="redis-password", decode_responses=True)
mongo_client = pymongo.MongoClient("mongodb://user:password@localhost:27017/")
db = mongo_client["mydb"]
```

## Import MongoDB Documents as Redis Hashes

The most common pattern: import flat documents as Redis hashes for field-level access.

```python
def import_collection_as_hashes(collection_name, key_prefix, id_field="_id", ttl_seconds=3600):
    collection = db[collection_name]
    total = collection.count_documents({})
    count = 0

    pipeline = r.pipeline(transaction=False)

    for doc in collection.find({}, batch_size=500):
        doc_id = str(doc.pop(id_field))
        redis_key = f"{key_prefix}:{doc_id}"

        # Flatten document to strings (Redis hashes require string values)
        flat_doc = {}
        for k, v in doc.items():
            if isinstance(v, (dict, list)):
                flat_doc[k] = json.dumps(v)
            elif v is None:
                flat_doc[k] = ""
            else:
                flat_doc[k] = str(v)

        pipeline.hset(redis_key, mapping=flat_doc)
        if ttl_seconds:
            pipeline.expire(redis_key, ttl_seconds)

        count += 1
        if count % 500 == 0:
            pipeline.execute()
            print(f"Imported {count}/{total} from {collection_name}...")

    pipeline.execute()
    print(f"Done: {count} documents from '{collection_name}' imported as hashes")

import_collection_as_hashes("users", "user", id_field="_id")
```

## Import Documents as JSON Strings

If you need the full document accessible as JSON (e.g., for API response caching):

```python
from bson import json_util

def import_collection_as_json(collection_name, key_prefix, id_field="_id", ttl_seconds=1800):
    collection = db[collection_name]
    count = 0
    pipeline = r.pipeline(transaction=False)

    for doc in collection.find({}, batch_size=500):
        doc_id = str(doc[id_field])
        redis_key = f"{key_prefix}:{doc_id}"

        # Serialize full document to JSON
        json_value = json_util.dumps(doc)
        pipeline.set(redis_key, json_value)
        if ttl_seconds:
            pipeline.expire(redis_key, ttl_seconds)

        count += 1
        if count % 500 == 0:
            pipeline.execute()
            print(f"Imported {count} documents...")

    pipeline.execute()
    print(f"Done: {count} documents imported as JSON strings")
```

## Import a Subset with Query Filter

```python
from datetime import datetime

def import_active_users(ttl_seconds=3600):
    collection = db["users"]
    query = {"status": "active", "last_login": {"$gte": datetime(2025, 1, 1)}}
    projection = {"name": 1, "email": 1, "role": 1, "plan": 1}

    count = 0
    pipeline = r.pipeline(transaction=False)

    for doc in collection.find(query, projection, batch_size=500):
        user_id = str(doc["_id"])
        redis_key = f"user:{user_id}"

        user_data = {
            "name": doc.get("name", ""),
            "email": doc.get("email", ""),
            "role": doc.get("role", "user"),
            "plan": doc.get("plan", "free")
        }

        pipeline.hset(redis_key, mapping=user_data)
        pipeline.expire(redis_key, ttl_seconds)
        count += 1

        if count % 500 == 0:
            pipeline.execute()

    pipeline.execute()
    print(f"Done: {count} active users imported")
```

## Import Scores as Sorted Set

For ranking or leaderboard data:

```python
def import_scores_as_sorted_set(leaderboard_key="leaderboard:global", ttl_seconds=86400):
    collection = db["scores"]
    score_map = {}

    for doc in collection.find({}, {"user_id": 1, "username": 1, "score": 1}):
        member = f"{doc['user_id']}:{doc.get('username', 'unknown')}"
        score_map[member] = float(doc.get("score", 0))

    if score_map:
        r.zadd(leaderboard_key, score_map)
        r.expire(leaderboard_key, ttl_seconds)

    print(f"Done: {len(score_map)} leaderboard entries imported")
```

## Handle ObjectId and DateTime Fields

MongoDB uses BSON types that need conversion for Redis:

```python
from bson import ObjectId
from datetime import datetime

def serialize_value(v):
    if isinstance(v, ObjectId):
        return str(v)
    elif isinstance(v, datetime):
        return v.isoformat()
    elif isinstance(v, (dict, list)):
        return json.dumps(v, default=str)
    elif v is None:
        return ""
    else:
        return str(v)
```

## Verify the Import

```python
def verify_import(collection_name, key_prefix, sample_size=10):
    collection = db[collection_name]
    samples = list(collection.aggregate([{"$sample": {"size": sample_size}}]))

    for doc in samples:
        doc_id = str(doc["_id"])
        redis_key = f"{key_prefix}:{doc_id}"
        redis_data = r.hgetall(redis_key)

        if redis_data:
            print(f"{redis_key}: found in Redis ({len(redis_data)} fields)")
        else:
            print(f"{redis_key}: MISSING from Redis")

verify_import("users", "user")
```

## Summary

Importing MongoDB documents into Redis for caching requires converting BSON types to strings and choosing the right Redis structure: hashes for field-level access, JSON strings for full document retrieval. Use pipelines to batch writes and apply TTLs so cached data expires and stays fresh relative to the MongoDB source.
