# How to Implement Domain Event Broadcasting with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Domain Event, DDD, Event-Driven

Description: Learn how to broadcast domain events using Dapr pub/sub so multiple bounded contexts can react to business state changes without tight coupling.

---

## What Are Domain Events?

Domain events represent significant business facts: `OrderPlaced`, `CustomerRegistered`, `PaymentProcessed`. Broadcasting them via Dapr pub/sub lets multiple bounded contexts react independently - the order service doesn't need to know about the notification service or the analytics service.

## Define Domain Events

Use a consistent envelope structure for all domain events:

```javascript
function createDomainEvent(type, aggregateId, payload) {
  return {
    eventId: require('crypto').randomUUID(),
    eventType: type,
    aggregateId,
    aggregateType: type.split('.')[0],
    occurredAt: new Date().toISOString(),
    version: '1.0',
    payload
  };
}
```

## Configure Pub/Sub for Domain Events

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: domain-events-pubsub
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
```

## Publishing Domain Events

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

class OrderService {
  async placeOrder(orderData) {
    const order = await db.createOrder(orderData);

    const event = createDomainEvent('order.placed', order.id, {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      totalAmount: order.totalAmount,
      currency: order.currency
    });

    await client.pubsub.publish('domain-events-pubsub', 'order.placed', event);
    return order;
  }
}
```

## Consumer: Notification Bounded Context

```javascript
const { DaprServer } = require('@dapr/dapr');
const server = new DaprServer();

await server.pubsub.subscribe('domain-events-pubsub', 'order.placed', async (event) => {
  const { payload } = event;
  await emailService.send({
    to: await getCustomerEmail(payload.customerId),
    subject: `Order #${payload.orderId} confirmed`,
    template: 'order-confirmation',
    data: payload
  });
});
```

## Consumer: Inventory Bounded Context

```javascript
await server.pubsub.subscribe('domain-events-pubsub', 'order.placed', async (event) => {
  const { payload } = event;
  for (const item of payload.items) {
    await inventoryService.reserve(item.productId, item.quantity, payload.orderId);
  }
});
```

## Consumer: Analytics Bounded Context

```javascript
await server.pubsub.subscribe('domain-events-pubsub', 'order.placed', async (event) => {
  await analyticsService.track('order_placed', {
    orderId: event.payload.orderId,
    revenue: event.payload.totalAmount,
    currency: event.payload.currency,
    timestamp: event.occurredAt
  });
});
```

## Topic Naming Conventions

Use `{aggregate}.{past-tense-verb}` naming for consistency:

| Topic | Meaning |
|---|---|
| `order.placed` | Order was successfully placed |
| `customer.registered` | New customer account created |
| `payment.processed` | Payment completed |
| `shipment.dispatched` | Package sent to carrier |

## Summary

Dapr pub/sub turns domain events into a loosely coupled integration backbone. Each bounded context subscribes only to the events it cares about, processes them at its own pace, and never needs to know which other services are listening - delivering the independence that makes microservice architectures maintainable at scale.
