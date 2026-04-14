# How to Set Up Dapr Pub/Sub with RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, RabbitMQ, Messaging, AMQP

Description: Configure the Dapr RabbitMQ pub/sub component to publish and subscribe to messages using AMQP exchanges and queues in self-hosted and Kubernetes deployments.

---

## Overview

The Dapr `pubsub.rabbitmq` component uses the AMQP protocol to connect to a RabbitMQ broker. Dapr creates fanout exchanges per topic and queues per subscriber automatically.

```mermaid
flowchart LR
    Publisher[Publisher App] -->|POST /v1.0/publish| Sidecar1[Dapr Sidecar]
    Sidecar1 -->|AMQP Publish| Exchange[RabbitMQ Exchange\norders]
    Exchange -->|Fanout| Q1[Queue\norder-processor]
    Exchange -->|Fanout| Q2[Queue\nnotification-service]
    Q1 --> Sidecar2[Dapr Sidecar]
    Sidecar2 -->|POST /handle-order| Sub1[Order Processor]
    Q2 --> Sidecar3[Dapr Sidecar]
    Sidecar3 -->|POST /notify| Sub2[Notification Service]
```

## Prerequisites

- RabbitMQ running locally or on Kubernetes
- Dapr CLI installed and initialized
- RabbitMQ management plugin enabled for monitoring

## Deploy RabbitMQ with Docker

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=dapr \
  -e RABBITMQ_DEFAULT_PASS=daprpassword \
  rabbitmq:3-management
```

## Deploy RabbitMQ on Kubernetes

```yaml
# rabbitmq.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3-management
        ports:
        - containerPort: 5672
        - containerPort: 15672
        env:
        - name: RABBITMQ_DEFAULT_USER
          value: "dapr"
        - name: RABBITMQ_DEFAULT_PASS
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: default
spec:
  selector:
    app: rabbitmq
  ports:
  - name: amqp
    port: 5672
    targetPort: 5672
  - name: management
    port: 15672
    targetPort: 15672
```

```bash
kubectl create secret generic rabbitmq-secret \
  --from-literal=password=daprpassword \
  --namespace default

kubectl apply -f rabbitmq.yaml
```

## Dapr Component Configuration

```yaml
# pubsub-rabbitmq.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: "amqp://dapr:daprpassword@rabbitmq:5672"
  - name: durable
    value: "true"
  - name: deletedWhenUnused
    value: "false"
  - name: autoAck
    value: "false"
  - name: requeueInFailure
    value: "true"
  - name: prefetchCount
    value: "10"
  - name: reconnectWaitSeconds
    value: "0"
  - name: enableDeadLetter
    value: "true"
  - name: maxLen
    value: "0"
  - name: maxLenBytes
    value: "0"
  - name: exchangeKind
    value: "fanout"
```

Use a Kubernetes secret for the host URL in production:

```yaml
  - name: connectionString
    secretKeyRef:
      name: rabbitmq-secret
      key: host
```

```bash
kubectl create secret generic rabbitmq-secret \
  --from-literal=host="amqp://dapr:daprpassword@rabbitmq:5672" \
  --namespace default
```

## Subscription Configuration

```yaml
# subscription.yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  route: /handle-order
scopes:
- order-processor
```

## Publishing Messages

```bash
# Publish to the orders topic
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "rmq-001", "item": "coffee", "qty": 2}'
```

With the Python SDK:

```python
# publisher.py
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    event = {"orderId": "rmq-001", "item": "coffee", "qty": 2}
    client.publish_event(
        pubsub_name="pubsub",
        topic_name="orders",
        data=json.dumps(event),
        data_content_type="application/json"
    )
    print("Published to RabbitMQ via Dapr")
```

## Subscriber Application

```python
# subscriber.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "orders",
        "route": "/handle-order"
    }])

@app.route('/handle-order', methods=['POST'])
def handle_order():
    event = request.get_json()
    order = event.get('data', {})
    print(f"RabbitMQ order received: orderId={order.get('orderId')}, item={order.get('item')}")
    # Process the order
    return jsonify({"status": "SUCCESS"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

```bash
dapr run \
  --app-id order-processor \
  --app-port 5001 \
  --dapr-http-port 3501 \
  -- python subscriber.py
```

## TLS Configuration

For production RabbitMQ with TLS:

```yaml
  metadata:
  - name: connectionString
    value: "amqps://dapr:daprpassword@rabbitmq-tls:5671"
  - name: caCert
    secretKeyRef:
      name: rabbitmq-tls-secret
      key: ca.crt
  - name: clientCert
    secretKeyRef:
      name: rabbitmq-tls-secret
      key: tls.crt
  - name: clientKey
    secretKeyRef:
      name: rabbitmq-tls-secret
      key: tls.key
```

## Verifying Messages in RabbitMQ Management UI

```bash
# Port-forward the management UI
kubectl port-forward svc/rabbitmq 15672:15672 -n default

# Open http://localhost:15672 and log in with dapr / daprpassword
# Navigate to Exchanges to see Dapr-created fanout exchanges
# Navigate to Queues to see subscriber queues
```

## Summary

The Dapr RabbitMQ pub/sub component uses AMQP fanout exchanges to deliver messages to all subscriber queues. Configure the component with the AMQP host URL, durability settings, and prefetch count. Dapr automatically creates exchanges per topic and queues per app ID. Use `enableDeadLetter: "true"` to activate RabbitMQ dead-lettering for failed messages, and secure the connection with TLS in production by providing CA and client certificates.
