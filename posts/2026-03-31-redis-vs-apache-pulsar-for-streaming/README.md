# Redis vs Apache Pulsar for Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Apache Pulsar, Streaming, Comparison, Messaging, Architecture

Description: Compare Redis Streams and Apache Pulsar for event streaming - covering multi-tenancy, tiered storage, geo-replication, and where each tool excels.

---

Redis Streams and Apache Pulsar both support publish-subscribe streaming with consumer groups, but they target very different scales and operational requirements. Redis is lightweight and fast; Pulsar is a full-featured streaming platform designed for multi-tenant, globally distributed deployments.

## Redis Streams for Streaming

Redis Streams append messages to an ordered log per key:

```bash
# Add events to a stream
XADD sensor:temperature * device_id sensor-42 value 23.7 unit C

# Read with a consumer group
XGROUP CREATE sensor:temperature analytics $ MKSTREAM
XREADGROUP GROUP analytics worker1 COUNT 100 BLOCK 5000 STREAMS sensor:temperature >
XACK sensor:temperature analytics <msg-id>
```

In Python with redis-py:

```python
import redis

r = redis.Redis(decode_responses=True)
r.xadd("events", {"type": "page_view", "path": "/home", "user": "u42"})

# Consumer group processing
msgs = r.xreadgroup("processors", "worker1",
                     streams={"events": ">"}, count=50, block=5000)
for stream, messages in msgs:
    for msg_id, data in messages:
        process(data)
        r.xack("events", "processors", msg_id)
```

## Apache Pulsar for Streaming

Pulsar separates compute (brokers) from storage (BookKeeper), enabling infinite retention without memory pressure:

```bash
# Create a topic with retention policy
pulsar-admin topics create persistent://my-tenant/my-ns/sensor-data
pulsar-admin topics set-retention --size 10G --time 7d \
  persistent://my-tenant/my-ns/sensor-data
```

Producer and consumer in Python:

```python
import pulsar

client = pulsar.Client("pulsar://localhost:6650")

# Producer
producer = client.create_producer("persistent://my-tenant/my-ns/sensor-data")
producer.send(b'{"device": "sensor-42", "value": 23.7}')

# Consumer
consumer = client.subscribe(
    "persistent://my-tenant/my-ns/sensor-data",
    "analytics-subscription",
    consumer_type=pulsar.ConsumerType.Shared,
)
msg = consumer.receive()
print(msg.data())
consumer.acknowledge(msg)

client.close()
```

## Feature Comparison

| Feature | Redis Streams | Apache Pulsar |
|---------|--------------|---------------|
| Storage | In-memory (bounded) | Disk via BookKeeper (unlimited) |
| Multi-tenancy | No | Yes (tenant/namespace/topic) |
| Tiered storage | No | Yes (S3/GCS offload) |
| Geo-replication | No (manual) | Built-in async geo-replication |
| Schema registry | No | Built-in |
| Delayed messages | No | Yes (up to 100 years) |
| Message ordering | Per-stream key | Per-key (key-shared subscription) |
| Ops complexity | Very low | High (ZooKeeper + BookKeeper + Brokers) |
| Throughput | ~100K msg/sec | Millions msg/sec |

## When to Use Redis Streams

- You need a lightweight streaming layer without new infrastructure.
- Stream data fits in memory (short retention - hours or days).
- Workloads are single-region.
- You want consumer groups without operating a cluster.

## When to Use Apache Pulsar

- You need months or years of message retention.
- Multi-tenant environments where different teams share a platform.
- Global replication across data centers out of the box.
- You need schema validation at the broker level.

## Summary

Redis Streams is the pragmatic embedded streaming layer for applications already running Redis, best suited for short-retention, single-region workloads. Apache Pulsar is the right choice when you need infinite retention via tiered storage, built-in geo-replication, or a shared streaming platform for multiple teams and services.
