# How to Configure Redis min-replicas-to-write for Write Safety

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Configuration, Durability

Description: Configure min-replicas-to-write and min-replicas-max-lag to ensure write commands only succeed when enough replicas are synchronized, preventing data loss.

---

By default, Redis primaries accept writes regardless of replica state. If a primary crashes before replicating recent writes, those writes are lost. The `min-replicas-to-write` and `min-replicas-max-lag` directives let you require a minimum number of connected and up-to-date replicas before accepting writes.

## How the Directives Work

```text
# redis.conf
min-replicas-to-write 1
min-replicas-max-lag 10
```

With this configuration, the primary refuses writes if fewer than 1 replica has acknowledged data within the last 10 seconds. Replicas send heartbeats every second, so `min-replicas-max-lag 10` means the replica must have sent a heartbeat in the last 10 seconds.

If the condition is not met, write commands return:

```text
(error) NOREPLICAS Not enough good replicas to write.
```

## Common Configurations

For a two-replica setup requiring at least one healthy replica:

```text
min-replicas-to-write 1
min-replicas-max-lag 10
```

For a three-replica setup requiring a majority:

```text
min-replicas-to-write 2
min-replicas-max-lag 5
```

To disable the safety check (accept writes regardless of replica state):

```text
min-replicas-to-write 0
```

A value of 0 for either directive disables the feature.

## Setting at Runtime

```bash
redis-cli CONFIG SET min-replicas-to-write 1
redis-cli CONFIG SET min-replicas-max-lag 10
redis-cli CONFIG GET min-replicas-to-write
redis-cli CONFIG GET min-replicas-max-lag
```

## Checking Replica Status

Before enabling this feature, verify your replicas are connected and in sync:

```bash
redis-cli INFO replication
```

```text
role:master
connected_slaves:2
slave0:ip=192.168.1.10,port=6380,state=online,offset=12345678,lag=0
slave1:ip=192.168.1.11,port=6380,state=online,offset=12345670,lag=1
master_replid:8f3a2b1c4e5d6f7a8b9c0d1e2f3a4b5c6d7e8f9a
master_repl_offset:12345678
```

A `lag=0` means the replica is fully synchronized. A lag growing beyond `min-replicas-max-lag` will block writes.

## Application-Level Handling

Applications must handle `NOREPLICAS` errors gracefully. In Python:

```python
import redis
from redis.exceptions import ResponseError

r = redis.Redis(host='localhost', port=6379)

try:
    r.set('order:1234', 'confirmed')
except ResponseError as e:
    if 'NOREPLICAS' in str(e):
        # Log alert and retry or queue for later
        print("Write rejected: insufficient replicas")
        raise
```

## Trade-offs

Enabling `min-replicas-to-write` converts Redis from an eventually consistent store to a semi-synchronous one. This:

- Reduces the risk of data loss during primary failure
- Does not add latency to accepted writes, but can cause sudden write failures when replicas fall behind
- Can cause write failures if replicas become unavailable (network partition)

For workloads where only some writes require durability guarantees, consider using separate Redis instances with different `min-replicas-to-write` configurations, since this directive applies server-wide and cannot be set per-key.

## Interaction with Sentinel and Cluster

In a network partition, `min-replicas-to-write` prevents an isolated primary from accepting new writes, reducing data divergence before Sentinel completes failover. Sentinel itself does not use this directive in its failover decisions - failover timing is governed by Sentinel's own `down-after-milliseconds` configuration.

In Redis Cluster, each shard is an independent primary-replica group. Set `min-replicas-to-write` in `redis.conf` on each primary node.

## Summary

`min-replicas-to-write` and `min-replicas-max-lag` add semi-synchronous write safety to Redis by rejecting writes when not enough up-to-date replicas are connected. Set `min-replicas-to-write 1` with a lag of 10 seconds for a sensible default in single-replica setups. Handle `NOREPLICAS` errors in your application to avoid silent data loss during replica outages.
