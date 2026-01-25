# How to Build Event-Sourced Apps with EventStoreDB in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Event Sourcing, EventStoreDB, CQRS, Domain-Driven Design, Event-Driven Architecture, Microservices

Description: Learn how to build event-sourced applications in Python using EventStoreDB. This guide covers event modeling, aggregate roots, projections, subscriptions, and best practices for building reliable event-driven systems.

---

> Event sourcing stores every change to your application state as a sequence of events. Instead of saving the current state, you save the history of what happened. This gives you a complete audit trail, temporal queries, and the ability to rebuild state at any point in time.

Traditional databases store the current state of your data. When you update a record, the previous value is gone. Event sourcing takes a different approach: every change becomes an immutable event appended to a log. You can always replay events to reconstruct past states or project them into new views.

---

## Why Event Sourcing?

Event sourcing provides several advantages over traditional CRUD operations:

- **Complete audit trail** - Every change is recorded with timestamp and metadata
- **Temporal queries** - Query the state of your system at any point in time
- **Debugging** - Replay events to understand exactly what happened
- **Event-driven integration** - Natural fit for microservices communication
- **Schema evolution** - Add new projections without migrating existing data

EventStoreDB is purpose-built for event sourcing. It provides features like optimistic concurrency, persistent subscriptions, and built-in projections that make building event-sourced systems straightforward.

---

## Setting Up EventStoreDB

### Running EventStoreDB with Docker

Start EventStoreDB locally for development:

```bash
# Run EventStoreDB with persistence
docker run -d --name eventstore \
  -p 2113:2113 \
  -p 1113:1113 \
  -e EVENTSTORE_INSECURE=true \
  -e EVENTSTORE_RUN_PROJECTIONS=All \
  -e EVENTSTORE_ENABLE_ATOM_PUB_OVER_HTTP=true \
  -v eventstore-data:/var/lib/eventstore \
  eventstore/eventstore:latest
```

### Installing the Python Client

Install the official EventStoreDB Python client:

```bash
pip install esdbclient
```

---

## Connecting to EventStoreDB

### Client Configuration

Create a connection manager for your EventStoreDB instance:

```python
# eventstore/client.py
# EventStoreDB client connection management
from esdbclient import EventStoreDBClient
from contextlib import contextmanager
import os


class EventStoreConnection:
    """
    Manages connections to EventStoreDB.
    Supports both single-node and cluster configurations.
    """

    def __init__(self, connection_string: str = None):
        # Default to local development instance
        self.connection_string = connection_string or os.getenv(
            "EVENTSTORE_URL",
            "esdb://localhost:2113?tls=false"
        )
        self._client = None

    @property
    def client(self) -> EventStoreDBClient:
        """Lazy initialization of the EventStoreDB client."""
        if self._client is None:
            self._client = EventStoreDBClient(uri=self.connection_string)
        return self._client

    def close(self):
        """Close the connection when done."""
        if self._client:
            self._client.close()
            self._client = None


# Global connection instance
_connection = EventStoreConnection()


def get_client() -> EventStoreDBClient:
    """Get the EventStoreDB client instance."""
    return _connection.client


@contextmanager
def eventstore_client():
    """
    Context manager for EventStoreDB operations.
    Ensures proper cleanup of resources.
    """
    client = get_client()
    try:
        yield client
    finally:
        # Client manages connection pooling internally
        pass
```

---

## Event Modeling

### Defining Domain Events

Events represent things that happened in your domain. Make them immutable and descriptive:

