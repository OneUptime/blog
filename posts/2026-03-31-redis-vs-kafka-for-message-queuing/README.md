# Redis vs Kafka for Message Queuing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kafka, Message Queue, Comparison, Streaming, Architecture

Description: Compare Redis and Apache Kafka for message queuing - covering throughput, durability, retention, and when each tool is the right fit for your system.

---

Both Redis and Kafka can be used to pass messages between services, but they were designed for different problems. Redis is a fast in-memory store with Streams and Pub/Sub added on top. Kafka is a distributed commit log built from the ground up for durable, high-throughput event streaming. Picking the wrong one is a common architectural mistake.

## Redis for Messaging

Redis supports two messaging primitives:

**Pub/Sub** - fire-and-forget fan-out:

```bash
# Publisher
PUBLISH notifications '{"type":"order.created","id":"123"}'

# Subscriber
SUBSCRIBE notifications
```

Messages are not stored. If a subscriber is offline, messages are lost.

**Streams** - persistent, consumer-group-aware log:

```bash
# Producer
XADD orders * id 123 status created amount 49.99

# Consumer group
XGROUP CREATE orders processing $ MKSTREAM

# Consumer reads
XREADGROUP GROUP processing worker1 COUNT 10 STREAMS orders >

# Acknowledge
XACK orders processing <message-id>
```

## Kafka for Messaging

Kafka stores messages on disk in partitioned topics with configurable retention:

```bash
# Create topic with 7-day retention
kafka-topics.sh --create \
  --topic orders \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --bootstrap-server localhost:9092

# Produce
echo '{"id":"123","status":"created"}' | kafka-console-producer.sh \
  --topic orders --bootstrap-server localhost:9092

# Consume from beginning
kafka-console-consumer.sh \
  --topic orders \
  --from-beginning \
  --bootstrap-server localhost:9092
```

## Key Differences

| Dimension | Redis Streams | Kafka |
|-----------|--------------|-------|
| Storage | In-memory (AOF optional) | Disk-based |
| Retention | Bounded by memory | Configurable (days/weeks) |
| Throughput | ~100K msg/sec per node | Millions msg/sec cluster |
| Replication | Via Redis Cluster | Built-in partition replication |
| Replay | Yes (from stream ID) | Yes (from any offset) |
| Consumer groups | Yes | Yes (consumer groups) |
| Ordering | Per-stream | Per-partition |
| Ops complexity | Low | High |
| Best for | Task queues, small events | Event streaming, audit logs |

## When to Use Redis

- **Job queues** where each job is processed once (BullMQ uses Redis Streams under the hood).
- **Small to medium throughput** - under a million messages per day.
- **Simple infrastructure** - you already have Redis and don't want to manage Kafka.
- **Short-lived messages** - cache invalidation events, real-time notifications.

## When to Use Kafka

- **Event sourcing** - you need to replay the full event history.
- **Audit logs** - compliance requires retaining events for months or years.
- **High throughput** - millions of messages per second across many consumers.
- **Multi-consumer fan-out** - dozens of independent consumer groups reading the same topic.

## Summary

Redis Streams is the pragmatic choice for job queues and lightweight event pipelines where you control message volume. Kafka is the right foundation when you need durable, replayable event streams at scale. If you already run Redis and your message volume is under a few hundred thousand per day, start with Redis Streams and migrate to Kafka only when you hit its limits.
