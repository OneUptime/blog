# Why You Should Not Use Single Large Hash in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hash, Anti-Pattern

Description: Understand why storing everything in one giant Redis hash creates hotspots and limits scalability, and how to partition data across many smaller hashes.

---

A common beginner pattern is to put all data of a certain type into a single Redis hash - one hash for all user profiles, one hash for all product prices. This feels convenient but becomes a serious bottleneck at scale.

## The Single Large Hash Anti-Pattern

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Anti-pattern: one hash for ALL users
r.hset("users", "user:1", '{"name": "Alice"}')
r.hset("users", "user:2", '{"name": "Bob"}')
# ... millions of fields in ONE key
```

## Why This Fails at Scale

**Single hotspot key.** Every user read and write hits the same key. In a Redis Cluster, this key lives on one shard, creating a CPU and network hotspot while other shards sit idle.

**Slow hash operations.** HGETALL on a 100K-field hash transfers megabytes of data. Even HSCAN is slow when fields are numerous:

```bash
# HGETALL on a 1M-field hash blocks and returns ~50-100MB
HGETALL users  # Do not run this in production
```

**No per-field TTL (before Redis 7.4).** Prior to Redis 7.4, hash fields cannot have individual expiration times. Redis 7.4 introduced `HEXPIRE` and related commands for per-field expiration, but the other scaling issues with a single large hash still apply.

**Memory inefficiency at scale.** Redis uses a compact encoding (listpack in Redis 7.0+, ziplist in earlier versions) for small hashes, but switches to a hashtable when a hash exceeds 128 fields or any field value exceeds 64 bytes. A single massive hash is always a hashtable - losing the memory-efficient encoding.

## The Right Pattern: One Hash Per Entity

```python
# Correct: separate hash per user
def set_user_profile(user_id: str, profile: dict):
    r.hset(f"user:{user_id}", mapping=profile)
    # Can set TTL per user
    r.expire(f"user:{user_id}", 86400)

def get_user_profile(user_id: str) -> dict:
    return r.hgetall(f"user:{user_id}")

def update_user_field(user_id: str, field: str, value: str):
    r.hset(f"user:{user_id}", field, value)
```

This distributes load across many keys, which spread naturally across Redis Cluster shards.

## Batch Reads Without a Monolithic Hash

Need to read multiple users at once? Use a pipeline:

```python
def get_many_users(user_ids: list[str]) -> dict:
    pipe = r.pipeline(transaction=False)
    for uid in user_ids:
        pipe.hgetall(f"user:{uid}")
    results = pipe.execute()
    return {uid: data for uid, data in zip(user_ids, results) if data}
```

## When a Single Hash IS Appropriate

Small, bounded collections work well as a single hash:

```python
# Fine: a hash for application-level config (< 50 fields, rarely changes)
r.hset("config:app", mapping={
    "max_retries": 3,
    "timeout_ms": 5000,
    "feature_flag_x": 1
})

# Fine: a hash for a specific product's attributes
r.hset("product:sku_123", mapping={
    "name": "Widget Pro",
    "price": "19.99",
    "category": "tools"
})
```

## Partitioning Large Collections

If you have a lookup table with millions of entries, partition it using a hash function:

```python
import zlib

NUM_PARTITIONS = 64

def get_partition(key: str) -> int:
    return zlib.crc32(key.encode()) % NUM_PARTITIONS

def set_in_partitioned_hash(collection: str, field: str, value: str):
    partition = get_partition(field)
    r.hset(f"{collection}:{partition}", field, value)

def get_from_partitioned_hash(collection: str, field: str) -> str | None:
    partition = get_partition(field)
    return r.hget(f"{collection}:{partition}", field)
```

## Summary

A single large Redis hash creates a CPU hotspot that prevents horizontal scaling across a Redis Cluster. Use one hash per entity to distribute load, enable per-entity TTLs, and keep hash sizes small enough for efficient encoding. Reserve single hashes for small, bounded configuration or attribute collections.
