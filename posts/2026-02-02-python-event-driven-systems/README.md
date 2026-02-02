# How to Build Event-Driven Systems with Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Event Driven, Architecture, Async, Messaging

Description: A practical guide to building event-driven systems in Python using asyncio, message queues, and event patterns for scalable and decoupled applications.

---

If you've ever built a monolithic application where components call each other directly, you know how quickly things can get tangled. Event-driven architecture offers a way out. Instead of components calling each other, they emit events and react to them. This decoupling makes your systems more flexible, scalable, and easier to maintain.

In this guide, we'll build event-driven systems in Python from the ground up. We'll start with simple patterns and work up to production-ready implementations with message queues.

---

## Why Event-Driven?

Traditional request-response architectures create tight coupling between services. When Service A calls Service B directly, A needs to know about B's location, interface, and availability. If B is down, A fails too.

Event-driven systems flip this around. Service A emits an event saying "this happened." Any service interested in that event can react to it. A doesn't know or care who's listening.

| Aspect | Request-Response | Event-Driven |
|--------|------------------|--------------|
| Coupling | Tight - caller knows callee | Loose - producer doesn't know consumers |
| Scaling | Scale together | Scale independently |
| Failure handling | Cascading failures | Isolated failures |
| Adding features | Modify existing code | Add new listeners |
| Debugging | Linear flow | Distributed traces needed |

---

## Basic Event Pattern with asyncio

Let's start with Python's built-in asyncio Event primitive. This works great for signaling between coroutines in a single process.

```python
# basic_event.py
# Simple event signaling between coroutines using asyncio.Event

import asyncio

async def producer(event: asyncio.Event, data_store: list):
    """Produces data and signals when ready"""
    print("Producer: Starting work...")
    await asyncio.sleep(2)  # Simulate work

    # Store the result and signal consumers
    data_store.append({"user_id": 123, "action": "signup"})
    print("Producer: Data ready, setting event")
    event.set()  # Signal that data is available

async def consumer(event: asyncio.Event, data_store: list, name: str):
    """Waits for event and processes data"""
    print(f"Consumer {name}: Waiting for data...")
    await event.wait()  # Block until event is set

    # Process the data
    for item in data_store:
        print(f"Consumer {name}: Processing {item}")

async def main():
    event = asyncio.Event()
    data_store = []

    # Run producer and multiple consumers concurrently
    await asyncio.gather(
        producer(event, data_store),
        consumer(event, data_store, "A"),
        consumer(event, data_store, "B"),
    )

if __name__ == "__main__":
    asyncio.run(main())
```

Output:
```
Consumer A: Waiting for data...
Consumer B: Waiting for data...
Producer: Starting work...
Producer: Data ready, setting event
Consumer A: Processing {'user_id': 123, 'action': 'signup'}
Consumer B: Processing {'user_id': 123, 'action': 'signup'}
```

---

## Building a Custom Event Bus

For more complex scenarios, you need an event bus that supports multiple event types and handlers. Here's a simple but effective implementation.

```python
# event_bus.py
# A simple in-process event bus with type-safe event handling

import asyncio
from typing import Callable, Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Event:
    """Base event class with metadata"""
    event_type: str
    payload: Dict[str, Any]
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

class EventBus:
    """Simple async event bus for in-process event handling"""

    def __init__(self):
        # Map event types to list of handler functions
        self._handlers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, handler: Callable):
        """Register a handler for an event type"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        print(f"Subscribed {handler.__name__} to {event_type}")

    def unsubscribe(self, event_type: str, handler: Callable):
        """Remove a handler from an event type"""
        if event_type in self._handlers:
            self._handlers[event_type].remove(handler)

    async def publish(self, event: Event):
        """Publish an event to all registered handlers"""
        handlers = self._handlers.get(event.event_type, [])

        if not handlers:
            print(f"No handlers for event: {event.event_type}")
            return

        # Run all handlers concurrently
        tasks = [self._run_handler(handler, event) for handler in handlers]
        await asyncio.gather(*tasks)

    async def _run_handler(self, handler: Callable, event: Event):
        """Run a single handler with error isolation"""
        try:
            # Support both sync and async handlers
            if asyncio.iscoroutinefunction(handler):
                await handler(event)
            else:
                handler(event)
        except Exception as e:
            # Log error but don't crash other handlers
            print(f"Handler {handler.__name__} failed: {e}")


# Example usage
async def handle_user_signup(event: Event):
    """Send welcome email when user signs up"""
    user_email = event.payload.get("email")
    print(f"Sending welcome email to {user_email}")
    await asyncio.sleep(0.1)  # Simulate email sending

async def handle_user_signup_analytics(event: Event):
    """Track signup in analytics"""
    user_id = event.payload.get("user_id")
    print(f"Tracking signup for user {user_id}")

def handle_user_signup_sync(event: Event):
    """Sync handler example - also works"""
    print(f"Sync handler: user signed up at {event.timestamp}")


async def main():
    bus = EventBus()

    # Register handlers
    bus.subscribe("user.signup", handle_user_signup)
    bus.subscribe("user.signup", handle_user_signup_analytics)
    bus.subscribe("user.signup", handle_user_signup_sync)

    # Publish an event
    event = Event(
        event_type="user.signup",
        payload={"user_id": 123, "email": "user@example.com"}
    )

    await bus.publish(event)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Event-Driven with Message Queues

For distributed systems, you need a message broker. Redis is a popular choice because it's fast and many teams already have it running. Here's how to build an event-driven system with Redis Pub/Sub.

```python
# redis_events.py
# Distributed event system using Redis Pub/Sub

