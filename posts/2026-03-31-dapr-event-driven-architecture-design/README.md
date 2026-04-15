# How to Design Event-Driven Architecture with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event-Driven Architecture, Pub/Sub, Microservice, Design Pattern, Cloud Native

Description: Design scalable event-driven microservices architectures with Dapr pub/sub, covering event taxonomy, service boundaries, and topology patterns.

---

## Overview

Event-driven architecture (EDA) decouples services by having them communicate through events rather than direct calls. Dapr's pub/sub building block provides the foundation for building EDA systems that are portable across different message brokers. This guide covers the key design decisions when building EDA with Dapr.

## Event Taxonomy

Define clear categories of events before building:

| Event Type | Purpose | Example |
|---|---|---|
| Domain Event | Business fact that occurred | `OrderPlaced`, `PaymentProcessed` |
| Integration Event | Cross-service notification | `OrderShipped`, `InventoryReserved` |
| Command Event | Request to perform action | `ProcessRefund`, `SendNotification` |
| Query Event | Request for data | Less common in EDA, prefer direct calls |

## Service Boundary Design

Group related capabilities into bounded contexts:

```text
Order Service         -> publishes: OrderPlaced, OrderCancelled
Inventory Service     -> publishes: InventoryReserved, StockLow
Payment Service       -> publishes: PaymentProcessed, PaymentFailed
Notification Service  -> subscribes to: OrderPlaced, PaymentProcessed, OrderShipped
Fulfillment Service   -> subscribes to: PaymentProcessed, InventoryReserved
```

## Dapr Pub/Sub Topology

Configure a shared pub/sub component and service-specific subscriptions:

```yaml
# Shared pub/sub component
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "$(APP_ID)-consumer"
scopes:
- order-service
- inventory-service
- payment-service
- notification-service
- fulfillment-service
```

Service-specific subscription routing:

```yaml
# Notification service subscriptions
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: notification-subscriptions
  namespace: default
spec:
  pubsubname: orders-pubsub
  topic: OrderPlaced
  routes:
    rules:
    - match: 'event.type == "order.placed.priority"'
      path: /notify/priority-order
    default: /notify/order-placed
  scopes:
  - notification-service
```

## Publishing Events with Metadata

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function publishOrderPlaced(order) {
  const event = {
    // CloudEvents standard fields
    specversion: '1.0',
    type: 'order.placed',
    source: 'order-service',
    id: `order-${order.id}-${Date.now()}`,
    time: new Date().toISOString(),
    // Domain data
    data: {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      total: order.total,
      currency: order.currency
    }
  };

  await client.pubsub.publish('orders-pubsub', 'OrderPlaced', event, {
    metadata: {
      rawPayload: 'true',
      partitionKey: order.customerId
    }
  });

  console.log(`Published OrderPlaced for order ${order.id}`);
}
```

## Fan-Out Pattern

Multiple services consuming the same event topic independently:

```yaml
# Payment service subscription
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: payment-order-subscription
spec:
  pubsubname: orders-pubsub
  topic: OrderPlaced
  route: /payments/initiate
  scopes:
  - payment-service

# Inventory service subscription
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: inventory-order-subscription
spec:
  pubsubname: orders-pubsub
  topic: OrderPlaced
  route: /inventory/reserve
  scopes:
  - inventory-service
```

## Event Envelope Pattern

Standardize event structure across all services:

```python
from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

@dataclass
class EventEnvelope:
    event_id: str
    event_type: str
    event_version: str
    source_service: str
    occurred_at: str
    correlation_id: str
    data: dict

    @classmethod
    def create(cls, event_type: str, source: str, data: dict, correlation_id: str = None):
        return cls(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            event_version="1.0",
            source_service=source,
            occurred_at=datetime.now(timezone.utc).isoformat(),
            correlation_id=correlation_id or str(uuid.uuid4()),
            data=data
        )
```

## Summary

Designing event-driven architecture with Dapr requires clear event taxonomy, well-defined service boundaries, and consistent event envelope structures. Scoped pub/sub components enforce which services can publish to which topics, preventing unintended coupling. The fan-out pattern with Dapr subscriptions allows multiple independent consumers of the same event without coordination between consuming services.
