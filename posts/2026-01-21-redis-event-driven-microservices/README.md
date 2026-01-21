# How to Implement Event-Driven Microservices with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Event-Driven Architecture, Microservices, Event Bus, Message Routing, Pub/Sub, Streams

Description: A comprehensive guide to building event-driven microservices with Redis as the event bus, including event routing, message patterns, and reliable delivery.

---

Event-driven architecture enables loosely coupled microservices that communicate through events. Redis provides multiple primitives - Pub/Sub and Streams - for implementing event buses and message routing.

## Why Redis for Event-Driven Architecture?

Redis offers key benefits for event-driven systems:

- **Low latency**: Sub-millisecond event delivery
- **Multiple patterns**: Pub/Sub for broadcasts, Streams for reliable delivery
- **Consumer groups**: Scalable event processing with acknowledgments
- **Built-in persistence**: Durable event storage with AOF
- **Simple operations**: No separate message broker needed

## Event Bus Architecture

```
+------------+    publish    +--------------+    subscribe    +------------+
|  Service A | ------------> |  Redis Bus   | --------------> |  Service B |
+------------+               +--------------+                 +------------+
                                   |
                                   | subscribe
                                   v
                             +------------+
                             |  Service C |
                             +------------+
```

## Pattern 1: Simple Pub/Sub Event Bus

Implement a basic event bus with Redis Pub/Sub:

```python
import redis
import json
import threading
import time
from typing import Dict, Any, Callable, List
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class Event:
    event_type: str
    source: str
    data: Dict[str, Any]
    timestamp: float
    correlation_id: str = None
    causation_id: str = None

class PubSubEventBus:
    def __init__(self, redis_client: redis.Redis, service_name: str):
        self.redis = redis_client
        self.service_name = service_name
        self._handlers: Dict[str, List[Callable]] = {}
        self._pubsub = None
        self._running = False
        self._thread = None

    def _channel_name(self, event_type: str) -> str:
        return f"events:{event_type}"

    def publish(self, event_type: str, data: Dict[str, Any],
                correlation_id: str = None, causation_id: str = None):
        """Publish an event."""
        event = Event(
            event_type=event_type,
            source=self.service_name,
            data=data,
            timestamp=time.time(),
            correlation_id=correlation_id,
            causation_id=causation_id
        )

        channel = self._channel_name(event_type)
        self.redis.publish(channel, json.dumps(asdict(event)))

        logger.debug(f"Published {event_type} to {channel}")

    def subscribe(self, event_type: str, handler: Callable[[Event], None]):
        """Subscribe to an event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def start(self):
        """Start listening for events."""
        if not self._handlers:
            return

        self._pubsub = self.redis.pubsub()

        # Subscribe to all registered channels
        channels = [self._channel_name(et) for et in self._handlers.keys()]
        self._pubsub.subscribe(*channels)

        self._running = True
        self._thread = threading.Thread(target=self._listen)
        self._thread.daemon = True
        self._thread.start()

        logger.info(f"Event bus started, subscribed to {len(channels)} channels")

    def stop(self):
        """Stop listening for events."""
        self._running = False
        if self._pubsub:
            self._pubsub.unsubscribe()
            self._pubsub.close()

    def _listen(self):
        """Background listener."""
        for message in self._pubsub.listen():
            if not self._running:
                break

            if message["type"] != "message":
                continue

            try:
                event_data = json.loads(message["data"])
                event = Event(**event_data)

                # Extract event type from channel
                channel = message["channel"]
                if isinstance(channel, bytes):
                    channel = channel.decode()
                event_type = channel.replace("events:", "")

                # Dispatch to handlers
                handlers = self._handlers.get(event_type, [])
                for handler in handlers:
                    try:
                        handler(event)
                    except Exception as e:
                        logger.error(f"Handler error: {e}")

            except Exception as e:
                logger.error(f"Error processing message: {e}")

# Usage
r = redis.Redis()

# Order Service
order_bus = PubSubEventBus(r, "order-service")

def on_payment_completed(event: Event):
    order_id = event.data["order_id"]
    print(f"Payment completed for order {order_id}")
    # Update order status...

order_bus.subscribe("PaymentCompleted", on_payment_completed)
order_bus.start()

# Publish from payment service
payment_bus = PubSubEventBus(r, "payment-service")
payment_bus.publish("PaymentCompleted", {
    "order_id": "ord_123",
    "amount": 99.99
})
```

