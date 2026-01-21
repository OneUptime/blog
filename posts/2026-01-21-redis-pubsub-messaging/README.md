# How to Implement Pub/Sub Messaging with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Messaging, Real-time, Events, Microservices

Description: A comprehensive guide to implementing publish/subscribe messaging patterns with Redis, including PUBLISH, SUBSCRIBE, pattern subscriptions, and real-time notification systems.

---

Redis Pub/Sub provides a simple yet powerful messaging paradigm for real-time communication between application components. Publishers send messages to channels without knowing who will receive them, while subscribers listen to channels without knowing who is publishing. This decoupling makes Pub/Sub ideal for event-driven architectures and real-time notifications.

## Understanding Redis Pub/Sub

Redis Pub/Sub follows the publish-subscribe pattern:

- **Publishers** send messages to named channels
- **Subscribers** listen to one or more channels
- **Messages are fire-and-forget** - no persistence or acknowledgment
- **Pattern matching** allows subscribing to multiple channels with wildcards

### Key Characteristics

| Feature | Behavior |
|---------|----------|
| Message Delivery | At-most-once (no guarantees) |
| Persistence | None (messages lost if no subscribers) |
| Message Order | Preserved per publisher |
| Scalability | All subscribers receive all messages |
| Pattern Matching | Supported with PSUBSCRIBE |

## Basic Pub/Sub Commands

### Publishing Messages

```bash
# Publish a message to a channel
redis-cli PUBLISH notifications "Hello, World!"

# Returns the number of subscribers that received the message
(integer) 2
```

### Subscribing to Channels

```bash
# Subscribe to one or more channels
redis-cli SUBSCRIBE notifications alerts

# Output:
# 1) "subscribe"
# 2) "notifications"
# 3) (integer) 1
# 1) "subscribe"
# 2) "alerts"
# 3) (integer) 2
# ... waiting for messages ...
```

### Pattern Subscriptions

```bash
# Subscribe to channels matching a pattern
redis-cli PSUBSCRIBE "user:*" "order:*"

# Matches: user:123, user:456, order:new, order:cancelled, etc.
```

## Python Pub/Sub Implementation

Here is a comprehensive Python implementation:

