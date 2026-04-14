# How to Use Dapr JavaScript Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, JavaScript, Server, Node.js, Subscription

Description: Learn how to use the DaprServer in Node.js to handle pub/sub subscriptions, service invocations, and binding triggers from the Dapr sidecar.

---

## Introduction

The `DaprServer` in the Dapr JavaScript SDK runs an HTTP or gRPC server that listens for inbound calls from the Dapr sidecar. It handles pub/sub topic subscriptions, direct service invocations from other Dapr services, and input binding triggers.

## Setting Up the Server

```javascript
const { DaprServer, CommunicationProtocolEnum, HttpMethod } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: process.env.APP_PORT || "3000",
  clientOptions: {
    daprHost: "127.0.0.1",
    daprPort: process.env.DAPR_HTTP_PORT || "3500",
  },
});
```

## Subscribing to Pub/Sub Topics

Register a topic subscription handler:

```javascript
await server.pubsub.subscribe("pubsub", "orders", async (data) => {
  console.log("Received order:", data);
  // Process the order
  await processOrder(data);
});
```

## Subscribing with Routing

Handle different event types on the same topic with routing rules:

```javascript
await server.pubsub.subscribeWithOptions("pubsub", "orders", {
  route: {
    default: "/orders/default",
    rules: [
      { match: 'event.type == "created"', path: "/orders/created" },
      { match: 'event.type == "cancelled"', path: "/orders/cancelled" },
    ],
  },
  callback: async (data) => {
    console.log("Order event:", data);
  },
});
```

## Handling Service Invocations

Register handlers for direct service-to-service calls:

```javascript
await server.invoker.listen("getOrder", async (data) => {
  const orderId = data.body?.orderId;
  const order = await fetchOrder(orderId);
  return order;
}, { method: HttpMethod.GET });

await server.invoker.listen("createOrder", async (data) => {
  const order = data.body;
  const saved = await saveOrder(order);
  return { success: true, order: saved };
}, { method: HttpMethod.POST });
```

## Handling Input Bindings

Listen for triggers from external systems through Dapr bindings:

```javascript
await server.binding.receive("cron-trigger", async (data) => {
  console.log("Cron triggered at:", new Date().toISOString());
  await runScheduledJob();
});

await server.binding.receive("kafka-input", async (data) => {
  console.log("Kafka message:", data);
  await handleKafkaMessage(data);
});
```

## Starting the Server

```javascript
async function main() {
  // Register all handlers before starting
  await server.pubsub.subscribe("pubsub", "orders", handleOrder);
  await server.invoker.listen("health", async () => ({ status: "ok" }));

  // Start listening
  await server.start();
  console.log("Dapr server started on port 3000");
}

main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
```

## Graceful Shutdown

Handle process signals for clean shutdown:

```javascript
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await server.stop();
  process.exit(0);
});
```

## Summary

The `DaprServer` provides a straightforward way to handle inbound Dapr traffic in Node.js. By registering handlers for pub/sub topics, service invocations, and bindings before calling `start()`, you create a service that integrates cleanly with the Dapr runtime and responds to events from across your microservices architecture.
