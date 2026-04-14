# How to Configure Dapr with KubeMQ Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, KubeMQ, Pub/Sub, Messaging, Kubernetes, Microservice

Description: Configure Dapr's pub/sub building block with KubeMQ, a Kubernetes-native message broker, covering component setup and topic-based messaging.

---

## Overview

KubeMQ is a Kubernetes-native enterprise message broker that supports multiple messaging patterns including pub/sub, queues, and streams. Dapr provides a first-class integration with KubeMQ, making it straightforward to use KubeMQ as your pub/sub backend without modifying application code.

## Prerequisites

- Dapr CLI installed
- KubeMQ running in your Kubernetes cluster or locally
- KubeMQ client token (for licensed features)

## Installing KubeMQ on Kubernetes

```bash
kubectl apply -f https://deploy.kubemq.io/init
kubectl apply -f https://deploy.kubemq.io/key/<your-license-key>
```

Verify KubeMQ is running:

```bash
kubectl get pods -n kubemq
```

## Dapr Component Configuration

Create the pub/sub component definition:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubemq-pubsub
  namespace: default
spec:
  type: pubsub.kubemq
  version: v1
  metadata:
    - name: address
      value: "kubemq-cluster.kubemq.svc.cluster.local:50000"
    - name: clientID
      value: "dapr-client"
    - name: authToken
      secretKeyRef:
        name: kubemq-token
        key: token
    - name: group
      value: "dapr-consumers"
    - name: store
      value: "false"
```

For local development without authentication:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubemq-pubsub
spec:
  type: pubsub.kubemq
  version: v1
  metadata:
    - name: address
      value: "localhost:50000"
    - name: clientID
      value: "local-dapr"
```

## Running KubeMQ Locally

```bash
docker run -d -p 50000:50000 -p 9090:9090 \
  kubemq/kubemq-community:latest
```

## Publishing Messages

```bash
curl -X POST http://localhost:3500/v1.0/publish/kubemq-pubsub/notifications \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-42", "message": "Your order shipped"}'
```

## Subscribing to Messages

Define a declarative subscription:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: notifications-subscription
spec:
  pubsubname: kubemq-pubsub
  topic: notifications
  routes:
    default: /notify
```

Handle the event in your application:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/notify', (req, res) => {
  const { userId, message } = req.body.data;
  console.log(`Notification for ${userId}: ${message}`);
  res.sendStatus(200);
});

app.listen(3000);
```

## Using Store Mode for Persistence

KubeMQ supports persistent message stores. Enable it in the component:

```yaml
metadata:
  - name: store
    value: "true"
```

## Starting the Service

```bash
dapr run --app-id notification-service \
  --app-port 3000 \
  --components-path ./components \
  node app.js
```

## Summary

KubeMQ integrates cleanly with Dapr's pub/sub API, offering Kubernetes-native messaging with support for persistent stores and consumer groups. The Dapr component abstracts KubeMQ's gRPC API, letting you publish and subscribe using the same Dapr HTTP or SDK interfaces you use with any other broker. For teams already using Kubernetes, KubeMQ is a lightweight alternative to Kafka or RabbitMQ.
