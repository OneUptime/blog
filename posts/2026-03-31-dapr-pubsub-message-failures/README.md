# How to Handle Message Processing Failures in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Error Handling, Retry, Dead Letter

Description: Learn how to handle message processing failures in Dapr pub/sub using retry policies, status codes, and dead letter topics to build resilient event-driven systems.

---

## How Dapr Handles Message Delivery Failures

When a Dapr subscriber fails to process a message, the sidecar's behavior depends on the HTTP status code returned by the handler:

- `200` or `204`: Message processed successfully, acknowledge and remove.
- `404`: Message is dropped (logged as error, not retried).
- Other non-success status codes (e.g., `500`): Retry the message according to the resiliency policy.
- `200` with body `{"status": "RETRY"}`: Explicit retry request.
- `200` with body `{"status": "DROP"}`: Discard the message without retry.

## Returning Correct Status Codes

Your handler should return meaningful status codes:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/handlers/orders", async (req, res) => {
  const { data } = req.body;

  try {
    await processOrder(data);
    // Success - acknowledge
    res.sendStatus(200);
  } catch (err) {
    if (err.isTransient) {
      // Tell Dapr to retry
      res.status(500).send();
    } else {
      // Permanent failure - drop the message
      res.json({ status: "DROP" });
    }
  }
});
```

## Configuring Retry Policies with Resiliency

Define a `Resiliency` resource to control retry behavior:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: pubsub-resiliency
  namespace: production
spec:
  policies:
    retries:
      standard-retry:
        policy: exponential
        maxRetries: 5
        duration: 1s
        maxInterval: 30s
    timeouts:
      handler-timeout: 10s
  targets:
    components:
      pubsub:
        inbound:
          retry: standard-retry
          timeout: handler-timeout
```

Apply this resiliency policy to your cluster:

```bash
kubectl apply -f pubsub-resiliency.yaml
```

## Configuring Dead Letter Topics

Route messages that exhaust retries to a dead letter topic:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: production
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /handlers/orders
  deadLetterTopic: orders-deadletter
scopes:
- order-processor
```

## Processing the Dead Letter Queue

Subscribe to the dead letter topic in a separate service for inspection and manual replay:

```javascript
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders-deadletter",
      route: "/handlers/dead-letters",
    },
  ]);
});

app.post("/handlers/dead-letters", async (req, res) => {
  const failedMessage = req.body;
  console.error("Dead letter received:", JSON.stringify(failedMessage));

  // Store for investigation
  await saveToDatabase("dead_letters", {
    topic: "orders",
    payload: failedMessage.data,
    receivedAt: new Date().toISOString(),
  });

  res.sendStatus(200);
});
```

## Explicit DROP for Non-Retryable Errors

For validation errors or malformed payloads, drop the message explicitly to avoid retry loops:

```javascript
app.post("/handlers/orders", (req, res) => {
  const { data } = req.body;

  if (!data.orderId || !data.customerId) {
    console.warn("Malformed order message, dropping:", data);
    // Return 200 with DROP status to discard without retry
    return res.json({ status: "DROP" });
  }

  // Process valid order
  processOrder(data).then(() => res.sendStatus(200));
});
```

## Monitoring Failure Rates

Use Dapr metrics to track message failures in Prometheus/Grafana:

```promql
# Query for message ingress count by status
dapr_component_pubsub_ingress_count{status="success"}
dapr_component_pubsub_ingress_count{status="drop"}
dapr_component_pubsub_ingress_count{status="retry"}
```

## Summary

Handling message failures in Dapr pub/sub involves returning appropriate HTTP status codes from handlers, configuring exponential retry policies via `Resiliency` resources, routing exhausted-retry messages to dead letter topics, and explicitly dropping malformed messages with the `DROP` status. This layered approach builds resilient event-driven pipelines that gracefully handle both transient and permanent failures.
