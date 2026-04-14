# How to Use Dapr Pub/Sub for Microservice Decoupling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Decoupling, Microservice, Architecture

Description: Learn how to decouple microservices using Dapr pub/sub so services communicate through events rather than direct calls, improving resilience and flexibility.

---

## The Problem with Direct Service Calls

When microservices call each other directly (via HTTP or gRPC), they create tight coupling:
- The caller must know the address and API contract of the callee
- If the callee is down, the caller fails
- Scaling one service does not automatically scale the chain
- Changing a service interface requires coordinating multiple consumers

Dapr pub/sub solves this by introducing an event bus that services publish to and subscribe from, eliminating direct dependencies.

## Before: Tightly Coupled Services

```javascript
// order-service directly calls inventory and payment
async function placeOrder(order) {
  // Fails if payment-service is down
  await fetch("http://payment-service/process", {
    method: "POST",
    body: JSON.stringify({ amount: order.total }),
  });

  // Fails if inventory-service is down
  await fetch("http://inventory-service/reserve", {
    method: "POST",
    body: JSON.stringify({ items: order.items }),
  });
}
```

## After: Decoupled with Dapr Pub/Sub

```javascript
// order-service only publishes an event
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function placeOrder(order) {
  await client.state.save("statestore", [
    { key: `order:${order.orderId}`, value: { ...order, status: "pending" } },
  ]);

  // Fire and forget - no direct dependency on payment or inventory
  await client.pubsub.publish("pubsub", "order-events", {
    type: "OrderPlaced",
    orderId: order.orderId,
    customerId: order.customerId,
    items: order.items,
    total: order.total,
  });

  return { orderId: order.orderId, status: "pending" };
}
```

## Payment Service - Independently Subscribed

```javascript
// payment-service reacts when ready - no coupling to order-service
app.post("/handlers/order-placed", async (req, res) => {
  const { orderId, total } = req.body.data;

  const result = await processPayment(orderId, total);

  await client.pubsub.publish("pubsub", "payment-events", {
    type: result.success ? "PaymentSucceeded" : "PaymentFailed",
    orderId,
    reason: result.reason,
  });

  res.sendStatus(200);
});
```

## Inventory Service - Independently Subscribed

```javascript
// inventory-service listens for PaymentSucceeded - no knowledge of order-service
app.post("/handlers/payment-succeeded", async (req, res) => {
  const { orderId } = req.body.data;

  // Look up order items from state store (shared data)
  const order = await client.state.get("statestore", `order:${orderId}`);
  await reserveInventory(order.items);

  await client.pubsub.publish("pubsub", "inventory-events", {
    type: "InventoryReserved",
    orderId,
  });

  res.sendStatus(200);
});
```

## Benefits of This Architecture

Adding a new service (e.g., a loyalty points service) requires no changes to existing services:

```javascript
// loyalty-service subscribes independently - order-service unchanged
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "payment-events",
      routes: {
        rules: [
          { match: `event.data.type == "PaymentSucceeded"`, path: "/handlers/award-points" },
        ],
      },
    },
  ]);
});

app.post("/handlers/award-points", async (req, res) => {
  const { orderId } = req.body.data;
  const order = await client.state.get("statestore", `order:${orderId}`);
  await awardLoyaltyPoints(order.customerId, order.total * 0.01);
  res.sendStatus(200);
});
```

## Component Configuration for Decoupling

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
  - name: enableTLS
    value: "false"
```

For production, prefer Kafka or Azure Service Bus for persistent, durable event delivery.

## Testing Decoupling

Verify that `order-service` works even when `payment-service` is down:

```bash
# Stop payment service
kubectl scale deployment payment-service --replicas=0 -n production

# Place an order - should succeed (event is queued)
curl -s -X POST http://order-service/commands/place-order \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-test", "total": 99.99}'

# Restart payment service - it will process the queued event
kubectl scale deployment payment-service --replicas=1 -n production
```

## Summary

Dapr pub/sub decouples microservices by replacing direct service calls with event publishing. Publishers emit events without knowing who receives them, subscribers process events independently, and new consumers can be added without modifying existing services. This architecture improves resilience, enables independent scaling, and reduces the coordination cost of evolving service interfaces.
