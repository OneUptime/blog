# How to Implement Eventual Consistency Patterns with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Eventual Consistency, Pattern, Distributed System, Cache

Description: Implement eventual consistency patterns in distributed systems using Redis to reconcile divergent replicas, propagate updates asynchronously, and detect conflicts with vector clocks.

---

Eventual consistency accepts that distributed nodes may temporarily disagree but guarantees they will converge. Redis supports several patterns that implement eventual consistency: write-behind propagation, last-write-wins with timestamps, and conflict detection with version vectors.

## Write-Behind Propagation

Write to Redis immediately for low latency, then propagate to the primary database asynchronously:

```python
import redis
import json
import time

r = redis.Redis()

def write_behind_update(entity_id, data):
    key = f"entity:{entity_id}"
    data["updated_at"] = time.time()
    r.set(key, json.dumps(data), ex=3600)
    # Queue for async persistence
    r.rpush("write_behind:queue", json.dumps({"id": entity_id, "data": data}))

def flush_write_behind():
    while True:
        raw = r.lpop("write_behind:queue")
        if not raw:
            break
        item = json.loads(raw)
        try:
            db.execute("UPDATE entities SET data=%s WHERE id=%s",
                      json.dumps(item["data"]), item["id"])
        except Exception:
            r.lpush("write_behind:queue", raw)  # Re-queue on failure
            break
```

## Last-Write-Wins with Timestamps

When two updates arrive out of order, keep the one with the higher timestamp:

```python
def lww_update(entity_id, data, ts):
    key = f"entity:{entity_id}"
    lua_script = """
    local current = redis.call('GET', KEYS[1])
    if current then
      local current_data = cjson.decode(current)
      if tonumber(current_data['updated_at']) >= tonumber(ARGV[2]) then
        return 0
      end
    end
    redis.call('SET', KEYS[1], ARGV[1], 'EX', '3600')
    return 1
    """
    payload = json.dumps({**data, "updated_at": ts})
    return r.eval(lua_script, 1, key, payload, ts)
```

## Read Repair

On read, check for divergence between Redis and the primary database and fix it:

```python
def read_with_repair(entity_id):
    redis_data = r.get(f"entity:{entity_id}")
    db_data = db.query("SELECT * FROM entities WHERE id = %s", entity_id)

    if redis_data is None and db_data:
        # Redis is stale - backfill
        r.set(f"entity:{entity_id}", json.dumps(db_data), ex=3600)
        return db_data

    if redis_data and db_data:
        rd = json.loads(redis_data)
        if rd.get("updated_at", 0) < db_data.get("updated_at", 0):
            # Database is newer - repair Redis
            r.set(f"entity:{entity_id}", json.dumps(db_data), ex=3600)
            return db_data
        return rd

    return json.loads(redis_data) if redis_data else None
```

## Version Vectors for Conflict Detection

Track which replica made which update to detect true conflicts:

```python
def update_with_version(entity_id, data, node_id):
    key = f"entity:{entity_id}"
    version_key = f"entity:{entity_id}:version"
    r.hincrby(version_key, node_id, 1)
    version_vector = r.hgetall(version_key)
    payload = {**data, "version": {k.decode(): int(v) for k, v in version_vector.items()}}
    r.set(key, json.dumps(payload), ex=3600)
    return payload["version"]

def is_concurrent_update(version_a, version_b):
    """Returns True if the versions are concurrent (conflict)"""
    all_keys = set(version_a) | set(version_b)
    a_dominates = any(version_a.get(k, 0) > version_b.get(k, 0) for k in all_keys)
    b_dominates = any(version_b.get(k, 0) > version_a.get(k, 0) for k in all_keys)
    return a_dominates and b_dominates
```

## Saga-Style Compensation

For multi-step operations, compensate failed steps to restore consistency:

```python
def transfer_credits(from_id, to_id, amount):
    r.decrby(f"credits:{from_id}", amount)
    try:
        r.incrby(f"credits:{to_id}", amount)
    except Exception:
        # Compensate: undo the debit
        r.incrby(f"credits:{from_id}", amount)
        raise
```

## Summary

Redis supports eventual consistency through write-behind propagation for low-latency writes, last-write-wins timestamps for simple conflict resolution, read repair for self-healing caches, and version vectors for detecting true concurrent conflicts. Choose the pattern based on your tolerance for stale reads and the cost of data divergence in your domain.
