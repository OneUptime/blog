# How to Implement Reliable Message Queues with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Streams, Message Queue, Consumer Groups, Reliable Messaging, Event-Driven

Description: A comprehensive guide to implementing reliable message queues with Redis Streams, including consumer groups, acknowledgments, dead letter handling, and production-ready patterns.

---

Redis Streams provide a powerful foundation for building reliable message queues. Unlike traditional Pub/Sub, Streams offer message persistence, consumer groups for parallel processing, acknowledgment mechanisms, and the ability to replay messages. This guide covers building production-ready message queues with all the reliability features you need.

## Redis Streams Fundamentals

Redis Streams is a log-like data structure where:

- Messages are appended with auto-generated or custom IDs
- Messages persist until explicitly deleted
- Consumer groups enable work distribution
- Each message can be acknowledged after processing
- Failed messages remain pending for retry

### Key Commands

| Command | Purpose |
|---------|---------|
| XADD | Add message to stream |
| XREAD | Read messages from stream |
| XREADGROUP | Read as part of consumer group |
| XACK | Acknowledge processed message |
| XPENDING | List pending messages |
| XCLAIM | Claim abandoned messages |
| XDEL | Delete specific messages |
| XTRIM | Trim stream by length or ID |

## Basic Stream Operations

```python
import redis
import time
import json

r = redis.Redis(decode_responses=True)

# Add messages
msg_id1 = r.xadd('mystream', {'event': 'order_created', 'order_id': '123'})
msg_id2 = r.xadd('mystream', {'event': 'order_paid', 'order_id': '123'})
print(f"Added: {msg_id1}, {msg_id2}")

# Read all messages
messages = r.xrange('mystream', '-', '+')
for msg_id, fields in messages:
    print(f"{msg_id}: {fields}")

# Read with count limit
recent = r.xrevrange('mystream', '+', '-', count=5)

# Blocking read for new messages
result = r.xread({'mystream': '$'}, block=5000, count=10)
```

## Building a Reliable Message Queue

### Python Implementation

