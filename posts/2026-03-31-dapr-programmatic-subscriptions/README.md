# How to Use Programmatic Subscriptions in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Subscription, Programming, Microservice

Description: Learn how to define Dapr pub/sub subscriptions programmatically by exposing a GET /dapr/subscribe endpoint that returns subscription configuration at startup.

---

## What Are Programmatic Subscriptions?

Programmatic subscriptions let your application define its own topic subscriptions at runtime by exposing a `GET /dapr/subscribe` endpoint. When the Dapr sidecar starts, it queries this endpoint to discover which topics the app wants to receive messages for. This approach keeps subscription logic co-located with handler code and is useful when subscriptions are dynamic or environment-specific.

## Basic Programmatic Subscription in Node.js

```javascript
const express = require("express");
const app = express();
app.use(express.json());

// Dapr sidecar calls this at startup
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders",
      route: "/handlers/orders",
    },
    {
      pubsubname: "pubsub",
      topic: "payments",
      route: "/handlers/payments",
    },
  ]);
});

app.post("/handlers/orders", (req, res) => {
  const data = req.body.data;
  console.log("Order received:", data.orderId);
  res.sendStatus(200);
});

app.post("/handlers/payments", (req, res) => {
  const data = req.body.data;
  console.log("Payment received:", data.paymentId);
  res.sendStatus(200);
});

app.listen(3000, () => console.log("Listening on 3000"));
```

## Dynamic Subscriptions Based on Environment

The programmatic model shines when subscriptions depend on runtime configuration:

```javascript
const subscriptions = [];

if (process.env.ENABLE_ORDER_PROCESSING === "true") {
  subscriptions.push({
    pubsubname: "pubsub",
    topic: "orders",
    route: "/handlers/orders",
  });
}

if (process.env.REGION === "us-east") {
  subscriptions.push({
    pubsubname: "pubsub",
    topic: "us-east-events",
    route: "/handlers/regional-events",
  });
}

app.get("/dapr/subscribe", (req, res) => {
  res.json(subscriptions);
});
```

## Programmatic Routing Rules

You can include content-based routing rules in programmatic subscriptions using the `routes` field:

```javascript
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "events",
      routes: {
        rules: [
          {
            match: `event.type == "UserRegistered"`,
            path: "/handlers/user-registered",
          },
          {
            match: `event.type == "UserDeleted"`,
            path: "/handlers/user-deleted",
          },
        ],
        default: "/handlers/events-default",
      },
    },
  ]);
});
```

## Adding Dead Letter and Metadata Options

Programmatic subscriptions support the same options as declarative ones, including dead letter topics:

```javascript
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders",
      route: "/handlers/orders",
      deadLetterTopic: "orders-deadletter",
      metadata: {
        maxDeliveryCount: "5",
      },
    },
  ]);
});
```

## Using the Python SDK

The Dapr Python SDK provides a helper for programmatic subscriptions:

```python
from dapr.ext.fastapi import DaprApp
from fastapi import FastAPI

app = FastAPI()
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="pubsub", topic="orders", route="/handlers/orders")
async def handle_order(event):
    print(f"Order received: {event.data}")
    return {"success": True}
```

## Running and Verifying

```bash
dapr run \
  --app-id order-service \
  --app-port 3000 \
  -- node app.js
```

Verify that Dapr loaded the subscriptions:

```bash
curl http://localhost:3500/v1.0/metadata
```

Look for your app's subscriptions in the response under `subscriptions`.

## Summary

Programmatic Dapr subscriptions are defined by your application via a `GET /dapr/subscribe` endpoint that returns subscription configuration as JSON. This approach allows dynamic, environment-driven subscription logic co-located with handler code, and supports all the same features as declarative subscriptions including routing rules and dead letter topics.
