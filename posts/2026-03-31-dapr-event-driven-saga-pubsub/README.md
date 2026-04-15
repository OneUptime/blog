# How to Implement Event-Driven Saga with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Saga, Event-Driven, Microservice

Description: Learn how to implement an event-driven saga using Dapr pub/sub to coordinate multi-step distributed transactions with automatic compensation on failure.

---

## What Is an Event-Driven Saga?

A saga breaks a distributed transaction into a sequence of local transactions, each publishing an event when it completes. If a step fails, compensating events trigger rollback transactions in reverse order. Dapr pub/sub is the message bus that carries these events.

## Saga Steps for Order Processing

1. Reserve inventory (Inventory Service)
2. Charge payment (Payment Service)
3. Create shipment (Shipping Service)

Each step publishes a success or failure event.

## Configure the Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: saga-pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Inventory Service

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');
const server = new DaprServer();
const client = new DaprClient();

await server.pubsub.subscribe('saga-pubsub', 'order.created', async (event) => {
  try {
    await reserveInventory(event.orderId, event.items);
    await client.pubsub.publish('saga-pubsub', 'inventory.reserved', {
      orderId: event.orderId,
      reservationId: generateId()
    });
  } catch (err) {
    await client.pubsub.publish('saga-pubsub', 'inventory.reservation.failed', {
      orderId: event.orderId,
      reason: err.message
    });
  }
});

// Compensating transaction - release reservation if payment fails
await server.pubsub.subscribe('saga-pubsub', 'payment.failed', async (event) => {
  await releaseInventory(event.orderId);
  await client.pubsub.publish('saga-pubsub', 'inventory.reservation.cancelled', {
    orderId: event.orderId
  });
});

// Compensating transaction - release reservation if shipment fails (after payment refund)
await server.pubsub.subscribe('saga-pubsub', 'payment.refunded', async (event) => {
  await releaseInventory(event.orderId);
  await client.pubsub.publish('saga-pubsub', 'inventory.reservation.cancelled', {
    orderId: event.orderId
  });
});
```

## Payment Service

```javascript
await server.pubsub.subscribe('saga-pubsub', 'inventory.reserved', async (event) => {
  try {
    const charge = await chargePayment(event.orderId);
    await client.pubsub.publish('saga-pubsub', 'payment.charged', {
      orderId: event.orderId,
      chargeId: charge.id
    });
  } catch (err) {
    await client.pubsub.publish('saga-pubsub', 'payment.failed', {
      orderId: event.orderId,
      reason: err.message
    });
  }
});

// Compensating transaction - refund if shipping fails
await server.pubsub.subscribe('saga-pubsub', 'shipment.failed', async (event) => {
  await refundPayment(event.orderId);
  await client.pubsub.publish('saga-pubsub', 'payment.refunded', {
    orderId: event.orderId
  });
});
```

## Shipping Service

```javascript
await server.pubsub.subscribe('saga-pubsub', 'payment.charged', async (event) => {
  try {
    const shipment = await createShipment(event.orderId);
    await client.pubsub.publish('saga-pubsub', 'order.completed', {
      orderId: event.orderId,
      trackingNumber: shipment.tracking
    });
  } catch (err) {
    await client.pubsub.publish('saga-pubsub', 'shipment.failed', {
      orderId: event.orderId,
      reason: err.message
    });
  }
});
```

## Compensation Chain

```text
order.created
  -> inventory.reserved -> payment.charged -> order.completed

  On failure:
  payment.failed -> inventory.reservation.cancelled (compensate)
  shipment.failed -> payment.refunded -> inventory.reservation.cancelled (compensate)
```

## Tracking Saga State

Store saga state in Dapr state management to enable monitoring and replay:

```javascript
async function updateSagaState(orderId, step, status) {
  await client.state.save('state-store', [{
    key: `saga:${orderId}`,
    value: { orderId, step, status, updatedAt: Date.now() }
  }]);
}
```

## Summary

Dapr pub/sub enables event-driven sagas by providing reliable message delivery between saga participants. Each service handles exactly its local transaction and publishes the outcome, while compensation subscriptions handle rollback automatically when downstream steps fail.
