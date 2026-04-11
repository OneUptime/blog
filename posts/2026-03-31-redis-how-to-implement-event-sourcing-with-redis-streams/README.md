# How to Implement Event Sourcing with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Event Sourcing, Redis Streams, Microservice, Event-Driven Architecture

Description: Learn how to implement event sourcing patterns using Redis Streams as a durable, ordered event log for microservices and distributed systems.

---

## What Is Event Sourcing

Event sourcing is an architectural pattern where application state changes are stored as an immutable sequence of events rather than as current state snapshots. Instead of updating a database row when a user places an order, you append an `OrderPlaced` event to a log. The current state is derived by replaying all events from the beginning.

Redis Streams - introduced in Redis 5.0 - provide a natural fit for this pattern. They offer:

- Append-only semantics with auto-generated sequence IDs
- Consumer groups for parallel processing
- Built-in message acknowledgment
- Time-based range queries

## Setting Up Redis Streams for Event Sourcing

### Appending Events

Every event has a unique ID in Redis Streams. The `*` tells Redis to auto-generate one using millisecond timestamp plus sequence number.

```bash
XADD orders * event_type OrderPlaced order_id 12345 user_id 99 amount 99.99 currency USD
XADD orders * event_type OrderShipped order_id 12345 carrier FedEx tracking TRK001
XADD orders * event_type OrderDelivered order_id 12345
```

The returned IDs look like `1711900000000-0` - timestamp in milliseconds followed by a sequence counter.

### Reading Events

```bash
# Read all events from the beginning
XRANGE orders - +

# Read events from a specific ID onwards
XRANGE orders 1711900000000-0 +

# Read the last 10 events
XREVRANGE orders + - COUNT 10

# Block until new events arrive (for real-time consumers)
XREAD BLOCK 0 STREAMS orders $
```

## Implementing Event Sourcing in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient({ url: 'redis://localhost:6379' });
await client.connect();

// Append an event
async function appendEvent(streamKey, eventType, payload) {
  const fields = {
    event_type: eventType,
    timestamp: Date.now().toString(),
    ...payload
  };
  const id = await client.xAdd(streamKey, '*', fields);
  console.log(`Event appended with ID: ${id}`);
  return id;
}

// Replay events to rebuild state
async function replayEvents(streamKey, aggregateId) {
  const events = await client.xRange(streamKey, '-', '+');
  let state = {};

  for (const event of events) {
    const { event_type, order_id, ...data } = event.message;
    if (order_id !== aggregateId) continue;

    switch (event_type) {
      case 'OrderPlaced':
        state = { id: order_id, status: 'placed', ...data };
        break;
      case 'OrderShipped':
        state = { ...state, status: 'shipped', ...data };
        break;
      case 'OrderDelivered':
        state = { ...state, status: 'delivered' };
        break;
    }
  }
  return state;
}

// Usage
await appendEvent('orders', 'OrderPlaced', { order_id: '12345', amount: '99.99' });
const orderState = await replayEvents('orders', '12345');
console.log(orderState);
```

## Consumer Groups for Parallel Processing

Consumer groups allow multiple service instances to process events without duplicate processing.

```bash
# Create a consumer group that only reads new messages from now on
XGROUP CREATE orders order-processor $ MKSTREAM

# Or start from the beginning of the stream
XGROUP CREATE orders order-processor 0
```

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Create consumer group
try:
    r.xgroup_create('orders', 'order-processor', '0', mkstream=True)
except redis.exceptions.ResponseError:
    pass  # Group already exists

def process_events(consumer_name):
    while True:
        # Read undelivered messages
        messages = r.xreadgroup(
            groupname='order-processor',
            consumername=consumer_name,
            streams={'orders': '>'},
            count=10,
            block=5000  # Block for 5 seconds
        )

        if not messages:
            continue

        for stream_name, events in messages:
            for event_id, data in events:
                try:
                    handle_event(data)
                    # Acknowledge successful processing
                    r.xack('orders', 'order-processor', event_id)
                except Exception as e:
                    print(f"Failed to process {event_id}: {e}")
                    # Message stays in pending list for retry

def handle_event(data):
    event_type = data.get('event_type')
    print(f"Processing event: {event_type}")
    # Your business logic here

process_events('consumer-1')
```

