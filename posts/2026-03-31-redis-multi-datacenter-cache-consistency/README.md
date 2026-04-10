# How to Implement Multi-Datacenter Cache Consistency with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Multi-Datacenter, Consistency, Replication

Description: Learn how to maintain Redis cache consistency across multiple datacenters using active-passive replication and cross-DC invalidation patterns.

---

When your application runs in multiple datacenters (or regions), each DC has its own Redis instance for low-latency reads. The challenge is keeping them consistent: a write in DC-East must invalidate cached entries in DC-West within an acceptable window.

## Architecture Options

```text
Option A: Active-Passive Replication
  DC-East (primary writes) --> replicates --> DC-West (read-only replica)

Option B: Cross-DC Invalidation via Pub/Sub or message queue
  Any DC writes --> publishes invalidation event --> all DCs evict their local cache

Option C: Read-Through with regional writes, global invalidation bus
  Best consistency, most complexity
```

## Option A: Redis Active-Passive Replication

Configure the West replica to replicate from East.

```bash
# On redis-west.internal, in redis.conf
replicaof redis-east.internal 6379

# Or at runtime
redis-cli -h redis-west.internal REPLICAOF redis-east.internal 6379

# Verify replication status
redis-cli -h redis-east.internal INFO replication
```

```python
import redis

# Writers always go to the primary
primary = redis.Redis(host="redis-east.internal", port=6379, decode_responses=True)

# Readers in West use the local replica
replica_west = redis.Redis(host="redis-west.internal", port=6379, decode_responses=True)

def write_data(key: str, value: dict, ttl: int = 300):
    import json
    primary.set(key, json.dumps(value), ex=ttl)

def read_data_west(key: str) -> dict | None:
    import json
    raw = replica_west.get(key)
    return json.loads(raw) if raw else None
```

## Option B: Cross-DC Invalidation Bus

Use a message queue (or Redis Pub/Sub with cross-DC tunnel) to broadcast invalidations.

```python
import json
import threading

# Each DC has its own Redis
dc_redis = {
    "east": redis.Redis(host="redis-east.internal", port=6379, decode_responses=True),
    "west": redis.Redis(host="redis-west.internal", port=6379, decode_responses=True),
}

INVALIDATION_CHANNEL = "global:cache:invalidations"

def write_with_invalidation(key: str, value: dict, origin_dc: str, ttl: int = 300):
    # Write to local DC
    dc_redis[origin_dc].set(key, json.dumps(value), ex=ttl)

    # Publish invalidation to all DCs
    event = json.dumps({"key": key, "origin": origin_dc})
    for dc, client in dc_redis.items():
        try:
            client.publish(INVALIDATION_CHANNEL, event)
        except redis.RedisError:
            pass  # Best-effort cross-DC invalidation

def start_invalidation_listener(local_dc: str):
    def listen():
        pubsub = dc_redis[local_dc].pubsub()
        pubsub.subscribe(INVALIDATION_CHANNEL)
        for message in pubsub.listen():
            if message["type"] != "message":
                continue
            event = json.loads(message["data"])
            if event["origin"] == local_dc:
                continue  # Don't evict data we just wrote locally
            key = event["key"]
            # Evict from local cache
            dc_redis[local_dc].delete(key)
            print(f"[{local_dc}] Evicted: {key} (from {event['origin']})")

    threading.Thread(target=listen, daemon=True).start()
```

## Monitoring Replication Lag

```bash
# Check replication offset difference between primary and replica
redis-cli -h redis-east.internal INFO replication | grep master_repl_offset
redis-cli -h redis-west.internal INFO replication | grep slave_repl_offset

# Lag in bytes
redis-cli -h redis-east.internal INFO replication | grep -E "lag|offset"
```

## Handling Split-Brain (Both DCs Accepting Writes)

```python
# Lua script for atomic check-and-set based on timestamp
WRITE_IF_NEWER = """
local existing = redis.call('GET', KEYS[1])
if existing then
    local current = cjson.decode(existing)
    if current['ts'] and tonumber(current['ts']) > tonumber(ARGV[1]) then
        return 0
    end
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
"""

def write_with_version(key: str, value: dict, ttl: int = 300):
    import time
    ts = time.time()
    versioned = json.dumps({"data": value, "ts": ts})
    # Atomically update only if our timestamp is newer
    primary.eval(WRITE_IF_NEWER, 1, key, str(ts), versioned, str(ttl))
```

## Summary

Multi-datacenter cache consistency in Redis uses active-passive replication for low-latency reads with eventual consistency, or a cross-DC invalidation bus for stronger consistency. Active-passive is simpler but has replication lag proportional to network latency. The invalidation bus pattern gives faster consistency with slightly more infrastructure, making it preferable for data where stale reads are costly.

