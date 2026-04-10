# What Does 'MOVED' Redirection Mean in Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Moved, Hash Slot, Sharding, Troubleshooting

Description: Understand what the MOVED redirection means in Redis Cluster, how hash slot routing works, and how cluster-aware clients handle MOVED responses automatically.

---

## What Is the MOVED Redirection

In Redis Cluster, when you send a command to a node that does not own the hash slot for the requested key, the node returns a MOVED redirection:

```text
(error) MOVED 7638 10.0.0.2:6379
```

This tells the client:
- The key hashes to slot **7638**
- The node responsible for slot 7638 is at **10.0.0.2:6379**

The client should retry the command at the new address.

## How Redis Cluster Hash Slots Work

Redis Cluster divides the key space into 16,384 hash slots. Every key maps to exactly one slot using:

```text
HASH_SLOT = CRC16(key) mod 16384
```

Each primary node owns a range of slots. For example:
- Node A: slots 0-5460
- Node B: slots 5461-10922
- Node C: slots 10923-16383

When you run `GET foo`, Redis computes the hash slot for `foo` and routes the command to the node that owns that slot.

## When MOVED Occurs

MOVED occurs when:

1. You connect directly to a node (not using a cluster-aware client)
2. You use `redis-cli` without the `-c` flag
3. The cluster slot assignment has changed (resharding) and the client cache is stale
4. You manually connect to a specific node

```bash
# Without -c flag, MOVED is returned as an error
redis-cli -h 10.0.0.1 -p 6379 GET foo
# (error) MOVED 12182 10.0.0.3:6379

# With -c flag, redis-cli follows MOVED redirections automatically
redis-cli -c -h 10.0.0.1 -p 6379 GET foo
# -> Redirected to slot [12182] located at 10.0.0.3:6379
# "bar"
```

## How Cluster-Aware Clients Handle MOVED

Modern cluster clients maintain a local slot table mapping each slot to its owning node. When a MOVED error is received:

1. The client updates its slot table with the new node for that slot
2. The client retries the command at the correct node
3. The corrected routing is cached for future commands

This means MOVED errors are typically transparent to the application.

### Python (redis-py cluster)

```python
from redis.cluster import RedisCluster

# Cluster client handles MOVED automatically
rc = RedisCluster(
    host='10.0.0.1',
    port=6379,
    skip_full_coverage_check=False
)

# This will follow MOVED redirections transparently
rc.set('mykey', 'myvalue')
value = rc.get('mykey')
```

### Node.js (ioredis cluster)

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: '10.0.0.1', port: 6379 },
  { host: '10.0.0.2', port: 6379 },
  { host: '10.0.0.3', port: 6379 }
]);

// ioredis handles MOVED transparently
cluster.set('mykey', 'myvalue');
```

### Java (Jedis cluster)

```java
Set<HostAndPort> nodes = new HashSet<>();
nodes.add(new HostAndPort("10.0.0.1", 6379));
nodes.add(new HostAndPort("10.0.0.2", 6379));
nodes.add(new HostAndPort("10.0.0.3", 6379));

JedisCluster jedisCluster = new JedisCluster(nodes);
// Handles MOVED redirections automatically
jedisCluster.set("mykey", "myvalue");
```

## Calculating the Hash Slot Manually

You can calculate the slot a key maps to:

```python
def crc16(data):
    crc = 0
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
    return crc & 0xffff

def key_hash_slot(key):
    # Handle hash tags {tag}
    s = key.find('{')
    if s >= 0:
        e = key.find('}', s + 1)
        if e > s + 1:
            key = key[s+1:e]
    return crc16(key.encode()) % 16384

print(key_hash_slot("foo"))  # 12182
print(key_hash_slot("bar"))  # 5061
```

Or use redis-cli:

```bash
redis-cli CLUSTER KEYSLOT foo
# (integer) 12182
```

## Hash Tags for Multi-Key Operations

Cross-slot errors occur when a multi-key operation spans multiple slots. Redis returns a `CROSSSLOT` error instead of executing the command. Use hash tags to force keys to the same slot:

```bash
# These keys will be on different slots
redis-cli CLUSTER KEYSLOT user:100
redis-cli CLUSTER KEYSLOT order:100

# With hash tags, both map to the same slot
redis-cli CLUSTER KEYSLOT {user:100}.profile
redis-cli CLUSTER KEYSLOT {user:100}.orders
```

In practice:

```python
# MSET on keys in different slots will fail in cluster mode
rc.mset({'user:100': 'alice', 'order:100': 'pending'})  # CROSSSLOT error

# Use hash tags to co-locate
rc.mset({'{100}.user': 'alice', '{100}.order': 'pending'})  # Works
```

## Debugging Slot Assignment

```bash
# Show which node owns each slot range
redis-cli -h 10.0.0.1 -p 6379 CLUSTER SHARDS

# Show all slot to node mappings
redis-cli -h 10.0.0.1 -p 6379 CLUSTER SLOTS
```

## Summary

The MOVED redirection in Redis Cluster tells a client that the key belongs to a different node and provides the correct address. Using `redis-cli -c` or a cluster-aware client handles MOVED transparently. For multi-key operations, use hash tags `{tag}` to ensure all related keys map to the same hash slot, avoiding CROSSSLOT errors entirely.
