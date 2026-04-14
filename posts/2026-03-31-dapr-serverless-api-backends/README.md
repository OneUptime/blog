# How to Use Dapr for Serverless API Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Serverless, API, Backend, Kubernetes

Description: Learn how to build serverless API backends with Dapr by leveraging its service invocation, state management, and bindings to reduce infrastructure boilerplate.

---

## Why Use Dapr for Serverless API Backends

Dapr (Distributed Application Runtime) provides a set of building blocks that simplify building microservices and serverless-style API backends. When combined with platforms like KEDA or Knative, Dapr enables backends that scale to zero while retaining full access to state stores, pub/sub, and service bindings.

## Setting Up a Dapr-Enabled API Service

Start by annotating your Kubernetes deployment to inject the Dapr sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "orders-api"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: orders-api
        image: myregistry/orders-api:latest
        ports:
        - containerPort: 3000
```

## Handling HTTP Invocation

With Dapr's service invocation, other services can call your backend without knowing its address:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/orders', async (req, res) => {
  const { orderId, item, quantity } = req.body;

  // Save state via Dapr sidecar
  const stateUrl = `http://localhost:3500/v1.0/state/statestore`;
  await fetch(stateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ key: orderId, value: { item, quantity } }])
  });

  res.json({ status: 'created', orderId });
});

app.listen(3000);
```

## Using Pub/Sub for Event-Driven Responses

Instead of tight coupling, emit events after processing:

```javascript
async function publishOrderCreated(orderId) {
  const pubsubUrl = `http://localhost:3500/v1.0/publish/pubsub/orders`;
  await fetch(pubsubUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, event: 'created' })
  });
}
```

## Scaling to Zero with KEDA

Combine Dapr with KEDA to scale down when idle:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: orders-api-scaler
spec:
  scaleTargetRef:
    name: orders-api
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: rabbitmq
    metadata:
      queueName: orders
      host: amqp://guest:guest@rabbitmq:5672/
      queueLength: "5"
```

With `minReplicaCount: 0`, the deployment scales to zero when there are no messages. KEDA monitors the trigger source and scales the deployment back up when new messages arrive.

## Invoking a Serverless Backend from Another Service

```bash
curl -X POST http://localhost:3500/v1.0/invoke/orders-api/method/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "abc123", "item": "widget", "quantity": 2}'
```

Dapr handles service discovery, retries, and mTLS automatically.

## Summary

Dapr simplifies serverless API backends by abstracting state, pub/sub, and service-to-service communication. Pairing Dapr annotations with KEDA autoscaling enables true scale-to-zero deployments. This pattern reduces infrastructure overhead while maintaining production-grade reliability.
