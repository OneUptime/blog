# How to Use Redis Streams vs Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Streams, Pub/Sub, Messaging, Event-Driven, Comparison

Description: A comprehensive comparison of Redis Streams and Pub/Sub for messaging workloads, including use cases, performance characteristics, and practical examples to help you choose the right approach.

---

Redis offers two messaging paradigms: the traditional Pub/Sub model and the newer Streams data structure. While both enable communication between producers and consumers, they have fundamentally different characteristics that make each suited for specific use cases. This guide compares both approaches and helps you choose the right one.

## Feature Comparison

| Feature | Pub/Sub | Streams |
|---------|---------|---------|
| Message Persistence | No | Yes |
| Consumer Groups | No | Yes |
| Message Acknowledgment | No | Yes |
| Message Replay | No | Yes |
| Delivery Guarantee | At-most-once | At-least-once |
| Blocking Reads | Yes | Yes |
| Pattern Matching | Yes | No |
| Message History | No | Yes |
| Backpressure Handling | No | Yes |
| Scalable Consumers | Limited | Yes (via groups) |

## Understanding Pub/Sub

Pub/Sub is a fire-and-forget messaging system:

- Messages are sent to channels
- All connected subscribers receive messages
- Messages are lost if no subscribers are connected
- No message persistence or history
- Simple and low-latency

### Pub/Sub Example

```python
import redis
import threading
import time

# Publisher
def publisher():
    r = redis.Redis(decode_responses=True)
    for i in range(5):
        r.publish('events', f'Event {i}')
        print(f"Published: Event {i}")
        time.sleep(1)

# Subscriber
def subscriber():
    r = redis.Redis(decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe('events')

    for message in pubsub.listen():
        if message['type'] == 'message':
            print(f"Received: {message['data']}")

# Start subscriber first
sub_thread = threading.Thread(target=subscriber, daemon=True)
sub_thread.start()

time.sleep(0.1)  # Wait for subscription

# Then publish
publisher()
```

## Understanding Streams

Streams provide durable, log-based messaging:

- Messages are appended to a log with unique IDs
- Messages persist until explicitly deleted
- Consumer groups enable parallel processing
- Supports acknowledgment and pending message tracking
- Can replay historical messages

### Streams Example

```python
import redis
import time

r = redis.Redis(decode_responses=True)

# Producer - add messages to stream
for i in range(5):
    msg_id = r.xadd('events-stream', {'event': f'Event {i}', 'timestamp': str(time.time())})
    print(f"Added message: {msg_id}")

# Consumer - read all messages
messages = r.xrange('events-stream', '-', '+')
for msg_id, fields in messages:
    print(f"Read: {msg_id} -> {fields}")

# Consumer with blocking read (new messages only)
last_id = '$'  # Only new messages
while True:
    messages = r.xread({'events-stream': last_id}, block=5000, count=10)
    if messages:
        for stream, stream_messages in messages:
            for msg_id, fields in stream_messages:
                print(f"New message: {msg_id} -> {fields}")
                last_id = msg_id
    else:
        print("No new messages")
        break
```

## When to Use Pub/Sub

### Best Use Cases for Pub/Sub

1. **Real-time notifications** where message loss is acceptable
2. **Live dashboards** showing current state
3. **Cache invalidation** across multiple servers
4. **Chat applications** where history is stored separately
5. **Event broadcasting** to multiple services

### Pub/Sub Implementation

```python
import redis
import json
from typing import Callable, Dict
from dataclasses import dataclass
import threading

@dataclass
class Event:
    type: str
    payload: dict

class PubSubEventBus:
    """Event bus using Redis Pub/Sub for real-time notifications."""

    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.pubsub = self.redis.pubsub()
        self.handlers: Dict[str, Callable] = {}

    def publish(self, channel: str, event: Event) -> int:
        """Publish an event to a channel."""
        message = json.dumps({
            'type': event.type,
            'payload': event.payload
        })
        return self.redis.publish(channel, message)

    def subscribe(self, channel: str, handler: Callable[[Event], None]):
        """Subscribe to a channel with a handler."""
        self.handlers[channel] = handler
        self.pubsub.subscribe(**{channel: self._create_handler(handler)})

    def _create_handler(self, handler: Callable):
        def wrapper(message):
            if message['type'] == 'message':
                data = json.loads(message['data'])
                event = Event(type=data['type'], payload=data['payload'])
                handler(event)
        return wrapper

    def start(self):
        """Start listening in a background thread."""
        thread = self.pubsub.run_in_thread(sleep_time=0.001)
        return thread

    def stop(self):
        """Stop the event bus."""
        self.pubsub.close()


# Use case: Cache invalidation
class CacheInvalidator:
    """Use Pub/Sub to invalidate caches across multiple servers."""

    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.pubsub = self.redis.pubsub()
        self.local_cache = {}

    def invalidate(self, key: str):
        """Invalidate a cache key across all servers."""
        self.redis.publish('cache:invalidate', key)

    def on_invalidation(self, message):
        """Handle cache invalidation messages."""
        if message['type'] == 'message':
            key = message['data']
            if key in self.local_cache:
                del self.local_cache[key]
                print(f"Invalidated local cache: {key}")

    def start_listener(self):
        """Start listening for invalidation messages."""
        self.pubsub.subscribe(**{'cache:invalidate': self.on_invalidation})
        return self.pubsub.run_in_thread(sleep_time=0.001)
```

