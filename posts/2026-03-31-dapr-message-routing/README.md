# How to Implement Message Routing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Message Routing, Subscription, Event-Driven

Description: Learn how to route Dapr Pub/Sub messages to different endpoints based on message content using routing rules in subscription configurations.

---

Dapr Pub/Sub message routing lets you direct messages from a single topic to different handler endpoints based on the content of the CloudEvent. Instead of a single catch-all handler, you define routing rules that match specific message attributes and route to specialized processors.

## How Routing Works

Dapr evaluates routing rules in order. The first matching rule determines the route. If no rule matches, the default route is used. Rules use Common Expression Language (CEL) to express conditions.

## Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
```

## Declarative Subscription with Routing Rules

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-routing
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
    - match: event.type == "order.priority" && event.data.priority == "high"
      path: /orders/priority
    - match: event.type == "order.standard"
      path: /orders/standard
    - match: event.data.region == "EU"
      path: /orders/eu
    default: /orders/default
```

## Subscriber Service with Multiple Routes

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "orders",
        "routes": {
            "rules": [
                {
                    "match": "event.type == 'order.priority' && event.data.priority == 'high'",
                    "path": "/orders/priority"
                },
                {
                    "match": "event.type == 'order.standard'",
                    "path": "/orders/standard"
                }
            ],
            "default": "/orders/default"
        }
    }])

@app.route('/orders/priority', methods=['POST'])
def handle_priority_order():
    order = request.json
    print(f"Priority handler: Processing urgent order {order.get('orderId')}")
    # Fast-path processing for priority orders
    return jsonify({"status": "SUCCESS"})

@app.route('/orders/standard', methods=['POST'])
def handle_standard_order():
    order = request.json
    print(f"Standard handler: Processing order {order.get('orderId')}")
    return jsonify({"status": "SUCCESS"})

@app.route('/orders/default', methods=['POST'])
def handle_default_order():
    order = request.json
    print(f"Default handler: Processing order {order.get('orderId')}")
    return jsonify({"status": "SUCCESS"})

if __name__ == '__main__':
    app.run(port=5001)
```

## Publishing Messages with Type Metadata

When publishing, include CloudEvent type metadata to trigger routing rules:

```bash
# Publish a high-priority order
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "order.priority",
    "source": "order-service",
    "id": "a1b2c3",
    "datacontenttype": "application/json",
    "data": {
      "orderId": "ORD-HIGH-001",
      "priority": "high",
      "total": 5000.00
    }
  }'

# Publish a standard order
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "order.standard",
    "source": "order-service",
    "id": "d4e5f6",
    "datacontenttype": "application/json",
    "data": {
      "orderId": "ORD-STD-002",
      "total": 49.99
    }
  }'
```

## Verifying Routing Behavior

```bash
dapr run --app-id order-router \
  --app-port 5001 \
  --components-path ./components \
  -- python router.py
```

## Summary

Dapr message routing uses CEL expressions to evaluate CloudEvent attributes and direct messages to specialized handlers. This eliminates complex if-else dispatch logic from your application code. Define routing rules declaratively in Subscription resources to keep routing configuration separate from business logic.