```python
import redis
import threading
import json
import time
from typing import Callable, Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class Event:
    """Base event class for Pub/Sub messages."""
    type: str
    timestamp: str
    data: dict

    @classmethod
    def create(cls, event_type: str, data: dict) -> 'Event':
        return cls(
            type=event_type,
            timestamp=datetime.utcnow().isoformat(),
            data=data
        )

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, json_str: str) -> 'Event':
        data = json.loads(json_str)
        return cls(**data)


class RedisPublisher:
    """Redis Pub/Sub publisher."""

    def __init__(self, host='localhost', port=6379, password=None):
        self.client = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )

    def publish(self, channel: str, message: str) -> int:
        """Publish a message to a channel."""
        return self.client.publish(channel, message)

    def publish_event(self, channel: str, event: Event) -> int:
        """Publish an event object to a channel."""
        return self.publish(channel, event.to_json())

    def publish_dict(self, channel: str, data: dict) -> int:
        """Publish a dictionary as JSON to a channel."""
        return self.publish(channel, json.dumps(data))

    def get_channel_subscribers(self, channel: str) -> int:
        """Get the number of subscribers for a channel."""
        result = self.client.pubsub_numsub(channel)
        return result[0][1] if result else 0

    def get_active_channels(self, pattern: str = '*') -> List[str]:
        """Get list of active channels matching pattern."""
        return self.client.pubsub_channels(pattern)


class RedisSubscriber:
    """Redis Pub/Sub subscriber with callback support."""

    def __init__(self, host='localhost', port=6379, password=None):
        self.client = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )
        self.pubsub = self.client.pubsub()
        self.handlers: Dict[str, List[Callable]] = {}
        self.pattern_handlers: Dict[str, List[Callable]] = {}
        self.running = False
        self.thread: Optional[threading.Thread] = None

    def subscribe(self, channel: str, handler: Callable[[str, str], None]):
        """Subscribe to a channel with a handler function."""
        if channel not in self.handlers:
            self.handlers[channel] = []
            self.pubsub.subscribe(channel)
        self.handlers[channel].append(handler)

    def psubscribe(self, pattern: str, handler: Callable[[str, str, str], None]):
        """Subscribe to channels matching a pattern."""
        if pattern not in self.pattern_handlers:
            self.pattern_handlers[pattern] = []
            self.pubsub.psubscribe(pattern)
        self.pattern_handlers[pattern].append(handler)

    def unsubscribe(self, channel: str):
        """Unsubscribe from a channel."""
        self.pubsub.unsubscribe(channel)
        if channel in self.handlers:
            del self.handlers[channel]

    def punsubscribe(self, pattern: str):
        """Unsubscribe from a pattern."""
        self.pubsub.punsubscribe(pattern)
        if pattern in self.pattern_handlers:
            del self.pattern_handlers[pattern]

    def _handle_message(self, message):
        """Process incoming messages."""
        if message['type'] == 'message':
            channel = message['channel']
            data = message['data']
            if channel in self.handlers:
                for handler in self.handlers[channel]:
                    try:
                        handler(channel, data)
                    except Exception as e:
                        print(f"Handler error: {e}")

        elif message['type'] == 'pmessage':
            pattern = message['pattern']
            channel = message['channel']
            data = message['data']
            if pattern in self.pattern_handlers:
                for handler in self.pattern_handlers[pattern]:
                    try:
                        handler(pattern, channel, data)
                    except Exception as e:
                        print(f"Pattern handler error: {e}")

    def start(self, daemon=True):
        """Start listening for messages in a background thread."""
        self.running = True
        self.thread = threading.Thread(target=self._listen, daemon=daemon)
        self.thread.start()

    def _listen(self):
        """Listen for messages."""
        for message in self.pubsub.listen():
            if not self.running:
                break
            self._handle_message(message)

    def stop(self):
        """Stop listening for messages."""
        self.running = False
        self.pubsub.close()

    def run_in_thread(self, sleep_time=0.001):
        """Run the subscriber in a managed thread."""
        return self.pubsub.run_in_thread(sleep_time=sleep_time)


class EventBus:
    """High-level event bus built on Redis Pub/Sub."""

    def __init__(self, host='localhost', port=6379, password=None,
                 channel_prefix='events:'):
        self.publisher = RedisPublisher(host, port, password)
        self.subscriber = RedisSubscriber(host, port, password)
        self.channel_prefix = channel_prefix

    def emit(self, event_type: str, data: dict) -> int:
        """Emit an event."""
        channel = f"{self.channel_prefix}{event_type}"
        event = Event.create(event_type, data)
        return self.publisher.publish_event(channel, event)

    def on(self, event_type: str, handler: Callable[[Event], None]):
        """Register a handler for an event type."""
        channel = f"{self.channel_prefix}{event_type}"

        def wrapper(ch: str, message: str):
            event = Event.from_json(message)
            handler(event)

        self.subscriber.subscribe(channel, wrapper)

    def on_pattern(self, pattern: str, handler: Callable[[str, Event], None]):
        """Register a handler for events matching a pattern."""
        full_pattern = f"{self.channel_prefix}{pattern}"

        def wrapper(pat: str, channel: str, message: str):
            event = Event.from_json(message)
            event_type = channel.replace(self.channel_prefix, '')
            handler(event_type, event)

        self.subscriber.psubscribe(full_pattern, wrapper)

    def start(self):
        """Start the event bus."""
        self.subscriber.start()

    def stop(self):
        """Stop the event bus."""
        self.subscriber.stop()


# Usage example
if __name__ == "__main__":
    # Example 1: Basic Pub/Sub
    print("=== Basic Pub/Sub ===")

    publisher = RedisPublisher()
    subscriber = RedisSubscriber()

    def message_handler(channel, message):
        print(f"Received on {channel}: {message}")

    subscriber.subscribe('notifications', message_handler)
    subscriber.start()

    time.sleep(0.1)  # Let subscriber connect

    publisher.publish('notifications', 'Hello from publisher!')
    publisher.publish('notifications', 'Another message!')

    time.sleep(0.5)
    subscriber.stop()

    # Example 2: Event Bus
    print("\n=== Event Bus ===")

    bus = EventBus()

    def on_user_created(event: Event):
        print(f"User created: {event.data}")

    def on_any_user_event(event_type: str, event: Event):
        print(f"User event '{event_type}': {event.data}")

    bus.on('user.created', on_user_created)
    bus.on_pattern('user.*', on_any_user_event)
    bus.start()

    time.sleep(0.1)

    bus.emit('user.created', {'id': 123, 'name': 'John'})
    bus.emit('user.updated', {'id': 123, 'name': 'John Doe'})

    time.sleep(0.5)
    bus.stop()
```