## When to Use Streams

### Best Use Cases for Streams

1. **Event sourcing** where history matters
2. **Task queues** with acknowledgment
3. **Log aggregation** systems
4. **Reliable messaging** between services
5. **Data pipelines** with multiple consumers

### Streams Implementation

```python
import redis
import json
import time
from typing import Optional, List, Dict, Callable
from dataclasses import dataclass
import threading

@dataclass
class StreamMessage:
    id: str
    data: dict

class StreamProducer:
    """Produce messages to a Redis Stream."""

    def __init__(self, redis_url='redis://localhost:6379', stream_name='events'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.stream_name = stream_name

    def send(self, data: dict, max_len: Optional[int] = None) -> str:
        """Send a message to the stream."""
        kwargs = {}
        if max_len:
            kwargs['maxlen'] = max_len
            kwargs['approximate'] = True

        msg_id = self.redis.xadd(self.stream_name, data, **kwargs)
        return msg_id

    def send_batch(self, messages: List[dict]) -> List[str]:
        """Send multiple messages."""
        pipe = self.redis.pipeline()
        for msg in messages:
            pipe.xadd(self.stream_name, msg)
        return pipe.execute()


class StreamConsumer:
    """Consume messages from a Redis Stream."""

    def __init__(self, redis_url='redis://localhost:6379', stream_name='events'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.stream_name = stream_name

    def read_all(self, count: Optional[int] = None) -> List[StreamMessage]:
        """Read all messages from the stream."""
        messages = self.redis.xrange(self.stream_name, '-', '+', count=count)
        return [StreamMessage(id=msg_id, data=data) for msg_id, data in messages]

    def read_new(self, last_id: str = '$', block_ms: int = 5000,
                 count: int = 10) -> List[StreamMessage]:
        """Read new messages (blocking)."""
        result = self.redis.xread(
            {self.stream_name: last_id},
            block=block_ms,
            count=count
        )

        if not result:
            return []

        messages = []
        for stream, stream_messages in result:
            for msg_id, data in stream_messages:
                messages.append(StreamMessage(id=msg_id, data=data))

        return messages

    def read_range(self, start: str, end: str,
                   count: Optional[int] = None) -> List[StreamMessage]:
        """Read messages in a time range."""
        messages = self.redis.xrange(self.stream_name, start, end, count=count)
        return [StreamMessage(id=msg_id, data=data) for msg_id, data in messages]


class ConsumerGroupProcessor:
    """Process stream messages with consumer groups."""

    def __init__(self, redis_url='redis://localhost:6379',
                 stream_name='events', group_name='processors',
                 consumer_name='consumer-1'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.stream_name = stream_name
        self.group_name = group_name
        self.consumer_name = consumer_name
        self._ensure_group_exists()

    def _ensure_group_exists(self):
        """Create consumer group if it doesn't exist."""
        try:
            self.redis.xgroup_create(
                self.stream_name,
                self.group_name,
                id='0',
                mkstream=True
            )
        except redis.ResponseError as e:
            if 'BUSYGROUP' not in str(e):
                raise

    def process(self, handler: Callable[[StreamMessage], bool],
                batch_size: int = 10, block_ms: int = 5000):
        """Process messages with acknowledgment."""
        while True:
            # Read new messages
            messages = self.redis.xreadgroup(
                self.group_name,
                self.consumer_name,
                {self.stream_name: '>'},
                count=batch_size,
                block=block_ms
            )

            if not messages:
                continue

            for stream, stream_messages in messages:
                for msg_id, data in stream_messages:
                    message = StreamMessage(id=msg_id, data=data)
                    try:
                        success = handler(message)
                        if success:
                            # Acknowledge successful processing
                            self.redis.xack(self.stream_name, self.group_name, msg_id)
                        else:
                            print(f"Handler returned False for {msg_id}")
                    except Exception as e:
                        print(f"Error processing {msg_id}: {e}")
                        # Message will remain pending for retry

    def claim_pending(self, min_idle_ms: int = 60000,
                      count: int = 10) -> List[StreamMessage]:
        """Claim pending messages that have been idle too long."""
        pending = self.redis.xpending_range(
            self.stream_name,
            self.group_name,
            min='-',
            max='+',
            count=count
        )

        claimed = []
        for entry in pending:
            msg_id = entry['message_id']
            idle = entry['time_since_delivered']

            if idle >= min_idle_ms:
                result = self.redis.xclaim(
                    self.stream_name,
                    self.group_name,
                    self.consumer_name,
                    min_idle_ms,
                    [msg_id]
                )
                for claimed_id, data in result:
                    claimed.append(StreamMessage(id=claimed_id, data=data))

        return claimed

    def get_pending_info(self) -> dict:
        """Get information about pending messages."""
        info = self.redis.xpending(self.stream_name, self.group_name)
        return {
            'pending_count': info['pending'],
            'min_id': info['min'],
            'max_id': info['max'],
            'consumers': info['consumers']
        }


# Example: Reliable task queue
class TaskQueue:
    """Reliable task queue using Redis Streams."""

    def __init__(self, redis_url='redis://localhost:6379',
                 queue_name='tasks'):
        self.producer = StreamProducer(redis_url, queue_name)
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.queue_name = queue_name

    def enqueue(self, task_type: str, payload: dict,
                priority: int = 0) -> str:
        """Add a task to the queue."""
        data = {
            'type': task_type,
            'payload': json.dumps(payload),
            'priority': str(priority),
            'enqueued_at': str(time.time())
        }
        return self.producer.send(data, max_len=10000)

    def get_queue_info(self) -> dict:
        """Get queue statistics."""
        length = self.redis.xlen(self.queue_name)
        info = self.redis.xinfo_stream(self.queue_name)
        return {
            'length': length,
            'first_entry': info.get('first-entry'),
            'last_entry': info.get('last-entry'),
            'groups': self.redis.xinfo_groups(self.queue_name)
        }


class TaskWorker:
    """Worker that processes tasks from the queue."""

    def __init__(self, redis_url='redis://localhost:6379',
                 queue_name='tasks', worker_id='worker-1'):
        self.processor = ConsumerGroupProcessor(
            redis_url=redis_url,
            stream_name=queue_name,
            group_name='workers',
            consumer_name=worker_id
        )
        self.handlers: Dict[str, Callable] = {}

    def register_handler(self, task_type: str, handler: Callable):
        """Register a handler for a task type."""
        self.handlers[task_type] = handler

    def _process_message(self, message: StreamMessage) -> bool:
        """Process a single message."""
        task_type = message.data.get('type')
        payload = json.loads(message.data.get('payload', '{}'))

        handler = self.handlers.get(task_type)
        if handler:
            try:
                handler(payload)
                return True
            except Exception as e:
                print(f"Task failed: {e}")
                return False
        else:
            print(f"No handler for task type: {task_type}")
            return True  # Acknowledge unknown tasks

    def start(self):
        """Start processing tasks."""
        print(f"Worker started, waiting for tasks...")
        self.processor.process(self._process_message)
```

