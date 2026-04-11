# How to Implement Inter-Service Communication with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Microservice, Event, Messaging

Description: Use Redis Streams for durable, ordered inter-service messaging with consumer groups, allowing microservices to communicate asynchronously with at-least-once delivery.

---

Redis Streams provide a persistent, ordered log that any number of services can read from at their own pace. Unlike Pub/Sub (which loses messages if a consumer is offline), Streams retain every message until explicitly trimmed, and consumer groups track delivery and acknowledgment per message, making them suitable for reliable inter-service communication.

## Creating and Publishing Events

```python
import redis
import json
import time

r = redis.Redis(host="redis", port=6379, decode_responses=True)

def publish_event(stream: str, event_type: str, payload: dict):
    message_id = r.xadd(stream, {
        "event_type": event_type,
        "payload": json.dumps(payload),
        "timestamp": str(int(time.time() * 1000))
    })
    return message_id

# Order service publishes order events
publish_event(
    "events:orders",
    "order.created",
    {"order_id": "8421", "user_id": "42", "total": 99.99}
)
```

## Setting Up a Consumer Group

Consumer groups allow multiple instances of a service to share the workload:

```bash
# Create groups for each downstream service
XGROUP CREATE events:orders inventory-svc $ MKSTREAM
XGROUP CREATE events:orders billing-svc $ MKSTREAM
```

In Python:

```python
def ensure_consumer_group(stream: str, group: str):
    try:
        r.xgroup_create(stream, group, id="0", mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise
```

## Consuming Events

```python
def consume_events(stream: str, group: str, consumer: str, batch: int = 10):
    messages = r.xreadgroup(
        groupname=group,
        consumername=consumer,
        streams={stream: ">"},  # ">" = only undelivered messages
        count=batch,
        block=5000  # block up to 5 seconds if no messages
    )

    if not messages:
        return

    for stream_name, entries in messages:
        for msg_id, data in entries:
            try:
                process_event(data)
                # Acknowledge successful processing
                r.xack(stream, group, msg_id)
            except Exception as e:
                print(f"Failed to process {msg_id}: {e}")
                # Do not ACK - message stays in PEL for retry
```

## Handling Unacknowledged Messages

Messages that were delivered but not acknowledged stay in the Pending Entry List (PEL):

```python
def reprocess_pending(stream: str, group: str, consumer: str, min_idle_ms: int = 60000):
    # Claim messages idle for more than 60 seconds
    claimed = r.xautoclaim(
        stream, group, consumer,
        min_idle_time=min_idle_ms,
        start_id="0-0",
        count=10
    )

    for msg_id, data in claimed[1]:
        try:
            process_event(data)
            r.xack(stream, group, msg_id)
        except Exception:
            pass  # will be retried next cycle
```

## Stream Retention

Prevent unbounded stream growth with `MAXLEN`:

```bash
# Keep only the last 100,000 messages
XADD events:orders MAXLEN ~ 100000 * event_type order.created ...
```

Or trim periodically:

```bash
XTRIM events:orders MAXLEN ~ 100000
```

## Monitoring Stream Lag

```bash
XINFO GROUPS events:orders
# name: inventory-svc
# consumers: 3
# pending: 12
# last-delivered-id: 1711843800000-0
# lag: 47          <-- messages not yet delivered
```

## Summary

Redis Streams give microservices durable, ordered messaging with consumer group semantics. The producer uses `XADD`, each consumer group reads independently with `XREADGROUP`, and successful processing requires an explicit `XACK`. The Pending Entry List ensures no message is lost even if a consumer crashes mid-processing. Combine `MAXLEN` trimming with lag monitoring to keep stream size bounded.