```python
# domain/events.py
# Domain events for an order management system
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
import json


@dataclass(frozen=True)
class DomainEvent:
    """
    Base class for all domain events.
    frozen=True makes the event immutable.
    """
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        """Serialize event to dictionary."""
        data = {}
        for key, value in self.__dict__.items():
            if isinstance(value, UUID):
                data[key] = str(value)
            elif isinstance(value, datetime):
                data[key] = value.isoformat()
            else:
                data[key] = value
        return data

    @classmethod
    def from_dict(cls, data: dict):
        """Deserialize event from dictionary."""
        # Convert string UUIDs back to UUID objects
        if 'event_id' in data and isinstance(data['event_id'], str):
            data['event_id'] = UUID(data['event_id'])
        if 'occurred_at' in data and isinstance(data['occurred_at'], str):
            data['occurred_at'] = datetime.fromisoformat(data['occurred_at'])
        return cls(**data)


@dataclass(frozen=True)
class OrderCreated(DomainEvent):
    """Event raised when a new order is created."""
    order_id: UUID = field(default_factory=uuid4)
    customer_id: str = ""
    items: tuple = ()  # Use tuple for immutability


@dataclass(frozen=True)
class OrderItemAdded(DomainEvent):
    """Event raised when an item is added to an order."""
    order_id: UUID = field(default_factory=uuid4)
    product_id: str = ""
    quantity: int = 1
    unit_price: float = 0.0


@dataclass(frozen=True)
class OrderItemRemoved(DomainEvent):
    """Event raised when an item is removed from an order."""
    order_id: UUID = field(default_factory=uuid4)
    product_id: str = ""


@dataclass(frozen=True)
class OrderSubmitted(DomainEvent):
    """Event raised when an order is submitted for processing."""
    order_id: UUID = field(default_factory=uuid4)
    total_amount: float = 0.0
    shipping_address: str = ""


@dataclass(frozen=True)
class OrderCancelled(DomainEvent):
    """Event raised when an order is cancelled."""
    order_id: UUID = field(default_factory=uuid4)
    reason: str = ""
    cancelled_by: str = ""
```

---

## Aggregate Roots

### Building the Order Aggregate

Aggregates enforce business rules and emit events. The aggregate root manages consistency:

```python
# domain/aggregates.py
# Order aggregate root with event sourcing
from dataclasses import dataclass, field
from typing import List, Optional
from uuid import UUID, uuid4
from enum import Enum
from domain.events import (
    DomainEvent,
    OrderCreated,
    OrderItemAdded,
    OrderItemRemoved,
    OrderSubmitted,
    OrderCancelled,
)


class OrderStatus(Enum):
    """Possible states for an order."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    CANCELLED = "cancelled"


@dataclass
class OrderItem:
    """Value object representing an item in an order."""
    product_id: str
    quantity: int
    unit_price: float

    @property
    def total_price(self) -> float:
        return self.quantity * self.unit_price


class Order:
    """
    Order aggregate root.
    Maintains order state and enforces business rules.
    """

    def __init__(self, order_id: UUID = None):
        self.id = order_id or uuid4()
        self.customer_id: Optional[str] = None
        self.items: dict[str, OrderItem] = {}  # product_id -> OrderItem
        self.status: OrderStatus = OrderStatus.DRAFT
        self.shipping_address: Optional[str] = None

        # Track uncommitted events for persistence
        self._uncommitted_events: List[DomainEvent] = []
        self._version: int = 0  # For optimistic concurrency

    @property
    def total_amount(self) -> float:
        """Calculate the total order amount."""
        return sum(item.total_price for item in self.items.values())

    @property
    def uncommitted_events(self) -> List[DomainEvent]:
        """Get events that haven't been persisted yet."""
        return self._uncommitted_events.copy()

    def clear_uncommitted_events(self):
        """Clear events after they've been persisted."""
        self._uncommitted_events.clear()

    # Command methods that validate and emit events

    @classmethod
    def create(cls, customer_id: str, order_id: UUID = None) -> "Order":
        """
        Factory method to create a new order.
        Validates input and emits OrderCreated event.
        """
        if not customer_id:
            raise ValueError("Customer ID is required")

        order = cls(order_id)
        event = OrderCreated(order_id=order.id, customer_id=customer_id)
        order._apply(event)
        order._uncommitted_events.append(event)
        return order

    def add_item(self, product_id: str, quantity: int, unit_price: float):
        """Add an item to the order."""
        if self.status != OrderStatus.DRAFT:
            raise ValueError("Cannot modify a submitted or cancelled order")
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        if unit_price <= 0:
            raise ValueError("Price must be positive")

        event = OrderItemAdded(
            order_id=self.id,
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price,
        )
        self._apply(event)
        self._uncommitted_events.append(event)

    def remove_item(self, product_id: str):
        """Remove an item from the order."""
        if self.status != OrderStatus.DRAFT:
            raise ValueError("Cannot modify a submitted or cancelled order")
        if product_id not in self.items:
            raise ValueError(f"Product {product_id} not in order")

        event = OrderItemRemoved(order_id=self.id, product_id=product_id)
        self._apply(event)
        self._uncommitted_events.append(event)

    def submit(self, shipping_address: str):
        """Submit the order for processing."""
        if self.status != OrderStatus.DRAFT:
            raise ValueError("Order already submitted or cancelled")
        if not self.items:
            raise ValueError("Cannot submit an empty order")
        if not shipping_address:
            raise ValueError("Shipping address is required")

        event = OrderSubmitted(
            order_id=self.id,
            total_amount=self.total_amount,
            shipping_address=shipping_address,
        )
        self._apply(event)
        self._uncommitted_events.append(event)

    def cancel(self, reason: str, cancelled_by: str):
        """Cancel the order."""
        if self.status == OrderStatus.CANCELLED:
            raise ValueError("Order already cancelled")

        event = OrderCancelled(
            order_id=self.id,
            reason=reason,
            cancelled_by=cancelled_by,
        )
        self._apply(event)
        self._uncommitted_events.append(event)

    # Event application methods - update state based on events

    def _apply(self, event: DomainEvent):
        """Apply an event to update aggregate state."""
        handler_name = f"_on_{type(event).__name__}"
        handler = getattr(self, handler_name, None)
        if handler:
            handler(event)
        self._version += 1

    def _on_OrderCreated(self, event: OrderCreated):
        self.id = event.order_id
        self.customer_id = event.customer_id
        self.status = OrderStatus.DRAFT

    def _on_OrderItemAdded(self, event: OrderItemAdded):
        if event.product_id in self.items:
            # Update quantity if item exists
            existing = self.items[event.product_id]
            self.items[event.product_id] = OrderItem(
                product_id=event.product_id,
                quantity=existing.quantity + event.quantity,
                unit_price=event.unit_price,
            )
        else:
            self.items[event.product_id] = OrderItem(
                product_id=event.product_id,
                quantity=event.quantity,
                unit_price=event.unit_price,
            )

    def _on_OrderItemRemoved(self, event: OrderItemRemoved):
        self.items.pop(event.product_id, None)

    def _on_OrderSubmitted(self, event: OrderSubmitted):
        self.status = OrderStatus.SUBMITTED
        self.shipping_address = event.shipping_address

    def _on_OrderCancelled(self, event: OrderCancelled):
        self.status = OrderStatus.CANCELLED
```