import asyncio
import json
from datetime import datetime
from typing import Callable, Dict, List
import redis.asyncio as redis

class RedisEventBus:
    """Event bus backed by Redis for distributed systems"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self._redis: redis.Redis = None
        self._pubsub: redis.client.PubSub = None
        self._handlers: Dict[str, List[Callable]] = {}
        self._running = False

    async def connect(self):
        """Initialize Redis connection"""
        self._redis = await redis.from_url(self.redis_url)
        self._pubsub = self._redis.pubsub()
        print("Connected to Redis")

    async def disconnect(self):
        """Clean up connections"""
        self._running = False
        if self._pubsub:
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()

    def subscribe(self, channel: str, handler: Callable):
        """Register a handler for a Redis channel"""
        if channel not in self._handlers:
            self._handlers[channel] = []
        self._handlers[channel].append(handler)

    async def publish(self, channel: str, data: dict):
        """Publish an event to a Redis channel"""
        message = {
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        await self._redis.publish(channel, json.dumps(message))
        print(f"Published to {channel}: {data}")

    async def start_listening(self):
        """Start listening for events on subscribed channels"""
        # Subscribe to all registered channels
        channels = list(self._handlers.keys())
        if not channels:
            print("No channels to subscribe to")
            return

        await self._pubsub.subscribe(*channels)
        print(f"Listening on channels: {channels}")

        self._running = True
        while self._running:
            message = await self._pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1.0
            )

            if message and message["type"] == "message":
                channel = message["channel"].decode()
                data = json.loads(message["data"])

                # Call all handlers for this channel
                for handler in self._handlers.get(channel, []):
                    try:
                        if asyncio.iscoroutinefunction(handler):
                            await handler(data)
                        else:
                            handler(data)
                    except Exception as e:
                        print(f"Handler error: {e}")


# Producer service example
async def order_service():
    """Service that publishes order events"""
    bus = RedisEventBus()
    await bus.connect()

    # Simulate order creation
    await bus.publish("orders.created", {
        "order_id": "ord_123",
        "user_id": "usr_456",
        "total": 99.99,
        "items": ["item_a", "item_b"]
    })

    await bus.disconnect()


# Consumer service example
async def notification_service():
    """Service that listens for order events"""
    bus = RedisEventBus()
    await bus.connect()

    async def send_order_confirmation(event: dict):
        order_id = event["data"]["order_id"]
        print(f"Sending confirmation for order {order_id}")

    bus.subscribe("orders.created", send_order_confirmation)

    # Run for 10 seconds then stop
    listen_task = asyncio.create_task(bus.start_listening())
    await asyncio.sleep(10)
    await bus.disconnect()
```

---

## Error Handling and Retries

Production event systems need robust error handling. Here's a pattern for handling failures with exponential backoff.

```python
# retry_handler.py
# Event handler with retry logic and dead letter queue

import asyncio
import random
from typing import Callable, Any
from dataclasses import dataclass

@dataclass
class EventWithRetry:
    """Event wrapper that tracks retry attempts"""
    event_type: str
    payload: dict
    attempt: int = 0
    max_retries: int = 3

async def with_retry(
    handler: Callable,
    event: EventWithRetry,
    on_failure: Callable = None
):
    """Execute handler with exponential backoff retry"""

    while event.attempt <= event.max_retries:
        try:
            await handler(event.payload)
            return  # Success, exit

        except Exception as e:
            event.attempt += 1

            if event.attempt > event.max_retries:
                print(f"Max retries exceeded for {event.event_type}")
                # Send to dead letter queue
                if on_failure:
                    await on_failure(event, e)
                return

            # Exponential backoff with jitter
            delay = (2 ** event.attempt) + random.uniform(0, 1)
            print(f"Retry {event.attempt}/{event.max_retries} in {delay:.2f}s")
            await asyncio.sleep(delay)


async def process_payment(payload: dict):
    """Payment handler that might fail"""
    if random.random() < 0.7:  # 70% failure rate for demo
        raise Exception("Payment gateway timeout")
    print(f"Payment processed: {payload['order_id']}")

async def dead_letter_handler(event: EventWithRetry, error: Exception):
    """Handle events that failed all retries"""
    print(f"DLQ: {event.event_type} failed with {error}")
    # In production: store to database, send alert, etc.


async def main():
    event = EventWithRetry(
        event_type="payment.process",
        payload={"order_id": "ord_123", "amount": 99.99}
    )

    await with_retry(
        process_payment,
        event,
        on_failure=dead_letter_handler
    )

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Event Sourcing Pattern

Event sourcing stores state as a sequence of events rather than current state. This gives you a complete audit trail and the ability to replay events.

```python
# event_sourcing.py
# Simple event sourcing implementation for order management

from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from enum import Enum

class OrderStatus(Enum):
    CREATED = "created"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

@dataclass
class DomainEvent:
    """Base class for domain events"""
    event_id: str
    aggregate_id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

@dataclass
class OrderCreated(DomainEvent):
    user_id: str
    items: List[str]
    total: float

@dataclass
class OrderPaid(DomainEvent):
    payment_id: str
    amount: float

@dataclass
class OrderShipped(DomainEvent):
    tracking_number: str
    carrier: str


class Order:
    """Order aggregate that rebuilds state from events"""

    def __init__(self, order_id: str):
        self.order_id = order_id
        self.status = None
        self.user_id = None
        self.items = []
        self.total = 0.0
        self.payment_id = None
        self.tracking_number = None
        self._events: List[DomainEvent] = []

    def apply(self, event: DomainEvent):
        """Apply an event to update state"""
        self._events.append(event)

        # Update state based on event type
        if isinstance(event, OrderCreated):
            self.status = OrderStatus.CREATED
            self.user_id = event.user_id
            self.items = event.items
            self.total = event.total

        elif isinstance(event, OrderPaid):
            self.status = OrderStatus.PAID
            self.payment_id = event.payment_id

        elif isinstance(event, OrderShipped):
            self.status = OrderStatus.SHIPPED
            self.tracking_number = event.tracking_number

    @classmethod
    def from_events(cls, order_id: str, events: List[DomainEvent]):
        """Rebuild order state from event history"""
        order = cls(order_id)
        for event in events:
            order.apply(event)
        return order

    def __repr__(self):
        return f"Order({self.order_id}, status={self.status}, items={len(self.items)})"


# Usage example
def main():
    # Event store (in production this would be a database)
    event_store = []

    # Create order through events
    event_store.append(OrderCreated(
        event_id="evt_1",
        aggregate_id="ord_123",
        user_id="usr_456",
        items=["item_a", "item_b"],
        total=99.99
    ))

    event_store.append(OrderPaid(
        event_id="evt_2",
        aggregate_id="ord_123",
        payment_id="pay_789",
        amount=99.99
    ))

    event_store.append(OrderShipped(
        event_id="evt_3",
        aggregate_id="ord_123",
        tracking_number="1Z999AA10123456784",
        carrier="UPS"
    ))

    # Rebuild order from events
    order = Order.from_events("ord_123", event_store)
    print(f"Order state: {order}")
    print(f"Status: {order.status.value}")
    print(f"Tracking: {order.tracking_number}")

if __name__ == "__main__":
    main()
```

---

## Comparison of Approaches

| Approach | Use Case | Pros | Cons |
|----------|----------|------|------|
| asyncio.Event | Single process signaling | Simple, no dependencies | Limited to one process |
| Custom Event Bus | In-process pub/sub | Type-safe, testable | No persistence |
| Redis Pub/Sub | Distributed systems | Fast, widely available | No message persistence |
| RabbitMQ/Kafka | Production workloads | Persistent, reliable | More complex setup |
| Event Sourcing | Audit trails, replays | Complete history | Storage overhead |

---

## Best Practices

1. **Name events in past tense** - Use `order.created` not `create.order`. Events describe what happened.

2. **Keep events immutable** - Once published, events shouldn't change. Version your event schemas instead.

3. **Include correlation IDs** - Add a request ID or trace ID to events for distributed tracing.

4. **Handle idempotency** - Consumers might receive the same event twice. Design handlers to handle duplicates.

5. **Monitor your queues** - Track queue depth, consumer lag, and failed messages.

---

## Wrapping Up

Event-driven architecture isn't a silver bullet, but it's a powerful tool for building scalable, decoupled systems. Start simple with in-process event buses for testing, then graduate to Redis or dedicated message brokers as your needs grow.

The key is thinking in terms of events rather than commands. Instead of "create user," think "user was created." This mental shift makes it natural to design systems where components react to changes rather than orchestrating them.

---

*Need to monitor your event-driven systems? [OneUptime](https://oneuptime.com) provides distributed tracing and alerting that helps you track events across services and catch failures before your users do.*

**Related Reading:**
- [How to Monitor Celery Workers with OpenTelemetry and OneUptime](https://oneuptime.com/blog/post/2025-01-06-celery-opentelemetry-oneuptime/view)
- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