## Node.js Pub/Sub Implementation

```javascript
const Redis = require('ioredis');
const EventEmitter = require('events');

class RedisPublisher {
    constructor(options = {}) {
        this.client = new Redis(options);
    }

    async publish(channel, message) {
        if (typeof message === 'object') {
            message = JSON.stringify(message);
        }
        return await this.client.publish(channel, message);
    }

    async publishEvent(channel, eventType, data) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            data
        };
        return await this.publish(channel, event);
    }

    async getChannelSubscribers(channel) {
        const result = await this.client.pubsub('NUMSUB', channel);
        return result[1] || 0;
    }

    async getActiveChannels(pattern = '*') {
        return await this.client.pubsub('CHANNELS', pattern);
    }

    async close() {
        await this.client.quit();
    }
}

class RedisSubscriber extends EventEmitter {
    constructor(options = {}) {
        super();
        this.client = new Redis(options);
        this.handlers = new Map();
        this.patternHandlers = new Map();

        this.client.on('message', (channel, message) => {
            this._handleMessage(channel, message);
        });

        this.client.on('pmessage', (pattern, channel, message) => {
            this._handlePatternMessage(pattern, channel, message);
        });
    }

    _handleMessage(channel, message) {
        const handlers = this.handlers.get(channel) || [];
        for (const handler of handlers) {
            try {
                handler(channel, this._parseMessage(message));
            } catch (error) {
                this.emit('error', error);
            }
        }
    }

    _handlePatternMessage(pattern, channel, message) {
        const handlers = this.patternHandlers.get(pattern) || [];
        for (const handler of handlers) {
            try {
                handler(pattern, channel, this._parseMessage(message));
            } catch (error) {
                this.emit('error', error);
            }
        }
    }

    _parseMessage(message) {
        try {
            return JSON.parse(message);
        } catch {
            return message;
        }
    }

    async subscribe(channel, handler) {
        if (!this.handlers.has(channel)) {
            this.handlers.set(channel, []);
            await this.client.subscribe(channel);
        }
        this.handlers.get(channel).push(handler);
    }

    async psubscribe(pattern, handler) {
        if (!this.patternHandlers.has(pattern)) {
            this.patternHandlers.set(pattern, []);
            await this.client.psubscribe(pattern);
        }
        this.patternHandlers.get(pattern).push(handler);
    }

    async unsubscribe(channel) {
        await this.client.unsubscribe(channel);
        this.handlers.delete(channel);
    }

    async punsubscribe(pattern) {
        await this.client.punsubscribe(pattern);
        this.patternHandlers.delete(pattern);
    }

    async close() {
        await this.client.quit();
    }
}

class EventBus {
    constructor(options = {}) {
        this.channelPrefix = options.channelPrefix || 'events:';
        this.publisher = new RedisPublisher(options);
        this.subscriber = new RedisSubscriber(options);
    }

    async emit(eventType, data) {
        const channel = `${this.channelPrefix}${eventType}`;
        return await this.publisher.publishEvent(channel, eventType, data);
    }

    async on(eventType, handler) {
        const channel = `${this.channelPrefix}${eventType}`;
        await this.subscriber.subscribe(channel, (ch, event) => {
            handler(event);
        });
    }

    async onPattern(pattern, handler) {
        const fullPattern = `${this.channelPrefix}${pattern}`;
        await this.subscriber.psubscribe(fullPattern, (pat, channel, event) => {
            const eventType = channel.replace(this.channelPrefix, '');
            handler(eventType, event);
        });
    }

    async close() {
        await this.publisher.close();
        await this.subscriber.close();
    }
}

// Usage example
async function main() {
    // Example 1: Basic Pub/Sub
    console.log('=== Basic Pub/Sub ===');

    const publisher = new RedisPublisher();
    const subscriber = new RedisSubscriber();

    await subscriber.subscribe('notifications', (channel, message) => {
        console.log(`Received on ${channel}:`, message);
    });

    await publisher.publish('notifications', { text: 'Hello, World!' });
    await publisher.publish('notifications', 'Plain text message');

    // Example 2: Pattern subscription
    console.log('\n=== Pattern Subscription ===');

    await subscriber.psubscribe('user:*', (pattern, channel, message) => {
        console.log(`Pattern ${pattern} matched ${channel}:`, message);
    });

    await publisher.publish('user:123', { action: 'login' });
    await publisher.publish('user:456', { action: 'logout' });

    // Example 3: Event Bus
    console.log('\n=== Event Bus ===');

    const bus = new EventBus();

    await bus.on('order.created', (event) => {
        console.log('Order created:', event);
    });

    await bus.onPattern('order.*', (eventType, event) => {
        console.log(`Order event '${eventType}':`, event);
    });

    await bus.emit('order.created', { orderId: 'ORD-123', total: 99.99 });
    await bus.emit('order.shipped', { orderId: 'ORD-123', carrier: 'UPS' });

    // Wait for messages to process
    await new Promise(resolve => setTimeout(resolve, 500));

    await subscriber.close();
    await publisher.close();
    await bus.close();
}

main().catch(console.error);
```

