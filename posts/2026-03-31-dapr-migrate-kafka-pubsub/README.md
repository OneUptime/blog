# How to Migrate from Kafka Direct Usage to Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Pub/Sub, Migration, Messaging

Description: Learn how to replace direct Kafka client usage with Dapr Pub/Sub to decouple your services from Kafka specifics and simplify local development.

---

## Why Migrate from Direct Kafka?

Kafkajs and other Kafka client libraries require you to manage brokers, consumer groups, partition offsets, and serialization in every service. Dapr Pub/Sub wraps Kafka behind a uniform API that also works with Redis, RabbitMQ, and Azure Service Bus - no code changes needed to switch.

## Before: Direct kafkajs Usage

```javascript
// producer.js - direct kafkajs
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();

async function publishEvent(event) {
  await producer.connect();
  await producer.send({
    topic: 'order-events',
    messages: [
      {
        key: event.orderId,
        value: JSON.stringify(event)
      }
    ]
  });
  await producer.disconnect();
}
```

```javascript
// consumer.js - direct kafkajs
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'fulfillment', brokers: ['kafka:9092'] });
const consumer = kafka.consumer({ groupId: 'fulfillment-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-events', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      await handleOrderEvent(event);
    }
  });
}
```

## After: Dapr Pub/Sub with Kafka

Configure the component:

```yaml
# components/kafka-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-events
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "fulfillment-group"
  - name: authType
    value: "none"
  - name: initialOffset
    value: "newest"
  - name: disableTls
    value: "true"
```

Producer - HTTP POST to Dapr sidecar:

```javascript
// producer.js - via Dapr
const axios = require('axios');

async function publishEvent(event) {
  await axios.post(
    `http://localhost:3500/v1.0/publish/order-events/order-events`,
    event,
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

Consumer - declare subscription and handle:

```javascript
// consumer.js - via Dapr
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'order-events',
      topic: 'order-events',
      route: '/order-events'
    }
  ]);
});

app.post('/order-events', async (req, res) => {
  const event = req.body.data;
  await handleOrderEvent(event);
  res.json({ status: 'SUCCESS' });
});

app.listen(3001);
```

## Handling Bulk Publish

Dapr supports bulk publishing for higher throughput:

```javascript
async function publishBulk(events) {
  const messages = events.map(e => ({
    entryId: e.orderId,
    event: e,
    contentType: 'application/json'
  }));

  await axios.post(
    'http://localhost:3500/v1.0/publish/bulk/order-events/order-events',
    messages
  );
}
```

## Local Development Without Kafka

For local development, swap the component to use Redis Streams:

```yaml
# components/pubsub-local.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-events
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
```

No code changes - just point Dapr at a different component directory:

```bash
dapr run --resources-path ./components-local -- node consumer.js
```

## Summary

Migrating from kafkajs to Dapr Pub/Sub removes consumer group management, offset tracking, and serialization boilerplate from your application code. Producers make a simple HTTP POST and consumers expose an HTTP endpoint. Switching between Kafka and Redis for local development is a single component YAML swap with zero code changes.
