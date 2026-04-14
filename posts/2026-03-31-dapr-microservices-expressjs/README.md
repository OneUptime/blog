# How to Build Microservices with Dapr and Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Express.js, Microservice, Node.js, Architecture

Description: A practical guide to building production-ready microservices using Dapr and Express.js with state management, pub/sub messaging, and service invocation.

---

## Introduction

Express.js is one of the most popular Node.js web frameworks. Pairing it with Dapr adds distributed systems capabilities like state management, event-driven messaging, and service discovery with minimal configuration.

## Project Setup

```bash
mkdir order-service && cd order-service
npm init -y
npm install @dapr/dapr express
```

## Application Structure

```text
order-service/
  src/
    app.js
    routes/
      orders.js
    services/
      orderService.js
  dapr/
    components/
      statestore.yaml
      pubsub.yaml
```

## Setting Up the Express App

```javascript
// src/app.js
const express = require("express");
const { DaprClient } = require("@dapr/dapr");

const app = express();
app.use(express.json());

const daprClient = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_HTTP_PORT || "3500",
});

module.exports = { app, daprClient };
```

## Order Routes with State Management

```javascript
// src/routes/orders.js
const { Router } = require("express");
const { daprClient } = require("../app");

const router = Router();

router.post("/", async (req, res) => {
  const order = { ...req.body, id: `order-${Date.now()}`, status: "pending" };

  await daprClient.state.save("statestore", [
    { key: order.id, value: order },
  ]);

  await daprClient.pubsub.publish("pubsub", "order-created", order);

  res.status(201).json(order);
});

router.get("/:id", async (req, res) => {
  const order = await daprClient.state.get("statestore", req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

module.exports = router;
```

## Registering Pub/Sub Subscriptions with DaprServer

```javascript
// src/subscriber.js
const { DaprServer } = require("@dapr/dapr");

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "3001",
  clientOptions: {
    daprHost: "127.0.0.1",
    daprPort: "3501",
  },
});

async function processOrder(order) {
  console.log(`Processing order ${order.id} with status ${order.status}`);
}

async function registerSubscriptions() {
  await server.pubsub.subscribe("pubsub", "order-created", async (data) => {
    console.log("New order received:", data.id);
    await processOrder(data);
  });

  await server.start();
}

registerSubscriptions().catch(console.error);
```

## Starting the Server

```javascript
// src/index.js
const { app } = require("./app");
const ordersRouter = require("./routes/orders");

app.use("/orders", ordersRouter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});
```

## Running with Dapr

```bash
dapr run \
  --app-id order-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --components-path ./dapr/components \
  -- node src/index.js
```

## Summary

Building microservices with Dapr and Express.js is a natural combination: Express.js handles routing and HTTP concerns, while Dapr provides state, pub/sub, and service invocation. This separation keeps your application code clean and makes it easy to swap infrastructure components without touching business logic.
