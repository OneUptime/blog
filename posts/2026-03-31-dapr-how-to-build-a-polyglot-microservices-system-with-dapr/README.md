# How to Build a Polyglot Microservices System with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Microservice, Polyglot, Go, Python, Node.js, Kubernetes

Description: Build a polyglot microservices system with Dapr where Go, Python, and Node.js services communicate seamlessly using shared Dapr components.

---

## Overview

One of Dapr's greatest strengths is enabling polyglot architectures - systems where each microservice is written in the language best suited for its job, yet all services communicate and share infrastructure through a uniform API. This guide walks through building a sample e-commerce system with a Go API gateway, Python order processor, and Node.js notification service.

## Architecture

```text
[Client] --> [Go API Gateway] --> [Python Order Service]
                                        |
                              [Dapr State Store (Redis)]
                                        |
                              [Node.js Notification Service]
                                (via Dapr Pub/Sub)
```

## Shared Dapr Component Configuration

Create a components directory shared by all services:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
```

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
```

## Go API Gateway

The API gateway receives client requests and invokes the Python order service via Dapr:

```go
// api-gateway/main.go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "log"
)

const daprPort = "3500"

type OrderRequest struct {
    ProductID string  `json:"productId"`
    Quantity  int     `json:"quantity"`
    UserID    string  `json:"userId"`
}

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
    var order OrderRequest
    if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    body, _ := json.Marshal(order)
    resp, err := http.Post(
        fmt.Sprintf("http://localhost:%s/v1.0/invoke/order-service/method/orders", daprPort),
        "application/json",
        bytes.NewBuffer(body),
    )
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer resp.Body.Close()

    result, _ := io.ReadAll(resp.Body)
    w.Header().Set("Content-Type", "application/json")
    w.Write(result)
}

func main() {
    http.HandleFunc("/api/orders", createOrderHandler)
    log.Printf("API Gateway listening on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Python Order Service

The order service processes orders, saves state, and publishes events:

```python
# order-service/app.py
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
DAPR_PORT = 3500

@app.route('/orders', methods=['POST'])
def create_order():
    order = request.get_json()
    order_id = f"order-{order['userId']}-{order['productId']}"

    # Save order state
    state_payload = [{
        "key": order_id,
        "value": {**order, "status": "created"}
    }]
    requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/state/statestore",
        json=state_payload,
        headers={"Content-Type": "application/json"}
    )

    # Publish order created event
    event = {
        "orderId": order_id,
        "userId": order["userId"],
        "productId": order["productId"]
    }
    requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/publish/pubsub/orders",
        json=event,
        headers={"Content-Type": "application/json"}
    )

    return jsonify({"orderId": order_id, "status": "created"})

@app.route('/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    resp = requests.get(
        f"http://localhost:{DAPR_PORT}/v1.0/state/statestore/{order_id}"
    )
    return jsonify(resp.json())

if __name__ == '__main__':
    app.run(port=3001)
```

## Node.js Notification Service

The notification service subscribes to order events:

```javascript
// notification-service/app.js
const express = require('express');
const app = express();
app.use(express.json());

// Dapr subscription endpoint
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      route: '/notifications/order-created'
    }
  ]);
});

app.post('/notifications/order-created', (req, res) => {
  const event = req.body;
  const order = event.data;

  console.log(`Sending notification to user ${order.userId}:`);
  console.log(`Your order ${order.orderId} for product ${order.productId} has been created!`);

  // In production: send email, SMS, or push notification here
  res.sendStatus(200);
});

app.listen(3002, () => {
  console.log('Notification service listening on port 3002');
});
```

## Docker Compose Setup

Run all services together for local development:

```yaml
# docker-compose.yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
    - "6379:6379"

  api-gateway:
    build: ./api-gateway
    ports:
    - "8080:8080"

  api-gateway-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "api-gateway", "-app-port", "8080",
              "-components-path", "/components"]
    volumes:
    - "./components:/components"
    network_mode: "service:api-gateway"
    depends_on: [redis]

  order-service:
    build: ./order-service
    ports:
    - "3001:3001"

  order-service-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "order-service", "-app-port", "3001",
              "-components-path", "/components"]
    volumes:
    - "./components:/components"
    network_mode: "service:order-service"
    depends_on: [redis]

  notification-service:
    build: ./notification-service
    ports:
    - "3002:3002"

  notification-service-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "notification-service", "-app-port", "3002",
              "-components-path", "/components"]
    volumes:
    - "./components:/components"
    network_mode: "service:notification-service"
    depends_on: [redis]
```

## Testing the System

Start all services:

```bash
docker-compose up -d

# Create an order
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod-001", "quantity": 2, "userId": "user-42"}'

# Check notification service logs
docker-compose logs -f notification-service
```

## Kubernetes Deployment

For Kubernetes, annotate each deployment with its app-id:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3001"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:latest
        ports:
        - containerPort: 3001
```

## Summary

Dapr enables true polyglot microservices by providing a language-agnostic API for state management, pub/sub messaging, and service invocation. In this guide, a Go gateway, Python order service, and Node.js notification service communicated seamlessly through shared Dapr components without any language-specific infrastructure dependencies. This approach lets each team choose the best technology for their domain while maintaining consistent operational patterns across the entire system.
