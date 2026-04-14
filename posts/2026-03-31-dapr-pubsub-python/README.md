# How to Use Dapr Pub/Sub with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Python, Messaging, Event-Driven

Description: Learn how to publish and subscribe to events in Python using the Dapr Pub/Sub API for decoupled, event-driven microservice communication.

---

## Introduction

Dapr's Pub/Sub API lets Python microservices communicate through events without direct coupling. Publishers send messages to topics and Dapr routes them to subscribers, handling delivery guarantees and broker abstraction.

## Installation

```bash
pip install dapr flask
```

Configure a pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
```

## Publishing Events

Use `DaprClient` to publish events:

```python
import json
from dapr.clients import DaprClient

def publish_order_created(order: dict) -> None:
    with DaprClient() as client:
        event_data = {
            "orderId": order["id"],
            "customerId": order["customerId"],
            "total": order["total"],
            "timestamp": "2026-03-31T12:00:00Z",
        }

        client.publish_event(
            pubsub_name="pubsub",
            topic_name="order-created",
            data=json.dumps(event_data),
            data_content_type="application/json",
        )
        print(f"Published order-created event for: {order['id']}")
```

## Publishing with Metadata

Include broker-specific metadata:

```python
with DaprClient() as client:
    client.publish_event(
        pubsub_name="pubsub",
        topic_name="notifications",
        data=json.dumps({"userId": "user-42", "message": "Order shipped!"}),
        data_content_type="application/json",
        publish_metadata={
            "ttlInSeconds": "300",
            "partitionKey": "user-42",
        }
    )
```

## Subscribing with Flask

Create a Flask subscriber:

```python
# notification_service.py
from flask import Flask, request, jsonify
from flask_dapr import DaprApp

app = Flask(__name__)
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="pubsub", topic="order-created")
def handle_order_created():
    event = request.get_json()
    data = event.get("data", {})
    print(f"Sending confirmation for order: {data['orderId']}")
    send_confirmation_email(data["customerId"], data["orderId"])
    return jsonify({"status": "SUCCESS"}), 200

@dapr_app.subscribe(pubsub="pubsub", topic="order-cancelled")
def handle_order_cancelled():
    event = request.get_json()
    data = event.get("data", {})
    print(f"Processing cancellation for order: {data['orderId']}")
    process_refund(data["orderId"])
    return jsonify({"status": "SUCCESS"}), 200

if __name__ == "__main__":
    app.run(port=5001)
```

## Installing the Flask Extension

```bash
pip install flask-dapr
```

## Subscribing with Raw HTTP (No Extension)

If you prefer not to use the extension:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "order-created",
            "route": "/order-created",
        }
    ])

@app.route("/order-created", methods=["POST"])
def handle_order():
    event = request.get_json()
    data = event.get("data", {})
    print("Order received:", data.get("orderId"))
    return jsonify({"status": "SUCCESS"})
```

## Running the Services

```bash
# Publisher
dapr run --app-id order-service --app-port 5000 -- python order_service.py

# Subscriber
dapr run --app-id notification-service --app-port 5001 -- python notification_service.py
```

## Summary

Dapr Pub/Sub in Python lets you build decoupled, event-driven services with simple `publish_event()` calls on the publisher side and Flask route handlers on the subscriber side. The Dapr Flask extension simplifies subscription registration, while Dapr handles message delivery, at-least-once guarantees, and broker portability.
