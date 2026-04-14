# How to Use Dapr with GCP Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Pub/Sub, Messaging, Microservice

Description: Configure Dapr's pub/sub building block with Google Cloud Pub/Sub to enable reliable asynchronous messaging between microservices on GCP.

---

## Overview

Google Cloud Pub/Sub is a managed messaging service ideal for decoupled microservice communication. Dapr's pub/sub API abstracts Pub/Sub behind a consistent interface, letting you switch messaging backends without changing application code.

## Prerequisites

- GCP project with Pub/Sub API enabled
- Dapr installed on Kubernetes or locally
- Appropriate IAM permissions (`roles/pubsub.editor`)

## Creating GCP Pub/Sub Topics

```bash
# Create a topic
gcloud pubsub topics create orders

# Create a subscription
gcloud pubsub subscriptions create orders-sub \
  --topic=orders \
  --ack-deadline=60
```

## Configuring the Dapr Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: projectId
    value: "my-gcp-project"
  - name: maxConcurrentConnections
    value: "10"
  - name: maxOutstandingMessages
    value: "100"
  - name: enableMessageOrdering
    value: "false"
```

## Publishing Messages

Use Dapr's publish API to send messages:

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "1001", "product": "widget", "quantity": 2}'
```

Or from a Python application:

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    resp = client.publish_event(
        pubsub_name="pubsub",
        topic_name="orders",
        data=json.dumps({"orderId": "1001", "product": "widget"}),
        data_content_type="application/json"
    )
    print(f"Published event: {resp}")
```

## Subscribing to Messages

Register a subscription via the Dapr subscriptions API:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
```

Implement the subscriber endpoint:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/orders", (req, res) => {
  const order = req.body;
  console.log(`Processing order: ${order.orderId}`);
  // Process the order...
  res.status(200).send();
});

app.listen(3000);
```

## Dead Letter Handling

Configure dead letter topics for failed messages:

```yaml
  metadata:
  - name: deadLetterTopic
    value: "orders-dlq"
  - name: maxDeliveryAttempts
    value: "5"
```

## Message Ordering

For ordered message delivery, enable ordering in both the component and topic:

```bash
gcloud pubsub topics create ordered-events \
  --message-retention-duration=1d
```

```yaml
  - name: enableMessageOrdering
    value: "true"
  - name: orderingKey
    value: "customerId"
```

## Summary

Dapr's GCP Pub/Sub component provides a clean abstraction over Google Cloud Pub/Sub, enabling reliable asynchronous messaging with features like dead lettering, message ordering, and flow control. Your microservices publish and subscribe using the Dapr API, making the underlying messaging infrastructure swappable without code changes.
