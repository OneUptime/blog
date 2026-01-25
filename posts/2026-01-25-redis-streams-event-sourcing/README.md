# How to Use Redis Streams for Event Sourcing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Streams, Event Sourcing, Messaging, Architecture

Description: Learn how to implement event sourcing patterns with Redis Streams, including event publishing, consumer groups, replay capabilities, and building event-driven architectures.

---

Redis Streams is a powerful data structure for building event-driven systems. Unlike simple pub/sub, Streams persist messages, support consumer groups, and allow you to replay history. This makes them ideal for event sourcing patterns where you need a reliable, ordered log of events.

## Understanding Redis Streams

A stream is an append-only log where each entry has a unique ID and contains field-value pairs. Each message ID consists of a timestamp and sequence number, ensuring global ordering.

## Basic Stream Operations

### Adding Events

```bash
# Add event to stream (auto-generate ID with *)
XADD orders:events * type created order_id 123 total 99.99

# Returns: "1706185200000-0" (timestamp-sequence)

# Add with MAXLEN to cap stream size
XADD orders:events MAXLEN ~ 10000 * type created order_id 123
```

### Reading Events

```bash
# Read all events
XRANGE orders:events - +

# Read last 10 events
XREVRANGE orders:events + - COUNT 10

# Read events after a specific ID
XRANGE orders:events 1706185200000-0 +

# Read new events (blocking)
XREAD BLOCK 5000 STREAMS orders:events $
```

## Event Publisher Implementation

```python
import redis
import json
import time
from typing import Dict, Any

class EventPublisher:
    """Publish events to Redis Streams."""

    def __init__(self, redis_client, stream_prefix: str = 'events'):
        self.r = redis_client
        self.stream_prefix = stream_prefix

    def publish(self, stream: str, event_type: str, data: Dict[str, Any],
                maxlen: int = None) -> str:
        """Publish an event to a stream."""
        stream_key = f"{self.stream_prefix}:{stream}"

        # Prepare event data
        event = {
            'type': event_type,
            'timestamp': str(int(time.time() * 1000)),
            'data': json.dumps(data)
        }

        # Add to stream
        if maxlen:
            event_id = self.r.xadd(stream_key, event, maxlen=maxlen, approximate=True)
        else:
            event_id = self.r.xadd(stream_key, event)

        return event_id.decode('utf-8') if isinstance(event_id, bytes) else event_id

    def publish_batch(self, stream: str, events: list) -> list:
        """Publish multiple events atomically."""
        stream_key = f"{self.stream_prefix}:{stream}"
        pipe = self.r.pipeline()

        for event_type, data in events:
            event = {
                'type': event_type,
                'timestamp': str(int(time.time() * 1000)),
                'data': json.dumps(data)
            }
            pipe.xadd(stream_key, event)

        return pipe.execute()

# Usage
r = redis.Redis()
publisher = EventPublisher(r)

# Publish order events
publisher.publish('orders', 'order.created', {
    'order_id': '12345',
    'customer_id': 'cust_001',
    'items': [{'sku': 'WIDGET-01', 'qty': 2}],
    'total': 49.99
})

publisher.publish('orders', 'order.paid', {
    'order_id': '12345',
    'payment_id': 'pay_abc123',
    'amount': 49.99
})
```

## Consumer Groups

Consumer groups allow multiple consumers to process events cooperatively:

