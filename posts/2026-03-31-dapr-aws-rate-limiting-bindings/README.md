# How to Handle AWS Rate Limiting in Dapr Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Rate Limiting, Resiliency, Binding

Description: Learn how to handle AWS service throttling and rate limiting in Dapr bindings using resiliency policies, exponential backoff, and circuit breakers to build fault-tolerant integrations.

---

## AWS Rate Limiting and Throttling

AWS services enforce rate limits (quotas) on API calls. When exceeded, the service returns throttling errors like `ProvisionedThroughputExceededException` (DynamoDB), `ThrottlingException` (SQS, SNS), or `SlowDown` (S3). Without retry logic, these transient errors cause binding failures that may result in data loss.

## Dapr Resiliency: The Primary Defense

Dapr's Resiliency API provides exponential backoff retry policies that handle throttling gracefully:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: aws-binding-resiliency
  namespace: default
spec:
  policies:
    retries:
      aws-throttle-retry:
        policy: exponential
        duration: 200ms
        maxInterval: 60s
        maxRetries: 10
        matching:
          httpStatusCodes: "429,503"
          gRPCStatusCodes: "8,14"

    timeouts:
      aws-binding-timeout: 30s

    circuitBreakers:
      aws-circuit-breaker:
        maxRequests: 5
        interval: 60s
        timeout: 120s
        trip: consecutiveFailures >= 5

  targets:
    components:
      order-store:
        outbound:
          retry: aws-throttle-retry
          timeout: aws-binding-timeout
          circuitBreaker: aws-circuit-breaker
      order-queue:
        outbound:
          retry: aws-throttle-retry
          timeout: aws-binding-timeout
```

## Service-Specific Rate Limits

### DynamoDB

DynamoDB throttles based on provisioned or on-demand capacity:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-store
spec:
  type: bindings.aws.dynamodb
  version: v1
  metadata:
    - name: table
      value: "orders"
    - name: region
      value: "us-east-1"
```

Use on-demand billing to reduce throttling risk:

```bash
aws dynamodb update-table \
  --table-name orders \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### SQS

SQS standard queues support nearly unlimited throughput, but FIFO queues are limited to 300 messages per second (or 3,000 with batching). For high-volume scenarios, distribute load across multiple queues or use SNS fan-out:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

// Distribute across multiple queues by hashing
function getQueueBinding(orderId) {
  const hash = orderId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return `order-queue-${hash % 3}`; // 3 queues: order-queue-0, order-queue-1, order-queue-2
}

async function enqueueOrder(order) {
  const binding = getQueueBinding(order.id);
  await client.binding.send(binding, "create", order);
}
```

### S3

S3 supports 3,500 PUT requests and 5,500 GET requests per second per prefix:

```javascript
// Use prefix-based sharding to distribute load
function getS3Key(documentId) {
  const prefix = documentId.slice(0, 2); // First 2 chars for prefix distribution
  return `${prefix}/${documentId}/content.json`;
}

await client.binding.send("document-store", "create", content, {
  key: getS3Key(documentId),
});
```

## Application-Level Rate Limiting

Implement client-side rate limiting to proactively stay within service quotas:

```javascript
const Bottleneck = require("bottleneck");

// DynamoDB: 100 WCU limit
const dynamoLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 10, // 100 requests/second max
});

// S3: 3500 PUT/s limit
const s3Limiter = new Bottleneck({
  maxConcurrent: 50,
  minTime: 1,
});

async function safeDynamoWrite(data) {
  return dynamoLimiter.schedule(() =>
    client.binding.send("order-store", "create", data)
  );
}

async function safeS3Upload(key, content) {
  return s3Limiter.schedule(() =>
    client.binding.send("document-store", "create", content, { key })
  );
}
```

## Monitoring for Throttling

Track throttle-related metrics:

```bash
# DynamoDB throttle metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name WriteThrottleEvents \
  --dimensions Name=TableName,Value=orders \
  --start-time $(date -v-1H -u +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Sum
```

Set up CloudWatch alarms for sustained throttling:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name DynamoDBWriteThrottle \
  --namespace AWS/DynamoDB \
  --metric-name WriteThrottleEvents \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --period 60 \
  --evaluation-periods 3 \
  --statistic Sum \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Summary

Handling AWS rate limiting in Dapr bindings requires a layered approach: Dapr resiliency policies for automatic retry with exponential backoff, circuit breakers to prevent cascading failures during sustained throttling, client-side rate limiters to proactively respect service quotas, and CloudWatch monitoring to detect patterns before they become incidents. Together, these techniques make your AWS binding integrations resilient to the inevitable throttle events that occur in production.
