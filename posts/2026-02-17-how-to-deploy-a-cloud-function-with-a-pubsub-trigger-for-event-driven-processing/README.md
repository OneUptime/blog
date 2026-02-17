# How to Deploy a Cloud Function with a Pub/Sub Trigger for Event-Driven Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Pub/Sub, Event-Driven, Serverless

Description: A hands-on guide to deploying Google Cloud Functions with Pub/Sub triggers for building reliable event-driven processing pipelines on GCP.

---

Pub/Sub triggered Cloud Functions are the backbone of event-driven architectures on Google Cloud. Instead of building always-running services that poll for messages, you write a function, attach it to a topic, and Google handles the rest - scaling, retries, and infrastructure. I have used this pattern for everything from processing user signups to transforming data streams to sending notifications.

Let me walk through the full setup, from creating the topic to deploying the function to handling edge cases in production.

## Setting Up the Pub/Sub Topic

First, create the Pub/Sub topic that your function will subscribe to:

```bash
# Create a Pub/Sub topic
gcloud pubsub topics create user-events

# Verify it was created
gcloud pubsub topics list
```

If you want a dead letter topic for failed messages (which you should for production), create that too:

```bash
# Create a dead letter topic for failed messages
gcloud pubsub topics create user-events-dead-letter
```

## Writing the Cloud Function

Here is a Gen 2 Cloud Function that processes Pub/Sub messages. This example handles user signup events:

```javascript
// index.js - Pub/Sub triggered function for processing user events
const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore();

functions.cloudEvent('processUserEvent', async (cloudEvent) => {
  // Extract the Pub/Sub message from the CloudEvent
  const message = cloudEvent.data.message;

  // Decode the base64-encoded message data
  const rawData = Buffer.from(message.data, 'base64').toString('utf-8');
  console.log(`Received message: ${rawData}`);

  // Parse the JSON payload
  let payload;
  try {
    payload = JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to parse message JSON:', error);
    // Do not retry for invalid JSON - it will never succeed
    return;
  }

  // Access message attributes (metadata set by the publisher)
  const attributes = message.attributes || {};
  const eventType = attributes.eventType;
  const source = attributes.source;

  console.log(`Event type: ${eventType}, Source: ${source}`);
  console.log(`Message ID: ${message.messageId}`);

  // Route based on event type
  switch (eventType) {
    case 'user.signup':
      await handleUserSignup(payload);
      break;
    case 'user.updated':
      await handleUserUpdate(payload);
      break;
    case 'user.deleted':
      await handleUserDeletion(payload);
      break;
    default:
      console.log(`Unknown event type: ${eventType}, skipping`);
  }
});

async function handleUserSignup(userData) {
  console.log(`Processing signup for user: ${userData.email}`);

  // Store user analytics data
  await firestore.collection('user-analytics').add({
    userId: userData.userId,
    email: userData.email,
    signupTimestamp: new Date(),
    source: userData.source || 'unknown',
    processed: true
  });

  console.log('User signup event processed successfully');
}

async function handleUserUpdate(userData) {
  console.log(`Processing update for user: ${userData.userId}`);
  // Update logic here
}

async function handleUserDeletion(userData) {
  console.log(`Processing deletion for user: ${userData.userId}`);
  // Cleanup logic here
}
```

And the package.json:

```json
{
  "name": "pubsub-user-events",
  "version": "1.0.0",
  "dependencies": {
    "@google-cloud/functions-framework": "^3.0.0",
    "@google-cloud/firestore": "^7.0.0"
  }
}
```

## Deploying the Function

Deploy with the Pub/Sub trigger:

```bash
# Deploy the function with a Pub/Sub trigger
gcloud functions deploy process-user-events \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=processUserEvent \
  --trigger-topic=user-events \
  --memory=256Mi \
  --timeout=120s \
  --min-instances=0 \
  --max-instances=50
```

The `--trigger-topic` flag tells Google Cloud to create an Eventarc trigger that routes messages from the `user-events` topic to your function.

## Publishing Messages

Now you can publish messages to the topic and watch your function process them:

```bash
# Publish a message with attributes
gcloud pubsub topics publish user-events \
  --message='{"userId": "u123", "email": "user@example.com", "source": "web"}' \
  --attribute=eventType=user.signup,source=registration-service
```

From application code (Node.js):

```javascript
// publisher.js - Publishing messages to Pub/Sub from your application
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

async function publishUserEvent(eventType, userData) {
  const topic = pubsub.topic('user-events');

  // Create the message with data and attributes
  const messageBuffer = Buffer.from(JSON.stringify(userData));

  const messageId = await topic.publishMessage({
    data: messageBuffer,
    attributes: {
      eventType: eventType,
      source: 'api-server',
      timestamp: new Date().toISOString()
    }
  });

  console.log(`Published message ${messageId} for event ${eventType}`);
  return messageId;
}

// Usage
await publishUserEvent('user.signup', {
  userId: 'u456',
  email: 'newuser@example.com',
  name: 'Jane Smith'
});
```

