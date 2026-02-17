# How to Build a Pub/Sub Push Subscription Handler in an Express.js Application on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Express, Cloud Run, Node.js, Messaging, Google Cloud

Description: Build a Pub/Sub push subscription handler in Express.js on Cloud Run that reliably processes messages with proper acknowledgment and error handling.

---

Google Cloud Pub/Sub supports two delivery modes: pull (where your application polls for messages) and push (where Pub/Sub sends messages to your HTTP endpoint). Push subscriptions are a natural fit for Cloud Run because Cloud Run already provides an HTTP endpoint, and Pub/Sub triggers requests just like any other client would.

The beauty of this setup is that Cloud Run scales to zero when there are no messages and scales up automatically when message volume increases. You do not need to manage a persistent process that polls for messages. In this post, I will show you how to build a robust Pub/Sub push handler with Express.js on Cloud Run.

## How Push Subscriptions Work

When a message is published to a Pub/Sub topic, the push subscription delivers it as an HTTP POST request to your endpoint. The request body contains the message data (base64-encoded), message attributes, and metadata. Your endpoint must respond with a 2xx status code to acknowledge the message. Any other status code (or a timeout) causes Pub/Sub to retry the delivery.

## Setting Up the Topic and Subscription

```bash
# Create a topic
gcloud pubsub topics create order-events

# Create a push subscription pointing to your Cloud Run service
gcloud pubsub subscriptions create order-events-push \
  --topic=order-events \
  --push-endpoint=https://your-service-url.run.app/pubsub/order-events \
  --ack-deadline=60 \
  --min-retry-delay=10s \
  --max-retry-delay=600s
```

You can update the push endpoint later after deploying your service.

## Basic Push Handler

```javascript
// app.js - Express application with Pub/Sub push handler
const express = require('express');

const app = express();
// Pub/Sub sends JSON payloads
app.use(express.json());

// Pub/Sub push handler
app.post('/pubsub/order-events', async (req, res) => {
  // Validate the request format
  if (!req.body || !req.body.message) {
    console.error('Invalid Pub/Sub message format');
    // Return 400 to tell Pub/Sub not to retry invalid messages
    return res.status(400).json({ error: 'Invalid message format' });
  }

  const pubsubMessage = req.body.message;

  // Decode the base64-encoded message data
  let messageData;
  try {
    const rawData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
    messageData = JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to parse message data:', error);
    // Bad message format - acknowledge to prevent infinite retries
    return res.status(200).json({ status: 'skipped', reason: 'unparseable' });
  }

  // Extract message metadata
  const messageId = pubsubMessage.messageId;
  const publishTime = pubsubMessage.publishTime;
  const attributes = pubsubMessage.attributes || {};

  console.log(`Processing message ${messageId}:`, messageData);

  try {
    // Process the message
    await processOrderEvent(messageData, attributes);

    // Return 200 to acknowledge the message
    res.status(200).json({ status: 'processed', messageId });
  } catch (error) {
    console.error(`Failed to process message ${messageId}:`, error);

    // Return 500 to trigger a retry
    res.status(500).json({ status: 'error', messageId });
  }
});

async function processOrderEvent(data, attributes) {
  const { orderId, eventType, payload } = data;

  switch (eventType) {
    case 'order.created':
      console.log(`New order created: ${orderId}`);
      await handleOrderCreated(orderId, payload);
      break;
    case 'order.shipped':
      console.log(`Order shipped: ${orderId}`);
      await sendShippingNotification(orderId, payload);
      break;
    case 'order.delivered':
      console.log(`Order delivered: ${orderId}`);
      await handleOrderDelivered(orderId, payload);
      break;
    default:
      console.log(`Unknown event type: ${eventType}`);
  }
}
```

## Verifying Pub/Sub Messages

In production, you should verify that push requests actually come from Pub/Sub and not from random clients.

```javascript
// middleware/verify-pubsub.js - Verify Pub/Sub push requests
const { OAuth2Client } = require('google-auth-library');

const authClient = new OAuth2Client();

// Middleware to verify Pub/Sub push authentication
async function verifyPubSubToken(req, res, next) {
  // Check for the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Missing or invalid authorization header');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Verify the OIDC token
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.SERVICE_URL,
    });

    const payload = ticket.getPayload();

    // Verify the token is from a Google service account
    if (!payload.email.endsWith('.iam.gserviceaccount.com')) {
      console.warn('Token not from a service account:', payload.email);
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.pubsubAuth = payload;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}

module.exports = { verifyPubSubToken };
```

You will need to install the auth library and configure the subscription with authentication.

