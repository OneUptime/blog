# How to Migrate from Single Redis to Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, Migration, Sharding, High Availability

Description: Step-by-step guide to migrating from a standalone Redis instance to a Redis Cluster, including data migration, code changes, and hash tag planning.

---

## Overview

Moving from a standalone Redis to Redis Cluster is one of the more involved Redis migrations. Cluster shards data across 16,384 hash slots distributed among multiple primaries. Not all Redis operations work the same way in cluster mode, so you need to plan the migration carefully.

## Pre-Migration Checklist

```bash
# 1. Check your current data size
redis-cli INFO memory | grep used_memory_human

# 2. List operations that don't work in cluster mode
# Multi-key commands across different slots fail
redis-cli MGET user:1 user:2  # may fail if on different nodes

# 3. Audit Lua scripts for multi-key usage
# Scripts must only access keys on the same slot

# 4. Check for KEYS / SCAN patterns on large datasets
# In cluster mode, SCAN only scans the local node
```

## Step 1: Plan Hash Tags

In cluster mode, related keys that need to be accessed together must share a hash tag to land in the same slot.

```bash
# Without hash tags: keys may be on different nodes
SET user:123:profile "Alice"      # slot 9186
SET user:123:sessions "sess_abc"  # slot 7024
MGET user:123:profile user:123:sessions  # ERROR in cluster mode

# With hash tags: keys share the same slot
SET {user:123}:profile "Alice"        # slot determined by {user:123}
SET {user:123}:sessions "sess_abc"    # same slot
MGET {user:123}:profile {user:123}:sessions  # OK
```

```python
# Helper: compute which slot a key maps to
import redis.cluster

def get_slot(key: str) -> int:
    # Extracts hash tag if present
    return redis.cluster.key_slot(key.encode())

# Test your key naming before migration
keys_to_check = [
    "{user:123}:profile",
    "{user:123}:sessions",
    "user:123:profile",   # no hash tag
]
for key in keys_to_check:
    print(f"{key} -> slot {get_slot(key)}")
```

## Step 2: Set Up Redis Cluster

```bash
# Create cluster configuration files
mkdir -p /etc/redis/cluster/{7000,7001,7002,7003,7004,7005}

for port in 7000 7001 7002 7003 7004 7005; do
  cat > /etc/redis/cluster/$port/redis.conf << EOF
port $port
cluster-enabled yes
cluster-config-file nodes-$port.conf
cluster-node-timeout 5000
appendonly yes
dir /var/lib/redis/cluster/$port
logfile /var/log/redis/cluster-$port.log
EOF
done

# Start all nodes
for port in 7000 7001 7002 7003 7004 7005; do
  redis-server /etc/redis/cluster/$port/redis.conf &
done

# Create the cluster (3 primaries + 3 replicas)
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1 --cluster-yes

# Verify cluster health
redis-cli -c -p 7000 CLUSTER INFO
redis-cli -c -p 7000 CLUSTER NODES
```

## Step 3: Migrate Data

### Using redis-cli --cluster import

```bash
# Import from standalone Redis into the cluster
redis-cli --cluster import 127.0.0.1:7000 \
  --cluster-from 127.0.0.1:6379 \
  --cluster-from-user default \
  --cluster-from-pass "" \
  --cluster-copy  # copy (don't delete from source)
```

### Custom Migration Script for Hash Tag Renaming

If you need to rename keys to add hash tags:

```python
import redis
from redis.cluster import RedisCluster, ClusterNode

src = redis.Redis(host='localhost', port=6379)
dst = RedisCluster(startup_nodes=[
    ClusterNode("127.0.0.1", 7000)
])

def rename_key_with_hash_tag(old_key: str) -> str:
    """
    Transform: user:123:profile -> {user:123}:profile
    """
    parts = old_key.split(":")
    if len(parts) >= 2:
        # Wrap first two parts as hash tag
        tag = f"{{{parts[0]}:{parts[1]}}}"
        remainder = ":".join(parts[2:])
        return f"{tag}:{remainder}" if remainder else tag
    return old_key

def migrate_with_rename(batch_size: int = 500):
    cursor = 0
    migrated = 0
    while True:
        cursor, keys = src.scan(cursor, count=batch_size)
        for key in keys:
            key_str = key.decode()
            new_key = rename_key_with_hash_tag(key_str)

            serialized = src.dump(key)
            if serialized:
                ttl_ms = src.pttl(key)
                ttl = max(0, ttl_ms) if ttl_ms > 0 else 0
                dst.restore(new_key, ttl, serialized, replace=True)
                migrated += 1

        if cursor == 0:
            break

    print(f"Migrated {migrated} keys")
```

## Step 4: Update Application Code

```python
# Before: standard Redis connection
import redis
client = redis.Redis(host='localhost', port=6379)

# After: cluster client
from redis.cluster import RedisCluster, ClusterNode

client = RedisCluster(
    startup_nodes=[ClusterNode("127.0.0.1", 7000)],
    decode_responses=True,
    skip_full_coverage_check=False
)

# Multi-key operations with hash tags
client.mset({"{user:123}:profile": "Alice", "{user:123}:email": "alice@ex.com"})
client.mget("{user:123}:profile", "{user:123}:email")
```

```python
# Pipeline in cluster mode - only same-slot keys
pipe = client.pipeline()
pipe.set("{user:123}:profile", "Alice")  # same slot
pipe.set("{user:123}:score", 1500)       # same slot
pipe.execute()
```

## Step 5: Test and Validate

```bash
# Test basic operations
redis-cli -c -p 7000 SET test:key "value"
redis-cli -c -p 7000 GET test:key

# Check slot distribution
redis-cli --cluster check 127.0.0.1:7000

# Rebalance if slots are uneven
redis-cli --cluster rebalance 127.0.0.1:7000

# Verify key count matches
redis-cli -p 6379 DBSIZE   # standalone
for port in 7000 7001 7002; do
  echo "Node $port: $(redis-cli -p $port DBSIZE) keys"
done
```

## Common Pitfalls

```bash
# Pitfall 1: KEYS command only returns local node keys
redis-cli -c -p 7000 KEYS "user:*"  # only returns keys on node 7000

# Fix: use SCAN with cluster-aware client
python3 -c "
from redis.cluster import RedisCluster, ClusterNode
c = RedisCluster(startup_nodes=[ClusterNode('127.0.0.1', 7000)])
keys = list(c.scan_iter('user:*'))
print(f'Total keys: {len(keys)}')
"

# Pitfall 2: SELECT db > 0 not supported in cluster mode
# Cluster only supports database 0

# Pitfall 3: WATCH/MULTI/EXEC transactions require same-slot keys
```

## Summary

Migrating from standalone Redis to Redis Cluster requires planning hash tags to co-locate related keys, updating application code to use cluster-aware clients, and migrating data using `redis-cli --cluster import` or custom scripts. The key preparation step is identifying which multi-key operations need hash tags and renaming keys accordingly. Test thoroughly in a staging cluster before cutting over production traffic.