## Pattern 2: Reliable Event Bus with Streams

Use Redis Streams for reliable event delivery:

```python
import redis
import json
import threading
import time
import uuid
from typing import Dict, Any, Callable, List, Optional
from dataclasses import dataclass, asdict, field
import logging

logger = logging.getLogger(__name__)

@dataclass
class StreamEvent:
    event_id: str
    event_type: str
    source: str
    data: Dict[str, Any]
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    stream_id: str = None

class StreamEventBus:
    def __init__(self, redis_client: redis.Redis, service_name: str,
                 namespace: str = "eventbus"):
        self.redis = redis_client
        self.service_name = service_name
        self.namespace = namespace
        self._handlers: Dict[str, List[Callable]] = {}
        self._running = False
        self._consumer_group = f"{service_name}-consumers"

    def _stream_key(self, event_type: str = None) -> str:
        if event_type:
            return f"{self.namespace}:stream:{event_type}"
        return f"{self.namespace}:stream:all"

    def publish(self, event_type: str, data: Dict[str, Any],
                metadata: Dict[str, Any] = None) -> str:
        """Publish event to stream."""
        event = StreamEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            source=self.service_name,
            data=data,
            timestamp=time.time(),
            metadata=metadata or {}
        )

        # Publish to type-specific stream
        stream_key = self._stream_key(event_type)
        entry = {
            "event_id": event.event_id,
            "event_type": event.event_type,
            "source": event.source,
            "data": json.dumps(event.data),
            "timestamp": str(event.timestamp),
            "metadata": json.dumps(event.metadata)
        }

        stream_id = self.redis.xadd(stream_key, entry, maxlen=100000)

        # Also publish to global stream
        global_stream = self._stream_key()
        self.redis.xadd(global_stream, {
            **entry,
            "original_stream": stream_key
        }, maxlen=500000)

        logger.debug(f"Published {event_type}: {event.event_id}")

        return stream_id.decode() if isinstance(stream_id, bytes) else stream_id

    def subscribe(self, event_type: str, handler: Callable[[StreamEvent], None]):
        """Subscribe to event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def subscribe_all(self, handler: Callable[[StreamEvent], None]):
        """Subscribe to all events."""
        self.subscribe("*", handler)

    def start(self, from_beginning: bool = False):
        """Start consuming events."""
        self._running = True

        # Create consumer groups for each event type
        for event_type in self._handlers.keys():
            if event_type == "*":
                stream_key = self._stream_key()
            else:
                stream_key = self._stream_key(event_type)

            try:
                start_id = "0" if from_beginning else "$"
                self.redis.xgroup_create(
                    stream_key,
                    self._consumer_group,
                    id=start_id,
                    mkstream=True
                )
            except redis.ResponseError:
                pass  # Group exists

        thread = threading.Thread(target=self._consume_loop)
        thread.daemon = True
        thread.start()

        logger.info(f"Stream event bus started for {self.service_name}")

    def stop(self):
        """Stop consuming events."""
        self._running = False

    def _consume_loop(self):
        """Main consumption loop."""
        consumer_name = f"{self.service_name}-{uuid.uuid4().hex[:8]}"

        # Build streams dict
        streams = {}
        for event_type in self._handlers.keys():
            if event_type == "*":
                stream_key = self._stream_key()
            else:
                stream_key = self._stream_key(event_type)
            streams[stream_key] = ">"

        while self._running:
            try:
                messages = self.redis.xreadgroup(
                    self._consumer_group,
                    consumer_name,
                    streams,
                    count=100,
                    block=5000
                )

                if not messages:
                    continue

                for stream_key, entries in messages:
                    for message_id, data in entries:
                        self._process_message(stream_key, message_id, data)

            except redis.RedisError as e:
                logger.error(f"Redis error: {e}")
                time.sleep(1)

    def _process_message(self, stream_key: bytes, message_id: bytes,
                         data: Dict[bytes, bytes]):
        """Process a single message."""
        if isinstance(stream_key, bytes):
            stream_key = stream_key.decode()

        decoded = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

        event = StreamEvent(
            event_id=decoded["event_id"],
            event_type=decoded["event_type"],
            source=decoded["source"],
            data=json.loads(decoded["data"]),
            timestamp=float(decoded["timestamp"]),
            metadata=json.loads(decoded.get("metadata", "{}")),
            stream_id=message_id.decode() if isinstance(message_id, bytes) else message_id
        )

        # Find handlers
        handlers = []
        if event.event_type in self._handlers:
            handlers.extend(self._handlers[event.event_type])
        if "*" in self._handlers:
            handlers.extend(self._handlers["*"])

        # Process
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Handler error for {event.event_type}: {e}")

        # Acknowledge
        self.redis.xack(stream_key, self._consumer_group, message_id)
```

