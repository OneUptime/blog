# How to Build Microservices with Dapr and Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Microservice, Architecture, Kubernetes

Description: Learn how to build a complete microservices system with Dapr and Python, covering service invocation, pub/sub communication, and shared state management.

---

## Introduction

Dapr simplifies microservices development by providing standardized building blocks for communication, state, and observability. This guide walks through building two Python services that communicate via service invocation and pub/sub messaging using Dapr.

## Architecture Overview

We will build two services:
- `order-service` - accepts orders and publishes events
- `inventory-service` - listens for order events and updates stock

## Project Structure

```text
microservices/
  order-service/
    app.py
    requirements.txt
  inventory-service/
    app.py
    requirements.txt
  components/
    pubsub.yaml
    statestore.yaml
```

## Order Service

```python
# order-service/app.py
import json
from flask import Flask, request, jsonify
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route("/orders", methods=["POST"])
def create_order():
    order = request.get_json()
    order_id = order["id"]

    with DaprClient() as client:
        # Save order state
        client.save_state(
            store_name="statestore",
            key=order_id,
            value=json.dumps(order)
        )
        # Publish order created event
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="order-created",
            data=json.dumps(order),
            data_content_type="application/json"
        )

    return jsonify({"order_id": order_id, "status": "created"})

if __name__ == "__main__":
    app.run(port=5001)
```

## Inventory Service

```python
# inventory-service/app.py
import json
from flask import Flask, request, jsonify
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "order-created",
        "route": "/handle-order"
    }])

@app.route("/handle-order", methods=["POST"])
def handle_order():
    body = request.get_json()
    order = body.get("data", {})
    item = order.get("item")
    qty = order.get("quantity", 1)

    with DaprClient() as client:
        # Read current stock
        result = client.get_state(store_name="statestore", key=f"stock-{item}")
        stock = int(result.data.decode()) if result.data else 100
        # Deduct quantity
        new_stock = stock - qty
        client.save_state(
            store_name="statestore",
            key=f"stock-{item}",
            value=str(new_stock)
        )

    print(f"Updated stock for {item}: {new_stock}")
    return jsonify({"status": "SUCCESS"})

if __name__ == "__main__":
    app.run(port=5002)
```

## Running Both Services

```bash
# Terminal 1 - Order Service
dapr run --app-id order-service --app-port 5001 \
  --components-path ./components -- python order-service/app.py

# Terminal 2 - Inventory Service
dapr run --app-id inventory-service --app-port 5002 \
  --components-path ./components -- python inventory-service/app.py
```

## Testing the System

```bash
curl -X POST http://localhost:5001/orders \
  -H "Content-Type: application/json" \
  -d '{"id":"ORD-001","item":"widget","quantity":3}'
```

## Kubernetes Deployment

Deploy with Dapr annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "5001"
```

## Summary

Dapr enables Python microservices to communicate reliably without direct dependencies on each other's infrastructure. Service invocation and pub/sub messaging decouple your services while the shared state store provides consistency. The same application code runs locally and on Kubernetes with only component configuration changes.
