# How to Apply Resiliency Policies to Pub/Sub in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Pub/Sub, Retry, Message Delivery

Description: Learn how to apply Dapr resiliency policies to pub/sub message delivery to automatically retry failed message processing and prevent message loss.

---

## Overview

Pub/sub message delivery in Dapr can fail when the subscribing service is temporarily unavailable, overloaded, or returns a non-200 status. Without resiliency policies, Dapr uses the broker's default delivery behavior (often limited retries or dead-lettering). By defining resiliency policies for pub/sub components, you get fine-grained control over retry behavior during message delivery.

## How Pub/Sub Resiliency Works

Resiliency policies apply to pub/sub at two points:
- **Outbound**: When your app publishes a message to the broker
- **Inbound**: When Dapr delivers a message from the broker to your app

Inbound resiliency is particularly important because it determines what happens when your message handler returns an error or non-success status code.

## Configuring Pub/Sub Resiliency

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: pubsub-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      messageTimeout: 30s
      publishTimeout: 5s
    retries:
      messageRetry:
        policy: exponential
        initialInterval: 1s
        multiplier: 2.0
        maxInterval: 60s
        maxRetries: 10
        randomizationFactor: 0.5
      publishRetry:
        policy: constant
        duration: 500ms
        maxRetries: 3
    circuitBreakers:
      brokerCB:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    components:
      orders-kafka:
        outbound:
          timeout: publishTimeout
          retry: publishRetry
          circuitBreaker: brokerCB
        inbound:
          timeout: messageTimeout
          retry: messageRetry
```

## Subscribing with Error Handling

When message handling fails, return a non-success status to trigger retries:

```javascript
const express = require('express');
const app = express();

app.post('/orders', async (req, res) => {
  try {
    await processOrder(req.body);
    res.status(200).send({ status: 'SUCCESS' });
  } catch (err) {
    if (isTransient(err)) {
      // Tell Dapr to retry this message
      res.status(200).send({ status: 'RETRY' });
    } else {
      // Tell Dapr to drop this message (dead-letter it)
      res.status(200).send({ status: 'DROP' });
    }
  }
});
```

In Go:

```go
func ordersHandler(w http.ResponseWriter, r *http.Request) {
    err := processOrder(r.Body)
    if err != nil {
        // Non-200 triggers Dapr retry
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    w.WriteHeader(http.StatusOK)
}
```

## Dead Letter Topics

Configure a dead-letter topic for messages that exhaust all retries:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: orders-kafka
  topic: orders
  routes:
    default: /orders
  deadLetterTopic: orders-dead-letter
```

The dead-letter topic receives messages that failed after all retry attempts.

## Monitoring Pub/Sub Resiliency

```bash
# Watch for retry events
kubectl logs deployment/order-processor -c daprd -f \
  | grep -E "retry|pubsub|deliver"

# Check Prometheus metrics
curl http://localhost:9090/metrics \
  | grep "dapr_component_pubsub"
```

## Summary

Dapr pub/sub resiliency policies control retry behavior for both message publishing and message delivery. Configuring `inbound` retry policies with exponential backoff ensures message processing failures are retried gracefully, while dead-letter topics catch messages that permanently fail after all retry attempts.
