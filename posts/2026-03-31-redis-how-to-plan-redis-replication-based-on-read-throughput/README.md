# How to Plan Redis Replication Based on Read Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Read Throughput, Scaling, Performance, Architecture

Description: Plan Redis replication topology by measuring read-to-write ratios, calculating replica capacity, and distributing read traffic to meet throughput requirements.

---

## Why Replication for Read Scaling

Redis is single-threaded per shard. A single Redis instance can handle 100,000-500,000 operations per second depending on command complexity and hardware. When your read throughput exceeds a single instance's capacity, you need to scale horizontally by adding read replicas.

Replicas receive all writes from the primary via asynchronous replication and serve read commands. By distributing reads across N replicas, you multiply read throughput by approximately N.

## Step 1 - Measure Your Current Read/Write Ratio

Before adding replicas, understand your workload:

```bash
# Check current operations per second
redis-cli INFO stats | grep -E "(total_commands|instantaneous_ops)"

# Sample commands over time
watch -n 1 "redis-cli INFO stats | grep instantaneous_ops_per_sec"
```

For a more detailed breakdown, use the MONITOR command for a short sample:

```bash
redis-cli MONITOR | head -n 10000 | awk '{print $4}' | sort | uniq -c | sort -rn | head -20
```

This shows command distribution. If `GET`, `HGET`, `LRANGE` dominate, reads are the bottleneck.

## Step 2 - Calculate Per-Instance Read Capacity

Benchmark your Redis instance to establish its maximum read throughput:

```bash
# Benchmark GET operations with pipelining
redis-benchmark -h localhost -p 6379 -c 50 -n 1000000 -t get -P 16 --csv

# Benchmark with realistic key sizes
redis-benchmark -h localhost -p 6379 -c 100 -n 500000 \
  -t get,set -d 512 -P 8 --csv
```

Example output:

```text
"GET","487809.62"
"SET","412371.13"
```

This means the instance can serve approximately 487,000 GET operations per second under these conditions. Use 70-80% of peak as your planning number to leave headroom: ~340,000 reads/sec.

## Step 3 - Calculate Required Replica Count

```python
import math

def calculate_replicas_needed(
    target_reads_per_second: int,
    single_instance_capacity: int,
    safety_factor: float = 0.75,  # Use 75% of capacity
    min_replicas_for_ha: int = 1   # At least 1 for failover
) -> dict:
    effective_capacity = single_instance_capacity * safety_factor
    replicas_for_throughput = target_reads_per_second / effective_capacity
    recommended_replicas = max(math.ceil(replicas_for_throughput), min_replicas_for_ha)

    return {
        'target_reads_per_second': target_reads_per_second,
        'single_instance_effective_capacity': int(effective_capacity),
        'replicas_for_throughput': round(replicas_for_throughput, 2),
        'recommended_replicas': recommended_replicas,
        'total_nodes': recommended_replicas + 1,  # Include primary
        'total_capacity': int(effective_capacity * recommended_replicas)
    }

# Example: Need 800,000 reads/sec, single instance handles ~340,000
result = calculate_replicas_needed(
    target_reads_per_second=800_000,
    single_instance_capacity=487_000,
    safety_factor=0.70
)

for k, v in result.items():
    print(f"{k}: {v}")
```

## Step 4 - Set Up Redis Replication

### Primary Configuration

```text
# redis.conf on primary
bind 0.0.0.0
requirepass primarypassword
repl-diskless-sync yes
repl-diskless-sync-delay 5
min-replicas-to-write 1
min-replicas-max-lag 10
```

### Replica Configuration

```text
# redis.conf on each replica
bind 0.0.0.0
requirepass samepassword
replicaof 10.0.0.1 6379
masterauth primarypassword
replica-read-only yes

# Tune replica replication buffer
repl-backlog-size 64mb
repl-backlog-ttl 3600
```

### Starting Replication

```bash
# Dynamically set up replication (on the replica)
redis-cli -h replica-host -p 6379 REPLICAOF 10.0.0.1 6379

# Verify replication status
redis-cli -h 10.0.0.1 -p 6379 INFO replication
```

Expected output on primary:

```text
role:master
connected_slaves:2
slave0:ip=10.0.0.2,port=6379,state=online,offset=1234567,lag=0
slave1:ip=10.0.0.3,port=6379,state=online,offset=1234567,lag=1
master_replid:abc123
master_repl_offset:1234567
```

## Step 5 - Distribute Read Traffic Across Replicas

### Application-Level Round-Robin

```python
import redis
import itertools

class ReadScaledRedis:
    def __init__(self, primary_host, replica_hosts, password=None):
        self.primary = redis.Redis(host=primary_host, password=password)
        self.replicas = [
            redis.Redis(host=host, password=password)
            for host in replica_hosts
        ]
        self._replica_cycle = itertools.cycle(self.replicas)

    def get_read_client(self) -> redis.Redis:
        return next(self._replica_cycle)

    def get_write_client(self) -> redis.Redis:
        return self.primary

    # Read operations go to replicas
    def get(self, key):
        return self.get_read_client().get(key)

    def hgetall(self, name):
        return self.get_read_client().hgetall(name)

    def lrange(self, name, start, end):
        return self.get_read_client().lrange(name, start, end)

    # Write operations go to primary
    def set(self, key, value, **kwargs):
        return self.primary.set(key, value, **kwargs)

    def hset(self, name, mapping=None, **kwargs):
        return self.primary.hset(name, mapping=mapping, **kwargs)

    def delete(self, *keys):
        return self.primary.delete(*keys)

# Usage
redis_cluster = ReadScaledRedis(
    primary_host='10.0.0.1',
    replica_hosts=['10.0.0.2', '10.0.0.3'],
    password='yourpassword'
)

# Reads distributed across replicas
user = redis_cluster.get('user:100')

# Writes go to primary
redis_cluster.set('user:100', 'alice')
```

### Using Redis Sentinel with Replica Reads

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('sentinel-1', 26379),
    ('sentinel-2', 26379),
    ('sentinel-3', 26379)
])

# Get primary for writes
primary = sentinel.master_for('mymaster', password='yourpassword')

# Get replica for reads (Sentinel picks a healthy replica)
replica = sentinel.slave_for('mymaster', password='yourpassword')
```

## Monitoring Replication Lag

Replication lag indicates how far behind replicas are from the primary. High lag means reads from replicas may be stale:

```bash
# Check replication lag on primary
redis-cli INFO replication | grep slave

# lag=0 means replica is fully caught up
# lag=N means N seconds behind

# Prometheus alert for high lag
redis_connected_slaves_lag_seconds > 30
```

### Acceptable Lag Thresholds

| Use Case | Max Acceptable Lag |
|----------|-------------------|
| Session data | 1-2 seconds |
| Product catalog cache | 10-30 seconds |
| Analytics counters | 60+ seconds |
| Near-real-time dashboards | < 1 second |

## Summary

Plan Redis replication for read throughput by benchmarking a single instance's read capacity, calculating the number of replicas needed to meet your target, and configuring replicas with `replicaof`. Distribute reads across replicas using round-robin at the application level or via Redis Sentinel's `slave_for` method. Monitor replication lag and alert when it exceeds your consistency threshold for the specific use case.
