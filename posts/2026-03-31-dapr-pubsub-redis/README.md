# How to Set Up Dapr Pub/Sub with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Redis, Messaging, Redis Streams

Description: Configure Dapr pub/sub messaging with Redis Streams as the message broker for reliable, ordered event delivery between microservices.

---

## Why Redis for Dapr Pub/Sub?

Redis Streams provides an append-only log with consumer groups, making it ideal for event-driven messaging. It supports message persistence, replay, and consumer group-based delivery. It is the default Dapr pub/sub backend and ships with every `dapr init` setup.

## Prerequisites

- Dapr CLI initialized (Redis container already running)
- Redis 5.0 or later (for Streams support)

## Component Configuration

The default Redis pub/sub component:

```yaml
# pubsub.yaml
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
  - name: enableTLS
    value: "false"
  - name: consumerID
    value: "mygroup"
```

### Additional Configuration Options

```yaml
  - name: maxLenApprox
    value: "1000"        # approximate stream length cap
  - name: redisMaxRetries
    value: "3"
  - name: redisMaxRetryInterval
    value: "2s"
  - name: processingTimeout
    value: "60s"
  - name: redeliverInterval
    value: "2s"
  - name: idleCheckFrequency
    value: "60s"
```

### Kubernetes Configuration with Auth

```yaml
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
    value: "redis-master.default.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: redis-password
  - name: enableTLS
    value: "false"
```

## Publisher Service

```python
# publisher.py
import os
import time
import requests
import json

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def publish_order(order):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/orders"
    resp = requests.post(url, json=order,
                         headers={"Content-Type": "application/json"})
    resp.raise_for_status()
    print(f"Published order: {order['orderId']}")

if __name__ == "__main__":
    for i in range(1, 6):
        publish_order({
            "orderId": f"ORD-{i:04d}",
            "customerId": f"CUST-{i}",
            "amount": round(10.0 * i, 2),
            "timestamp": time.time()
        })
        time.sleep(0.5)
```

Start the publisher:

```bash
dapr run \
  --app-id order-publisher \
  --dapr-http-port 3500 \
  -- python publisher.py
```

## Subscriber Service

```python
# subscriber.py
from flask import Flask, request, jsonify
import argparse

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/orders"
        }
    ]
    return jsonify(subscriptions)

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.get_json()
    print(f"CloudEvent received:")
    print(f"  ID: {event.get('id')}")
    print(f"  Source: {event.get('source')}")
    print(f"  Data: {event.get('data')}")

    order = event.get("data", {})
    # Process the order
    print(f"Processing order {order.get('orderId')} - ${order.get('amount')}")

    return jsonify({"status": "SUCCESS"})

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5001)
    args = parser.parse_args()
    app.run(host="0.0.0.0", port=args.port)
```

Start the subscriber:

```bash
dapr run \
  --app-id order-subscriber \
  --app-port 5001 \
  --dapr-http-port 3501 \
  -- python subscriber.py
```

## Node.js Subscriber Example

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Register subscriptions
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      route: '/orders'
    }
  ]);
});

// Handle order messages
app.post('/orders', (req, res) => {
  const { data, id, source } = req.body;
  console.log(`Event ${id} from ${source}:`, data);
  console.log(`Processing order: ${data.orderId}`);
  res.json({ status: 'SUCCESS' });
});

app.listen(3001, () => console.log('Subscriber listening on port 3001'));
```

## Verifying with Redis CLI

Inspect the Redis Streams directly:

```bash
# List streams (Dapr creates one per topic)
redis-cli keys "*"

# Read messages from the orders stream
redis-cli xread COUNT 10 STREAMS orders 0

# Check consumer groups
redis-cli xinfo groups orders
```

The stream key is the topic name (e.g., `orders`).

## Multiple Consumers (Competing Consumers)

Multiple instances of the same subscriber app share a consumer group and process messages in parallel without duplicates:

```bash
# Start two instances of the subscriber
dapr run --app-id order-subscriber --app-port 5001 -- python subscriber.py &
dapr run --app-id order-subscriber --app-port 5002 \
  --dapr-http-port 3502 --dapr-grpc-port 50003 \
  -- python subscriber.py --port 5002
```

Both instances join the same consumer group and split the message load.

## Message Replay

Redis Streams retain messages until the stream is trimmed. To replay from the beginning, reset the consumer group offset:

```bash
redis-cli xgroup setid orders order-subscriber 0
```

## Summary

Dapr pub/sub with Redis Streams provides reliable, ordered event delivery between microservices. The default configuration works out of the box after `dapr init`. Publishers post to the `/v1.0/publish` endpoint, and subscribers register topic routes via `/dapr/subscribe`. Redis Streams back the messages with durability, consumer groups for horizontal scaling, and configurable stream retention.
