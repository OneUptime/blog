# How to Handle Serialization Versioning in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Serialization, Schema Evolution

Description: Learn how to handle serialization versioning in Redis so you can evolve data schemas without cache stampedes, migration downtime, or deserialization errors.

---

When your application evolves, cached data in Redis may have been written with an old schema. Reading it with new code fails unless you plan for versioning from the start.

## Strategy 1: Version in the Key Name

The simplest approach - include the schema version in the Redis key:

```python
import json
import redis

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

SCHEMA_VERSION = 2

def cache_key(user_id: int) -> str:
    return f"user:{user_id}:v{SCHEMA_VERSION}"

def store_user(user_id: int, data: dict):
    client.set(cache_key(user_id), json.dumps(data), ex=3600)

def get_user(user_id: int):
    raw = client.get(cache_key(user_id))
    if raw is None:
        return None  # Cache miss - fetch from DB
    return json.loads(raw)
```

When you bump `SCHEMA_VERSION`, old keys are simply missed (cache miss) and re-populated with new schema. Old keys expire naturally via TTL.

## Strategy 2: Version Embedded in Payload

```python
import json

def serialize_v2(data: dict) -> str:
    return json.dumps({
        "_v": 2,
        **data,
    })

def deserialize(raw: str) -> dict:
    obj = json.loads(raw)
    version = obj.get("_v", 1)  # assume v1 if no version field

    if version == 1:
        return migrate_v1_to_v2(obj)
    elif version == 2:
        return obj
    else:
        raise ValueError(f"Unknown schema version: {version}")

def migrate_v1_to_v2(obj: dict) -> dict:
    # v1 had 'username', v2 renamed it to 'name'
    obj["name"] = obj.pop("username", "")
    obj["_v"] = 2
    return obj
```

## Strategy 3: Binary Formats with Schema Registry

For binary formats like Avro or protobuf, prepend a schema ID:

```python
import struct
import io
import fastavro

SCHEMAS = {
    1: v1_schema,
    2: v2_schema,
}
CURRENT_VERSION = 2

def pack(data: dict) -> bytes:
    buf = io.BytesIO()
    buf.write(struct.pack(">H", CURRENT_VERSION))
    fastavro.schemaless_writer(buf, SCHEMAS[CURRENT_VERSION], data)
    return buf.getvalue()

def unpack(raw: bytes) -> dict:
    version = struct.unpack(">H", raw[:2])[0]
    buf = io.BytesIO(raw[2:])
    return fastavro.schemaless_reader(buf, SCHEMAS[version], reader_schema=SCHEMAS[CURRENT_VERSION])
```

## Lazy Migration Pattern

Read old version, write back new version on cache hit:

```python
def get_with_migration(user_id: int):
    raw = client.get(f"user:{user_id}")
    if raw is None:
        return None

    # Check version before deserialize migrates it
    original_version = json.loads(raw).get("_v", 1)
    data = deserialize(raw)

    # If we got an old version, re-cache as v2
    if original_version != 2:
        client.set(f"user:{user_id}", serialize_v2(data), ex=3600)

    return data
```

## Summary

Handle Redis serialization versioning by either including the version in the key (simplest, causes cache misses during rollout), embedding a version field in the payload (allows lazy migration without stampedes), or prepending a schema ID for binary formats. The lazy migration pattern - migrate on read and re-cache - avoids bulk re-population jobs and spreads migration load naturally over time.