```bash
# Install the auth library
npm install google-auth-library

# Update the subscription with OIDC authentication
gcloud pubsub subscriptions update order-events-push \
  --push-auth-service-account=your-sa@your-project.iam.gserviceaccount.com \
  --push-auth-token-audience=https://your-service-url.run.app
```

## Idempotent Message Processing

Pub/Sub guarantees at-least-once delivery, which means your handler might receive the same message multiple times. Make your processing idempotent.

```javascript
// Idempotent processing using message deduplication
const processedMessages = new Map();
const DEDUP_WINDOW = 10 * 60 * 1000; // 10 minutes

app.post('/pubsub/order-events', async (req, res) => {
  const message = req.body.message;
  const messageId = message.messageId;

  // Check if we have already processed this message
  if (processedMessages.has(messageId)) {
    console.log(`Duplicate message ${messageId}, skipping`);
    return res.status(200).json({ status: 'duplicate' });
  }

  const data = JSON.parse(
    Buffer.from(message.data, 'base64').toString('utf-8')
  );

  try {
    await processOrderEvent(data, message.attributes);

    // Record that we processed this message
    processedMessages.set(messageId, Date.now());

    // Clean up old entries
    for (const [id, timestamp] of processedMessages) {
      if (Date.now() - timestamp > DEDUP_WINDOW) {
        processedMessages.delete(id);
      }
    }

    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error(`Processing failed for ${messageId}:`, error);
    res.status(500).json({ status: 'error' });
  }
});
```

For production systems, use a database or Redis instead of an in-memory map for deduplication, since Cloud Run instances can be replaced at any time.

## Handling Multiple Topics

You can handle push subscriptions from multiple topics in the same service.

```javascript
// Route different topics to different handlers
app.post('/pubsub/order-events', handleOrderEvents);
app.post('/pubsub/user-events', handleUserEvents);
app.post('/pubsub/inventory-updates', handleInventoryUpdates);

async function handleOrderEvents(req, res) {
  const data = parseMessage(req);
  if (!data) return res.status(200).json({ status: 'skipped' });

  // Process order events
  await processOrder(data);
  res.status(200).json({ status: 'processed' });
}

async function handleUserEvents(req, res) {
  const data = parseMessage(req);
  if (!data) return res.status(200).json({ status: 'skipped' });

  // Process user events
  await processUserEvent(data);
  res.status(200).json({ status: 'processed' });
}

// Shared message parsing helper
function parseMessage(req) {
  try {
    const raw = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse message:', error);
    return null;
  }
}
```

## Dead Letter Handling

Configure a dead letter topic to capture messages that fail after maximum retries.

```bash
# Create a dead letter topic
gcloud pubsub topics create order-events-dlq

# Create a subscription for the dead letter topic
gcloud pubsub subscriptions create order-events-dlq-sub \
  --topic=order-events-dlq

# Update the original subscription with dead letter configuration
gcloud pubsub subscriptions update order-events-push \
  --dead-letter-topic=order-events-dlq \
  --max-delivery-attempts=10
```

You can then process dead letter messages separately or alert on them.

```javascript
// Dead letter handler - log and alert on failed messages
app.post('/pubsub/dead-letters', async (req, res) => {
  const message = req.body.message;
  const data = Buffer.from(message.data, 'base64').toString('utf-8');

  console.error('Dead letter received:', {
    messageId: message.messageId,
    attributes: message.attributes,
    data: data,
    deliveryAttempt: message.attributes?.['CloudPubSubDeadLetterSourceDeliveryCount'],
  });

  // Send alert to your monitoring system
  await sendAlert('Pub/Sub message failed permanently', { messageId: message.messageId });

  // Acknowledge so the dead letter does not loop
  res.status(200).json({ status: 'logged' });
});
```

## Deploying to Cloud Run

```bash
# Deploy the service
gcloud run deploy pubsub-handler \
  --source . \
  --region us-central1 \
  --platform managed \
  --no-allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 50

# Update the push subscription with the service URL
SERVICE_URL=$(gcloud run services describe pubsub-handler --region us-central1 --format='value(status.url)')

gcloud pubsub subscriptions update order-events-push \
  --push-endpoint="${SERVICE_URL}/pubsub/order-events"
```

## Starting the Server

```javascript
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Pub/Sub handler running on port ${PORT}`);
});
```

Pub/Sub push subscriptions with Cloud Run give you event-driven processing that scales automatically. Messages arrive as HTTP requests, so you use the same Express.js patterns you already know. The key things to remember are: always make your handlers idempotent, return appropriate status codes to control retry behavior, verify the push authentication token in production, and set up dead letter topics for messages that cannot be processed.