---

## Event Store Repository

### Persisting and Loading Aggregates

The repository handles storing events and rebuilding aggregates from event streams:

```python
# infrastructure/repository.py
# Event store repository for order aggregates
from esdbclient import EventStoreDBClient, NewEvent, StreamState
from typing import Optional, Type
from uuid import UUID
import json

from domain.aggregates import Order
from domain.events import (
    DomainEvent,
    OrderCreated,
    OrderItemAdded,
    OrderItemRemoved,
    OrderSubmitted,
    OrderCancelled,
)
from eventstore.client import get_client


# Registry mapping event type names to classes
EVENT_TYPES = {
    "OrderCreated": OrderCreated,
    "OrderItemAdded": OrderItemAdded,
    "OrderItemRemoved": OrderItemRemoved,
    "OrderSubmitted": OrderSubmitted,
    "OrderCancelled": OrderCancelled,
}


class OrderRepository:
    """
    Repository for persisting and loading Order aggregates.
    Uses EventStoreDB as the event store.
    """

    def __init__(self, client: EventStoreDBClient = None):
        self.client = client or get_client()

    def _stream_name(self, order_id: UUID) -> str:
        """Generate stream name for an order."""
        return f"order-{order_id}"

    def _serialize_event(self, event: DomainEvent) -> NewEvent:
        """Serialize a domain event for storage."""
        event_type = type(event).__name__
        event_data = json.dumps(event.to_dict()).encode('utf-8')

        return NewEvent(
            type=event_type,
            data=event_data,
            metadata=json.dumps({
                "content-type": "application/json",
            }).encode('utf-8'),
        )

    def _deserialize_event(self, event_type: str, data: bytes) -> DomainEvent:
        """Deserialize an event from storage."""
        event_class = EVENT_TYPES.get(event_type)
        if not event_class:
            raise ValueError(f"Unknown event type: {event_type}")

        event_data = json.loads(data.decode('utf-8'))

        # Handle UUID conversion for order_id
        if 'order_id' in event_data and isinstance(event_data['order_id'], str):
            event_data['order_id'] = UUID(event_data['order_id'])

        # Handle items tuple conversion
        if 'items' in event_data and isinstance(event_data['items'], list):
            event_data['items'] = tuple(event_data['items'])

        return event_class.from_dict(event_data)

    def save(self, order: Order) -> None:
        """
        Save uncommitted events from the aggregate.
        Uses optimistic concurrency to prevent conflicts.
        """
        events = order.uncommitted_events
        if not events:
            return

        stream_name = self._stream_name(order.id)
        new_events = [self._serialize_event(e) for e in events]

        # Determine expected stream state for concurrency check
        if order._version - len(events) == 0:
            # New stream - expect it doesn't exist
            expected_position = StreamState.NO_STREAM
        else:
            # Existing stream - expect specific position
            expected_position = order._version - len(events) - 1

        # Append events with optimistic concurrency
        self.client.append_to_stream(
            stream_name=stream_name,
            events=new_events,
            current_version=expected_position,
        )

        order.clear_uncommitted_events()

    def load(self, order_id: UUID) -> Optional[Order]:
        """
        Load an order by replaying its events.
        Returns None if the order doesn't exist.
        """
        stream_name = self._stream_name(order_id)

        try:
            # Read all events from the stream
            events = self.client.get_stream(stream_name)
        except Exception:
            return None

        if not events:
            return None

        # Create empty aggregate and replay events
        order = Order(order_id)
        for recorded_event in events:
            event = self._deserialize_event(
                recorded_event.type,
                recorded_event.data,
            )
            order._apply(event)

        return order

    def exists(self, order_id: UUID) -> bool:
        """Check if an order exists."""
        stream_name = self._stream_name(order_id)
        try:
            events = list(self.client.get_stream(stream_name, limit=1))
            return len(events) > 0
        except Exception:
            return False
```