```python
class EventConsumer:
    """Consume events from Redis Streams using consumer groups."""

    def __init__(self, redis_client, stream: str, group: str, consumer: str):
        self.r = redis_client
        self.stream = stream
        self.group = group
        self.consumer = consumer
        self._ensure_group_exists()

    def _ensure_group_exists(self):
        """Create consumer group if it does not exist."""
        try:
            self.r.xgroup_create(self.stream, self.group, id='0', mkstream=True)
        except redis.exceptions.ResponseError as e:
            if 'BUSYGROUP' not in str(e):
                raise

    def consume(self, count: int = 10, block: int = 5000) -> list:
        """Consume new events from the stream."""
        results = self.r.xreadgroup(
            self.group,
            self.consumer,
            {self.stream: '>'},  # '>' means only new messages
            count=count,
            block=block
        )

        if not results:
            return []

        events = []
        for stream_name, messages in results:
            for message_id, fields in messages:
                events.append({
                    'id': message_id.decode('utf-8') if isinstance(message_id, bytes) else message_id,
                    'type': fields.get(b'type', b'').decode('utf-8'),
                    'timestamp': fields.get(b'timestamp', b'').decode('utf-8'),
                    'data': json.loads(fields.get(b'data', b'{}'))
                })

        return events

    def acknowledge(self, event_ids: list):
        """Acknowledge processed events."""
        if event_ids:
            self.r.xack(self.stream, self.group, *event_ids)

    def claim_pending(self, min_idle_time: int = 60000, count: int = 10) -> list:
        """Claim pending messages that have been idle too long."""
        pending = self.r.xpending_range(
            self.stream,
            self.group,
            min='-',
            max='+',
            count=count
        )

        if not pending:
            return []

        claimable_ids = [
            p['message_id'] for p in pending
            if p['time_since_delivered'] >= min_idle_time
        ]

        if not claimable_ids:
            return []

        claimed = self.r.xclaim(
            self.stream,
            self.group,
            self.consumer,
            min_idle_time,
            claimable_ids
        )

        return self._parse_messages(claimed)

    def _parse_messages(self, messages):
        events = []
        for message_id, fields in messages:
            events.append({
                'id': message_id.decode('utf-8') if isinstance(message_id, bytes) else message_id,
                'type': fields.get(b'type', b'').decode('utf-8'),
                'data': json.loads(fields.get(b'data', b'{}'))
            })
        return events

# Usage
consumer = EventConsumer(r, 'events:orders', 'billing-service', 'billing-1')

while True:
    events = consumer.consume(count=10, block=5000)

    for event in events:
        try:
            process_event(event)
            consumer.acknowledge([event['id']])
        except Exception as e:
            print(f"Error processing {event['id']}: {e}")
```

## Event Sourcing Patterns

### Aggregate Event Store

```python
class AggregateEventStore:
    """Store and replay events for aggregates."""

    def __init__(self, redis_client):
        self.r = redis_client

    def append_event(self, aggregate_type: str, aggregate_id: str,
                     event_type: str, data: dict, expected_version: int = None):
        """Append event to aggregate stream with optimistic concurrency."""
        stream_key = f"aggregate:{aggregate_type}:{aggregate_id}"

        if expected_version is not None:
            current_len = self.r.xlen(stream_key)
            if current_len != expected_version:
                raise ConcurrencyError(
                    f"Expected version {expected_version}, got {current_len}"
                )

        event = {
            'type': event_type,
            'data': json.dumps(data),
            'timestamp': str(int(time.time() * 1000))
        }

        return self.r.xadd(stream_key, event)

    def get_events(self, aggregate_type: str, aggregate_id: str,
                   after_version: int = 0) -> list:
        """Get all events for an aggregate after a version."""
        stream_key = f"aggregate:{aggregate_type}:{aggregate_id}"

        if after_version > 0:
            all_events = self.r.xrange(stream_key, '-', '+')
            events = all_events[after_version:]
        else:
            events = self.r.xrange(stream_key, '-', '+')

        return [
            {
                'id': e[0].decode('utf-8'),
                'type': e[1][b'type'].decode('utf-8'),
                'data': json.loads(e[1][b'data']),
                'timestamp': e[1][b'timestamp'].decode('utf-8')
            }
            for e in events
        ]

    def get_version(self, aggregate_type: str, aggregate_id: str) -> int:
        """Get current version (event count) of an aggregate."""
        stream_key = f"aggregate:{aggregate_type}:{aggregate_id}"
        return self.r.xlen(stream_key)

class ConcurrencyError(Exception):
    pass

# Usage
store = AggregateEventStore(r)

store.append_event('Order', '12345', 'OrderCreated', {
    'customer_id': 'cust_001',
    'items': [{'sku': 'WIDGET', 'qty': 2}]
}, expected_version=0)

store.append_event('Order', '12345', 'ItemAdded', {
    'sku': 'GADGET',
    'qty': 1
}, expected_version=1)
```