## Pattern 3: Event Router

Route events to specific consumers based on content:

```python
import redis
import json
import re
from typing import Dict, Any, Callable, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class RoutingRule:
    pattern: str
    handler: Callable
    filter_func: Optional[Callable[[Dict], bool]] = None
    priority: int = 0

class EventRouter:
    def __init__(self, redis_client: redis.Redis, namespace: str = "router"):
        self.redis = redis_client
        self.namespace = namespace
        self._routes: List[RoutingRule] = []
        self._stream_key = f"{namespace}:events"

    def route(self, pattern: str, priority: int = 0):
        """Decorator to register a route handler."""
        def decorator(func: Callable):
            rule = RoutingRule(
                pattern=pattern,
                handler=func,
                priority=priority
            )
            self._routes.append(rule)
            # Sort by priority (higher first)
            self._routes.sort(key=lambda r: r.priority, reverse=True)
            return func
        return decorator

    def route_with_filter(self, pattern: str,
                          filter_func: Callable[[Dict], bool],
                          priority: int = 0):
        """Decorator with content-based filter."""
        def decorator(func: Callable):
            rule = RoutingRule(
                pattern=pattern,
                handler=func,
                filter_func=filter_func,
                priority=priority
            )
            self._routes.append(rule)
            self._routes.sort(key=lambda r: r.priority, reverse=True)
            return func
        return decorator

    def _match_pattern(self, event_type: str, pattern: str) -> bool:
        """Check if event type matches pattern."""
        # Support wildcards: Order.* matches Order.Created, Order.Updated
        regex_pattern = pattern.replace(".", r"\.").replace("*", ".*")
        return bool(re.match(f"^{regex_pattern}$", event_type))

    def dispatch(self, event: Dict[str, Any]) -> bool:
        """Dispatch event to matching handlers."""
        event_type = event.get("event_type", "")
        dispatched = False

        for rule in self._routes:
            if not self._match_pattern(event_type, rule.pattern):
                continue

            # Check filter if present
            if rule.filter_func and not rule.filter_func(event):
                continue

            try:
                rule.handler(event)
                dispatched = True
            except Exception as e:
                logger.error(f"Handler error for {rule.pattern}: {e}")

        return dispatched

    def publish(self, event_type: str, data: Dict[str, Any]):
        """Publish and route event."""
        event = {
            "event_type": event_type,
            "data": data,
            "timestamp": time.time()
        }

        # Store in stream
        self.redis.xadd(
            self._stream_key,
            {"event": json.dumps(event)},
            maxlen=100000
        )

        # Route locally (for same-process routing)
        self.dispatch(event)

# Usage
r = redis.Redis()
router = EventRouter(r)

# Route all Order events
@router.route("Order.*")
def handle_order_events(event):
    print(f"Order event: {event['event_type']}")

# Route with filter - only high-value orders
@router.route_with_filter(
    "Order.Created",
    lambda e: e["data"].get("total", 0) > 1000,
    priority=10
)
def handle_high_value_order(event):
    print(f"High value order: {event}")

# Route specific event
@router.route("Payment.Failed", priority=5)
def handle_payment_failure(event):
    print(f"Payment failed: {event}")

# Publish events
router.publish("Order.Created", {"order_id": "123", "total": 1500})
router.publish("Order.Created", {"order_id": "456", "total": 50})
router.publish("Payment.Failed", {"order_id": "789", "reason": "insufficient_funds"})
```

