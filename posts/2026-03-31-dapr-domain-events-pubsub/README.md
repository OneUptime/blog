# How to Use Domain Events with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Domain Event, Pub/Sub, DDD, Domain-Driven Design, Microservice

Description: Implement Domain-Driven Design domain events using Dapr pub/sub to communicate business facts across bounded contexts.

---

## Overview

Domain events represent something that happened in the domain that domain experts care about. Unlike integration events (which cross service boundaries), domain events are first raised within an aggregate and then published externally via Dapr pub/sub for consumption by other bounded contexts.

## Domain Event Structure

Define domain events with rich business context:

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

@dataclass
class DomainEvent:
    """Base class for all domain events"""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    aggregate_id: str = ""
    aggregate_type: str = ""
    event_version: int = 1

@dataclass
class OrderPlaced(DomainEvent):
    """Raised when a customer places an order"""
    aggregate_type: str = "Order"
    customer_id: str = ""
    items: list = field(default_factory=list)
    total_amount: float = 0.0
    currency: str = "USD"
    shipping_address: Optional[dict] = None

@dataclass
class PaymentCollected(DomainEvent):
    """Raised when payment is successfully collected"""
    aggregate_type: str = "Order"
    payment_method: str = ""
    amount_collected: float = 0.0
    transaction_id: str = ""
```

## Order Aggregate Publishing Domain Events

```python
import dapr.clients as dapr
import json
from dataclasses import asdict

class OrderAggregate:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self.status = "draft"
        self._pending_events = []

    def place(self, customer_id: str, items: list, total: float):
        # Business logic and validation
        if not items:
            raise ValueError("Order must have at least one item")

        self.status = "placed"

        # Record domain event (not yet published)
        event = OrderPlaced(
            aggregate_id=self.order_id,
            customer_id=customer_id,
            items=items,
            total_amount=total
        )
        self._pending_events.append(event)
        return self

    def collect_payment(self, transaction_id: str, amount: float, method: str):
        self.status = "paid"

        event = PaymentCollected(
            aggregate_id=self.order_id,
            transaction_id=transaction_id,
            amount_collected=amount,
            payment_method=method
        )
        self._pending_events.append(event)
        return self

    def publish_events(self, pubsub_name: str = "orders-pubsub"):
        with dapr.DaprClient() as client:
            for event in self._pending_events:
                topic = type(event).__name__
                client.publish_event(
                    pubsub_name=pubsub_name,
                    topic_name=topic,
                    data=json.dumps(asdict(event)),
                    data_content_type="application/json"
                )
                print(f"Published domain event: {topic} for aggregate {event.aggregate_id}")

        self._pending_events.clear()
```

## Dapr Subscription Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-placed-subscription
spec:
  pubsubname: orders-pubsub
  topic: OrderPlaced
  route: /domain-events/order-placed
  scopes:
  - inventory-service
  - notification-service
  - analytics-service
```

## Event Handler in Inventory Service

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/domain-events/order-placed', methods=['POST'])
def handle_order_placed():
    event_data = request.json
    data = event_data.get('data', {})

    order_id = data.get('aggregate_id')
    items = data.get('items', [])

    print(f"Inventory service: reserving stock for order {order_id}")
    reserve_inventory_for_items(items, order_id)

    return jsonify({"status": "SUCCESS"}), 200

def reserve_inventory_for_items(items: list, order_id: str):
    for item in items:
        print(f"  Reserving {item.get('quantity', 1)} of {item.get('productId')}")

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "orders-pubsub",
        "topic": "OrderPlaced",
        "route": "/domain-events/order-placed"
    }])

if __name__ == '__main__':
    app.run(port=8080)
```

## Transactional Outbox Pattern

Guarantee domain event delivery by using an outbox pattern with Dapr:

```python
def place_order_with_outbox(order_id: str, customer_id: str, items: list):
    with dapr.DaprClient() as client:
        # Save order state and event in a single transaction
        operations = [
            TransactionalStateOperation(
                key=f"order:{order_id}",
                data=json.dumps({"status": "placed", "customerId": customer_id}),
                operation_type=TransactionOperationType.upsert
            ),
            TransactionalStateOperation(
                key=f"outbox:{order_id}",
                data=json.dumps({"topic": "OrderPlaced", "orderId": order_id}),
                operation_type=TransactionOperationType.upsert
            )
        ]
        client.execute_state_transaction("statestore", operations)
        # Outbox processor reads and publishes the event asynchronously
```

## Summary

Domain events in Dapr pub/sub provide a clean implementation of DDD tactical patterns for microservices. By collecting events within aggregates and publishing them after successful business logic execution, you maintain domain integrity. The transactional outbox pattern ensures no domain events are lost even when the publishing service crashes between saving state and calling Dapr's publish API.
