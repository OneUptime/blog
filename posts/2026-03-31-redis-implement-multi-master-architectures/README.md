# How to Implement Multi-Master Redis Architectures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Architecture

Description: Learn how to design multi-master Redis architectures using Redis Cluster and Redis Enterprise Active-Active for high availability and conflict-free writes across nodes.

---

A multi-master Redis architecture allows multiple nodes to accept writes simultaneously. This differs from standard Redis replication, where only the primary accepts writes and replicas are read-only. Multi-master setups are critical for globally distributed applications that need low-latency local writes.

## Redis Cluster: Sharded Multi-Primary

Redis Cluster partitions data across multiple primary shards using 16,384 hash slots. Each primary accepts writes for its assigned key range. This is the closest to multi-master in open-source Redis.

```bash
# Create a 3-primary, 3-replica cluster
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1
```

Each primary owns a slot range:

```bash
redis-cli -p 7001 CLUSTER INFO
redis-cli -p 7001 CLUSTER NODES
```

A key is mapped to a slot using CRC16:

```bash
redis-cli --cluster check 127.0.0.1:7001
redis-cli -c -p 7001 SET user:1 "alice"
# -> Redirected to slot [10778] located at 127.0.0.1:7002
```

## Client-Side Multi-Primary Writes

With Redis Cluster, your client library handles redirection automatically.

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='127.0.0.1', port=7001, decode_responses=True)

rc.set('user:1', 'alice')
rc.set('product:42', 'widget')
rc.set('order:100', 'pending')

print(rc.get('user:1'))
```

## Cross-Shard Transactions with Hash Tags

To keep related keys on the same shard, use hash tags:

```python
# All keys with {session} land on the same slot
rc.set('{session}:user', 'alice')
rc.set('{session}:cart', '[item1, item2]')
rc.set('{session}:expiry', '1800')

# Batched multi-key operation on same shard
pipe = rc.pipeline()
pipe.get('{session}:user')
pipe.get('{session}:cart')
results = pipe.execute()
```

## Handling MOVED and ASK Redirects

When a key slot migrates during rebalancing, clients receive redirect errors:

```bash
(error) MOVED 10778 127.0.0.1:7002
(error) ASK 10778 127.0.0.1:7003
```

Smart clients handle this automatically. If using raw `redis-cli`, pass the `-c` flag for auto-redirection:

```bash
redis-cli -c -p 7001 GET user:1
```

## Conflict Resolution Strategy

Redis Cluster does not resolve write conflicts - last write wins per slot. For true conflict-free multi-master across data centers, use Redis Enterprise Active-Active with built-in CRDTs.

```bash
# Redis Enterprise CLI example
crdb-cli crdb create \
  --name my-crdb \
  --memory-size 1g \
  --instance fqdn=cluster1.example.com \
  --instance fqdn=cluster2.example.com
```

## Monitoring Multi-Master Health

```bash
# Check replication lag
redis-cli -p 7001 INFO replication | grep lag

# Check cluster state
redis-cli -p 7001 CLUSTER INFO | grep cluster_state

# Simulate failover
redis-cli -p 7001 DEBUG SLEEP 30 &
redis-cli -p 7004 CLUSTER FAILOVER
```

## Summary

Redis Cluster provides a sharded multi-primary model where each primary owns a key range and accepts writes independently. Hash tags enable multi-key operations within a single shard. For true active-active multi-master with CRDT-based conflict resolution across geographies, Redis Enterprise is the recommended solution.