## Real-Time Notification System

Here is a practical example of a notification system:

```python
import redis
import json
import threading
from datetime import datetime
from enum import Enum
from typing import Optional, List
from dataclasses import dataclass, asdict

class NotificationType(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

@dataclass
class Notification:
    id: str
    user_id: str
    type: str
    title: str
    message: str
    timestamp: str
    read: bool = False
    data: Optional[dict] = None

    def to_dict(self):
        return asdict(self)

class NotificationService:
    """Real-time notification service using Redis Pub/Sub."""

    def __init__(self, redis_host='localhost', redis_port=6379):
        self.redis = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True
        )
        self.pubsub = self.redis.pubsub()
        self.channel_prefix = 'notifications:'

    def _get_user_channel(self, user_id: str) -> str:
        return f"{self.channel_prefix}user:{user_id}"

    def _get_broadcast_channel(self) -> str:
        return f"{self.channel_prefix}broadcast"

    def _generate_id(self) -> str:
        import uuid
        return str(uuid.uuid4())

    def send_to_user(self, user_id: str, notification_type: NotificationType,
                     title: str, message: str, data: Optional[dict] = None) -> Notification:
        """Send a notification to a specific user."""
        notification = Notification(
            id=self._generate_id(),
            user_id=user_id,
            type=notification_type.value,
            title=title,
            message=message,
            timestamp=datetime.utcnow().isoformat(),
            data=data
        )

        channel = self._get_user_channel(user_id)
        self.redis.publish(channel, json.dumps(notification.to_dict()))

        # Also store in user's notification list
        self._store_notification(notification)

        return notification

    def broadcast(self, notification_type: NotificationType,
                  title: str, message: str, data: Optional[dict] = None) -> str:
        """Broadcast a notification to all users."""
        notification_id = self._generate_id()

        payload = {
            'id': notification_id,
            'type': notification_type.value,
            'title': title,
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'data': data
        }

        channel = self._get_broadcast_channel()
        self.redis.publish(channel, json.dumps(payload))

        return notification_id

    def _store_notification(self, notification: Notification):
        """Store notification in user's list for later retrieval."""
        key = f"user:{notification.user_id}:notifications"
        self.redis.lpush(key, json.dumps(notification.to_dict()))
        self.redis.ltrim(key, 0, 99)  # Keep last 100 notifications

    def get_user_notifications(self, user_id: str,
                                limit: int = 20) -> List[Notification]:
        """Get recent notifications for a user."""
        key = f"user:{user_id}:notifications"
        items = self.redis.lrange(key, 0, limit - 1)
        return [Notification(**json.loads(item)) for item in items]

    def mark_as_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a notification as read."""
        key = f"user:{user_id}:notifications"
        items = self.redis.lrange(key, 0, -1)

        for i, item in enumerate(items):
            notification = json.loads(item)
            if notification['id'] == notification_id:
                notification['read'] = True
                self.redis.lset(key, i, json.dumps(notification))
                return True

        return False

    def subscribe_user(self, user_id: str, handler):
        """Subscribe to notifications for a specific user."""
        channel = self._get_user_channel(user_id)
        self.pubsub.subscribe(**{channel: handler})

    def subscribe_broadcast(self, handler):
        """Subscribe to broadcast notifications."""
        channel = self._get_broadcast_channel()
        self.pubsub.subscribe(**{channel: handler})

    def start_listening(self):
        """Start listening for notifications in a background thread."""
        return self.pubsub.run_in_thread(sleep_time=0.001)

    def close(self):
        """Close the notification service."""
        self.pubsub.close()


# WebSocket integration example (using Flask-SocketIO)
"""
from flask import Flask
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
notification_service = NotificationService()

def handle_notification(message):
    data = json.loads(message['data'])
    user_id = data.get('user_id')
    if user_id:
        socketio.emit('notification', data, room=f'user_{user_id}')

@socketio.on('connect')
def on_connect():
    user_id = request.args.get('user_id')
    if user_id:
        join_room(f'user_{user_id}')
        notification_service.subscribe_user(user_id, handle_notification)

if __name__ == '__main__':
    notification_service.start_listening()
    socketio.run(app, port=5000)
"""

# Usage example
if __name__ == "__main__":
    service = NotificationService()

    # Handler for user notifications
    def user_notification_handler(message):
        data = json.loads(message['data'])
        print(f"User notification: {data['title']} - {data['message']}")

    # Handler for broadcast
    def broadcast_handler(message):
        data = json.loads(message['data'])
        print(f"Broadcast: {data['title']} - {data['message']}")

    # Subscribe
    service.subscribe_user('user123', user_notification_handler)
    service.subscribe_broadcast(broadcast_handler)

    # Start listening
    thread = service.start_listening()

    # Send notifications
    import time
    time.sleep(0.1)

    service.send_to_user(
        'user123',
        NotificationType.INFO,
        'Welcome!',
        'Thanks for signing up!'
    )

    service.broadcast(
        NotificationType.WARNING,
        'Maintenance',
        'System maintenance in 1 hour'
    )

    time.sleep(0.5)

    # Get stored notifications
    notifications = service.get_user_notifications('user123')
    print(f"\nStored notifications: {len(notifications)}")

    thread.stop()
    service.close()
```