### Event Replay and Projection

```python
class EventProjection:
    """Build projections from event streams."""

    def __init__(self, redis_client, projection_name: str):
        self.r = redis_client
        self.projection_name = projection_name

    def get_checkpoint(self) -> str:
        """Get last processed event ID."""
        return self.r.get(f"projection:{self.projection_name}:checkpoint") or b'0'

    def save_checkpoint(self, event_id: str):
        """Save last processed event ID."""
        self.r.set(f"projection:{self.projection_name}:checkpoint", event_id)

    def rebuild(self, stream: str, handlers: dict):
        """Rebuild projection from scratch."""
        self.r.delete(f"projection:{self.projection_name}:checkpoint")

        last_id = '0'
        processed = 0

        while True:
            events = self.r.xrange(stream, f'({last_id}', '+', count=100)

            if not events:
                break

            for event_id, fields in events:
                event_type = fields[b'type'].decode('utf-8')
                data = json.loads(fields[b'data'])

                handler = handlers.get(event_type)
                if handler:
                    handler(data)

                last_id = event_id.decode('utf-8')
                processed += 1

            self.save_checkpoint(last_id)

        return processed

# Usage: Build order statistics projection
projection = EventProjection(r, 'order-stats')

def handle_order_created(data):
    r.hincrby('stats:orders', 'total_count', 1)
    r.hincrbyfloat('stats:orders', 'total_value', data['total'])

def handle_order_shipped(data):
    r.hincrby('stats:orders', 'shipped_count', 1)

handlers = {
    'order.created': handle_order_created,
    'order.shipped': handle_order_shipped
}

projection.rebuild('events:orders', handlers)
```

## Stream Maintenance

### Trim Old Events

```python
def trim_stream(redis_client, stream: str, max_len: int = None,
                max_age_hours: int = None):
    """Trim stream to manage size."""
    if max_len:
        redis_client.xtrim(stream, maxlen=max_len, approximate=True)

    if max_age_hours:
        cutoff = int((time.time() - max_age_hours * 3600) * 1000)
        cutoff_id = f"{cutoff}-0"
        redis_client.xtrim(stream, minid=cutoff_id, approximate=True)

trim_stream(r, 'events:orders', max_len=100000)
```

### Monitor Stream Health

```python
def get_stream_info(redis_client, stream: str) -> dict:
    """Get comprehensive stream information."""
    info = redis_client.xinfo_stream(stream)
    groups = redis_client.xinfo_groups(stream)

    return {
        'length': info['length'],
        'first_entry': info.get('first-entry'),
        'last_entry': info.get('last-entry'),
        'consumer_groups': [
            {
                'name': g['name'].decode('utf-8'),
                'consumers': g['consumers'],
                'pending': g['pending'],
                'last_delivered_id': g['last-delivered-id'].decode('utf-8')
            }
            for g in groups
        ]
    }

info = get_stream_info(r, 'events:orders')
print(f"Stream length: {info['length']}")
for group in info['consumer_groups']:
    print(f"Group {group['name']}: {group['pending']} pending messages")
```

---

Redis Streams provides a solid foundation for event sourcing and event-driven architectures. With consumer groups, you get reliable message delivery with automatic load balancing. The ability to replay events makes it perfect for building projections and recovering state. Start with simple event publishing and consumption, then add consumer groups as your system grows.
