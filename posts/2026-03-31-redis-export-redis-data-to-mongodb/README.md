# How to Export Redis Data to MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MongoDB, Export, ETL, Data Migration

Description: Learn how to export Redis data to MongoDB by scanning keys, reading values by type, and inserting them as documents with TTL metadata preserved.

---

Exporting Redis data to MongoDB lets you persist in-memory data to durable document storage. MongoDB's schema flexibility makes it a natural fit for Redis's varied data types - each Redis type maps cleanly to a MongoDB document.

## Setup

```python
import redis
import pymongo
from datetime import datetime, timezone

r = redis.Redis(host="localhost", port=6379, password="redis-password", decode_responses=True)
client = pymongo.MongoClient("mongodb://user:password@localhost:27017/")
db = client["redis_export"]
```

## Export All Key Types (Generic Approach)

This approach scans all keys and exports each to a MongoDB collection based on its type:

```python
def export_key_to_mongo(key):
    key_type = r.type(key)
    ttl = r.ttl(key)

    doc = {
        "_id": key,
        "type": key_type,
        "ttl": ttl if ttl > 0 else None,
        "exported_at": datetime.now(timezone.utc)
    }

    if key_type == "string":
        doc["value"] = r.get(key)
        collection = db["strings"]

    elif key_type == "hash":
        doc["value"] = r.hgetall(key)
        collection = db["hashes"]

    elif key_type == "list":
        doc["value"] = r.lrange(key, 0, -1)
        collection = db["lists"]

    elif key_type == "set":
        doc["value"] = list(r.smembers(key))
        collection = db["sets"]

    elif key_type == "zset":
        members = r.zrange(key, 0, -1, withscores=True)
        doc["value"] = [{"member": m, "score": s} for m, s in members]
        collection = db["sorted_sets"]

    else:
        return  # skip unknown types

    collection.replace_one({"_id": key}, doc, upsert=True)


def export_all_keys(pattern="*", batch_size=500):
    count = 0
    for key in r.scan_iter(pattern, count=batch_size):
        try:
            export_key_to_mongo(key)
            count += 1
            if count % 1000 == 0:
                print(f"Exported {count} keys...")
        except Exception as e:
            print(f"Error exporting {key}: {e}")

    print(f"Done: {count} keys exported to MongoDB")


export_all_keys()
```

## Export Hashes as Flat Documents

For user profiles or config hashes, flatten the hash directly into MongoDB documents:

```python
def export_user_hashes(key_pattern="user:*"):
    collection = db["users"]
    collection.create_index("redis_key")

    count = 0
    for key in r.scan_iter(key_pattern, count=500):
        if r.type(key) != "hash":
            continue

        data = r.hgetall(key)
        doc = {
            "redis_key": key,
            "exported_at": datetime.now(timezone.utc),
            **data  # flatten hash fields as top-level document fields
        }

        collection.replace_one({"redis_key": key}, doc, upsert=True)
        count += 1

        if count % 500 == 0:
            print(f"Exported {count} user hashes...")

    print(f"Done: {count} user hashes")
```

## Export with Batch Inserts for Performance

```python
def export_strings_batch(key_pattern="session:*", batch_size=500):
    collection = db["sessions"]
    batch = []

    for key in r.scan_iter(key_pattern, count=500):
        if r.type(key) != "string":
            continue

        value = r.get(key)
        ttl = r.ttl(key)

        batch.append(pymongo.ReplaceOne(
            {"_id": key},
            {
                "_id": key,
                "value": value,
                "ttl": ttl if ttl > 0 else None,
                "exported_at": datetime.now(timezone.utc)
            },
            upsert=True
        ))

        if len(batch) >= batch_size:
            collection.bulk_write(batch)
            print(f"Wrote batch of {batch_size}")
            batch = []

    if batch:
        collection.bulk_write(batch)

    print("Session export complete")
```

## Add MongoDB Indexes After Export

```python
# Add indexes for common query patterns
db["hashes"].create_index("type")
db["strings"].create_index("exported_at")
db["users"].create_index([("redis_key", pymongo.ASCENDING)], unique=True)

# TTL index to auto-expire documents matching Redis TTL
db["sessions"].create_index("exported_at", expireAfterSeconds=86400)
```

## Validate the Export

```python
def validate_export():
    # Compare key counts
    redis_count = r.dbsize()
    mongo_total = sum([
        db["strings"].count_documents({}),
        db["hashes"].count_documents({}),
        db["lists"].count_documents({}),
        db["sets"].count_documents({}),
        db["sorted_sets"].count_documents({})
    ])

    print(f"Redis keys: {redis_count}")
    print(f"MongoDB documents: {mongo_total}")

    # Spot check a key
    sample_key = r.randomkey()
    mongo_doc = None
    for col_name in ["strings", "hashes", "lists", "sets", "sorted_sets"]:
        mongo_doc = db[col_name].find_one({"_id": sample_key})
        if mongo_doc:
            break

    if mongo_doc:
        print(f"Sample key '{sample_key}' found in MongoDB")
    else:
        print(f"WARNING: '{sample_key}' not found in MongoDB")

validate_export()
```

## Summary

Exporting Redis data to MongoDB is straightforward because both systems handle dynamic schemas well. Use `SCAN` to iterate keys safely, map each Redis type to an appropriate document structure, and use bulk writes for performance. MongoDB's document model naturally accommodates Redis hashes as flat documents and lists as arrays.
