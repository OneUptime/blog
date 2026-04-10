# How to Implement Message Ordering Guarantees with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Ordering, Consumer Group, Sequence

Description: Learn how Redis Streams guarantee message ordering within a single stream and how to implement per-entity ordering across partitioned streams and consumer groups.

---

Redis Streams provide strong ordering guarantees within a single stream - entries are appended in order and always read in insertion order. The challenge arises when you need ordering across partitioned streams or parallel consumers.

## Single Stream Ordering

Every entry in a Redis Stream has a unique, monotonically increasing ID in the format `<millisecond-timestamp>-<sequence>`. Redis guarantees entries are always read in this order:

```bash
# Write three events
XADD user:events * action login user_id 42
XADD user:events * action page_view user_id 42 page /dashboard
XADD user:events * action logout user_id 42

# Read always returns them in insertion order
XRANGE user:events - +
```

```text
1) 1) "1711234567890-0"
   2) 1) "action"
      2) "login"
      3) "user_id"
      4) "42"
2) 1) "1711234567891-0"
   2) 1) "action"
      2) "page_view"
      3) "user_id"
      4) "42"
      5) "page"
      6) "/dashboard"
3) 1) "1711234567892-0"
   2) 1) "action"
      2) "logout"
      3) "user_id"
      4) "42"
```

## Ordering Within a Consumer Group

A single consumer group with one active consumer processes messages in order. With multiple consumers, parallel processing breaks per-message ordering:

```python
import redis

r = redis.Redis(decode_responses=True)

# SAFE: one consumer - strict ordering
def ordered_consumer(stream, group, consumer_name):
    while True:
        msgs = r.xreadgroup(group, consumer_name, {stream: '>'}, count=1, block=5000)
        if msgs:
            for _, entries in msgs:
                for msg_id, fields in entries:
                    process_in_order(fields)
                    r.xack(stream, group, msg_id)
```

## Per-Entity Ordering with Partitioned Streams

To process different entities in parallel while maintaining per-entity order, route each entity to a dedicated partition:

```python
import hashlib

NUM_PARTITIONS = 16

def get_partition_stream(entity_id):
    h = int(hashlib.md5(entity_id.encode()).hexdigest(), 16)
    partition = h % NUM_PARTITIONS
    return f'events:{partition}'

def publish_ordered(entity_id, event_type, data):
    stream = get_partition_stream(entity_id)
    # All events for entity_id go to the same stream partition
    return r.xadd(stream, {'entity_id': entity_id, 'event_type': event_type, **data})

# user:42 always goes to the same partition - events are ordered
publish_ordered('user:42', 'order.created', {'amount': 99.95})
publish_ordered('user:42', 'order.paid', {})
publish_ordered('user:42', 'order.shipped', {'tracking': 'TRK-123'})
```

## Sequence Numbers for Distributed Producers

When multiple producers write to the same stream, clock skew can cause unexpected ordering. Add a logical sequence number:

```python
def publish_with_sequence(stream, entity_id, event_type, data):
    # Increment sequence atomically
    seq = r.incr(f'seq:{stream}:{entity_id}')

    payload = {
        'entity_id': entity_id,
        'event_type': event_type,
        'sequence': seq,
        **data
    }
    return r.xadd(stream, payload)
```

## Detecting Out-of-Order Events at the Consumer

Even with partitioning, validate sequence numbers to catch anomalies:

```python
def consume_with_order_check(stream, group, consumer_name):
    last_sequence = {}

    while True:
        msgs = r.xreadgroup(group, consumer_name, {stream: '>'}, count=10, block=5000)
        if not msgs:
            continue

        for _, entries in msgs:
            for msg_id, fields in entries:
                entity_id = fields.get('entity_id')
                sequence = int(fields.get('sequence', 0))
                expected = last_sequence.get(entity_id, 0) + 1

                if sequence != expected:
                    print(f"WARNING: Out-of-order event for {entity_id}: got {sequence}, expected {expected}")

                last_sequence[entity_id] = sequence
                process_event(fields)
                r.xack(stream, group, msg_id)
```

## Reading Events in Order for Replay

For replaying or auditing events in exact order:

```bash
# Read all events from the beginning in order
XRANGE events:0 - + COUNT 100

# Read from a specific point
XRANGE events:0 1711234567890-0 + COUNT 100
```

## Summary

Redis Streams guarantee insertion-order delivery within a single stream. For per-entity ordering with parallel consumers, partition streams by entity ID so each entity's events always land in the same partition and are processed by a dedicated consumer. Add logical sequence numbers for validation and out-of-order detection when multiple producers are involved.
