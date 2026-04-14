# How to Use Dapr Service Invocation with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Python, Microservice, HTTP

Description: Learn how to use Dapr's Service Invocation API in Python to call other microservices with automatic service discovery, retries, and mTLS.

---

## Introduction

Dapr's Service Invocation building block lets Python microservices call each other using app-ids rather than hostnames or IP addresses. Dapr handles name resolution, load balancing, automatic retries, and mTLS encryption without any extra configuration in your Python code.

## Installation

```bash
pip install dapr flask
```

## Setting Up the Caller Service

```python
# order_service.py
import json
from dapr.clients import DaprClient

def check_inventory(product_id: str) -> dict:
    with DaprClient() as client:
        result = client.invoke_method(
            app_id="inventory-service",
            method_name=f"stock/{product_id}",
            http_verb="GET",
            data=b"",
        )
        return json.loads(result.text())

def create_payment(order_id: str, amount: float) -> dict:
    with DaprClient() as client:
        payload = json.dumps({"orderId": order_id, "amount": amount})
        result = client.invoke_method(
            app_id="payment-service",
            method_name="charge",
            http_verb="POST",
            data=payload.encode("utf-8"),
            content_type="application/json",
        )
        return json.loads(result.text())
```

## Setting Up the Receiver Service

Create a Flask app that handles invocation:

```python
# inventory_service.py
from flask import Flask, jsonify, request

app = Flask(__name__)

# In-memory stock data
stock = {
    "widget": {"productId": "widget", "available": 100, "reserved": 5},
    "gadget": {"productId": "gadget", "available": 50, "reserved": 2},
}

@app.route("/stock/<product_id>", methods=["GET"])
def get_stock(product_id):
    item = stock.get(product_id)
    if not item:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(item)

@app.route("/reserve", methods=["POST"])
def reserve_stock():
    data = request.get_json()
    product_id = data.get("productId")
    quantity = data.get("quantity", 1)

    if product_id not in stock:
        return jsonify({"error": "Product not found"}), 404

    stock[product_id]["reserved"] += quantity
    stock[product_id]["available"] -= quantity
    return jsonify({"success": True, "reserved": quantity})

if __name__ == "__main__":
    app.run(port=5001)
```

## Passing Headers

Include custom headers in service invocations:

```python
from dapr.clients.grpc._helpers import MetadataDict

with DaprClient() as client:
    metadata: MetadataDict = {
        "x-correlation-id": ["req-abc-123"],
        "x-user-id": ["user-42"],
    }

    result = client.invoke_method(
        app_id="auth-service",
        method_name="validate",
        http_verb="POST",
        data=json.dumps({"token": "my-jwt"}).encode("utf-8"),
        metadata=metadata,
    )
```

## Running Both Services

```bash
# Terminal 1 - Start inventory service
dapr run --app-id inventory-service --app-port 5001 \
  -- python inventory_service.py

# Terminal 2 - Start order service
dapr run --app-id order-service --app-port 5000 \
  -- python order_service.py
```

## Configuring Resiliency

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: service-resiliency
spec:
  policies:
    retries:
      default-retry:
        policy: exponential
        maxInterval: 8s
        maxRetries: 3
  targets:
    apps:
      inventory-service:
        retry: default-retry
```

## Summary

Dapr Service Invocation in Python replaces hardcoded URLs and manual retry logic with a single `client.invoke_method()` call. Dapr manages service discovery, load balancing, and mTLS encryption so your Python microservices can focus entirely on business logic.
