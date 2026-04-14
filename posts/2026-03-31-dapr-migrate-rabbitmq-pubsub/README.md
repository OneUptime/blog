# How to Migrate from RabbitMQ Direct Usage to Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RabbitMQ, Pub/Sub, Migration, Messaging

Description: Learn how to replace direct RabbitMQ AMQP client usage with Dapr Pub/Sub to abstract broker details and enable seamless broker migrations in the future.

---

## The Case for Migrating

Direct RabbitMQ usage requires managing connections, channels, exchanges, queues, and bindings in your application code. This couples your services tightly to RabbitMQ's topology. Dapr Pub/Sub hides that complexity behind a simple HTTP or gRPC API.

## Before: Direct amqplib Usage

```javascript
// publisher.js - direct amqplib
const amqp = require('amqplib');

async function publishOrder(order) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertExchange('orders', 'direct', { durable: true });
  channel.publish(
    'orders',
    'order.created',
    Buffer.from(JSON.stringify(order)),
    { persistent: true }
  );

  await channel.close();
  await connection.close();
}
```

```javascript
// subscriber.js - direct amqplib
const amqp = require('amqplib');

async function startConsumer() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertExchange('orders', 'direct', { durable: true });
  const q = await channel.assertQueue('order-processor', { durable: true });
  await channel.bindQueue(q.queue, 'orders', 'order.created');

  channel.consume(q.queue, (msg) => {
    const order = JSON.parse(msg.content.toString());
    processOrder(order);
    channel.ack(msg);
  });
}
```

## After: Dapr Pub/Sub with RabbitMQ

Configure the Dapr component:

```yaml
# components/rabbitmq-pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: "amqp://localhost:5672"
  - name: durable
    value: "true"
  - name: deletedWhenUnused
    value: "false"
  - name: autoAck
    value: "false"
  - name: reconnectWait
    value: "0"
  - name: concurrencyMode
    value: "parallel"
```

Publisher - simple HTTP POST:

```javascript
// publisher.js - via Dapr
const axios = require('axios');

async function publishOrder(order) {
  await axios.post(
    'http://localhost:3500/v1.0/publish/orderpubsub/order.created',
    order
  );
}
```

Subscriber - HTTP endpoint:

```javascript
// subscriber.js - via Dapr
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'orderpubsub',
      topic: 'order.created',
      route: '/order-created'
    }
  ]);
});

app.post('/order-created', async (req, res) => {
  const order = req.body.data;
  await processOrder(order);
  res.sendStatus(200);
});

app.listen(3001, () => console.log('Subscriber running on port 3001'));
```

## Content-Type for Structured Events

Dapr supports CloudEvents by default. To publish raw JSON without CloudEvents wrapping:

```javascript
await axios.post(
  'http://localhost:3500/v1.0/publish/orderpubsub/order.created?metadata.rawPayload=true',
  order
);
```

## Testing the Migration

Run with the Dapr CLI:

```bash
dapr run \
  --app-id order-publisher \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- node publisher.js
```

```bash
dapr run \
  --app-id order-subscriber \
  --app-port 3001 \
  --dapr-http-port 3501 \
  --resources-path ./components \
  -- node subscriber.js
```

## Summary

Replacing direct amqplib calls with Dapr Pub/Sub eliminates RabbitMQ topology management from application code. Publishers post to the Dapr sidecar, subscribers expose HTTP endpoints, and all AMQP details live in the component YAML. When you want to switch to Kafka or Azure Service Bus later, only the component file changes.
