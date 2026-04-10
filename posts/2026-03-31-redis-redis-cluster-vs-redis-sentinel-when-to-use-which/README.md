# Redis Cluster vs Redis Sentinel: When to Use Which

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, Redis Sentinel, High Availability, Scaling

Description: Understand the difference between Redis Cluster and Redis Sentinel, when to use each, and how to configure clients for both topologies.

---

## Overview

Redis offers two high-availability topologies: Redis Sentinel and Redis Cluster. Sentinel provides automated failover for a single primary-replica setup. Cluster provides both horizontal scaling and high availability by sharding data across multiple primaries. Choosing the wrong one is a common architectural mistake.

## Redis Sentinel

Sentinel monitors Redis instances and performs automatic failover when a primary goes down. It does not shard data - all data lives on a single primary (with replicas for reads and failover).

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1

# Start sentinel
redis-sentinel /etc/redis/sentinel.conf
```

```python
from redis.sentinel import Sentinel

# Connect to sentinels
sentinel = Sentinel(
    [('sentinel1', 26379), ('sentinel2', 26379), ('sentinel3', 26379)],
    socket_timeout=0.5
)

# Get primary connection (auto-redirects on failover)
primary = sentinel.master_for('mymaster', socket_timeout=0.5)
primary.set('key', 'value')

# Get replica connection for reads
replica = sentinel.slave_for('mymaster', socket_timeout=0.5)
value = replica.get('key')
```

### Failover Flow

```text
Normal:   App asks Sentinel for primary/replica addresses
          App -> Primary (reads/writes)
          App -> Replica (reads)

Failover: Primary fails
          Sentinel detects (quorum)
          Sentinel promotes replica to primary
          Sentinel notifies clients via pub/sub
          App reconnects to new primary
```

## Redis Cluster

Cluster shards data across 16,384 hash slots, distributed among multiple primary nodes. Each primary can have replicas for failover.

```bash
# Minimal cluster: 3 primaries + 3 replicas
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1

# Check cluster status
redis-cli -c -p 7000 cluster info
redis-cli -c -p 7000 cluster nodes
```

```python
from redis.cluster import RedisCluster, ClusterNode

# Cluster-aware client handles redirects automatically
cluster = RedisCluster(
    startup_nodes=[
        ClusterNode("127.0.0.1", 7000),
        ClusterNode("127.0.0.1", 7001),
    ],
    decode_responses=True
)

cluster.set("user:123", "Alice")
value = cluster.get("user:123")
```

### Hash Tags for Co-location

```bash
# Force keys to the same slot using hash tags {}
SET {user:123}:profile "Alice"
SET {user:123}:sessions "sess_abc"

# These are in the same slot, so MGET works
MGET {user:123}:profile {user:123}:sessions
```

```python
# Pipelining across slots requires care in cluster mode
pipe = cluster.pipeline()
pipe.set("{user:123}:profile", "Alice")   # same slot
pipe.set("{user:123}:email", "alice@example.com")  # same slot
pipe.execute()
```

## Feature Comparison

```text
Feature                  | Sentinel                  | Cluster
-------------------------|---------------------------|---------------------------
Data sharding            | No (single primary)       | Yes (16384 hash slots)
Max dataset size         | Limited by single node RAM| Sum of all nodes' RAM
Horizontal scaling       | No                        | Yes (add nodes live)
High availability        | Yes (primary failover)    | Yes (per-shard failover)
Multi-key operations     | All keys                  | Only same-slot keys
Lua scripts              | All keys                  | Only same-slot keys
Client complexity        | Low (sentinel-aware)      | Medium (cluster-aware)
Minimum nodes            | 1 primary + 3 sentinels   | 3 primaries (6 with HA)
```

## When to Use Sentinel

- Your dataset fits on a single Redis node
- You need simple primary-replica failover without sharding complexity
- Your application uses multi-key operations (MGET, Lua, transactions) heavily
- You want minimal operational complexity

## When to Use Cluster

- Your dataset exceeds a single node's memory
- You need horizontal write scaling across multiple primaries
- You can design keys with hash tags to keep related keys co-located
- You need to scale read AND write throughput beyond a single node

## Migrating from Sentinel to Cluster

```bash
# 1. Check current data size
redis-cli info memory | grep used_memory_human

# 2. Create new cluster
redis-cli --cluster create ... --cluster-replicas 1

# 3. Use redis-cli --cluster import (from standalone)
redis-cli --cluster import 127.0.0.1:7000 \
  --cluster-from 127.0.0.1:6379 \
  --cluster-copy  # keep source data

# 4. Update application connection strings
```

## Summary

Redis Sentinel is the right choice for applications that need automated failover without data sharding - simpler to operate with full support for multi-key operations. Redis Cluster is necessary when your dataset outgrows a single node or you need horizontal write scaling, but requires cluster-aware clients and key co-location planning for multi-key operations. Start with Sentinel; migrate to Cluster when your data size or write throughput demands it.
