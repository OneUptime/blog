# How to Publish Ordered Messages to Pub/Sub from a Node.js Express Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Node.js, Express, Messaging, Google Cloud

Description: Learn how to publish ordered messages to Google Cloud Pub/Sub from a Node.js Express application using ordering keys to guarantee message sequence.

---

Google Cloud Pub/Sub is a fully managed messaging service that handles millions of messages per second. By default, Pub/Sub does not guarantee message ordering - messages can arrive at subscribers in any order. But many use cases require strict ordering: financial transactions, event sourcing, change data capture, and log processing all need messages delivered in sequence.

Pub/Sub solves this with ordering keys. When you publish messages with the same ordering key, Pub/Sub guarantees they will be delivered to subscribers in the order they were published. In this post, I will show you how to set this up in a Node.js Express application.

## How Ordering Keys Work

An ordering key is a string you attach to each message. Pub/Sub guarantees order only within messages that share the same ordering key. Messages with different ordering keys can be delivered in any order relative to each other. Think of it like separate lanes on a highway - each lane maintains its own order, but lanes are independent.

For example, if you are publishing order updates, you might use the order ID as the ordering key. All updates for order "ORD-123" will arrive in sequence, but updates for "ORD-456" might interleave freely.

## Project Setup

Let's set up an Express application that publishes ordered messages.

```bash
# Initialize project and install dependencies
mkdir pubsub-ordered && cd pubsub-ordered
npm init -y
npm install express @google-cloud/pubsub
```

## Creating a Topic with Message Ordering Enabled

Before you can publish ordered messages, your topic must have message ordering enabled. You can do this through the console or programmatically.

```javascript
// create-topic.js - Create a topic with ordering enabled
const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub({ projectId: 'your-project-id' });

async function createOrderedTopic(topicName) {
  const [topic] = await pubsub.createTopic({
    name: topicName,
    // Enable message ordering on the topic
    messageOrderingEnabled: true,
  });

  console.log(`Topic ${topic.name} created with ordering enabled`);
  return topic;
}

createOrderedTopic('order-events');
```

You also need a subscription with ordering enabled.

```javascript
// create-subscription.js - Create subscription with ordering
async function createOrderedSubscription(topicName, subscriptionName) {
  const [subscription] = await pubsub
    .topic(topicName)
    .createSubscription(subscriptionName, {
      // Enable message ordering on the subscription
      enableMessageOrdering: true,
    });

  console.log(`Subscription ${subscription.name} created with ordering enabled`);
  return subscription;
}

createOrderedSubscription('order-events', 'order-events-sub');
```

## Building the Express Publisher

Now let's build the Express application that publishes ordered messages.

```javascript
// app.js - Express app with ordered Pub/Sub publishing
const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');

const app = express();
app.use(express.json());

const pubsub = new PubSub({ projectId: 'your-project-id' });
const topic = pubsub.topic('order-events', {
  // Required: enable message ordering on the topic object
  enableMessageOrdering: true,
  messageOrdering: true,
});

// Publish an order event with ordering
app.post('/orders/:orderId/events', async (req, res) => {
  const { orderId } = req.params;
  const { eventType, payload } = req.body;

  try {
    const messageData = JSON.stringify({
      orderId,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    // Publish with the orderId as the ordering key
    // All messages for the same order will be delivered in sequence
    const messageId = await topic.publishMessage({
      data: Buffer.from(messageData),
      orderingKey: orderId,
      attributes: {
        eventType: eventType,
        source: 'order-service',
      },
    });

    console.log(`Published message ${messageId} for order ${orderId}`);
    res.json({ messageId, orderId });
  } catch (error) {
    console.error('Failed to publish:', error);
    res.status(500).json({ error: 'Failed to publish message' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Handling Publishing Failures with Ordering Keys

When you use ordering keys, there is an important caveat. If a message fails to publish, all subsequent messages with the same ordering key will also fail. This is by design - if message 2 of 5 fails, you would not want messages 3, 4, and 5 to be delivered without message 2.

The Pub/Sub client enters a "paused" state for that ordering key. You need to explicitly resume publishing.

```javascript
// robust-publisher.js - Handle ordering key failures
const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub({ projectId: 'your-project-id' });
const topic = pubsub.topic('order-events', {
  enableMessageOrdering: true,
  messageOrdering: true,
});