## Handling Pending Messages and Retries

Messages that were read but not acknowledged sit in the Pending Entry List (PEL). Use `XPENDING` to inspect and `XCLAIM` to reassign them.

```bash
# View pending messages for a consumer group
XPENDING orders order-processor - + 10

# Claim messages idle for more than 60 seconds
XCLAIM orders order-processor new-consumer 60000 1711900000000-0
```

```python
def recover_pending_events(consumer_name, idle_threshold_ms=60000):
    # Get pending messages that have been idle too long
    pending = r.xpending_range(
        'orders',
        'order-processor',
        min='-',
        max='+',
        count=100
    )

    for msg in pending:
        if msg['time_since_delivered'] > idle_threshold_ms:
            # Claim and reprocess
            claimed = r.xclaim(
                'orders',
                'order-processor',
                consumer_name,
                idle_threshold_ms,
                [msg['message_id']]
            )
            for event_id, data in claimed:
                handle_event(data)
                r.xack('orders', 'order-processor', event_id)
```

## Snapshotting for Performance

Replaying from the beginning of a long stream is slow. Implement snapshots to speed up state reconstruction.

```python
import json

def save_snapshot(aggregate_id, state, last_event_id):
    key = f"snapshot:order:{aggregate_id}"
    r.hset(key, mapping={
        'state': json.dumps(state),
        'last_event_id': last_event_id,
        'created_at': str(r.time()[0])
    })
    r.expire(key, 86400 * 7)  # Keep snapshots for 7 days

def load_from_snapshot(stream_key, aggregate_id):
    key = f"snapshot:order:{aggregate_id}"
    snapshot = r.hgetall(key)

    if not snapshot:
        return replay_events(stream_key, aggregate_id)

    state = json.loads(snapshot['state'])
    last_event_id = snapshot['last_event_id']

    # Replay only events since the snapshot
    recent_events = r.xrange(stream_key, f'({last_event_id}', '+')
    for event_id, data in recent_events:
        if data.get('order_id') == aggregate_id:
            state = apply_event(state, data)

    return state
```

## Stream Trimming and Data Retention

For long-running systems, streams can grow very large. Use MAXLEN to cap stream size.

```bash
# Trim to approximately 100,000 events (~ means approximate for performance)
XADD orders MAXLEN ~ 100000 * event_type OrderPlaced order_id 99

# Trim to exact size (slower but precise)
XTRIM orders MAXLEN 100000
```

```python
# Append with automatic trimming
def append_event_with_trim(stream_key, event_type, payload, maxlen=100000):
    fields = {'event_type': event_type, **payload}
    return r.xadd(stream_key, fields, maxlen=maxlen, approximate=True)
```

## Stream Partitioning by Aggregate

For high-throughput systems, partition events by aggregate ID to allow parallel processing.

```python
def get_stream_for_order(order_id):
    # Hash order_id to one of 16 partitions
    partition = int(order_id) % 16
    return f"orders:partition:{partition}"

def append_partitioned_event(order_id, event_type, payload):
    stream_key = get_stream_for_order(order_id)
    return append_event(stream_key, event_type, {'order_id': order_id, **payload})
```

## Summary

Redis Streams provide a powerful foundation for event sourcing with built-in ordering, consumer groups for parallel processing, and pending message tracking for fault tolerance. Combining append-only streams with snapshots and consumer groups gives you a scalable, reliable event log that supports both real-time processing and historical state reconstruction. For production use, configure appropriate MAXLEN trimming and implement snapshot strategies to keep replay times manageable.