```python
import redis
import json
import time
import threading
import uuid
from typing import Optional, Callable, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MessageStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD = "dead"


@dataclass
class Message:
    id: str
    stream: str
    data: dict
    attempts: int = 0
    created_at: float = None
    processed_at: float = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()


class MessageQueue:
    """Reliable message queue built on Redis Streams."""

    def __init__(self, redis_url: str = 'redis://localhost:6379',
                 stream_name: str = 'queue',
                 max_len: int = 100000):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.stream_name = stream_name
        self.max_len = max_len
        self.dead_letter_stream = f"{stream_name}:dead"

    def enqueue(self, data: dict, message_id: str = None) -> str:
        """Add a message to the queue."""
        payload = {
            'data': json.dumps(data),
            'created_at': str(time.time()),
            'attempts': '0'
        }

        msg_id = self.redis.xadd(
            self.stream_name,
            payload,
            id=message_id or '*',
            maxlen=self.max_len,
            approximate=True
        )

        logger.info(f"Enqueued message: {msg_id}")
        return msg_id

    def enqueue_batch(self, messages: List[dict]) -> List[str]:
        """Add multiple messages atomically."""
        pipe = self.redis.pipeline()
        for data in messages:
            payload = {
                'data': json.dumps(data),
                'created_at': str(time.time()),
                'attempts': '0'
            }
            pipe.xadd(self.stream_name, payload, maxlen=self.max_len, approximate=True)
        return pipe.execute()

    def get_queue_length(self) -> int:
        """Get the number of messages in the queue."""
        return self.redis.xlen(self.stream_name)

    def get_queue_info(self) -> dict:
        """Get detailed queue information."""
        info = self.redis.xinfo_stream(self.stream_name)
        groups = self.redis.xinfo_groups(self.stream_name)
        return {
            'length': info['length'],
            'first_entry': info.get('first-entry'),
            'last_entry': info.get('last-entry'),
            'groups': groups
        }


class ConsumerGroup:
    """Consumer group for processing messages."""

    def __init__(self, queue: MessageQueue, group_name: str,
                 consumer_name: str = None):
        self.queue = queue
        self.redis = queue.redis
        self.stream_name = queue.stream_name
        self.group_name = group_name
        self.consumer_name = consumer_name or f"consumer-{uuid.uuid4().hex[:8]}"
        self._ensure_group()

    def _ensure_group(self):
        """Create consumer group if it doesn't exist."""
        try:
            self.redis.xgroup_create(
                self.stream_name,
                self.group_name,
                id='0',
                mkstream=True
            )
            logger.info(f"Created consumer group: {self.group_name}")
        except redis.ResponseError as e:
            if 'BUSYGROUP' not in str(e):
                raise
            logger.debug(f"Consumer group already exists: {self.group_name}")

    def read_messages(self, count: int = 10, block_ms: int = 5000) -> List[Message]:
        """Read new messages for processing."""
        result = self.redis.xreadgroup(
            self.group_name,
            self.consumer_name,
            {self.stream_name: '>'},
            count=count,
            block=block_ms
        )

        if not result:
            return []

        messages = []
        for stream, stream_messages in result:
            for msg_id, fields in stream_messages:
                messages.append(Message(
                    id=msg_id,
                    stream=stream,
                    data=json.loads(fields.get('data', '{}')),
                    attempts=int(fields.get('attempts', 0)),
                    created_at=float(fields.get('created_at', time.time()))
                ))

        return messages

    def acknowledge(self, message_id: str) -> bool:
        """Acknowledge successful message processing."""
        result = self.redis.xack(self.stream_name, self.group_name, message_id)
        if result:
            logger.debug(f"Acknowledged: {message_id}")
        return result > 0

    def acknowledge_batch(self, message_ids: List[str]) -> int:
        """Acknowledge multiple messages."""
        if not message_ids:
            return 0
        return self.redis.xack(self.stream_name, self.group_name, *message_ids)

    def get_pending(self, count: int = 100) -> List[dict]:
        """Get list of pending messages."""
        pending = self.redis.xpending_range(
            self.stream_name,
            self.group_name,
            min='-',
            max='+',
            count=count
        )
        return pending

    def get_pending_summary(self) -> dict:
        """Get summary of pending messages."""
        info = self.redis.xpending(self.stream_name, self.group_name)
        return {
            'count': info['pending'],
            'min_id': info['min'],
            'max_id': info['max'],
            'by_consumer': info['consumers']
        }

    def claim_stale_messages(self, min_idle_ms: int = 60000,
                              count: int = 10) -> List[Message]:
        """Claim messages that have been pending too long."""
        pending = self.redis.xpending_range(
            self.stream_name,
            self.group_name,
            min='-',
            max='+',
            count=count
        )

        claimed = []
        for entry in pending:
            if entry['time_since_delivered'] >= min_idle_ms:
                result = self.redis.xclaim(
                    self.stream_name,
                    self.group_name,
                    self.consumer_name,
                    min_idle_ms,
                    [entry['message_id']]
                )
                for msg_id, fields in result:
                    if fields:  # Message still exists
                        claimed.append(Message(
                            id=msg_id,
                            stream=self.stream_name,
                            data=json.loads(fields.get('data', '{}')),
                            attempts=int(fields.get('attempts', 0)) + 1,
                            created_at=float(fields.get('created_at', time.time()))
                        ))

        if claimed:
            logger.info(f"Claimed {len(claimed)} stale messages")

        return claimed


class Worker:
    """Worker that processes messages from a queue."""

    def __init__(self, queue: MessageQueue, group_name: str,
                 worker_id: str = None, max_retries: int = 3,
                 retry_delay_ms: int = 5000):
        self.queue = queue
        self.consumer = ConsumerGroup(queue, group_name, worker_id)
        self.max_retries = max_retries
        self.retry_delay_ms = retry_delay_ms
        self.handlers: Dict[str, Callable] = {}
        self.default_handler: Optional[Callable] = None
        self.running = False
        self._thread: Optional[threading.Thread] = None

    def register_handler(self, message_type: str,
                         handler: Callable[[dict], bool]):
        """Register a handler for a specific message type."""
        self.handlers[message_type] = handler

    def set_default_handler(self, handler: Callable[[dict], bool]):
        """Set default handler for unmatched messages."""
        self.default_handler = handler

    def _get_handler(self, data: dict) -> Optional[Callable]:
        """Get appropriate handler for message."""
        msg_type = data.get('type') or data.get('event_type')
        if msg_type and msg_type in self.handlers:
            return self.handlers[msg_type]
        return self.default_handler

    def _process_message(self, message: Message) -> bool:
        """Process a single message."""
        handler = self._get_handler(message.data)

        if not handler:
            logger.warning(f"No handler for message: {message.id}")
            return True  # Acknowledge to avoid blocking

        try:
            result = handler(message.data)
            return result if result is not None else True
        except Exception as e:
            logger.error(f"Error processing {message.id}: {e}")
            return False

    def _handle_failure(self, message: Message):
        """Handle a failed message."""
        if message.attempts >= self.max_retries:
            # Move to dead letter queue
            self._move_to_dead_letter(message)
            self.consumer.acknowledge(message.id)
            logger.warning(f"Message {message.id} moved to dead letter queue")
        else:
            # Update attempt count (will be retried on next claim)
            logger.info(f"Message {message.id} will be retried "
                       f"(attempt {message.attempts + 1}/{self.max_retries})")

    def _move_to_dead_letter(self, message: Message):
        """Move failed message to dead letter stream."""
        self.queue.redis.xadd(
            self.queue.dead_letter_stream,
            {
                'data': json.dumps(message.data),
                'original_id': message.id,
                'attempts': str(message.attempts),
                'failed_at': str(time.time())
            }
        )

    def _process_batch(self):
        """Process a batch of messages."""
        # First, claim any stale messages
        stale = self.consumer.claim_stale_messages(
            min_idle_ms=self.retry_delay_ms
        )
        for message in stale:
            if self._process_message(message):
                self.consumer.acknowledge(message.id)
            else:
                self._handle_failure(message)

        # Then process new messages
        messages = self.consumer.read_messages(count=10, block_ms=5000)
        for message in messages:
            if self._process_message(message):
                self.consumer.acknowledge(message.id)
            else:
                self._handle_failure(message)

    def start(self, background: bool = False):
        """Start processing messages."""
        self.running = True
        logger.info(f"Worker {self.consumer.consumer_name} starting...")

        if background:
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()
        else:
            self._run()

    def _run(self):
        """Main processing loop."""
        while self.running:
            try:
                self._process_batch()
            except Exception as e:
                logger.error(f"Worker error: {e}")
                time.sleep(1)

    def stop(self):
        """Stop the worker."""
        self.running = False
        if self._thread:
            self._thread.join(timeout=10)
        logger.info(f"Worker {self.consumer.consumer_name} stopped")


class DeadLetterProcessor:
    """Process messages from the dead letter queue."""

    def __init__(self, queue: MessageQueue):
        self.queue = queue
        self.redis = queue.redis
        self.dead_letter_stream = queue.dead_letter_stream

    def get_dead_letters(self, count: int = 100) -> List[dict]:
        """Get messages from dead letter queue."""
        messages = self.redis.xrange(self.dead_letter_stream, '-', '+', count=count)
        return [
            {
                'id': msg_id,
                'data': json.loads(fields.get('data', '{}')),
                'original_id': fields.get('original_id'),
                'attempts': int(fields.get('attempts', 0)),
                'failed_at': float(fields.get('failed_at', 0))
            }
            for msg_id, fields in messages
        ]

    def replay_message(self, dead_letter_id: str) -> Optional[str]:
        """Replay a dead letter message back to the main queue."""
        messages = self.redis.xrange(
            self.dead_letter_stream,
            dead_letter_id,
            dead_letter_id
        )

        if not messages:
            return None

        _, fields = messages[0]
        data = json.loads(fields.get('data', '{}'))

        # Re-enqueue
        new_id = self.queue.enqueue(data)

        # Delete from dead letter
        self.redis.xdel(self.dead_letter_stream, dead_letter_id)

        logger.info(f"Replayed {dead_letter_id} as {new_id}")
        return new_id

    def purge(self, older_than_seconds: int = 86400) -> int:
        """Purge old dead letters."""
        cutoff = time.time() - older_than_seconds
        messages = self.redis.xrange(self.dead_letter_stream, '-', '+')

        deleted = 0
        for msg_id, fields in messages:
            failed_at = float(fields.get('failed_at', 0))
            if failed_at < cutoff:
                self.redis.xdel(self.dead_letter_stream, msg_id)
                deleted += 1

        return deleted


# Usage example
if __name__ == "__main__":
    # Create queue
    queue = MessageQueue(stream_name='orders')

    # Create worker
    worker = Worker(queue, group_name='order-processors', worker_id='worker-1')

    # Register handlers
    def process_order_created(data):
        print(f"Processing order: {data}")
        # Simulate processing
        time.sleep(0.1)
        return True

    def process_order_shipped(data):
        print(f"Shipping order: {data}")
        return True

    worker.register_handler('order_created', process_order_created)
    worker.register_handler('order_shipped', process_order_shipped)

    # Start worker in background
    worker.start(background=True)

    # Enqueue some messages
    for i in range(5):
        queue.enqueue({
            'type': 'order_created',
            'order_id': f'ORD-{i}',
            'customer': f'customer-{i}'
        })

    time.sleep(2)

    # Check queue info
    print(f"Queue info: {queue.get_queue_info()}")
    print(f"Pending: {worker.consumer.get_pending_summary()}")

    worker.stop()
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class MessageQueue {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || 'redis://localhost:6379');
        this.streamName = options.streamName || 'queue';
        this.maxLen = options.maxLen || 100000;
        this.deadLetterStream = `${this.streamName}:dead`;
    }

    async enqueue(data) {
        const payload = {
            data: JSON.stringify(data),
            created_at: Date.now().toString(),
            attempts: '0'
        };

        const id = await this.redis.xadd(
            this.streamName,
            'MAXLEN', '~', this.maxLen,
            '*',
            ...Object.entries(payload).flat()
        );

        return id;
    }

    async enqueueBatch(messages) {
        const pipeline = this.redis.pipeline();

        for (const data of messages) {
            const payload = {
                data: JSON.stringify(data),
                created_at: Date.now().toString(),
                attempts: '0'
            };

            pipeline.xadd(
                this.streamName,
                'MAXLEN', '~', this.maxLen,
                '*',
                ...Object.entries(payload).flat()
            );
        }

        return await pipeline.exec();
    }

    async getQueueLength() {
        return await this.redis.xlen(this.streamName);
    }

    async getQueueInfo() {
        const info = await this.redis.xinfo('STREAM', this.streamName);
        const groups = await this.redis.xinfo('GROUPS', this.streamName);
        return { info, groups };
    }
}

class ConsumerGroup {
    constructor(queue, groupName, consumerName = null) {
        this.queue = queue;
        this.redis = queue.redis;
        this.streamName = queue.streamName;
        this.groupName = groupName;
        this.consumerName = consumerName || `consumer-${uuidv4().slice(0, 8)}`;
    }

    async ensureGroup() {
        try {
            await this.redis.xgroup(
                'CREATE', this.streamName, this.groupName, '0', 'MKSTREAM'
            );
        } catch (e) {
            if (!e.message.includes('BUSYGROUP')) throw e;
        }
    }

    async readMessages(count = 10, blockMs = 5000) {
        const result = await this.redis.xreadgroup(
            'GROUP', this.groupName, this.consumerName,
            'COUNT', count,
            'BLOCK', blockMs,
            'STREAMS', this.streamName, '>'
        );

        if (!result) return [];

        return result[0][1].map(([id, fields]) => {
            const fieldObj = {};
            for (let i = 0; i < fields.length; i += 2) {
                fieldObj[fields[i]] = fields[i + 1];
            }
            return {
                id,
                data: JSON.parse(fieldObj.data || '{}'),
                attempts: parseInt(fieldObj.attempts || '0'),
                createdAt: parseFloat(fieldObj.created_at || Date.now())
            };
        });
    }

    async acknowledge(messageId) {
        return await this.redis.xack(this.streamName, this.groupName, messageId);
    }

    async acknowledgeBatch(messageIds) {
        if (messageIds.length === 0) return 0;
        return await this.redis.xack(this.streamName, this.groupName, ...messageIds);
    }

    async getPending(count = 100) {
        return await this.redis.xpending(
            this.streamName, this.groupName,
            '-', '+', count
        );
    }

    async claimStaleMessages(minIdleMs = 60000, count = 10) {
        const pending = await this.redis.xpending(
            this.streamName, this.groupName,
            '-', '+', count
        );

        const claimed = [];
        for (const [id, consumer, idleMs, deliveries] of pending) {
            if (idleMs >= minIdleMs) {
                const result = await this.redis.xclaim(
                    this.streamName, this.groupName, this.consumerName,
                    minIdleMs, id
                );

                if (result.length > 0) {
                    const [msgId, fields] = result[0];
                    const fieldObj = {};
                    for (let i = 0; i < fields.length; i += 2) {
                        fieldObj[fields[i]] = fields[i + 1];
                    }
                    claimed.push({
                        id: msgId,
                        data: JSON.parse(fieldObj.data || '{}'),
                        attempts: parseInt(fieldObj.attempts || '0') + 1,
                        createdAt: parseFloat(fieldObj.created_at || Date.now())
                    });
                }
            }
        }

        return claimed;
    }
}

class Worker {
    constructor(queue, groupName, options = {}) {
        this.queue = queue;
        this.consumer = new ConsumerGroup(queue, groupName, options.workerId);
        this.maxRetries = options.maxRetries || 3;
        this.retryDelayMs = options.retryDelayMs || 5000;
        this.handlers = new Map();
        this.defaultHandler = null;
        this.running = false;
    }

    registerHandler(messageType, handler) {
        this.handlers.set(messageType, handler);
    }

    setDefaultHandler(handler) {
        this.defaultHandler = handler;
    }

    async processMessage(message) {
        const type = message.data.type || message.data.event_type;
        const handler = this.handlers.get(type) || this.defaultHandler;

        if (!handler) {
            console.warn(`No handler for message: ${message.id}`);
            return true;
        }

        try {
            const result = await handler(message.data);
            return result !== false;
        } catch (e) {
            console.error(`Error processing ${message.id}:`, e);
            return false;
        }
    }

    async handleFailure(message) {
        if (message.attempts >= this.maxRetries) {
            await this.moveToDeadLetter(message);
            await this.consumer.acknowledge(message.id);
            console.warn(`Message ${message.id} moved to dead letter queue`);
        } else {
            console.info(`Message ${message.id} will be retried`);
        }
    }

    async moveToDeadLetter(message) {
        await this.queue.redis.xadd(
            this.queue.deadLetterStream, '*',
            'data', JSON.stringify(message.data),
            'original_id', message.id,
            'attempts', message.attempts.toString(),
            'failed_at', Date.now().toString()
        );
    }

    async start() {
        await this.consumer.ensureGroup();
        this.running = true;
        console.log(`Worker ${this.consumer.consumerName} starting...`);

        while (this.running) {
            try {
                // Claim stale messages
                const stale = await this.consumer.claimStaleMessages(this.retryDelayMs);
                for (const message of stale) {
                    if (await this.processMessage(message)) {
                        await this.consumer.acknowledge(message.id);
                    } else {
                        await this.handleFailure(message);
                    }
                }

                // Process new messages
                const messages = await this.consumer.readMessages(10, 5000);
                for (const message of messages) {
                    if (await this.processMessage(message)) {
                        await this.consumer.acknowledge(message.id);
                    } else {
                        await this.handleFailure(message);
                    }
                }
            } catch (e) {
                console.error('Worker error:', e);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    stop() {
        this.running = false;
        console.log(`Worker ${this.consumer.consumerName} stopped`);
    }
}

// Usage example
async function main() {
    const queue = new MessageQueue({ streamName: 'orders' });
    const worker = new Worker(queue, 'order-processors', { workerId: 'worker-1' });

    worker.registerHandler('order_created', async (data) => {
        console.log('Processing order:', data);
        return true;
    });

    worker.registerHandler('order_shipped', async (data) => {
        console.log('Shipping order:', data);
        return true;
    });

    // Start worker
    const workerPromise = worker.start();

    // Enqueue messages
    for (let i = 0; i < 5; i++) {
        await queue.enqueue({
            type: 'order_created',
            orderId: `ORD-${i}`,
            customer: `customer-${i}`
        });
    }

    // Wait a bit then stop
    await new Promise(r => setTimeout(r, 3000));
    worker.stop();

    console.log('Queue length:', await queue.getQueueLength());
}

main().catch(console.error);
```