## Pattern 4: Saga Coordinator with Events

Coordinate distributed transactions using events:

```python
import redis
import json
import uuid
import time
from typing import Dict, Any, List, Callable, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class SagaState(Enum):
    STARTED = "started"
    PENDING = "pending"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"

@dataclass
class SagaStep:
    name: str
    command_event: str
    success_event: str
    failure_event: str
    compensation_event: str

@dataclass
class SagaDefinition:
    name: str
    steps: List[SagaStep]

class EventDrivenSagaCoordinator:
    def __init__(self, event_bus: StreamEventBus, namespace: str = "saga"):
        self.event_bus = event_bus
        self.redis = event_bus.redis
        self.namespace = namespace
        self._definitions: Dict[str, SagaDefinition] = {}

    def _saga_key(self, saga_id: str) -> str:
        return f"{self.namespace}:{saga_id}"

    def register_saga(self, definition: SagaDefinition):
        """Register a saga definition."""
        self._definitions[definition.name] = definition

        # Subscribe to relevant events
        for step in definition.steps:
            self.event_bus.subscribe(step.success_event, self._on_step_success)
            self.event_bus.subscribe(step.failure_event, self._on_step_failure)

    def start_saga(self, saga_name: str, data: Dict[str, Any]) -> str:
        """Start a new saga instance."""
        definition = self._definitions.get(saga_name)
        if not definition:
            raise ValueError(f"Unknown saga: {saga_name}")

        saga_id = str(uuid.uuid4())

        # Store saga state
        saga_state = {
            "saga_id": saga_id,
            "saga_name": saga_name,
            "state": SagaState.STARTED.value,
            "current_step": 0,
            "data": data,
            "history": [],
            "started_at": time.time()
        }

        self.redis.set(
            self._saga_key(saga_id),
            json.dumps(saga_state)
        )

        # Start first step
        self._execute_step(saga_id, saga_state, definition, 0)

        return saga_id

    def _execute_step(self, saga_id: str, saga_state: Dict,
                      definition: SagaDefinition, step_index: int):
        """Execute a saga step by publishing command event."""
        if step_index >= len(definition.steps):
            # All steps completed
            self._complete_saga(saga_id, saga_state)
            return

        step = definition.steps[step_index]

        saga_state["current_step"] = step_index
        saga_state["state"] = SagaState.PENDING.value
        saga_state["history"].append({
            "step": step.name,
            "action": "started",
            "timestamp": time.time()
        })

        self.redis.set(
            self._saga_key(saga_id),
            json.dumps(saga_state)
        )

        # Publish command event
        self.event_bus.publish(step.command_event, {
            "saga_id": saga_id,
            **saga_state["data"]
        })

    def _on_step_success(self, event):
        """Handle step success event."""
        saga_id = event.data.get("saga_id")
        if not saga_id:
            return

        saga_data = self.redis.get(self._saga_key(saga_id))
        if not saga_data:
            return

        saga_state = json.loads(saga_data)
        definition = self._definitions.get(saga_state["saga_name"])

        current_step = saga_state["current_step"]
        step = definition.steps[current_step]

        # Check if this is the expected success event
        if event.event_type != step.success_event:
            return

        saga_state["history"].append({
            "step": step.name,
            "action": "completed",
            "timestamp": time.time()
        })

        # Update data with response
        saga_state["data"].update(event.data)

        # Execute next step
        self._execute_step(saga_id, saga_state, definition, current_step + 1)

    def _on_step_failure(self, event):
        """Handle step failure event."""
        saga_id = event.data.get("saga_id")
        if not saga_id:
            return

        saga_data = self.redis.get(self._saga_key(saga_id))
        if not saga_data:
            return

        saga_state = json.loads(saga_data)
        definition = self._definitions.get(saga_state["saga_name"])

        current_step = saga_state["current_step"]
        step = definition.steps[current_step]

        if event.event_type != step.failure_event:
            return

        saga_state["state"] = SagaState.COMPENSATING.value
        saga_state["error"] = event.data.get("error")
        saga_state["history"].append({
            "step": step.name,
            "action": "failed",
            "error": event.data.get("error"),
            "timestamp": time.time()
        })

        self.redis.set(
            self._saga_key(saga_id),
            json.dumps(saga_state)
        )

        # Start compensation
        self._compensate(saga_id, saga_state, definition, current_step - 1)

    def _compensate(self, saga_id: str, saga_state: Dict,
                    definition: SagaDefinition, step_index: int):
        """Compensate completed steps in reverse order."""
        if step_index < 0:
            saga_state["state"] = SagaState.FAILED.value
            saga_state["completed_at"] = time.time()
            self.redis.set(
                self._saga_key(saga_id),
                json.dumps(saga_state)
            )
            logger.info(f"Saga {saga_id} compensation completed")
            return

        step = definition.steps[step_index]

        saga_state["history"].append({
            "step": step.name,
            "action": "compensating",
            "timestamp": time.time()
        })

        self.redis.set(
            self._saga_key(saga_id),
            json.dumps(saga_state)
        )

        # Publish compensation event
        self.event_bus.publish(step.compensation_event, {
            "saga_id": saga_id,
            **saga_state["data"]
        })

    def _complete_saga(self, saga_id: str, saga_state: Dict):
        """Mark saga as completed."""
        saga_state["state"] = SagaState.COMPLETED.value
        saga_state["completed_at"] = time.time()

        self.redis.set(
            self._saga_key(saga_id),
            json.dumps(saga_state)
        )

        logger.info(f"Saga {saga_id} completed successfully")

# Usage
event_bus = StreamEventBus(redis.Redis(), "order-coordinator")
coordinator = EventDrivenSagaCoordinator(event_bus)

# Define order saga
order_saga = SagaDefinition(
    name="create_order",
    steps=[
        SagaStep(
            name="reserve_inventory",
            command_event="InventoryReserveCommand",
            success_event="InventoryReserved",
            failure_event="InventoryReserveFailed",
            compensation_event="InventoryReleaseCommand"
        ),
        SagaStep(
            name="process_payment",
            command_event="PaymentProcessCommand",
            success_event="PaymentProcessed",
            failure_event="PaymentFailed",
            compensation_event="PaymentRefundCommand"
        ),
        SagaStep(
            name="create_shipment",
            command_event="ShipmentCreateCommand",
            success_event="ShipmentCreated",
            failure_event="ShipmentFailed",
            compensation_event="ShipmentCancelCommand"
        )
    ]
)

coordinator.register_saga(order_saga)
event_bus.start()

# Start a saga
saga_id = coordinator.start_saga("create_order", {
    "order_id": "ord_123",
    "customer_id": "cust_456",
    "items": [{"product_id": "prod_1", "quantity": 2}],
    "amount": 99.99
})
```