async function publishOrderEvent(orderId, eventType, payload) {
  const messageData = JSON.stringify({
    orderId,
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  });

  try {
    const messageId = await topic.publishMessage({
      data: Buffer.from(messageData),
      orderingKey: orderId,
    });
    return messageId;
  } catch (error) {
    console.error(`Publish failed for ordering key ${orderId}:`, error.message);

    // Resume publishing for this ordering key after a failure
    // Without this, all future publishes with this key will fail
    topic.resumePublishing(orderId);

    // Retry the publish
    try {
      const messageId = await topic.publishMessage({
        data: Buffer.from(messageData),
        orderingKey: orderId,
      });
      console.log(`Retry succeeded: ${messageId}`);
      return messageId;
    } catch (retryError) {
      console.error('Retry also failed:', retryError.message);
      topic.resumePublishing(orderId);
      throw retryError;
    }
  }
}
```

## Batching Configuration for Ordered Messages

Pub/Sub batches messages for efficiency. With ordering keys, batching interacts with ordering in important ways. Messages in the same batch with the same ordering key will maintain their order.

```javascript
// Configure batching for better throughput while maintaining order
const topic = pubsub.topic('order-events', {
  enableMessageOrdering: true,
  messageOrdering: true,
  batching: {
    maxMessages: 100,         // Batch up to 100 messages
    maxMilliseconds: 10,      // Or flush every 10ms, whichever comes first
    maxBytes: 1024 * 1024,    // Or when batch reaches 1MB
  },
});
```

For low-latency use cases, reduce `maxMilliseconds`. For high-throughput scenarios, increase `maxMessages` and `maxBytes`.

## Publishing Multiple Events in Sequence

When you need to publish a sequence of events for the same entity, just use the same ordering key.

```javascript
// Publish a sequence of order lifecycle events
app.post('/orders', async (req, res) => {
  const orderId = `ORD-${Date.now()}`;
  const { items, customer } = req.body;

  try {
    // These will be delivered in exactly this order
    // because they share the same ordering key
    await publishOrderEvent(orderId, 'order.created', {
      items,
      customer,
    });

    await publishOrderEvent(orderId, 'order.payment_initiated', {
      amount: items.reduce((sum, item) => sum + item.price, 0),
    });

    await publishOrderEvent(orderId, 'order.confirmed', {
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ orderId, status: 'created' });
  } catch (error) {
    console.error('Failed to publish order events:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});
```

## Choosing Good Ordering Keys

The choice of ordering key directly affects both correctness and performance. Here are some guidelines:

- Use the entity ID that needs ordering (order ID, user ID, device ID)
- Avoid using a single ordering key for all messages - this eliminates parallelism
- Avoid too many unique ordering keys if most keys only have one message - the overhead is not worth it
- Keep ordering keys reasonably short - they count toward the message size

```javascript
// Good: order-level ordering for order events
orderingKey: orderId  // "ORD-12345"

// Good: user-level ordering for user activity
orderingKey: userId   // "user-789"

// Bad: global ordering kills parallelism
orderingKey: "global"  // Don't do this

// Bad: too granular, no benefit
orderingKey: `${orderId}-${eventId}`  // Unique per message defeats the purpose
```

## Testing Locally

You can test your application with curl.

```bash
# Publish a series of events for the same order
curl -X POST http://localhost:3000/orders/ORD-001/events \
  -H "Content-Type: application/json" \
  -d '{"eventType": "order.created", "payload": {"items": ["item-1"]}}'

curl -X POST http://localhost:3000/orders/ORD-001/events \
  -H "Content-Type: application/json" \
  -d '{"eventType": "order.shipped", "payload": {"carrier": "FedEx"}}'

curl -X POST http://localhost:3000/orders/ORD-001/events \
  -H "Content-Type: application/json" \
  -d '{"eventType": "order.delivered", "payload": {}}'
```

All three events for ORD-001 will arrive at the subscriber in exactly the order they were published.

Ordered messaging in Pub/Sub is a powerful feature when you need it, but it does come with trade-offs in throughput and complexity around failure handling. Use it when ordering matters for your use case, choose your ordering keys carefully, and always handle the resume-after-failure pattern in your publisher code.