## Node.js Comparison Example

```javascript
const Redis = require('ioredis');

// Pub/Sub Example
class PubSubMessenger {
    constructor() {
        this.publisher = new Redis();
        this.subscriber = new Redis();
    }

    async publish(channel, message) {
        const data = JSON.stringify(message);
        return await this.publisher.publish(channel, data);
    }

    subscribe(channel, handler) {
        this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, message) => {
            if (ch === channel) {
                handler(JSON.parse(message));
            }
        });
    }

    async close() {
        await this.publisher.quit();
        await this.subscriber.quit();
    }
}

// Streams Example
class StreamMessenger {
    constructor(streamName = 'events') {
        this.redis = new Redis();
        this.streamName = streamName;
    }

    async publish(message) {
        const id = await this.redis.xadd(
            this.streamName,
            '*',
            'data',
            JSON.stringify(message)
        );
        return id;
    }

    async consume(lastId = '$', blockMs = 5000) {
        const results = await this.redis.xread(
            'BLOCK', blockMs,
            'STREAMS', this.streamName, lastId
        );

        if (!results) return [];

        return results[0][1].map(([id, fields]) => ({
            id,
            data: JSON.parse(fields[1])
        }));
    }

    async createConsumerGroup(groupName) {
        try {
            await this.redis.xgroup(
                'CREATE', this.streamName, groupName, '0', 'MKSTREAM'
            );
        } catch (e) {
            if (!e.message.includes('BUSYGROUP')) throw e;
        }
    }

    async consumeGroup(groupName, consumerName, handler) {
        while (true) {
            const results = await this.redis.xreadgroup(
                'GROUP', groupName, consumerName,
                'BLOCK', 5000,
                'COUNT', 10,
                'STREAMS', this.streamName, '>'
            );

            if (!results) continue;

            for (const [stream, messages] of results) {
                for (const [id, fields] of messages) {
                    const data = JSON.parse(fields[1]);
                    try {
                        await handler({ id, data });
                        await this.redis.xack(this.streamName, groupName, id);
                    } catch (e) {
                        console.error(`Failed to process ${id}:`, e);
                    }
                }
            }
        }
    }

    async close() {
        await this.redis.quit();
    }
}

// Comparison demonstration
async function comparePubSubVsStreams() {
    console.log('=== Pub/Sub Demo ===');

    const pubsub = new PubSubMessenger();

    pubsub.subscribe('events', (msg) => {
        console.log('Pub/Sub received:', msg);
    });

    await new Promise(r => setTimeout(r, 100));

    await pubsub.publish('events', { type: 'test', value: 1 });
    await pubsub.publish('events', { type: 'test', value: 2 });

    await new Promise(r => setTimeout(r, 100));

    console.log('\n=== Streams Demo ===');

    const streams = new StreamMessenger('demo-stream');

    // Publish messages
    const id1 = await streams.publish({ type: 'test', value: 1 });
    const id2 = await streams.publish({ type: 'test', value: 2 });
    console.log('Published:', id1, id2);

    // Read all messages (historical)
    const allMessages = await streams.redis.xrange('demo-stream', '-', '+');
    console.log('Historical messages:', allMessages.length);

    // Consumer group processing
    await streams.createConsumerGroup('processors');

    // This would run in a worker
    // await streams.consumeGroup('processors', 'worker-1', async (msg) => {
    //     console.log('Processing:', msg);
    // });

    await pubsub.close();
    await streams.close();
}

comparePubSubVsStreams().catch(console.error);
```

