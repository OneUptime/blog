# How to Migrate from Redis Pub/Sub to Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Pub/Sub, Migration, Messaging

Description: Learn how to replace direct Redis Pub/Sub usage with Dapr Pub/Sub to gain portability, dead-letter support, and broker-agnostic messaging in your services.

---

## Why Migrate Away from Redis Pub/Sub?

Redis Pub/Sub is fast and simple, but it has real limitations: messages are not persisted, subscribers that are offline miss messages, and there is no dead-letter queue. Dapr Pub/Sub wraps your broker (Redis Streams, Kafka, RabbitMQ) behind a consistent API so you can switch brokers without changing application code.

## Before: Direct Redis Pub/Sub

```javascript
// publisher.js - direct redis
const redis = require('redis');
const client = redis.createClient({ url: 'redis://localhost:6379' });

async function publishOrder(order) {
  await client.connect();
  await client.publish('orders', JSON.stringify(order));
  await client.disconnect();
}
```

```javascript
// subscriber.js - direct redis
const redis = require('redis');
const subscriber = redis.createClient({ url: 'redis://localhost:6379' });

await subscriber.connect();
await subscriber.subscribe('orders', (message) => {
  const order = JSON.parse(message);
  console.log('Received order:', order.id);
  processOrder(order);
});
```

## After: Dapr Pub/Sub

Configure a pubsub component backed by Redis Streams (or swap to Kafka/RabbitMQ later):

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
```

Publisher - POST to Dapr sidecar:

```javascript
// publisher.js - via Dapr
const axios = require('axios');

async function publishOrder(order) {
  await axios.post(
    'http://localhost:3500/v1.0/publish/orderpubsub/orders',
    order,
    { headers: { 'Content-Type': 'application/json' } }
  );
  console.log('Published order:', order.id);
}
```

Subscriber - declare subscription and handle via HTTP endpoint:

```javascript
// subscriber.js - via Dapr
const express = require('express');
const app = express();
app.use(express.json());

// Declare subscriptions
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'orderpubsub',
      topic: 'orders',
      route: '/orders'
    }
  ]);
});

// Handle messages (Dapr wraps payloads in a CloudEvents envelope)
app.post('/orders', (req, res) => {
  const order = req.body.data;
  console.log('Received order:', order.id);
  processOrder(order);
  res.sendStatus(200); // ACK
});

app.listen(3000);
```

## Key Differences

| Feature | Redis Pub/Sub | Dapr Pub/Sub |
|---------|---------------|--------------|
| Message persistence | No | Yes (Redis Streams) |
| Missed messages | Lost | Replayed |
| Dead-letter queue | No | Yes (configurable) |
| Broker switch | Code change | Component swap |
| At-least-once delivery | No | Yes |

## Dead-Letter Configuration

```yaml
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: consumerID
    value: "order-processor"
  - name: maxLenApprox
    value: "1000"
```

For dead-letter routing in your subscription:

```json
{
  "pubsubname": "orderpubsub",
  "topic": "orders",
  "route": "/orders",
  "deadLetterTopic": "orders-dlq"
}
```

## Summary

Migrating from Redis Pub/Sub to Dapr Pub/Sub gives you message persistence, at-least-once delivery, and dead-letter queues without changing your business logic. The publisher posts to a local Dapr sidecar endpoint, and the subscriber exposes an HTTP handler - the broker details are entirely in the component YAML. Swapping Redis for Kafka later requires only a component file change.
