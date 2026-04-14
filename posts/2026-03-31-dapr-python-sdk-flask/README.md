# How to Use Dapr Python SDK with Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Flask, Microservice, Pub/Sub

Description: Learn how to integrate the Dapr Python SDK with Flask to handle pub/sub events, manage state, and invoke other Dapr-enabled services.

---

## Introduction

Flask is a popular Python micro-framework that works well with Dapr for building microservices. The `dapr` package gives Flask applications access to state management, pub/sub, and service invocation capabilities with minimal setup.

## Prerequisites

```bash
pip install dapr flask cloudevents
dapr init
```

## Creating the Flask App

```python
# app.py
import json
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
from cloudevents.http import from_http

app = Flask(__name__)
```

## Registering Pub/Sub Subscriptions

Dapr calls the `/dapr/subscribe` endpoint to discover subscriptions:

```python
@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    subscriptions = [
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/orders"
        }
    ]
    return jsonify(subscriptions)
```

## Handling Pub/Sub Events

```python
@app.route("/orders", methods=["POST"])
def handle_order():
    event = from_http(request.headers, request.get_data())
    order_data = json.loads(event.data)
    print(f"Processing order: {order_data}")
    return jsonify({"status": "SUCCESS"})
```

## State Management

```python
@app.route("/state/<key>", methods=["POST"])
def save_state(key):
    data = request.get_json()
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=key,
            value=json.dumps(data)
        )
    return jsonify({"saved": key})

@app.route("/state/<key>", methods=["GET"])
def get_state(key):
    with DaprClient() as client:
        result = client.get_state(store_name="statestore", key=key)
        if result.data:
            return jsonify({"value": result.data.decode("utf-8")})
    return jsonify({"error": "not found"}), 404
```

## Publishing Events from Flask

```python
@app.route("/publish", methods=["POST"])
def publish_event():
    payload = request.get_json()
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="orders",
            data=json.dumps(payload),
            data_content_type="application/json"
        )
    return jsonify({"published": True})
```

## Running the Flask App with Dapr

```bash
dapr run \
  --app-id flask-service \
  --app-port 5000 \
  --dapr-http-port 3500 \
  -- flask run --host 0.0.0.0 --port 5000
```

## Testing the Endpoint

```bash
curl -X POST http://localhost:5000/publish \
  -H "Content-Type: application/json" \
  -d '{"order_id": "123", "item": "book"}'
```

## Summary

Flask and Dapr integrate naturally through the standard HTTP subscription model. Your Flask app exposes the `/dapr/subscribe` endpoint to register topics, and Dapr forwards matching events to your route handlers. State management and service invocation are available via the `DaprClient` throughout your Flask routes.
