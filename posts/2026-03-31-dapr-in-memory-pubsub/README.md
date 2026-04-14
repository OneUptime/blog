# How to Configure Dapr with In-Memory Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, In-Memory, Testing, Development, Microservice

Description: Use Dapr's in-memory pub/sub component for local development and testing without an external broker, enabling fast iteration cycles.

---

## Overview

Dapr's in-memory pub/sub component is a lightweight, zero-dependency broker that runs entirely in the Dapr sidecar process. It is perfect for local development, unit testing, and CI pipelines where spinning up Kafka or RabbitMQ would add unnecessary complexity. Messages are not persisted and are lost when the sidecar restarts, but that is acceptable for development purposes.

## When to Use In-Memory Pub/Sub

- Local development without a running broker
- Integration tests in CI where speed matters
- Rapid prototyping of pub/sub message flows
- Unit testing application subscription handlers

Do not use it in production because messages are lost on restart and there is no cross-process delivery.

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.in-memory
  version: v1
  metadata: []
```

There is no metadata required. Save this file as `components/pubsub.yaml`.

## Project Structure Example

```bash
my-app/
  components/
    pubsub.yaml
  app.py
  requirements.txt
```

## Publishing a Message

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "status": "created"}'
```

## Handling Subscriptions in Node.js

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Dapr calls this to discover subscriptions
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      route: '/orders'
    }
  ]);
});

app.post('/orders', (req, res) => {
  const event = req.body;
  console.log('Received:', event.data);
  res.sendStatus(200);
});

app.listen(3000, () => console.log('App listening on 3000'));
```

## Running with Dapr

```bash
dapr run --app-id order-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  node app.js
```

## Switching to Production Broker

The key advantage of using Dapr's in-memory component during development is that switching to a real broker requires only a component file change, not any application code changes.

Replace `pubsub.yaml` for production:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka.default.svc.cluster.local:9092"
    - name: consumerGroup
      value: "order-service"
    - name: authType
      value: "none"
```

Your application code stays identical. Only the Dapr component YAML changes.

## Writing Tests

```python
import subprocess
import requests
import time

def test_order_subscription():
    # Start app with in-memory pub/sub
    proc = subprocess.Popen([
        'dapr', 'run', '--app-id', 'test-app',
        '--app-port', '5000',
        '--resources-path', './components',
        'python', 'app.py'
    ])
    time.sleep(2)

    resp = requests.post(
        'http://localhost:3500/v1.0/publish/pubsub/orders',
        json={'orderId': 'test-1'}
    )
    assert resp.status_code == 204
    proc.terminate()
```

## Summary

Dapr's in-memory pub/sub component removes broker dependencies from local development and testing. Configure it with a minimal YAML file, write your application against Dapr's standard pub/sub API, and swap in a real broker for staging and production by changing only the component YAML. This approach enforces a clean separation between your messaging logic and broker infrastructure.
