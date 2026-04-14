# How to Configure Dapr with RocketMQ Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RocketMQ, Pub/Sub, Messaging, Microservice

Description: Learn how to configure Dapr's pub/sub building block with Apache RocketMQ, including component setup, topic configuration, and message publishing.

---

## Overview

Apache RocketMQ is a distributed messaging and streaming platform widely used in enterprise environments. Dapr's pub/sub building block supports RocketMQ as a broker, letting you decouple microservices without tying your application code to RocketMQ-specific client libraries.

## Prerequisites

- Dapr CLI installed and initialized
- A running RocketMQ broker (NameServer + Broker)
- kubectl access if deploying to Kubernetes

## Running RocketMQ Locally

Start RocketMQ with Docker Compose for local development:

```yaml
version: "3"
services:
  namesrv:
    image: apache/rocketmq:5.1.4
    command: sh mqnamesrv
    ports:
      - "9876:9876"
  broker:
    image: apache/rocketmq:5.1.4
    command: sh mqbroker -n namesrv:9876
    environment:
      - JAVA_OPT_EXT=-Xms256m -Xmx256m
    depends_on:
      - namesrv
```

```bash
docker compose up -d
```

## Defining the Dapr Component

Create a `pubsub.yaml` component file:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rocketmq-pubsub
  namespace: default
spec:
  type: pubsub.rocketmq
  version: v1
  metadata:
    - name: nameServer
      value: "localhost:9876"
    - name: consumerGroup
      value: "dapr-consumer-group"
    - name: producerGroup
      value: "dapr-producer-group"
    - name: retries
      value: "3"
    - name: sendTimeOutSec
      value: "10"
```

Place this file in your Dapr components directory (`~/.dapr/components/` for self-hosted mode).

## Publishing a Message

Use the Dapr HTTP API to publish a message to a topic:

```bash
curl -X POST http://localhost:3500/v1.0/publish/rocketmq-pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "1001", "item": "widget", "quantity": 5}'
```

## Subscribing to Messages

Define a subscription using a declarative YAML or programmatic approach. For declarative:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: rocketmq-pubsub
  topic: orders
  route: /orders
```

In your application, expose the `/orders` endpoint:

```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    print(f"Received order: {event['orderId']}")
    return '', 200
```

## Kubernetes Deployment

For Kubernetes, store credentials in a secret and reference them:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rocketmq-pubsub
  namespace: production
spec:
  type: pubsub.rocketmq
  version: v1
  metadata:
    - name: nameServer
      value: "rocketmq-namesrv.messaging.svc.cluster.local:9876"
    - name: consumerGroup
      value: "order-service-group"
    - name: producerGroup
      value: "api-gateway-group"
    - name: accessKey
      secretKeyRef:
        name: rocketmq-credentials
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: rocketmq-credentials
        key: secretKey
```

## Testing the Setup

Run your application with Dapr sidecar:

```bash
dapr run --app-id order-service \
  --app-port 5000 \
  --components-path ./components \
  python app.py
```

## Summary

Dapr's RocketMQ pub/sub component abstracts broker-specific client code behind a standard API. You define a component YAML pointing at your RocketMQ NameServer, create subscriptions, and Dapr handles message routing to your application endpoints. This approach works consistently whether you are running locally with Docker or deploying to Kubernetes.
