# How to Implement At-Most-Once Delivery in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, At-Most-Once Delivery, Messaging, Microservice

Description: Learn how to configure Dapr pub/sub for at-most-once message delivery where messages are delivered zero or one times, trading durability for lower latency.

---

## What Is At-Most-Once Delivery?

At-most-once delivery is a messaging semantic where a message is delivered to the subscriber at most one time. If the delivery fails - due to a network error, handler crash, or timeout - the message is dropped and not retried. This avoids duplicate processing but risks message loss.

Use at-most-once when:
- Duplicate processing is worse than message loss (e.g., billing events)
- Data is ephemeral or self-healing (e.g., metrics samples, heartbeats)
- Latency matters more than guaranteed delivery (e.g., live sensor readings)

## Configuring At-Most-Once with Resiliency Policy

Disable retries in your Resiliency resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: at-most-once-resiliency
  namespace: production
spec:
  policies:
    retries:
      no-retry:
        policy: constant
        maxRetries: 0
        duration: 0s
    timeouts:
      fast-timeout: 5s
  targets:
    components:
      pubsub:
        inbound:
          retry: no-retry
          timeout: fast-timeout
```

With `maxRetries: 0`, Dapr will not redeliver a message if the handler fails or times out.

## Broker-Level At-Most-Once Settings

For certain brokers, you also need to configure delivery guarantees at the broker level.

For Kafka:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka-broker:9092
  - name: consumeRetryEnabled
    value: "false"
  - name: authType
    value: none
```

For RabbitMQ, set `autoAck` to acknowledge before processing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: amqp://rabbitmq:5672
  - name: autoAck
    value: "true"
```

With `autoAck: true`, RabbitMQ removes the message from the queue as soon as it is delivered to the consumer, regardless of whether processing succeeds.

## Handler Pattern for At-Most-Once

Since there are no retries, handlers should be fast and acknowledge quickly:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/handlers/metrics", (req, res) => {
  const { data } = req.body;

  // Acknowledge immediately - best effort
  res.sendStatus(200);

  // Process asynchronously after ack
  setImmediate(async () => {
    try {
      await writeMetricToTimeSeries(data);
    } catch (err) {
      // Log but do not retry - this is expected under at-most-once
      console.warn(`Metric dropped due to processing error: ${err.message}`);
    }
  });
});
```

## Publisher-Side: Fire and Forget

Publishers in at-most-once systems typically do not need delivery confirmation:

```javascript
async function publishMetric(metric) {
  try {
    await client.pubsub.publish("pubsub", "metrics", metric);
  } catch (err) {
    // Log and continue - metric loss is acceptable
    console.warn(`Metric publish failed (at-most-once): ${err.message}`);
  }
}
```

## Choosing Between At-Least-Once and At-Most-Once

| Property | At-Least-Once | At-Most-Once |
|---|---|---|
| Message loss risk | None | Possible |
| Duplicate risk | Possible | None |
| Retry overhead | Yes | None |
| Idempotency required | Yes | No |
| Best for | Orders, payments | Metrics, heartbeats |

## Summary

At-most-once delivery in Dapr is configured by setting `maxRetries: 0` in your Resiliency policy and optionally enabling broker-level auto-ack. This eliminates retry overhead and duplicate processing at the cost of possible message loss. It is well-suited for high-frequency, ephemeral data where a dropped message is preferable to processing the same event twice.