---

## Projections

### Building Read Models

Projections transform events into queryable read models:

```python
# projections/order_summary.py
# Read model projection for order summaries
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
from uuid import UUID


@dataclass
class OrderSummary:
    """Read model for order list views."""
    order_id: str
    customer_id: str
    status: str
    total_amount: float
    item_count: int
    created_at: datetime
    updated_at: datetime


class OrderSummaryProjection:
    """
    Projection that maintains order summaries.
    Updates in-memory store as events are processed.
    """

    def __init__(self):
        # In production, use a database (PostgreSQL, Redis, etc.)
        self._summaries: Dict[str, OrderSummary] = {}

    def handle_event(self, event_type: str, event_data: dict):
        """Route events to appropriate handlers."""
        handler_name = f"_handle_{event_type}"
        handler = getattr(self, handler_name, None)
        if handler:
            handler(event_data)

    def _handle_OrderCreated(self, event: dict):
        order_id = event['order_id']
        self._summaries[order_id] = OrderSummary(
            order_id=order_id,
            customer_id=event['customer_id'],
            status='draft',
            total_amount=0.0,
            item_count=0,
            created_at=datetime.fromisoformat(event['occurred_at']),
            updated_at=datetime.fromisoformat(event['occurred_at']),
        )

    def _handle_OrderItemAdded(self, event: dict):
        order_id = event['order_id']
        if order_id in self._summaries:
            summary = self._summaries[order_id]
            summary.item_count += 1
            summary.total_amount += event['quantity'] * event['unit_price']
            summary.updated_at = datetime.fromisoformat(event['occurred_at'])

    def _handle_OrderItemRemoved(self, event: dict):
        order_id = event['order_id']
        if order_id in self._summaries:
            summary = self._summaries[order_id]
            summary.item_count = max(0, summary.item_count - 1)
            summary.updated_at = datetime.fromisoformat(event['occurred_at'])

    def _handle_OrderSubmitted(self, event: dict):
        order_id = event['order_id']
        if order_id in self._summaries:
            summary = self._summaries[order_id]
            summary.status = 'submitted'
            summary.total_amount = event['total_amount']
            summary.updated_at = datetime.fromisoformat(event['occurred_at'])

    def _handle_OrderCancelled(self, event: dict):
        order_id = event['order_id']
        if order_id in self._summaries:
            summary = self._summaries[order_id]
            summary.status = 'cancelled'
            summary.updated_at = datetime.fromisoformat(event['occurred_at'])

    # Query methods

    def get_by_id(self, order_id: str) -> Optional[OrderSummary]:
        """Get a specific order summary."""
        return self._summaries.get(order_id)

    def get_by_customer(self, customer_id: str) -> List[OrderSummary]:
        """Get all orders for a customer."""
        return [
            s for s in self._summaries.values()
            if s.customer_id == customer_id
        ]

    def get_by_status(self, status: str) -> List[OrderSummary]:
        """Get all orders with a specific status."""
        return [
            s for s in self._summaries.values()
            if s.status == status
        ]
```

