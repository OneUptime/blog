# How to Migrate from Redis to DragonflyDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DragonflyDB, Migration, Performance, Caching

Description: Learn how to migrate from Redis to DragonflyDB using RDB snapshots or live replication, covering compatibility checks and validation steps.

---

DragonflyDB is a Redis-compatible in-memory database designed for multi-core performance and higher memory efficiency. Because it speaks the Redis protocol, migrating is straightforward - but there are compatibility gaps to verify before cutting over.

## Compatibility Check

DragonflyDB supports most Redis commands but has some limitations:

```bash
# Check which Redis commands you use
redis-cli INFO commandstats | sort -t= -k2 -rn | head -20

# DragonflyDB known limitations (check current docs):
# - Some OBJECT subcommands differ
# - WAIT command behavior may differ
# - Lua scripting: KEYS and ARGV behave the same but some redis.call nuances differ
# - No native RedisJSON/RediSearch (as of early 2025)
```

## Option 1: RDB Snapshot Migration

**Step 1: Export RDB from Redis**

```bash
# Force a fresh RDB snapshot
redis-cli BGSAVE

# Wait for completion
redis-cli LASTSAVE

# Get file path
redis-cli CONFIG GET dir
redis-cli CONFIG GET dbfilename
# Copy the dump.rdb file
```

**Step 2: Install DragonflyDB**

```bash
# Using Docker
docker pull docker.dragonflydb.io/dragonflydb/dragonfly

# Start with existing RDB
docker run -p 6380:6379 \
  -v /path/to/redis/data:/data \
  docker.dragonflydb.io/dragonflydb/dragonfly \
  --logtostdout --requirepass yourpassword
```

**Step 3: Verify data loaded**

```bash
redis-cli -p 6380 DBSIZE
redis-cli -p 6380 INFO keyspace
```

## Option 2: Live Migration via Replication

DragonflyDB supports acting as a replica of Redis, enabling a live migration with minimal downtime.

**Step 1: Start DragonflyDB**

```bash
docker run -d --name dragonfly \
  -p 6380:6379 \
  -v dragonfly-data:/data \
  docker.dragonflydb.io/dragonflydb/dragonfly \
  --requirepass yourpassword \
  --logtostdout
```

**Step 2: Configure DragonflyDB to replicate from Redis**

```bash
# Connect to DragonflyDB and set it as replica of Redis
redis-cli -p 6380 -a yourpassword REPLICAOF <redis-host> 6379

# Monitor replication status
redis-cli -p 6380 -a yourpassword INFO replication
```

**Step 3: Verify replication sync**

```bash
# Check offset on both sides
redis-cli -h <redis-host> INFO replication | grep master_repl_offset
redis-cli -p 6380 INFO replication | grep master_repl_offset
```

**Step 4: Promote DragonflyDB and cut over**

```bash
# Stop writes to Redis, then promote DragonflyDB
redis-cli -p 6380 -a yourpassword REPLICAOF NO ONE

# Update application connection strings
export REDIS_URL="redis://:yourpassword@dragonfly-host:6380"
```

## Benchmark Comparison

```bash
# Run redis-benchmark against both to compare
redis-benchmark -h <redis-host> -p 6379 -n 100000 -c 50 -t set,get

redis-benchmark -h <dragonfly-host> -p 6380 -n 100000 -c 50 -t set,get
```

DragonflyDB typically shows higher throughput on multi-core systems because it uses a thread-per-core architecture with shared-nothing design.

## Application Configuration

```python
import redis

# No client-side changes needed - DragonflyDB speaks Redis protocol
r = redis.Redis(
    host="dragonfly-host",
    port=6380,
    password="yourpassword",
    decode_responses=True
)

# All standard Redis operations work
r.set("test:key", "value")
r.lpush("test:list", "item1", "item2")
r.hset("test:hash", mapping={"field": "value"})

print(r.get("test:key"))
```

## Post-Migration Monitoring

```bash
# Check memory efficiency
redis-cli -p 6380 INFO memory | grep -E "used_memory_human|mem_fragmentation_ratio"

# Monitor commands per second
redis-cli -p 6380 INFO stats | grep instantaneous_ops_per_sec

# Check for any errors
redis-cli -p 6380 INFO stats | grep -E "rejected_connections|evicted_keys"
```

## Things to Watch For

- DragonflyDB does not support all Redis modules (JSON, Search, TimeSeries) as of 2025
- Cluster mode behavior differs - DragonflyDB handles multi-threading differently
- Lua script compatibility - test all scripts before migration
- Some persistence configuration options differ from Redis

## Summary

Migrating from Redis to DragonflyDB is low-risk due to protocol compatibility. Use live replication for zero-downtime migrations. Test your specific command usage and any Lua scripts beforehand, and monitor performance post-migration to confirm the expected throughput improvements on multi-core hardware.
