# How to Test Dapr Pub/Sub Messaging Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Testing, Local Development, Redis

Description: Learn how to test Dapr pub/sub messaging locally using the Dapr CLI, Redis, Docker Compose, and the Dapr dashboard for end-to-end verification.

---

## Setting Up a Local Pub/Sub Environment

Testing Dapr pub/sub locally requires the Dapr CLI, a message broker (Redis by default), and your application. The Dapr CLI's default initialization ships with a local Redis instance.

## Initialize Dapr Locally

```bash
dapr init
```

This starts a Redis container and creates default component files in `~/.dapr/components/`. The default pubsub component uses Redis Streams.

## Start Your Application with Dapr

```bash
dapr run \
  --app-id order-processor \
  --app-port 3000 \
  --dapr-http-port 3500 \
  -- node app.js
```

## Write a Simple Subscriber

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders",
      route: "/orders",
    },
  ]);
});

app.post("/orders", (req, res) => {
  console.log("Received order:", JSON.stringify(req.body.data));
  res.sendStatus(200);
});

app.listen(3000, () => console.log("Listening on port 3000"));
```

## Publish a Test Message via CLI

```bash
# Publish using Dapr CLI (requires the Dapr sidecar to be running)
dapr publish \
  --publish-app-id order-processor \
  --pubsub pubsub \
  --topic orders \
  --data '{"orderId": "test-001", "item": "widget"}'
```

## Publish via curl

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test-002", "item": "gadget"}'
```

Watch the subscriber terminal for the received message.

## Test with Multiple Services Using Docker Compose

```yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  publisher:
    build: ./publisher
    environment:
      - DAPR_HTTP_PORT=3500
    depends_on:
      - redis

  subscriber:
    build: ./subscriber
    ports:
      - "3001:3001"
    depends_on:
      - redis

  publisher-dapr:
    image: daprio/daprd:latest
    command:
      - "./daprd"
      - "--app-id=publisher"
      - "--app-port=3000"
      - "--dapr-http-port=3500"
      - "--resources-path=/components"
    volumes:
      - ./components:/components
    network_mode: "service:publisher"

  subscriber-dapr:
    image: daprio/daprd:latest
    command:
      - "./daprd"
      - "--app-id=subscriber"
      - "--app-port=3001"
      - "--dapr-http-port=3501"
      - "--resources-path=/components"
    volumes:
      - ./components:/components
    network_mode: "service:subscriber"
```

## Use the Dapr Dashboard for Verification

```bash
dapr dashboard
```

Navigate to `http://localhost:8080` to see active components and loaded subscriptions. The dashboard shows whether your app has registered its subscriptions correctly.

## Writing Automated Tests

```bash
# In a test script
dapr run --app-id test-sub --app-port 4000 -- node test-subscriber.js &
SUB_PID=$!
sleep 2

# Publish a message
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test-auto"}'

sleep 1
kill $SUB_PID
```

## Summary

Testing Dapr pub/sub locally is straightforward with the Dapr CLI and the default Redis component. Use `dapr publish` or curl to send test messages, observe subscriber logs for confirmation, and use Docker Compose for multi-service integration tests. The Dapr dashboard provides a visual view of component and subscription health.
