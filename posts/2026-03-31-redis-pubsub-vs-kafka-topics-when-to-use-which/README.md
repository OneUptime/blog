# Redis Pub/Sub vs Kafka Topics: When to Use Which

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kafka, Pub/Sub, Topic, Messaging, Event-Driven Architecture

Description: Decide between Redis Pub/Sub and Kafka topics for your event-driven system by comparing delivery guarantees, message persistence, and fan-out patterns.

---

Redis Pub/Sub and Kafka topics both enable publisher-subscriber messaging, but they make fundamentally different promises about message delivery. Choosing between them without understanding those promises leads to silent data loss or unnecessary operational complexity.

## Redis Pub/Sub

Redis Pub/Sub is fire-and-forget. Messages are delivered to currently connected subscribers and discarded immediately - there is no storage, no replay, and no consumer tracking.

```python
import redis
import threading

r = redis.Redis(decode_responses=True)

# Subscriber in a separate thread
def subscriber():
    p = r.pubsub()
    p.subscribe("notifications")
    for message in p.listen():
        if message["type"] == "message":
            print(f"Received: {message['data']}")

thread = threading.Thread(target=subscriber, daemon=True)
thread.start()

# Publisher
r.publish("notifications", '{"type": "order.created", "id": "ord-42"}')
```

Publish to pattern:

```bash
PSUBSCRIBE order.*

# This subscriber receives both:
PUBLISH order.created '{"id":"1"}'
PUBLISH order.shipped '{"id":"1"}'
```

## Kafka Topics

Kafka stores messages on disk in an ordered, immutable log. Consumers track their position (offset) independently and can replay from any point:

```python
from confluent_kafka import Producer, Consumer

# Producer
producer = Producer({"bootstrap.servers": "localhost:9092"})
producer.produce("notifications", key="order-42",
                  value='{"type":"order.created","id":"ord-42"}')
producer.flush()

# Consumer (survives restarts and catches up on missed messages)
consumer = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": "email-service",
    "auto.offset.reset": "earliest",
})
consumer.subscribe(["notifications"])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg and not msg.error():
        print(f"Received: {msg.value().decode()}")
        consumer.commit()
```

## Critical Differences

| Property | Redis Pub/Sub | Kafka Topic |
|----------|--------------|-------------|
| Message persistence | None (fire-and-forget) | Disk (configurable retention) |
| Offline consumer | Messages are lost | Messages wait until consumer reconnects |
| Message replay | Not possible | Yes (seek to any offset) |
| Consumer tracking | None | Offset per consumer group |
| Ordering | Per channel | Per partition |
| Delivery guarantee | At-most-once | At-least-once (configurable) |
| Throughput | Very high | Very high |
| Ops complexity | Zero | High |

## Redis Streams as a Middle Ground

Redis Streams fills the gap between Pub/Sub and Kafka by adding persistence and consumer groups:

```bash
# Persistent, replayable, consumer-group-aware
XADD notifications * type order.created id ord-42

# Consumer group ensures each message is processed once
XGROUP CREATE notifications email-service 0
XREADGROUP GROUP email-service worker1 COUNT 10 STREAMS notifications >
XACK notifications email-service <msg-id>
```

## Decision Guide

Use **Redis Pub/Sub** when:
- Message loss on disconnect is acceptable (e.g., live dashboard updates, typing indicators).
- You need real-time fan-out to currently connected clients.
- You want zero infrastructure overhead.

Use **Kafka Topics** when:
- Every message must be processed at least once, even if a consumer is offline.
- You need audit trails or replay (event sourcing, debugging).
- Multiple independent consumer groups need to process the same stream.

Use **Redis Streams** when:
- You need consumer groups and persistence but want to avoid Kafka's operational complexity.
- Message volume is moderate and retention can be bounded by memory.

## Summary

Redis Pub/Sub is not a message queue - it is a broadcast mechanism for connected clients. Kafka topics are durable, replayable event logs. If your system cannot afford to lose messages, do not use Redis Pub/Sub. Use Kafka for durability at scale, or Redis Streams as a pragmatic middle ground that adds consumer groups and bounded persistence without Kafka's operational weight.