## Monitoring and Observability

### Prometheus Metrics

```python
from prometheus_client import Counter, Gauge, Histogram

# Metrics
messages_enqueued = Counter(
    'redis_streams_messages_enqueued_total',
    'Total messages enqueued',
    ['stream']
)

messages_processed = Counter(
    'redis_streams_messages_processed_total',
    'Total messages processed',
    ['stream', 'status']
)

processing_duration = Histogram(
    'redis_streams_processing_duration_seconds',
    'Message processing duration',
    ['stream', 'handler']
)

queue_length = Gauge(
    'redis_streams_queue_length',
    'Current queue length',
    ['stream']
)

pending_messages = Gauge(
    'redis_streams_pending_messages',
    'Number of pending messages',
    ['stream', 'group']
)
```

### Health Check Endpoint

```python
from fastapi import FastAPI

app = FastAPI()

@app.get('/health')
async def health_check():
    queue = MessageQueue()

    try:
        info = queue.get_queue_info()
        pending = ConsumerGroup(queue, 'workers').get_pending_summary()

        return {
            'status': 'healthy',
            'queue_length': info['length'],
            'pending_count': pending['count'],
            'consumer_groups': info['groups']
        }
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}
```

## Best Practices

1. **Use consumer groups**: Enable parallel processing and fault tolerance

2. **Always acknowledge**: Prevent message reprocessing

3. **Implement dead letter handling**: Don't lose failed messages

4. **Set appropriate timeouts**: Balance between retries and stuck messages

5. **Monitor pending counts**: Alert on growing backlogs

6. **Trim old messages**: Use MAXLEN to prevent unbounded growth

7. **Handle idempotency**: Design handlers to handle duplicate processing

8. **Use appropriate block times**: Balance responsiveness and resource usage

## Conclusion

Redis Streams provides a robust foundation for building reliable message queues. With consumer groups, acknowledgment, and pending message tracking, you can build production-ready messaging systems that handle failures gracefully. The combination of persistence, parallel processing, and dead letter handling makes Streams suitable for critical workloads where message delivery guarantees matter.
