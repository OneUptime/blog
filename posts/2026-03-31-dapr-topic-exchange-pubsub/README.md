# How to Implement Topic Exchange with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Topic, Routing, Messaging

Description: Learn how to implement a topic exchange pattern with Dapr Pub/Sub using content-based routing to route messages to different subscribers based on topic attributes.

---

## What Is a Topic Exchange?

A topic exchange routes messages to queues based on routing key patterns. Subscribers bind to topics using pattern matching, similar to RabbitMQ topic exchanges. Dapr Pub/Sub supports this through topic routing rules and CEL (Common Expression Language) expressions that match message attributes.

## Pub/Sub Component Setup

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: events-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Publishing Events with Routing Keys

Publish messages with metadata fields that act as routing keys:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function publishOrderEvent(event) {
  // The message data includes routing fields
  await client.pubsub.publish('events-pubsub', 'orders', {
    orderId: event.orderId,
    region: event.region,         // e.g., "us-east", "eu-west"
    orderType: event.orderType,   // e.g., "express", "standard"
    amount: event.amount,
    customerId: event.customerId,
    timestamp: new Date().toISOString(),
  });
}

// Different types of events
await publishOrderEvent({ orderId: '1', region: 'us-east', orderType: 'express', amount: 150 });
await publishOrderEvent({ orderId: '2', region: 'eu-west', orderType: 'standard', amount: 30 });
await publishOrderEvent({ orderId: '3', region: 'us-east', orderType: 'standard', amount: 75 });
```

## Declarative Topic Routing with Subscriptions

Define routing rules in subscription components to route messages to different paths or services:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-routing
spec:
  pubsubname: events-pubsub
  topic: orders
  routes:
    rules:
    - match: 'event.data.region == "us-east" && event.data.orderType == "express"'
      path: /orders/us-express
    - match: 'event.data.region == "eu-west"'
      path: /orders/eu
    - match: 'event.data.amount > 100'
      path: /orders/high-value
    default: /orders/standard
  scopes:
  - order-processor
```

## Programmatic Routing in Code

```javascript
const { DaprServer } = require('@dapr/dapr');

const server = new DaprServer({
  serverHost: '127.0.0.1',
  serverPort: '3000',
});

// Subscribe with routing rules
await server.pubsub.subscribe('events-pubsub', 'orders', {
  default: '/orders/default',
  rules: [
    {
      match: 'event.data.orderType == "express"',
      path: '/orders/express',
    },
    {
      match: 'event.data.region == "eu-west"',
      path: '/orders/eu',
    },
  ],
});

// Handler for express orders
server.pubsub.subscribeToRoute('events-pubsub', 'orders', 'orders/express', async (data) => {
  console.log(`Express order received: ${data.orderId} in ${data.region}`);
  await processExpressOrder(data);
});

// Handler for EU orders
server.pubsub.subscribeToRoute('events-pubsub', 'orders', 'orders/eu', async (data) => {
  console.log(`EU order received: ${data.orderId}`);
  await processEUOrder(data);
});

// Default handler
server.pubsub.subscribeToRoute('events-pubsub', 'orders', 'orders/default', async (data) => {
  console.log(`Standard order received: ${data.orderId}`);
  await processStandardOrder(data);
});

await server.start();
```

## Using CEL Expressions for Pattern Matching

CEL expressions can match on nested fields and combine conditions:

```yaml
rules:
- match: 'event.data.region.startsWith("us") && event.data.amount >= 500'
  path: /priority/us-high-value
- match: 'has(event.data.tags) && "vip" in event.data.tags'
  path: /priority/vip
- match: 'event.data.orderType in ["express", "overnight"]'
  path: /priority/fast
```

## Summary

Dapr Pub/Sub topic exchange routing uses CEL expressions in subscription rules to route messages to different handlers based on message content. Define rules declaratively in Subscription components or programmatically in code. This provides flexible, content-based routing without requiring separate topics for each message variant, keeping the publishing side simple.