## Pub/Sub Monitoring

### Monitor Active Channels

```python
def monitor_pubsub(client):
    """Monitor Pub/Sub activity."""
    # Get active channels
    channels = client.pubsub_channels('*')
    print(f"Active channels: {channels}")

    # Get subscriber counts
    for channel in channels:
        count = client.pubsub_numsub(channel)
        print(f"  {channel}: {count[0][1]} subscribers")

    # Get pattern subscriber count
    pattern_count = client.pubsub_numpat()
    print(f"Pattern subscriptions: {pattern_count}")
```

### Prometheus Metrics

```python
from prometheus_client import Counter, Gauge

# Metrics
pubsub_messages_published = Counter(
    'redis_pubsub_messages_published_total',
    'Total messages published',
    ['channel']
)

pubsub_messages_received = Counter(
    'redis_pubsub_messages_received_total',
    'Total messages received',
    ['channel']
)

pubsub_active_subscribers = Gauge(
    'redis_pubsub_active_subscribers',
    'Number of active subscribers',
    ['channel']
)
```

## Best Practices

1. **Handle disconnections**: Implement reconnection logic for subscribers

2. **Use pattern subscriptions wisely**: They can be expensive with many channels

3. **Don't rely on delivery**: Pub/Sub is fire-and-forget; use Streams for guarantees

4. **Monitor subscriber counts**: Alert on unexpected changes

5. **Use namespaced channels**: Prefix channels to avoid collisions

6. **Parse messages safely**: Always handle JSON parse errors

7. **Limit message size**: Keep messages small; store large data separately

8. **Consider Streams for durability**: Use Redis Streams when persistence is required

## Limitations of Pub/Sub

- **No persistence**: Messages are lost if no subscribers are connected
- **No acknowledgments**: No way to confirm message delivery
- **No replay**: Cannot retrieve historical messages
- **Memory pressure**: Large subscriber counts can impact performance
- **Single-node scope**: In Redis Cluster, Pub/Sub is node-local

For use cases requiring message durability and guaranteed delivery, consider Redis Streams instead.

## Conclusion

Redis Pub/Sub provides a lightweight, high-performance messaging system for real-time communication. It excels at scenarios like live notifications, cache invalidation, and event broadcasting where at-most-once delivery is acceptable. For applications requiring message persistence and guaranteed delivery, combine Pub/Sub with Redis Streams or use Streams exclusively.
