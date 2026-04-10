# When to Use Redis Pub/Sub vs Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Stream, Architecture, Messaging, Decision guide

Description: Compare Redis Pub/Sub and Redis Streams to choose the right messaging pattern based on durability, replay, consumer groups, and throughput requirements.

---

## Core Differences at a Glance

| Feature | Pub/Sub | Streams |
|---|---|---|
| Message persistence | None (fire and forget) | Persistent until trimmed |
| Missed messages | Lost forever | Replayable from any ID |
| Consumer groups | No | Yes |
| Delivery guarantee | At-most-once | At-least-once (with ACK) |
| Pattern matching | Yes (PSUBSCRIBE) | No |
| Ordering guarantee | Per-channel ordering | Global ordering by ID |
| Memory usage | Low (no storage) | Grows until trimmed |
| Redis Cluster scaling | Cross-shard broadcast | Shard-local (per stream key) |

## Choose Redis Pub/Sub When

### 1. You need true broadcast to all current subscribers

Pub/Sub delivers to every connected subscriber simultaneously. Streams with multiple consumer groups also broadcast, but you must pre-create groups.

```bash
# Every subscriber receives this
PUBLISH live-scores '{"team":"A","score":3}'
```

Use case: live sports scores, real-time dashboards, chat broadcast, stock tickers where latency matters but lost messages are acceptable.

### 2. Subscribers are always online and loss is acceptable

If your subscribers are always running and a few missed messages during deployments or restarts are tolerable, Pub/Sub is simpler.

### 3. You need pattern-based routing

Pub/Sub supports `PSUBSCRIBE` with glob patterns. Streams do not.

```bash
PSUBSCRIBE 'events.*'
```

### 4. You want minimal overhead

Pub/Sub has no storage cost. For high-throughput metrics or telemetry where only real-time data matters, Pub/Sub avoids accumulating data.

## Choose Redis Streams When

### 1. Messages must survive subscriber downtime

A Streams consumer group tracks the last acknowledged ID. After a restart, it resumes from where it left off.

```python
# Consumer resumes after restart - no messages lost
messages = r.xreadgroup('mygroup', 'worker-1', {'events': '>'}, block=2000)
```

Use case: order processing, payment events, audit logs, any event that must be processed at least once.

### 2. You need competing consumers (worker queues)

Multiple workers in the same consumer group split the message load. Pub/Sub delivers to all subscribers, not splitting load.

```bash
XREADGROUP GROUP order-workers worker-1 COUNT 10 STREAMS orders >
XREADGROUP GROUP order-workers worker-2 COUNT 10 STREAMS orders >
# worker-1 and worker-2 get different messages
```

### 3. You need message replay or auditing

Streams retain history. Read from a specific point in the past:

```bash
# Replay from the beginning
XRANGE events 0-0 + COUNT 100

# Replay from a specific timestamp
XRANGE events 1711900000000-0 + COUNT 100
```

### 4. You need delivery acknowledgement

Streams track unacknowledged messages in the Pending Entries List. If a consumer crashes mid-processing, the message is not lost:

```bash
XACK events order-workers 1711900000000-0
```

## Hybrid Pattern - Pub/Sub for Notifications, Streams for Processing

A common production pattern uses both:

```python
# Fast notification via Pub/Sub (best effort)
r.publish('order-notifications', json.dumps({'id': order_id, 'status': 'created'}))

# Durable processing via Streams (guaranteed delivery)
r.xadd('order-processing', {'id': order_id, 'payload': json.dumps(data)}, maxlen=100000, approximate=True)
```

Pub/Sub notifies UIs in real time. Streams handle the backend workflow with guaranteed processing.

## Decision Flowchart

```text
Start
  |
  v
Do subscribers need to receive messages sent while they were offline?
  YES -> Use Redis Streams
  NO
  |
  v
Do you need load balancing across multiple consumers?
  YES -> Use Redis Streams
  NO
  |
  v
Do you need pattern-based subscriptions (PSUBSCRIBE)?
  YES -> Use Redis Pub/Sub
  NO
  |
  v
Is this a broadcast to all current subscribers with no history needed?
  YES -> Use Redis Pub/Sub
  NO -> Use Redis Streams
```

## Performance Characteristics

Pub/Sub at high throughput:

```bash
redis-cli --latency -h localhost
# Typical: < 1ms for small messages
# Bottleneck: subscriber count (each message copied N times)
```

Streams at high throughput:

```bash
# XADD throughput: typically 100k-500k/sec depending on value size
redis-cli --pipe < <(for i in $(seq 1 10000); do echo -en "*5\r\n\$4\r\nXADD\r\n\$6\r\nevents\r\n\$1\r\n*\r\n\$5\r\nfield\r\n\$5\r\nvalue\r\n"; done)
```

## Summary

Use Redis Pub/Sub for real-time broadcast where message loss is acceptable and low latency is priority. Use Redis Streams when you need durable message delivery, consumer groups for load balancing, message replay capability, or delivery acknowledgements. Many production systems use both: Pub/Sub for instant notifications to live clients and Streams for guaranteed event processing in backend workflows.
