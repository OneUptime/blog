# How to Convert Between Redis Data Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Type, Migration, Pipeline, Script

Description: Learn practical patterns for migrating data between Redis data types - from strings to hashes, lists to sorted sets, and sets to streams - without data loss.

---

As your application evolves, you may need to migrate data from one Redis type to another - for example, converting string keys into a hash for memory efficiency, or upgrading a list-based queue to a stream for consumer group support. This guide covers safe conversion patterns.

## String Keys to Hash

A common optimization: consolidate per-attribute string keys into a single hash.

```python
import redis

r = redis.Redis()

# Before: separate string keys
# SET user:1:name "Alice"
# SET user:1:age "30"
# SET user:1:city "NYC"

def strings_to_hash(user_id, fields):
    """Migrate strings to hash: read strings, write hash, delete originals."""
    pipe = r.pipeline()
    for field in fields:
        pipe.get(f"user:{user_id}:{field}")
    values = pipe.execute()

    mapping = {fields[i]: values[i].decode() for i in range(len(fields)) if values[i]}
    if mapping:
        with r.pipeline() as p:
            p.hset(f"user:{user_id}", mapping=mapping)
            for field in fields:
                p.delete(f"user:{user_id}:{field}")
            p.execute()

strings_to_hash("1", ["name", "age", "city"])
```

## List to Sorted Set (Add Timestamps)

Convert a plain list (no ordering metadata) to a sorted set with timestamps for time-range queries:

```bash
# Before: list-based queue
# RPUSH events "login" "purchase" "logout"

# After: sorted set with Unix timestamps as scores
```

```python
def list_to_sorted_set(list_key, zset_key, base_timestamp=0):
    """Convert list elements to sorted set with incremental scores."""
    elements = r.lrange(list_key, 0, -1)
    if not elements:
        return

    pipe = r.pipeline()
    for i, elem in enumerate(elements):
        score = base_timestamp + i
        pipe.zadd(zset_key, {elem: score})
    pipe.execute()
    print(f"Migrated {len(elements)} elements")

import time
list_to_sorted_set("events", "events:sorted", base_timestamp=int(time.time()))
r.delete("events")  # Clean up after verification
```

## Set to Sorted Set (Add Scores)

Promote a set to a sorted set when you need ordering:

```python
def set_to_sorted_set(set_key, zset_key, default_score=0):
    """Convert set members to sorted set with a default score."""
    members = r.smembers(set_key)
    if not members:
        return

    with r.pipeline() as pipe:
        for member in members:
            pipe.zadd(zset_key, {member: default_score})
        pipe.execute()

    print(f"Migrated {len(members)} members")

set_to_sorted_set("tags:post:1", "tags:post:1:scored")
```

## List to Stream

Convert a list-based queue to a stream for consumer group support:

```python
def list_to_stream(list_key, stream_key, field_name="payload"):
    """Migrate all list elements to a Redis stream."""
    elements = r.lrange(list_key, 0, -1)
    if not elements:
        return

    with r.pipeline() as pipe:
        for elem in elements:
            pipe.xadd(stream_key, {field_name: elem})
        pipe.execute()

    print(f"Migrated {len(elements)} items to stream")
    r.delete(list_key)

list_to_stream("job_queue", "job_stream")
```

## Hash to JSON String

When a hash grows too large or you need atomic whole-object replacement:

```python
import json

def hash_to_json_string(hash_key, string_key, ttl=None):
    """Convert hash to a JSON string value."""
    data = r.hgetall(hash_key)
    if not data:
        return

    # Decode bytes to strings
    decoded = {k.decode(): v.decode() for k, v in data.items()}
    json_str = json.dumps(decoded)

    with r.pipeline() as pipe:
        pipe.set(string_key, json_str)
        if ttl:
            pipe.expire(string_key, ttl)
        pipe.execute()
    r.delete(hash_key)
```

## Safe Migration Pattern

Always migrate in three steps: write new, verify, delete old:

```python
def safe_migrate(source_key, migrate_fn, dest_key):
    """Generic safe migration: write new format, verify, delete old."""
    # Step 1: Write to new location
    migrate_fn(source_key, dest_key)

    # Step 2: Verify destination has data
    dest_type = r.type(dest_key).decode()
    assert dest_type != "none", "Migration failed: dest key is empty"

    # Step 3: Delete source only after verification
    r.delete(source_key)
    print(f"Migration complete: {source_key} -> {dest_key} ({dest_type})")
```

## Summary

Redis does not support in-place type conversion - you must read data from the source type, write it to a new key in the target type, verify the result, then delete the original. Use pipelines to batch writes for efficiency, and always perform migrations in a separate step from the delete to avoid data loss during failures.
