# How to Configure Redis Streams for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Pub/Sub, Stream, Messaging

Description: Configure Redis Streams as the Dapr pub/sub backend with consumer groups, message retention, and delivery guarantee settings.

---

## Overview

Redis Streams is one of the most popular backends for Dapr pub/sub in self-hosted and Kubernetes environments. It offers persistent message storage, consumer groups, and at-least-once delivery semantics. This guide covers the full configuration of the Dapr Redis Streams pub/sub component.

## Basic Component Configuration

Create the pub/sub component manifest:

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: redis-password
  - name: enableTLS
    value: "false"
  - name: concurrency
    value: "1"
```

For self-hosted mode with a local Redis:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
```

## Advanced Configuration Options

Configure message retention and consumer group behavior:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: maxLenApprox
    value: "1000"
  - name: processingTimeout
    value: "60s"
  - name: redeliverInterval
    value: "30s"
  - name: concurrency
    value: "10"
  - name: queueDepth
    value: "100"
```

Key metadata fields:
- `maxLenApprox` - approximate maximum stream length before trimming
- `processingTimeout` - how long before a message is considered unacknowledged
- `redeliverInterval` - how often to check for unacknowledged messages
- `concurrency` - number of concurrent workers processing messages

## Publisher Example

```python
# publisher/app.py
import requests
import json
import time

DAPR_PORT = 3500

def publish_order(order_data):
    url = f"http://localhost:{DAPR_PORT}/v1.0/publish/pubsub/orders"
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=order_data, headers=headers)
    response.raise_for_status()
    print(f"Published order: {order_data['orderId']}")

if __name__ == '__main__':
    for i in range(10):
        order = {
            "orderId": f"order-{i:04d}",
            "productId": "prod-001",
            "quantity": i + 1
        }
        publish_order(order)
        time.sleep(0.5)
```

## Subscriber Example

```javascript
// subscriber/app.js
const express = require('express');
const app = express();
app.use(express.json());

// Register subscriptions
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      route: '/orders',
      metadata: {
        rawPayload: 'false'
      }
    }
  ]);
});

// Handle messages
app.post('/orders', (req, res) => {
  const { data } = req.body;
  console.log(`Processing order: ${data.orderId}`);

  try {
    // Process the order
    processOrder(data);
    res.sendStatus(200);  // Acknowledge message
  } catch (err) {
    console.error(`Failed to process order: ${err.message}`);
    // Return 500 to trigger retry
    res.sendStatus(500);
  }
});

function processOrder(order) {
  // Business logic here
  console.log(`Fulfilled order ${order.orderId} - ${order.quantity} x ${order.productId}`);
}

app.listen(3000, () => console.log('Subscriber listening on port 3000'));
```

## Configuring Dead Letter Topics

Route failed messages to a dead letter topic after delivery retries are exhausted:

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
  deadLetterTopic: orders-dlq
```

Control how many retries occur before dead-lettering by defining a resiliency policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: pubsub-resiliency
spec:
  policies:
    retries:
      pubsubRetry:
        policy: constant
        duration: 5s
        maxRetries: 3
  targets:
    components:
      pubsub:
        inbound:
          retry: pubsubRetry
```

Subscribe to the dead letter queue:

```javascript
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      route: '/orders'
    },
    {
      pubsubname: 'pubsub',
      topic: 'orders-dlq',
      route: '/orders-dead-letter'
    }
  ]);
});

app.post('/orders-dead-letter', (req, res) => {
  const { data } = req.body;
  console.error(`Dead letter order: ${JSON.stringify(data)}`);
  // Alert, store in database, or trigger manual review
  res.sendStatus(200);
});
```

## Viewing Redis Streams Data

Inspect messages directly in Redis:

```bash
# Connect to Redis
redis-cli -h redis-master -p 6379

# List all streams
KEYS *

# Read messages from a stream (topic)
XREAD COUNT 10 STREAMS dapr-pubsub-orders 0

# Check consumer groups
XINFO GROUPS dapr-pubsub-orders

# Check pending messages (unacknowledged)
XPENDING dapr-pubsub-orders my-consumer-group - + 10
```

## Kubernetes Secret for Redis Password

```bash
kubectl create secret generic redis-secret \
  --from-literal=redis-password=your-password-here \
  -n default
```

Reference it in the component:

```yaml
metadata:
- name: redisPassword
  secretKeyRef:
    name: redis-secret
    key: redis-password
```

## Running Locally

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start subscriber
dapr run --app-id subscriber --app-port 3000 \
  --components-path ./components -- node subscriber/app.js

# Start publisher
dapr run --app-id publisher --components-path ./components \
  -- python publisher/app.py
```

## Summary

Redis Streams provides a robust, persistent pub/sub backend for Dapr with consumer groups and at-least-once delivery guarantees. Key configuration parameters like `maxLenApprox`, `processingTimeout`, and `maxRetries` let you tune throughput and reliability to match your workload. Dead letter topics capture failed messages for manual inspection, and Dapr handles consumer group management so you only need to implement your business logic in the subscriber handler.
