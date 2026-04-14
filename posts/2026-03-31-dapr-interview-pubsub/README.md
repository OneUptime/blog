# How to Explain Dapr Pub/Sub in an Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Interview, Messaging, Event-Driven

Description: Explain Dapr pub/sub messaging in a technical interview covering the publish/subscribe lifecycle, CloudEvents format, at-least-once delivery, and dead letter topics.

---

## Core Pub/Sub Answer

**Strong interview answer:**

"Dapr pub/sub provides a portable messaging API. Publishers call a Dapr HTTP endpoint to publish an event to a named topic. Dapr routes the message to the configured broker - Kafka, Redis Streams, Azure Service Bus, and others. Subscribers declare their topic subscriptions either programmatically or via YAML, and Dapr delivers events to their HTTP endpoints with at-least-once delivery semantics."

## Publish Flow

```bash
# Publish an event via Dapr HTTP API
curl -X POST http://localhost:3500/v1.0/publish/pubsub/order-created \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "customerId": "cust-456", "total": 99.99}'

# Dapr wraps in CloudEvents format and sends to the broker
```

## CloudEvents Wrapping

```json
{
  "specversion": "1.0",
  "type": "com.dapr.event.sent",
  "source": "orderservice",
  "id": "a96a3aee-14bb-4c78-b6c7-b4cb8b697929",
  "datacontenttype": "application/json",
  "topic": "order-created",
  "pubsubname": "pubsub",
  "data": {
    "orderId": "123",
    "customerId": "cust-456",
    "total": 99.99
  }
}
```

## Subscribe - Programmatic Declaration

```javascript
// app.js - subscriber service
const express = require('express');
const app = express();

// Tell Dapr which topics this app subscribes to
app.get('/dapr/subscribe', (req, res) => {
    res.json([{
        pubsubname: 'pubsub',
        topic: 'order-created',
        route: '/events/order-created',
        deadLetterTopic: 'order-created-dlq',
    }]);
});

// Handle delivered events
app.post('/events/order-created', express.json(), async (req, res) => {
    const event = req.body;
    console.log('Processing order:', event.data.orderId);

    try {
        await processOrder(event.data);
        res.status(200).send();  // Ack - Dapr won't redeliver
    } catch (err) {
        res.status(500).send();  // Nack - Dapr will retry or send to DLQ
    }
});
```

## Subscribe - Declarative YAML

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  pubsubname: pubsub
  topic: order-created
  route: /events/order-created
  deadLetterTopic: order-created-dlq
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

## At-Least-Once Delivery

```yaml
Delivery Guarantee: At-least-once (default)

Flow:
1. Dapr delivers event to subscriber endpoint
2. If subscriber returns 2xx: message acknowledged, not redelivered
3. If subscriber returns 404: message dropped (permanent failure)
4. If subscriber returns other non-2xx (including 5xx): message retried or sent to dead letter topic
5. If subscriber times out: message retried

Application must be idempotent - handle duplicate delivery gracefully
```

## Idempotency Example

```javascript
async function processOrder(data) {
    // Check if already processed
    const existing = await daprClient.state.get('statestore', `processed-${data.orderId}`);
    if (existing) {
        console.log(`Order ${data.orderId} already processed, skipping`);
        return;
    }

    // Process order
    await fulfillOrder(data);

    // Mark as processed
    await daprClient.state.save('statestore', [{ key: `processed-${data.orderId}`, value: { ts: Date.now() } }]);
}
```

## Dead Letter Topic

```bash
# When all retries fail, message goes to DLQ
# Subscribe to DLQ for manual inspection/reprocessing
app.post('/events/order-created-dlq', express.json(), async (req, res) => {
    const failedEvent = req.body;
    console.error('Failed event:', failedEvent);
    await alertOncallTeam(failedEvent);
    res.status(200).send();  // Ack to prevent infinite DLQ loop
});
```

## Common Interview Questions

**Q: How does Dapr prevent message loss during sidecar restart?**
"The broker holds the message. If the sidecar restarts before acknowledging, the broker redelivers the message to the new sidecar instance."

**Q: What's the difference between pub/sub and service invocation?**
"Service invocation is synchronous - the caller waits for a response. Pub/sub is asynchronous - the publisher doesn't wait and the subscriber processes at its own pace. Use service invocation when you need an immediate result; use pub/sub for event-driven workflows."

**Q: Can multiple subscribers receive the same event?**
"Yes - multiple services can subscribe to the same topic. Each receives a copy of the event independently. Within a consumer group, Dapr ensures competing consumers (multiple instances of the same service) each process different messages."

## Summary

Dapr pub/sub provides a portable event-driven messaging API with CloudEvents formatting, at-least-once delivery, declarative or programmatic subscriptions, and dead letter topics. The key interview points are the delivery guarantee (at-least-once requires idempotent handlers), the acknowledgment protocol (2xx/404/5xx response codes), and the portability across brokers via component YAML.
