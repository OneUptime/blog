# Redis Streams vs Kafka: A Detailed Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kafka, Stream, Comparison, Event Streaming, Architecture

Description: A detailed comparison of Redis Streams and Apache Kafka covering consumer groups, ordering, retention, throughput, and when to choose each for event streaming.

---

Redis Streams and Kafka are both append-only event logs with consumer group semantics. From the surface they look interchangeable, but their operational models, persistence strategies, and scalability ceilings are fundamentally different. This post digs into the details.

## Redis Streams Basics

Redis Streams use the XADD / XREAD / XGROUP family of commands:

```bash
# Append to a stream (auto-generated ID)
XADD orders * user_id 42 item_id 100 qty 2

# Read without a group (offset-based)
XREAD COUNT 10 STREAMS orders 0-0

# Create consumer group
XGROUP CREATE orders fulfillment $ MKSTREAM

# Consume in a group
XREADGROUP GROUP fulfillment worker1 COUNT 10 BLOCK 5000 STREAMS orders >

# Acknowledge processing
XACK orders fulfillment 1700000000000-0
```

Pending entry list - messages delivered but not acknowledged:

```bash
XPENDING orders fulfillment - + 10
```

## Kafka Basics

Kafka uses producers, topics, partitions, and consumer groups:

```java
// Producer
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

Producer<String, String> producer = new KafkaProducer<>(props);
producer.send(new ProducerRecord<>("orders", "user-42",
    "{\"item_id\":100,\"qty\":2}"));
```

```java
// Consumer
Properties consumerProps = new Properties();
consumerProps.put("bootstrap.servers", "localhost:9092");
consumerProps.put("group.id", "fulfillment");
consumerProps.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
consumerProps.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
consumerProps.put("enable.auto.commit", "false");

Consumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
consumer.subscribe(Collections.singletonList("orders"));

ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(5000));
for (ConsumerRecord<String, String> record : records) {
    process(record.value());
}
consumer.commitSync();
```

## Side-by-Side Comparison

| Dimension | Redis Streams | Kafka |
|-----------|--------------|-------|
| Persistence | In-memory (AOF optional) | Disk (log segments) |
| Retention | Bounded by MAXLEN or memory | Time or size based (configurable) |
| Partitioning | Single stream key | Multiple partitions per topic |
| Ordering | Total order within stream | Per-partition |
| Throughput | ~100K msg/sec per stream | Millions/sec across partitions |
| Consumer groups | Yes | Yes |
| Pending/unacked tracking | XPENDING | Offsets |
| Replay from arbitrary point | Yes (stream ID) | Yes (offset) |
| Message expiry / TTL | XADD MAXLEN or trim | Log compaction / retention |
| Schema registry | No | Confluent Schema Registry |
| Exactly-once | No | Yes (idempotent producer + transactions) |
| Ops complexity | Low (existing Redis) | High (ZooKeeper/KRaft + Kafka) |

## Handling Backpressure

Redis MAXLEN caps stream size to avoid OOM:

```bash
# Keep only last 10,000 messages
XADD orders MAXLEN ~ 10000 * user_id 42 item_id 100
```

Kafka handles backpressure through log retention policies:

```bash
# Set retention to 7 days and 10 GB max
kafka-configs.sh --alter --entity-type topics --entity-name orders \
  --add-config "retention.ms=604800000,retention.bytes=10737418240"
```

## Dead Letter Handling

Redis - move unprocessable messages to a separate stream:

```python
def process_with_dlq(client, stream, group, worker, dlq_stream):
    msgs = client.xreadgroup(group, worker, {stream: ">"}, count=10, block=5000)
    for _, messages in msgs:
        for msg_id, data in messages:
            try:
                process(data)
                client.xack(stream, group, msg_id)
            except Exception as e:
                client.xadd(dlq_stream, {**data, "error": str(e), "original_id": msg_id})
                client.xack(stream, group, msg_id)
```

Kafka - configure `errors.deadletterqueue.topic.name` via Kafka Connect or handle in consumer logic.

## When to Choose Redis Streams

- You already operate Redis and want to avoid introducing Kafka.
- Message volume fits in memory with a bounded retention window.
- Simple consumer group semantics without cross-partition ordering concerns.
- Development simplicity and fast iteration matter more than extreme scale.

## When to Choose Kafka

- You need infinite message retention on disk.
- Throughput exceeds a million messages per second.
- You need exactly-once delivery semantics.
- Multiple independent systems consume the same stream without coordination.

## Summary

Redis Streams is the pragmatic embedded streaming layer for moderate workloads. Kafka is the right foundation when you need durable, infinitely retained, multi-partition streams at massive scale. If your team already manages Redis and your volume is under a few hundred million messages per day, Redis Streams keeps infrastructure simple. Introduce Kafka when you hit retention or throughput limits that memory-bounded streams cannot address.