---

## Subscriptions

### Real-time Event Processing

Subscribe to event streams for real-time updates:

```python
# subscriptions/order_processor.py
# Persistent subscription for order events
from esdbclient import EventStoreDBClient, PersistentSubscription
from typing import Callable
import json
import threading

from eventstore.client import get_client
from projections.order_summary import OrderSummaryProjection


class OrderEventSubscription:
    """
    Persistent subscription to order events.
    Processes events and updates projections in real-time.
    """

    def __init__(
        self,
        group_name: str = "order-processors",
        client: EventStoreDBClient = None
    ):
        self.client = client or get_client()
        self.group_name = group_name
        self.projection = OrderSummaryProjection()
        self._running = False
        self._thread = None

    def start(self):
        """Start processing events in a background thread."""
        self._running = True
        self._thread = threading.Thread(target=self._process_events, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop processing events."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5.0)

    def _process_events(self):
        """
        Main processing loop.
        Reads events from subscription and updates projections.
        """
        # Subscribe to all order streams using a prefix filter
        subscription = self.client.subscribe_to_all(
            filter_include=['order-'],  # Only order streams
            from_position=None,  # Start from beginning
        )

        for event in subscription:
            if not self._running:
                break

            try:
                # Parse event data
                event_data = json.loads(event.data.decode('utf-8'))

                # Update projection
                self.projection.handle_event(event.type, event_data)

                print(f"Processed: {event.type} for order {event_data.get('order_id')}")

            except Exception as e:
                print(f"Error processing event: {e}")
                # In production, implement proper error handling
                # Consider dead letter queues for failed events


def run_subscription():
    """Entry point for running the subscription worker."""
    subscription = OrderEventSubscription()

    print("Starting order event subscription...")
    subscription.start()

    try:
        # Keep running until interrupted
        while True:
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down...")
        subscription.stop()


if __name__ == "__main__":
    run_subscription()
```

---

## Usage Example

### Putting It All Together

Here is a complete example showing how to use the event-sourced order system:

```python
# example.py
# Example usage of the event-sourced order system
from uuid import uuid4
from domain.aggregates import Order
from infrastructure.repository import OrderRepository
from eventstore.client import eventstore_client


def main():
    """Demonstrate event sourcing with orders."""

    with eventstore_client() as client:
        repo = OrderRepository(client)

        # Create a new order
        order = Order.create(customer_id="cust-123")
        print(f"Created order: {order.id}")

        # Add items to the order
        order.add_item(product_id="prod-001", quantity=2, unit_price=29.99)
        order.add_item(product_id="prod-002", quantity=1, unit_price=49.99)
        print(f"Added items. Total: ${order.total_amount:.2f}")

        # Save the order (persists all events)
        repo.save(order)
        print("Order saved to EventStoreDB")

        # Load the order from event store
        loaded_order = repo.load(order.id)
        print(f"Loaded order with {len(loaded_order.items)} items")

        # Submit the order
        loaded_order.submit(shipping_address="123 Main St, City, Country")
        repo.save(loaded_order)
        print(f"Order submitted. Status: {loaded_order.status.value}")

        # Show all events that were recorded
        print("\nEvent history:")
        for i, event in enumerate(repo.client.get_stream(f"order-{order.id}")):
            print(f"  {i+1}. {event.type}")


if __name__ == "__main__":
    main()
```

---

## Best Practices

1. **Make events immutable** - Use frozen dataclasses or named tuples
2. **Name events in past tense** - OrderCreated, not CreateOrder
3. **Include all relevant data** - Events should be self-contained
4. **Version your events** - Plan for schema evolution from the start
5. **Use optimistic concurrency** - Prevent conflicting writes
6. **Keep aggregates small** - Split large aggregates into smaller ones
7. **Build projections for queries** - Don't query the event store directly
8. **Handle idempotency** - Events may be delivered more than once

---

*Building event-sourced applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for event-driven systems with support for distributed tracing and real-time alerting.*

**Related Reading:**
- [How to Implement CQRS Pattern in Python](https://oneuptime.com/blog/post/2026-01-22-cqrs-pattern-python/view)
- [How to Build RabbitMQ Consumers with Pika in Python](https://oneuptime.com/blog/post/2026-01-23-rabbitmq-consumers-pika-python/view)
