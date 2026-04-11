# How to Scale Redis for Multi-Region Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Region, Global Replication, High Availability, Redis Enterprise, Geo-Distribution

Description: Architect Redis for multi-region deployments using active-passive replication, Redis Cluster with geo-distribution, and conflict-free strategies for global applications.

---

## Multi-Region Redis Architectures

Scaling Redis across multiple geographic regions enables:
- Low-latency reads for users close to each region
- Disaster recovery with automatic failover
- Data residency compliance

The main architectural patterns are:
1. Active-Passive - one primary region, replicas in other regions (read-only)
2. Active-Active - writes accepted in all regions, conflicts resolved automatically
3. Read Local/Write Global - all writes go to a single global primary, reads are local

## Pattern 1 - Active-Passive with Cross-Region Replication

Set up a replica in a different region pointing to the primary:

```bash
# On the replica Redis server in region B
redis-cli REPLICAOF primary-redis.region-a.example.com 6379

# Check replication status
redis-cli INFO replication
```

Configuration for the replica:

```bash
# replica redis.conf in region B
replicaof primary-redis.region-a.example.com 6379
replica-read-only yes
replica-lazy-flush yes      # async flush reduces network pressure
repl-backlog-size 64mb      # larger backlog tolerates network hiccups
repl-timeout 60             # allow more time for cross-region sync
```

### Application Routing

```python
import redis

# Route reads to local region, writes to primary
PRIMARY_REDIS = redis.Redis(host='redis-primary.region-a.example.com', port=6379)
LOCAL_REPLICA = redis.Redis(host='redis-replica.region-b.example.com', port=6379)

def get(key: str):
    return LOCAL_REPLICA.get(key)

def set(key: str, value: str, ttl: int = 3600):
    return PRIMARY_REDIS.setex(key, ttl, value)
```

## Pattern 2 - Redis Sentinel with Cross-Region Failover

Use Sentinel to monitor and failover the primary:

```bash
# sentinel.conf - same config on all sentinel nodes
sentinel monitor mymaster primary-redis.region-a.example.com 6379 2
sentinel down-after-milliseconds mymaster 10000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

Connect using Sentinel client that automatically follows the primary:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('sentinel-1.region-a.example.com', 26379),
    ('sentinel-2.region-a.example.com', 26379),
    ('sentinel-1.region-b.example.com', 26379),  # sentinel in other region
], socket_timeout=0.5)

primary = sentinel.master_for('mymaster', socket_timeout=0.5)
replica = sentinel.slave_for('mymaster', socket_timeout=0.5)
```

## Pattern 3 - Redis Cluster with Geographic Sharding

Partition the keyspace so each region owns specific hash slots:

```bash
# Create cluster nodes in each region
# Region A: 3 masters + 3 replicas, all 16384 slots start here
redis-cli --cluster create \
  redis-a1:6379 redis-a2:6379 redis-a3:6379 \
  redis-a4:6379 redis-a5:6379 redis-a6:6379 \
  --cluster-replicas 1

# Region B: add new nodes for slots 5461-10922
redis-cli --cluster add-node redis-b1:6379 redis-a1:6379
redis-cli --cluster reshard redis-a1:6379 \
  --cluster-from all \
  --cluster-to <node-id-b1> \
  --cluster-slots 5461
```

Application-side routing with hash tags:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(
    startup_nodes=[
        {"host": "redis-a1.region-a.example.com", "port": 6379},
        {"host": "redis-b1.region-b.example.com", "port": 6379},
    ],
    decode_responses=True,
)

# Use hash tags to route region-specific keys to local nodes
# Keys with {region_a} hash tag go to region A nodes
rc.set("{region_a}user:1001", '{"name": "Alice"}')
rc.set("{region_b}user:2001", '{"name": "Bob"}')
```

## Pattern 4 - Active-Active with Redis Enterprise

Redis Enterprise and Redis Cloud support active-active (CRDT-based) geo-replication:

```bash
# Using Redis Enterprise REST API to create active-active database
curl -X POST https://cluster-a.example.com:9443/v1/bdbs \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "name": "my-global-db",
    "crdt": true,
    "crdt_sync_sources": [
      {"uri": "redis://cluster-b.example.com:6379"}
    ],
    "replication": true
  }'
```

With active-active, last-write-wins is used for conflicts. Design keys to minimize conflicts:

```python
# Use region-prefixed keys to avoid conflicts on the same key
import os

REGION = os.environ.get('REGION', 'us-east-1')

def region_key(key: str) -> str:
    """Prefix key with region to avoid write conflicts."""
    return f"{REGION}:{key}"

# For shared counters, use Redis INCR - CRDTs handle counter conflicts correctly
rc.incr("global:page_views")
```

## Monitoring Cross-Region Replication Lag

```bash
# Check replication offset and lag
redis-cli INFO replication | grep -E "master_repl_offset|slave_repl_offset|lag"

# Monitor replication lag in real time
watch -n 1 "redis-cli -h replica.region-b.example.com INFO replication | grep lag"
```

```python
def check_replication_lag():
    primary_info = PRIMARY_REDIS.info('replication')
    replica_info = LOCAL_REPLICA.info('replication')

    primary_offset = primary_info.get('master_repl_offset', 0)
    replica_offset = replica_info.get('slave_repl_offset', 0) or replica_info.get('master_repl_offset', 0)

    lag_bytes = primary_offset - replica_offset
    print(f"Replication lag: {lag_bytes:,} bytes")
    return lag_bytes
```

## Summary

Multi-region Redis deployments require careful architectural decisions based on consistency and availability requirements. Active-passive with cross-region replication is the simplest approach and works well for read-heavy workloads. Redis Sentinel adds automated failover. Redis Cluster with geographic sharding enables horizontal scaling. For true active-active writes in all regions, Redis Enterprise with CRDT support is the most robust option.
