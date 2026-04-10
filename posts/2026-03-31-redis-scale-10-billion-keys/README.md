# How to Scale Redis for 10 Billion Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Scalability, Memory, Cluster, Performance

Description: Architect a Redis deployment capable of storing 10 billion keys using cluster sharding, memory-efficient data structures, and aggressive key optimization techniques.

---

Storing 10 billion keys in Redis requires careful architecture. A single Redis instance can hold hundreds of millions of keys on a large server, but 10 billion keys demands a cluster, memory-efficient encoding, and strict key design discipline.

## Estimating Memory Requirements

Each Redis key has overhead beyond the stored value: dictionary entry, expiry metadata, and the key string itself.

```bash
# Check per-key memory overhead for a sample key
redis-cli OBJECT ENCODING mykey
redis-cli MEMORY USAGE mykey
```

A typical string key + small string value consumes 60-80 bytes. For 10 billion keys:

```text
10,000,000,000 * 70 bytes = ~700 GB
```

With Redis Cluster using 3 primary nodes + 3 replicas:

```text
700 GB / 3 shards = ~233 GB per primary
Total cluster memory: ~1.4 TB (with replicas)
```

## Cluster Setup for Scale

```bash
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

Use server instances with 256+ GB RAM per node to accommodate 233 GB of data plus overhead.

## Key Design: Keep Keys Short

Long key names waste memory at scale. Compare:

```bash
# Bad: 34 bytes just for the key name
SET user_profile:username:12345:active 1

# Good: 9 bytes for the key name
SET u:12345:a 1
```

With 10 billion keys, saving 25 bytes per key saves 250 GB.

## Use Hash Encoding for Small Objects

Instead of individual string keys, group small values into Hashes:

```python
import redis

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Bad: 1 key per user field = 30 billion keys for 10B users with 3 fields
client.set("user:1:name", "Alice")
client.set("user:1:age", "30")
client.set("user:1:city", "NYC")

# Good: 1 hash per user = 10 billion keys for 10B users
client.hset("user:1", mapping={"name": "Alice", "age": "30", "city": "NYC"})
```

Enable hash compression in redis.conf:

```text
hash-max-listpack-entries 128
hash-max-listpack-value 64
```

## Use Integer Encoding

Redis automatically encodes small integers as integers (not strings) using `OBJ_ENCODING_INT`. Keep counter values as integers:

```bash
SET counter:user:1 0
INCR counter:user:1
```

Check the encoding:

```bash
OBJECT ENCODING counter:user:1
# int
```

## Monitor Key Distribution

```bash
# Check key count across all cluster nodes:
redis-cli --cluster info 127.0.0.1:7001
```

## Keyspace Analysis

Run SCAN-based analysis without blocking:

```bash
redis-cli --bigkeys
redis-cli --memkeys
```

## Summary

Scaling Redis to 10 billion keys requires a multi-node cluster to distribute memory load, aggressive key name compression, and smart use of hash encoding to reduce the total key count. Plan your memory budget carefully based on per-key overhead, use short key names, and group related fields into Hashes to maximize the number of entries Redis can store efficiently.