## Pattern 5: Event-Driven CQRS

Separate commands and queries with events:

```python
import redis
import json
import time
from typing import Dict, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

class CommandBus:
    """Handle commands and emit events."""

    def __init__(self, redis_client: redis.Redis, event_bus: StreamEventBus):
        self.redis = redis_client
        self.event_bus = event_bus
        self._handlers: Dict[str, Callable] = {}

    def register(self, command_type: str):
        """Decorator to register command handler."""
        def decorator(func: Callable):
            self._handlers[command_type] = func
            return func
        return decorator

    def execute(self, command_type: str, data: Dict[str, Any]) -> Dict:
        """Execute command and emit resulting events."""
        handler = self._handlers.get(command_type)
        if not handler:
            raise ValueError(f"No handler for command: {command_type}")

        # Execute handler
        result = handler(data)

        # Emit events from result
        events = result.get("events", [])
        for event in events:
            self.event_bus.publish(
                event["event_type"],
                event["data"],
                metadata={"command": command_type}
            )

        return result

class QueryHandler:
    """Handle queries from read models."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._handlers: Dict[str, Callable] = {}

    def register(self, query_type: str):
        """Decorator to register query handler."""
        def decorator(func: Callable):
            self._handlers[query_type] = func
            return func
        return decorator

    def query(self, query_type: str, params: Dict[str, Any]) -> Any:
        """Execute query."""
        handler = self._handlers.get(query_type)
        if not handler:
            raise ValueError(f"No handler for query: {query_type}")

        return handler(params)

class ReadModelProjection:
    """Build read models from events."""

    def __init__(self, redis_client: redis.Redis, event_bus: StreamEventBus):
        self.redis = redis_client
        self.event_bus = event_bus
        self._projectors: Dict[str, Callable] = {}

    def on_event(self, event_type: str):
        """Decorator to register event projector."""
        def decorator(func: Callable):
            self._projectors[event_type] = func
            self.event_bus.subscribe(event_type, self._handle_event)
            return func
        return decorator

    def _handle_event(self, event):
        """Handle event and update read model."""
        projector = self._projectors.get(event.event_type)
        if projector:
            projector(event.data)

# Usage Example
r = redis.Redis()
event_bus = StreamEventBus(r, "cqrs-service")

command_bus = CommandBus(r, event_bus)
query_handler = QueryHandler(r)
projection = ReadModelProjection(r, event_bus)

# Command handler
@command_bus.register("CreateOrder")
def handle_create_order(data: Dict) -> Dict:
    order_id = str(uuid.uuid4())

    return {
        "order_id": order_id,
        "events": [
            {
                "event_type": "OrderCreated",
                "data": {
                    "order_id": order_id,
                    "customer_id": data["customer_id"],
                    "items": data["items"],
                    "total": sum(i["price"] * i["qty"] for i in data["items"])
                }
            }
        ]
    }

# Read model projection
@projection.on_event("OrderCreated")
def project_order_created(data: Dict):
    # Update read model
    r.hset(f"orders:summary:{data['order_id']}", mapping={
        "order_id": data["order_id"],
        "customer_id": data["customer_id"],
        "total": data["total"],
        "status": "created",
        "created_at": str(time.time())
    })

    # Update customer orders list
    r.lpush(f"customers:{data['customer_id']}:orders", data["order_id"])

# Query handler
@query_handler.register("GetOrder")
def handle_get_order(params: Dict) -> Optional[Dict]:
    order_id = params["order_id"]
    data = r.hgetall(f"orders:summary:{order_id}")

    if data:
        return {
            k.decode(): v.decode()
            for k, v in data.items()
        }
    return None

# Execute
event_bus.start()

result = command_bus.execute("CreateOrder", {
    "customer_id": "cust_123",
    "items": [
        {"product_id": "prod_1", "price": 29.99, "qty": 2}
    ]
})

# Query read model
order = query_handler.query("GetOrder", {"order_id": result["order_id"]})
```

## Best Practices

1. **Use Streams for reliable delivery** - Pub/Sub messages are fire-and-forget
2. **Design idempotent handlers** - Events may be delivered multiple times
3. **Include correlation IDs** - Track related events across services
4. **Version your events** - Plan for schema evolution
5. **Monitor consumer lag** - Ensure consumers keep up with events
6. **Implement dead letter handling** - Handle repeatedly failing events
7. **Use consumer groups** - Scale event processing horizontally

## Conclusion

Redis provides flexible primitives for building event-driven microservices. Use Pub/Sub for simple broadcast scenarios and Streams for reliable, scalable event processing. Combine with patterns like event routing, saga coordination, and CQRS to build robust distributed systems.
