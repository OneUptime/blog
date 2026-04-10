# How to Scale Redis Streams Across Multiple Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Scaling, Cluster, Consumer Group

Description: Learn how to scale Redis Streams using stream partitioning, Redis Cluster for horizontal distribution, and multiple consumer groups for independent processing at scale.

---

A single Redis Stream on one instance can handle millions of entries per second for writes, but read throughput and storage have limits. Scaling Redis Streams involves distributing streams across instances using Redis Cluster or application-level partitioning.

## Scaling with Application-Level Partitioning

The simplest approach is to partition streams in your application before Redis Cluster:

```python
import redis
import hashlib

# Connect to multiple Redis instances
instances = [
    redis.Redis(host='redis-0', port=6379),
    redis.Redis(host='redis-1', port=6379),
    redis.Redis(host='redis-2', port=6379),
]

def get_instance(partition_key):
    index = int(hashlib.md5(partition_key.encode()).hexdigest(), 16) % len(instances)
    return instances[index]

def publish_event(entity_id, event_type, data):
    r = get_instance(entity_id)
    return r.xadd('events:stream', {
        'entity_id': entity_id,
        'event_type': event_type,
        **data
    })
```

## Scaling with Redis Cluster

Redis Cluster distributes keys across 16,384 hash slots. Use hash tags to co-locate related streams on the same shard:

```bash
# Streams with the same hash tag go to the same slot
XADD {orders}.events-0 * order_id 1001
XADD {orders}.events-1 * order_id 1002
XADD {orders}.events-2 * order_id 1003
```

Without hash tags, each stream lives on whatever shard Redis assigns it to:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(
    host='redis-cluster',
    port=6379,
    decode_responses=True,
    skip_full_coverage_check=True
)

# These streams will be distributed across cluster shards
for partition in range(8):
    rc.xadd(f'events:{partition}', {'data': 'value'})
```

## Consumer Groups in a Cluster

Consumer groups are per-stream, so each stream needs its own group setup:

```bash
#!/bin/bash
# Set up consumer groups for all partitions on the cluster
for i in $(seq 0 7); do
  redis-cli -c -h redis-cluster XGROUP CREATE "events:$i" workers $ MKSTREAM
done
```

## Multi-Instance Consumer Worker

Deploy workers that read from multiple streams across instances:

```python
import threading

def start_shard_consumer(redis_instance, stream, consumer_name, group='workers'):
    while True:
        msgs = redis_instance.xreadgroup(
            group, consumer_name,
            {stream: '>'},
            count=50,
            block=3000
        )

        if not msgs:
            continue

        for _, entries in msgs:
            for msg_id, fields in entries:
                try:
                    process_event(fields)
                    redis_instance.xack(stream, group, msg_id)
                except Exception as e:
                    print(f"Error processing {msg_id}: {e}")

# Start a consumer for each partition
threads = []
for i, r_instance in enumerate(instances):
    t = threading.Thread(
        target=start_shard_consumer,
        args=(r_instance, 'events:stream', f'worker-instance-{i}'),
        daemon=True
    )
    t.start()
    threads.append(t)
```

## Monitoring Cross-Instance Lag

Check lag across all instances:

```python
def get_cluster_lag():
    total_lag = 0
    for i, r_instance in enumerate(instances):
        groups = r_instance.xinfo_groups('events:stream')
        for g in groups:
            lag = g.get('lag', 0)
            total_lag += lag
            print(f"Instance {i} / {g['name']}: lag={lag}")
    print(f"Total cluster lag: {total_lag}")
    return total_lag
```

## Balancing Stream Sizes

Verify that load is evenly distributed across instances:

```bash
# Check stream length on each instance
redis-cli -h redis-0 XLEN events:stream
redis-cli -h redis-1 XLEN events:stream
redis-cli -h redis-2 XLEN events:stream
```

## Summary

Scale Redis Streams by partitioning across multiple instances using consistent hashing in your application, or by deploying Redis Cluster and distributing streams across shards. Create consumer groups per stream and run dedicated consumer workers per partition or instance. Monitor per-instance lag to detect imbalances and scale consumer workers accordingly.
