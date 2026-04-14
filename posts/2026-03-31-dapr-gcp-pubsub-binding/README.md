# How to Use Dapr GCP Pub/Sub Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Pub/Sub, Binding, Message Queue

Description: Learn how to configure and use the Dapr GCP Pub/Sub binding as an input trigger and output producer for event-driven microservices on Google Cloud Platform.

---

## What Is the Dapr GCP Pub/Sub Binding?

Google Cloud Pub/Sub is a managed messaging service that supports both push and pull message delivery. The Dapr GCP Pub/Sub binding allows microservices to publish messages to topics and consume messages from subscriptions without managing the GCP client library directly.

Note: While Dapr also has a GCP Pub/Sub pub/sub component (for the Dapr Pub/Sub API), the GCP Pub/Sub binding specifically uses the Dapr Binding API and is suitable for simpler point-to-point integration scenarios.

## Setting Up GCP Pub/Sub

```bash
# Create a topic
gcloud pubsub topics create order-events

# Create a subscription
gcloud pubsub subscriptions create order-processor-sub \
  --topic=order-events \
  --ack-deadline=60 \
  --message-retention-duration=7d
```

## Configuring the Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-events
  namespace: default
spec:
  type: bindings.gcp.pubsub
  version: v1
  metadata:
    - name: topic
      value: "order-events"
    - name: subscription
      value: "order-processor-sub"
    - name: type
      value: "service_account"
    - name: project_id
      value: "my-gcp-project"
    - name: private_key_id
      secretKeyRef:
        name: gcp-secrets
        key: privateKeyId
    - name: private_key
      secretKeyRef:
        name: gcp-secrets
        key: privateKey
    - name: client_email
      value: "dapr-binding@my-gcp-project.iam.gserviceaccount.com"
    - name: client_id
      value: "123456789012345678901"
    - name: auth_uri
      value: "https://accounts.google.com/o/oauth2/auth"
    - name: token_uri
      value: "https://oauth2.googleapis.com/token"
```

Store the service account key in Kubernetes:

```bash
kubectl create secret generic gcp-secrets \
  --from-literal=privateKeyId=<key-id> \
  --from-literal=privateKey="-----BEGIN RSA PRIVATE KEY-----\n..."
```

## Publishing Messages to Pub/Sub

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function publishOrderEvent(order, eventType) {
  await client.binding.send("order-events", "create", {
    eventId: `${order.orderId}-${eventType}-${Date.now()}`,
    eventType,
    orderId: order.orderId,
    customerId: order.customerId,
    data: order,
    publishedAt: new Date().toISOString(),
  });

  console.log(`Published ${eventType} for order ${order.orderId}`);
}

await publishOrderEvent({ orderId: "ORD-001", customerId: "CUST-42", amount: 99.99 }, "order.placed");
await publishOrderEvent({ orderId: "ORD-001" }, "order.shipped");
```

## Consuming Messages from Pub/Sub

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/order-events", async (req, res) => {
  // Dapr delivers the decoded message data directly in req.body
  const message = req.body;

  console.log(`Processing ${message.eventType} for order ${message.orderId}`);

  try {
    await handleEvent(message);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Processing error:", err);
    res.status(500).send(err.message);
  }
});

async function handleEvent(event) {
  switch (event.eventType) {
    case "order.placed":
      await processNewOrder(event.data);
      break;
    case "order.shipped":
      await notifyCustomer(event.orderId);
      break;
  }
}

app.listen(3000);
```

## Setting Message Attributes

GCP Pub/Sub supports message attributes for subscription-level filtering. Note that the Dapr GCP Pub/Sub binding does not currently forward request metadata as Pub/Sub message attributes. To use attribute-based filtering, publish messages with attributes using the GCP client library directly or the `gcloud` CLI, and create a filtered subscription:

```bash
# Publish a message with attributes using gcloud
gcloud pubsub topics publish order-events \
  --message='{"orderId":"ORD-001"}' \
  --attribute=priority=high,region=us-west1

# Create a subscription with attribute filter
gcloud pubsub subscriptions create high-priority-sub \
  --topic=order-events \
  --message-filter='attributes.priority = "high"'
```

## Summary

The Dapr GCP Pub/Sub binding provides a straightforward way to publish and consume messages from Google Cloud Pub/Sub without the GCP client library. Configure the binding with your service account credentials, use the `create` operation to publish, and implement an HTTP endpoint to consume messages. For advanced use cases like attribute-based subscription filtering, you can complement the Dapr binding with direct GCP Pub/Sub CLI or client library calls.
