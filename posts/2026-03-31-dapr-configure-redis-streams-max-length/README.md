# How to Configure Redis Streams Max Length for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Pub/Sub, Stream, Messaging

Description: Configure Redis Streams max length and trimming strategies in the Dapr pub/sub component to control memory usage and message retention.

---

## Overview

Dapr uses Redis Streams as a pub/sub transport. Without max length limits, streams grow unboundedly and consume all available Redis memory. This guide covers `maxLenApprox`, time-based trimming with `streamTTL`, and consumer group configuration.

## Configuring Redis Streams Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: maxLenApprox
    value: "10000"
  - name: processingTimeout
    value: "60s"
  - name: redeliverInterval
    value: "30s"
  - name: queueDepth
    value: "100"
  - name: concurrency
    value: "10"
```

## Understanding Max Length Options

`maxLenApprox` uses Redis's `MAXLEN ~` syntax, which trims the stream approximately to the target length using radix tree node trimming (very fast):

```bash
# Equivalent Redis command Dapr uses internally
XADD mystream MAXLEN ~ 10000 * field value
```

For time-based trimming, use `streamTTL` instead, which evicts entries older than the specified duration:

```yaml
  - name: streamTTL
    value: "30m"
```

Note: `maxLenApprox` and `streamTTL` cannot be used together.

## Monitoring Stream Length

```bash
# Check current stream length
kubectl exec -it redis-0 -- redis-cli XLEN dapr-messages

# Check stream info
kubectl exec -it redis-0 -- redis-cli XINFO STREAM dapr-messages

# List consumer groups
kubectl exec -it redis-0 -- redis-cli XINFO GROUPS dapr-messages
```

## Consumer Group Pending Entries

Monitor pending entries to detect processing backlogs:

```bash
kubectl exec -it redis-0 -- redis-cli XPENDING dapr-messages my-consumer-group - + 10
```

## Publishing and Subscribing in Python

```python
import requests

# Publish
requests.post(
    "http://localhost:3500/v1.0/publish/redis-pubsub/orders",
    json={"orderId": "123", "amount": 99.99}
)
```

```yaml
# Subscription
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: redis-pubsub
  topic: orders
  routes:
    default: /handle-order
```

## Retention Strategy Recommendations

| Throughput | Recommended maxLenApprox | Retention |
|------------|--------------------------|-----------|
| Low (< 100/s) | 10,000 | ~1 hour |
| Medium (< 1000/s) | 100,000 | ~1 hour |
| High (> 1000/s) | 500,000 | ~8 minutes |

Use `maxLenApprox` for high-throughput scenarios to avoid the performance penalty of exact trimming.

## Handling Idle Consumers

```yaml
  - name: processingTimeout
    value: "60s"
  - name: redeliverInterval
    value: "30s"
```

Messages not acknowledged within `processingTimeout` are redelivered after `redeliverInterval`. This prevents message loss when a consumer pod dies mid-processing.

## Summary

Configure `maxLenApprox` in Dapr's Redis Streams pub/sub component to prevent unbounded stream growth. Use approximate length-based trimming for high-throughput topics and time-based trimming with `streamTTL` when duration-based retention is required. Monitor stream length and pending consumer entries to detect backlogs before they impact downstream services.
