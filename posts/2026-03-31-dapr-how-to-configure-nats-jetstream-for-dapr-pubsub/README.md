# How to Configure NATS JetStream for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, NATS, JetStream, Pub/Sub, Messaging

Description: Configure NATS JetStream as the Dapr pub/sub backend with stream persistence, consumer durability, and delivery policy settings.

---

## Overview

NATS JetStream is a high-performance persistent messaging system that integrates with Dapr as a pub/sub component. It offers durable consumers, stream replay, and configurable retention policies. This guide covers how to deploy NATS JetStream and configure the Dapr component for production use.

## Deploy NATS JetStream

Using Helm on Kubernetes:

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update
helm install nats nats/nats \
  --set config.jetstream.enabled=true \
  --set config.jetstream.fileStore.enabled=true \
  --set config.jetstream.fileStore.pvc.size=10Gi \
  --namespace messaging \
  --create-namespace
```

For local development with Docker:

```bash
docker run -d \
  --name nats \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:latest -js
```

Verify JetStream is enabled:

```bash
nats server info --server nats://localhost:4222 | grep -i jetstream
```

## Dapr Component Configuration

Create the NATS JetStream pub/sub component:

```yaml
# components/pubsub-nats.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.jetstream
  version: v1
  metadata:
  - name: natsURL
    value: "nats://nats.messaging.svc.cluster.local:4222"
  - name: name
    value: "dapr"
  - name: durableName
    value: "dapr-consumer"
  - name: queueGroupName
    value: "order-processors"
  - name: startSequence
    value: "1"
  - name: flowControl
    value: "false"
  - name: heartbeat
    value: "15s"
  - name: ackWait
    value: "30s"
  - name: maxDeliver
    value: "5"
  - name: backOff
    value: "1s,5s,10s"
  - name: maxAckPending
    value: "1024"
```

Key configuration options:
- `durableName` - enables durable consumers that survive restarts
- `queueGroupName` - enables load-balanced message delivery across multiple instances
- `ackWait` - time before unacknowledged messages are redelivered
- `maxDeliver` - maximum delivery attempts before giving up
- `backOff` - delivery retry intervals

## NATS Authentication

For clusters with authentication:

```yaml
spec:
  type: pubsub.jetstream
  version: v1
  metadata:
  - name: natsURL
    value: "nats://nats.messaging.svc.cluster.local:4222"
  - name: jwt
    value: "<your-jwt-token>"
  - name: seedKey
    value: "<your-seed-key>"
  - name: tls_client_cert
    value: "/etc/nats/tls/client.crt"
  - name: tls_client_key
    value: "/etc/nats/tls/client.key"
```

Mount TLS certificates as a volume in your Kubernetes pod. Use `jwt` and `seedKey` for decentralized NATS authentication, or use `token` for token-based auth.

## Publisher Service

```go
// publisher/main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"

    dapr "github.com/dapr/go-sdk/client"
)

type OrderEvent struct {
    OrderID   string    `json:"orderId"`
    ProductID string    `json:"productId"`
    Quantity  int       `json:"quantity"`
    Timestamp time.Time `json:"timestamp"`
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatalf("Failed to create Dapr client: %v", err)
    }
    defer client.Close()

    ctx := context.Background()

    for i := 0; i < 100; i++ {
        event := OrderEvent{
            OrderID:   fmt.Sprintf("order-%04d", i),
            ProductID: "prod-001",
            Quantity:  i + 1,
            Timestamp: time.Now(),
        }

        data, _ := json.Marshal(event)

        if err := client.PublishEvent(ctx, "pubsub", "orders", data); err != nil {
            log.Printf("Failed to publish event %d: %v", i, err)
            continue
        }

        log.Printf("Published event: %s", event.OrderID)
        time.Sleep(100 * time.Millisecond)
    }
}
```

## Subscriber Service

```python
# subscriber/app.py
from flask import Flask, request, jsonify
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/process-order",
            "metadata": {
                "deliverPolicy": "all"
            }
        }
    ])

@app.route('/process-order', methods=['POST'])
def process_order():
    envelope = request.get_json()
    event_data = envelope.get('data', {})

    order_id = event_data.get('orderId', 'unknown')
    quantity = event_data.get('quantity', 0)

    logging.info(f"Processing order {order_id}: quantity={quantity}")

    # Simulate processing
    if quantity > 100:
        logging.error(f"Order {order_id} quantity exceeds limit")
        return jsonify({"status": "RETRY"}), 200

    return jsonify({"status": "SUCCESS"}), 200

if __name__ == '__main__':
    app.run(port=5000)
```

## JetStream Stream Management

Create and manage streams directly via NATS CLI:

```bash
# Install NATS CLI
brew install nats-io/nats-tools/nats

# Create a stream manually for inspection
nats stream add orders-stream \
  --subjects "orders.*" \
  --storage file \
  --retention limits \
  --max-age 24h \
  --max-msgs 1000000

# View stream info
nats stream info orders-stream

# View messages
nats stream view orders-stream

# Check consumer status
nats consumer info orders-stream dapr-consumer
```

## Configuring Multiple Consumers

For different services subscribing to the same topic:

```yaml
# Subscription A - order processor
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-processor-sub
spec:
  pubsubname: pubsub
  topic: orders
  route: /process-order
---
# Subscription B - analytics service
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-analytics-sub
spec:
  pubsubname: pubsub
  topic: orders
  route: /analytics/order
```

## Summary

NATS JetStream provides persistent, durable message delivery for Dapr pub/sub with configurable retention, consumer groups, and delivery policies. Key settings like `durableName`, `queueGroupName`, and `ackWait` control how messages are distributed and redelivered across service instances. The `backOff` parameter allows progressive retry delays, reducing load on struggling consumers while JetStream guarantees messages are not lost even if all consumers are temporarily offline.
