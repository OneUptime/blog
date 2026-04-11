# How Redis Handles Large Keys During Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Performance

Description: Learn how Redis replicates large keys, the risks of RDB full resync overhead, and strategies for managing large keys in replicated deployments.

---

Large keys in Redis - those consuming megabytes of memory - can cause significant problems during replication, especially during full resync operations. Understanding how Redis handles them lets you design safer data models.

## What Is a Large Key?

There is no strict definition, but keys consuming more than 1MB are generally considered large. Common examples:
- A hash with millions of fields
- A list with hundreds of thousands of elements
- A sorted set with many high-cardinality members
- A string value storing a large JSON blob

Check key size:

```bash
redis-cli MEMORY USAGE mykey SAMPLES 0
redis-cli --bigkeys
```

## How Large Keys Affect RDB Replication

When a replica connects to a primary for the first time (or reconnects after losing sync), Redis performs a full resync by generating an RDB snapshot. Large keys are serialized into this RDB file.

Serializing a large key takes time and memory. During this time, the primary forks a child process:

```bash
redis-cli INFO persistence | grep "rdb_bgsave_in_progress"
redis-cli INFO stats | grep "latest_fork_usec"
```

Fork time is proportional to memory used. A 10GB dataset can take seconds to fork on systems without huge pages, causing latency spikes.

## Replication Buffer Pressure

During RDB generation, new write commands are accumulated in the replica's client output buffer. If a large key write arrives while the RDB is being generated, it goes into this buffer. If the buffer exceeds the configured limit, the replica disconnects and triggers another full resync - a loop:

```bash
redis-cli CONFIG GET client-output-buffer-limit
redis-cli CONFIG SET client-output-buffer-limit "replica 512mb 128mb 60"
```

## Streaming Large Keys

Redis has supported diskless replication since version 2.8.18, and it became the default in Redis 7.0. It streams the RDB directly to replicas without writing it to disk first. This helps with large key replication on systems with slow disks:

```bash
redis-cli CONFIG SET repl-diskless-sync yes
redis-cli CONFIG SET repl-diskless-sync-delay 5
```

## Best Practices for Large Keys

Break up large keys into smaller ones. For example, instead of one hash with a million fields, use a consistent hash to distribute across 100 smaller hashes:

```bash
# Instead of one large hash
# HSET user-data field1 val1 field2 val2 ...

# Use key sharding
HSET user-data:shard1 field1 val1
HSET user-data:shard2 field2 val2
```

For large strings, consider compressing the value before storing:

```python
import redis
import zlib

r = redis.Redis()
compressed = zlib.compress(large_json.encode())
r.set("compressed-key", compressed)
```

## Monitoring Large Key Impact on Replication

Watch for replication lag caused by large key operations:

```bash
redis-cli INFO replication | grep "lag="
```

## Summary

Large keys slow down Redis replication by increasing RDB snapshot size and fork time, which can cause latency spikes and replication lag. Using diskless replication, increasing the replication backlog, and splitting large keys into smaller shards are the main strategies for managing this risk.
