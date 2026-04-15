# How to Implement At-Least-Once Delivery in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, At-Least-Once Delivery, Idempotency, Microservice

Description: Learn how Dapr pub/sub guarantees at-least-once delivery and how to write idempotent message handlers to safely process duplicate messages.

---

## What Is At-Least-Once Delivery?

At-least-once delivery is a messaging guarantee where every message is delivered to the subscriber one or more times. The broker retries unacknowledged messages until the subscriber confirms receipt. This prevents message loss but means your handler may process the same message more than once - so idempotency is required.

Dapr pub/sub uses at-least-once delivery by default for most supported brokers.

## How Dapr Ensures At-Least-Once Delivery

Dapr's sidecar delivers a message to your app's handler and waits for an acknowledgment (HTTP 200/204). If the sidecar does not receive an ack within the timeout, or receives a 5xx error, it marks the message for redelivery. The broker (e.g., Kafka, RabbitMQ, Azure Service Bus) then re-delivers the message.

Your handler must be idempotent - applying the same operation twice must have the same effect as applying it once.

## Writing an Idempotent Handler

Use the message ID (from the CloudEvent `id` field) to track processed messages:

```javascript
const express = require("express");
const { DaprClient } = require("@dapr/dapr");
const app = express();
app.use(express.json());
const client = new DaprClient();

const PROCESSED_KEY_TTL = 86400; // 24 hours in seconds

app.post("/handlers/orders", async (req, res) => {
  const eventId = req.body.id;
  const data = req.body.data;

  // Check if already processed
  const alreadyProcessed = await client.state.get(
    "statestore",
    `processed:${eventId}`
  );

  if (alreadyProcessed) {
    console.log(`Duplicate message detected, skipping: ${eventId}`);
    return res.sendStatus(200); // Still ack to prevent redelivery
  }

  // Process the order
  await fulfillOrder(data);

  // Mark as processed with TTL
  await client.state.save("statestore", [
    {
      key: `processed:${eventId}`,
      value: { processedAt: new Date().toISOString() },
      metadata: { ttlInSeconds: String(PROCESSED_KEY_TTL) },
    },
  ]);

  console.log(`Order processed: ${data.orderId}`);
  res.sendStatus(200);
});
```

## Using Database Upserts for Idempotency

For database-backed workflows, use upsert semantics:

```javascript
async function fulfillOrder(order) {
  // INSERT ... ON CONFLICT DO NOTHING ensures idempotency at the DB level
  await db.query(
    `INSERT INTO fulfilled_orders (order_id, customer_id, fulfilled_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (order_id) DO NOTHING`,
    [order.orderId, order.customerId]
  );
}
```

## Configuring Retry Policy to Support At-Least-Once

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: at-least-once-resiliency
spec:
  policies:
    retries:
      at-least-once-retry:
        policy: exponential
        maxRetries: -1  # Unlimited retries (until dead letter limit)
        duration: 2s
        maxInterval: 60s
  targets:
    components:
      pubsub:
        inbound:
          retry: at-least-once-retry
          timeout: 15s
```

Setting `maxRetries: -1` means Dapr retries indefinitely until success or the broker's own delivery limit kicks in.

## Publisher-Side: Include Idempotency Keys

Publishers should include a stable, unique ID in every message:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

async function publishOrder(order) {
  const messageId = `order-${order.orderId}`;

  await client.pubsub.publish("pubsub", "orders", order, {
    metadata: { "cloudevent.id": messageId },
  });
}
```

## Testing Duplicate Handling

Simulate duplicate delivery by publishing the same event ID twice:

```bash
EVENT_ID="test-$(date +%s)"

curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/cloudevents+json" \
  -d "{\"specversion\":\"1.0\",\"id\":\"$EVENT_ID\",\"type\":\"OrderPlaced\",\"source\":\"test\",\"data\":{\"orderId\":\"ord-dupe-test\"}}"

# Send again immediately
curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/cloudevents+json" \
  -d "{\"specversion\":\"1.0\",\"id\":\"$EVENT_ID\",\"type\":\"OrderPlaced\",\"source\":\"test\",\"data\":{\"orderId\":\"ord-dupe-test\"}}"
```

The second delivery should be skipped by your idempotency check.

## Summary

Dapr pub/sub provides at-least-once delivery by retrying unacknowledged messages. To safely handle this, write idempotent handlers that use the CloudEvent `id` to detect and skip duplicate messages - using a state store or database upsert for deduplication tracking. Configure generous retry policies and set TTLs on processed-message keys to bound storage growth.