## Understanding Delivery Guarantees

Pub/Sub provides at-least-once delivery. This means your function might receive the same message more than once. You must design your function to handle duplicates gracefully.

```javascript
// Idempotent message processing using message ID as dedup key
const processedMessages = new Set(); // In production, use Firestore or Redis

functions.cloudEvent('processEvent', async (cloudEvent) => {
  const messageId = cloudEvent.data.message.messageId;

  // Check if we already processed this message
  // In production, check against a persistent store like Firestore
  const docRef = firestore.collection('processed-messages').doc(messageId);
  const doc = await docRef.get();

  if (doc.exists) {
    console.log(`Message ${messageId} already processed, skipping`);
    return;
  }

  // Process the message
  const data = JSON.parse(
    Buffer.from(cloudEvent.data.message.data, 'base64').toString()
  );
  await processData(data);

  // Mark as processed
  await docRef.set({
    processedAt: new Date(),
    status: 'completed'
  });
});
```

## Configuring Retries

When your function throws an error or returns a rejected promise, Cloud Functions will retry the message delivery. For Gen 2 functions, the retry behavior is controlled by the underlying Pub/Sub subscription.

```bash
# View the subscription created by the trigger
gcloud pubsub subscriptions list --filter="topic=user-events"

# Configure retry policy on the subscription
gcloud pubsub subscriptions update eventarc-us-central1-process-user-events-sub-123 \
  --min-retry-delay=10s \
  --max-retry-delay=600s
```

The retry policy uses exponential backoff. Starting from the minimum delay, each retry doubles the wait time up to the maximum delay.

## Setting Up Dead Letter Topics

For messages that repeatedly fail processing, configure a dead letter topic to catch them instead of retrying forever:

```bash
# Update the subscription with dead letter configuration
gcloud pubsub subscriptions update eventarc-us-central1-process-user-events-sub-123 \
  --dead-letter-topic=user-events-dead-letter \
  --max-delivery-attempts=5
```

After 5 failed delivery attempts, the message moves to the dead letter topic instead of being retried again. Create a separate function to monitor or process dead letter messages:

```javascript
// dead-letter-handler.js - Process messages that failed multiple times
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('handleDeadLetter', async (cloudEvent) => {
  const message = cloudEvent.data.message;
  const data = Buffer.from(message.data, 'base64').toString();

  // Log the failed message for investigation
  console.error('Dead letter message received:', {
    messageId: message.messageId,
    data: data,
    attributes: message.attributes,
    deliveryAttempt: cloudEvent.data.deliveryAttempt
  });

  // Optionally store in a database for manual review
  // Or send an alert to your team
});
```

## Python Example

Here is the same pattern in Python:

```python
# main.py - Pub/Sub triggered Cloud Function in Python
import functions_framework
import base64
import json
from google.cloud import firestore

db = firestore.Client()

@functions_framework.cloud_event
def process_user_event(cloud_event):
    """Process a Pub/Sub message about user events."""
    # Decode the Pub/Sub message
    message_data = base64.b64decode(
        cloud_event.data["message"]["data"]
    ).decode("utf-8")

    payload = json.loads(message_data)
    attributes = cloud_event.data["message"].get("attributes", {})

    event_type = attributes.get("eventType", "unknown")
    print(f"Processing {event_type} event: {payload}")

    # Process based on event type
    if event_type == "user.signup":
        handle_signup(payload)
    elif event_type == "user.updated":
        handle_update(payload)

def handle_signup(user_data):
    """Handle a new user signup."""
    db.collection("user-analytics").add({
        "userId": user_data["userId"],
        "email": user_data["email"],
        "processed": True
    })
    print(f"Processed signup for {user_data['email']}")

def handle_update(user_data):
    """Handle a user profile update."""
    print(f"Processed update for {user_data['userId']}")
```

## Message Ordering

If your events need to be processed in order, enable message ordering on the topic:

```bash
# Enable message ordering on the topic
gcloud pubsub topics update user-events --message-ordering
```

When publishing, provide an ordering key:

```javascript
// Publish with an ordering key to ensure per-user message ordering
const topic = pubsub.topic('user-events', {
  enableMessageOrdering: true
});

await topic.publishMessage({
  data: Buffer.from(JSON.stringify(userData)),
  orderingKey: userData.userId, // Messages with same key are delivered in order
  attributes: { eventType: 'user.updated' }
});
```

## Monitoring Your Pub/Sub Function

Keep an eye on your function's processing metrics. Key things to watch include message processing latency, error rates, and the number of unacknowledged messages (backlog). Use OneUptime to set up alerts on these metrics so you know immediately when your event processing pipeline falls behind or starts failing. A growing Pub/Sub backlog usually means your function is either erroring out or not scaling fast enough for the incoming message rate.

Event-driven architectures with Pub/Sub and Cloud Functions are powerful, but they need proper monitoring and error handling to be reliable in production. Invest in dead letter topics, idempotent processing, and observability from day one.
