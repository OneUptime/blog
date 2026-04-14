# How to Use Dapr Pub/Sub with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Node.js, Messaging, Event-Driven

Description: Learn how to publish and subscribe to events in Node.js using the Dapr Pub/Sub API for decoupled, event-driven microservice communication.

---

## Introduction

Dapr's Pub/Sub building block enables event-driven communication between microservices without coupling publishers to subscribers. Your Node.js services publish and receive messages through Dapr, which handles delivery guarantees and broker abstraction.

## Installing the SDK

```bash
npm install @dapr/dapr
```

Configure a Redis-backed pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
```

## Publishing Events

Create a publisher using `DaprClient`:

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });

async function publishOrderCreated(order) {
  await client.pubsub.publish("pubsub", "order-created", {
    orderId: order.id,
    customerId: order.customerId,
    total: order.total,
    timestamp: new Date().toISOString(),
  });
  console.log("Published order-created event for:", order.id);
}
```

## Subscribing to Events

Use `DaprServer` to subscribe to topics:

```javascript
const { DaprServer } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3501" },
});

await server.pubsub.subscribe("pubsub", "order-created", async (data) => {
  console.log("Processing order:", data.orderId);
  await sendConfirmationEmail(data.customerId, data.orderId);
});

await server.start();
```

## Dead Letter Topics

Configure a dead letter topic for failed messages:

```javascript
await server.pubsub.subscribeWithOptions("pubsub", "order-created", {
  deadLetterTopic: "order-created-failed",
  callback: async (data) => {
    if (!data.orderId) {
      throw new Error("Invalid order data");
    }
    await processOrder(data);
  },
});
```

## Controlling Message Acknowledgment

Return a status to control redelivery:

```javascript
const { DaprPubSubStatusEnum } = require("@dapr/dapr");

await server.pubsub.subscribe("pubsub", "payments", async (data) => {
  try {
    await processPayment(data);
    return DaprPubSubStatusEnum.SUCCESS;
  } catch (err) {
    console.error("Payment processing failed:", err.message);
    return DaprPubSubStatusEnum.RETRY;
  }
});
```

## Publishing with Metadata

Pass metadata for broker-specific features:

```javascript
await client.pubsub.publish(
  "pubsub",
  "notifications",
  { userId: "user-42", message: "Your order shipped!" },
  { metadata: { ttlInSeconds: "300", partitionKey: "user-42" } }
);
```

## Running the Services

```bash
# Publisher
dapr run --app-id order-service --app-port 3000 -- node publisher.js

# Subscriber
dapr run --app-id notification-service --app-port 3001 -- node subscriber.js
```

## Summary

Dapr's Pub/Sub API in Node.js makes it easy to build decoupled, event-driven services. Publishers send events to named topics without knowing who receives them, and subscribers react to events independently. Dapr handles at-least-once delivery, dead letter topics, and broker portability so your application logic stays clean.
