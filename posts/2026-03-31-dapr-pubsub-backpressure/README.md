# How to Handle Pub/Sub Backpressure in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Backpressure, Resiliency, Microservice

Description: Learn how to manage backpressure in Dapr pub/sub by controlling concurrency, using retry policies, and configuring broker-level throttling to protect consumers.

---

## Understanding Backpressure in Pub/Sub

Backpressure occurs when a subscriber cannot process messages as fast as they arrive. Without controls, this causes memory exhaustion, timeouts, and cascading failures. Dapr provides several mechanisms to manage this.

## Limit Concurrent Message Handlers

For Kafka, Dapr does not support a component-level concurrency setting. Instead, use the `app-max-concurrency` sidecar annotation to limit concurrent message delivery to your app:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "3000"
        dapr.io/app-max-concurrency: "5"  # Process max 5 messages at once
```

For RabbitMQ, use the `prefetchCount` setting:

```yaml
  - name: prefetchCount
    value: "10"  # Fetch up to 10 unacknowledged messages
```

## Return 429 to Signal Overload

When your service is overwhelmed, return HTTP 429 (Too Many Requests) from the subscription handler:

```javascript
let activeJobs = 0;
const MAX_JOBS = 10;

app.post("/orders", async (req, res) => {
  if (activeJobs >= MAX_JOBS) {
    // Signal backpressure - Dapr will retry later
    return res.status(429).send("Too busy");
  }

  activeJobs++;
  try {
    await processOrder(req.body.data);
    res.sendStatus(200);
  } finally {
    activeJobs--;
  }
});
```

Dapr treats any non-2xx, non-404 status code (including 429) as a retryable error and will redeliver the message. To add backoff between retries, configure a resiliency policy with exponential retry as shown below.

## Configure Retry with Backoff

Pair backpressure signals with an exponential retry policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: backpressure-resiliency
spec:
  policies:
    retries:
      consumerRetry:
        policy: exponential
        maxRetries: 10
        maxInterval: 60s
  targets:
    components:
      pubsub:
        inbound:
          retry: consumerRetry
```

## Scale Consumers Horizontally

When backpressure is persistent, scale out consumer replicas. Each replica in the same consumer group shares the partition load:

```bash
kubectl scale deployment order-processor --replicas=5
```

For KEDA-based autoscaling with Kafka:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaler
spec:
  scaleTargetRef:
    name: order-processor
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      consumerGroup: order-service
      topic: orders
      lagThreshold: "100"  # Scale when lag exceeds 100 messages
```

## Use a Circuit Breaker

Protect downstream dependencies from cascade failures during backpressure:

```yaml
spec:
  policies:
    circuitBreakers:
      consumerBreaker:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures > 5
  targets:
    components:
      pubsub:
        inbound:
          circuitBreaker: consumerBreaker
```

## Monitor Consumer Lag

```bash
# Check Kafka consumer group lag
kubectl exec -it kafka-0 -- kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group order-service
```

High lag indicates backpressure is building faster than it is being consumed.

## Summary

Managing Dapr pub/sub backpressure requires limiting concurrent handlers at the component level, returning HTTP 429 from overloaded handlers, configuring exponential retry policies, and scaling consumers based on message lag. Combining these techniques prevents consumer overload and protects the overall system stability.