## Decision Guide

### Choose Pub/Sub When

- Real-time delivery is more important than durability
- All subscribers need all messages
- Historical messages are not needed
- Simple broadcast patterns
- Low latency is critical
- Cache invalidation or live updates

### Choose Streams When

- Messages must not be lost
- Need to replay historical data
- Multiple consumers process different messages
- Acknowledgment and retry are required
- Building task queues or pipelines
- Event sourcing architecture

### Hybrid Approach

Sometimes the best solution combines both:

```python
class HybridMessaging:
    """Use both Pub/Sub and Streams for different purposes."""

    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.pubsub = self.redis.pubsub()

    def publish_event(self, event_type: str, data: dict):
        """Publish to both Stream (durability) and Pub/Sub (real-time)."""
        message = {
            'type': event_type,
            'data': json.dumps(data),
            'timestamp': str(time.time())
        }

        # Store in stream for durability
        stream_id = self.redis.xadd(f'events:{event_type}', message, maxlen=10000)

        # Broadcast via Pub/Sub for real-time
        self.redis.publish(f'live:{event_type}', json.dumps({
            'stream_id': stream_id,
            **message
        }))

        return stream_id
```

## Performance Characteristics

### Pub/Sub Performance

- **Latency**: Very low (~0.1ms local)
- **Throughput**: High (100k+ msg/sec)
- **Memory**: Minimal (no storage)
- **Scaling**: Limited by subscriber count

### Streams Performance

- **Latency**: Low (~0.5ms local)
- **Throughput**: High (50k+ msg/sec with acknowledgment)
- **Memory**: Grows with retained messages
- **Scaling**: Consumer groups enable horizontal scaling

## Conclusion

Redis Pub/Sub and Streams serve different purposes in messaging architectures. Pub/Sub excels at real-time broadcasting where message loss is acceptable, while Streams provides durable, reliable messaging with consumer groups and acknowledgment. For most production systems requiring reliability, Streams is the better choice. However, Pub/Sub remains valuable for real-time notifications and cache invalidation where simplicity and low latency are priorities. Consider using both together when you need both real-time delivery and message durability.
