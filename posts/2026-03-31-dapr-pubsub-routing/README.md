# How to Use Dapr Pub/Sub Message Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Message Routing, CEL, Event-Driven

Description: Configure Dapr pub/sub message routing to route messages to different handlers based on message content using CEL expressions and route rules.

---

## What Is Dapr Pub/Sub Message Routing?

Dapr message routing allows you to route incoming pub/sub messages to different application endpoints based on the message content, using rules evaluated against the CloudEvent metadata. Instead of a single route handling all messages for a topic, you can route `order.created` events to one handler and `order.cancelled` to another, all within a single subscription.

## How Routing Works

```mermaid
flowchart TD
    Sidecar[Dapr Sidecar] --> R{Route Rules}
    R -->|event.type == order.created| H1[/create-order]
    R -->|event.type == order.cancelled| H2[/cancel-order]
    R -->|event.type == order.shipped| H3[/ship-order]
    R -->|No rule matches| H4[/default-handler]
```

## CEL Expressions for Route Rules

Routing rules use Common Expression Language (CEL) to match against CloudEvent attributes and data fields:

| Expression | Description |
|-----------|-------------|
| `event.type == "order.created"` | Match event type |
| `event.source == "web-app"` | Match event source |
| `int(event.data.amount) > 100` | Match data field |
| `event.subject == "high-priority"` | Match subject |

## Subscription with Route Rules

### Programmatic Subscription

```python
# subscriber.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "routes": {
                "rules": [
                    {
                        "match": "event.type == \"order.created\"",
                        "path": "/orders/create"
                    },
                    {
                        "match": "event.type == \"order.cancelled\"",
                        "path": "/orders/cancel"
                    },
                    {
                        "match": "event.type == \"order.shipped\"",
                        "path": "/orders/ship"
                    }
                ],
                "default": "/orders/default"
            }
        }
    ])

@app.route('/orders/create', methods=['POST'])
def create_order():
    event = request.get_json()
    order = event.get("data", {})
    print(f"Creating order: {order.get('orderId')}")
    return jsonify({"status": "SUCCESS"})

@app.route('/orders/cancel', methods=['POST'])
def cancel_order():
    event = request.get_json()
    order = event.get("data", {})
    print(f"Cancelling order: {order.get('orderId')}")
    return jsonify({"status": "SUCCESS"})

@app.route('/orders/ship', methods=['POST'])
def ship_order():
    event = request.get_json()
    order = event.get("data", {})
    print(f"Shipping order: {order.get('orderId')}")
    return jsonify({"status": "SUCCESS"})

@app.route('/orders/default', methods=['POST'])
def default_order():
    event = request.get_json()
    print(f"Unknown event type: {event.get('type')}")
    return jsonify({"status": "SUCCESS"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

### Declarative Subscription with Routing

```yaml
# subscription-with-routing.yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
    - match: event.type == "order.created"
      path: /orders/create
    - match: event.type == "order.cancelled"
      path: /orders/cancel
    - match: event.type == "order.shipped"
      path: /orders/ship
    default: /orders/default
scopes:
- order-service
```

## Publishing with Event Type

Publishers set the `type` field via CloudEvent metadata:

```bash
# Publish an order.created event
curl -X POST \
  "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.cloudevent.type=order.created" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-001", "customerId": "CUST-42", "amount": 99.99}'

# Publish an order.cancelled event
curl -X POST \
  "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.cloudevent.type=order.cancelled" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-001", "reason": "customer_request"}'
```

## Python Publisher with Event Types

```python
import requests
import os

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def publish_event(topic, event_type, data):
    url = (f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/{topic}"
           f"?metadata.cloudevent.type={event_type}")
    resp = requests.post(url, json=data,
                         headers={"Content-Type": "application/json"})
    resp.raise_for_status()
    print(f"Published {event_type}: {data}")

# Publish different event types to the same topic
publish_event("orders", "order.created", {
    "orderId": "ORD-001", "amount": 99.99
})

publish_event("orders", "order.shipped", {
    "orderId": "ORD-001", "trackingCode": "TRK-XYZ"
})

publish_event("orders", "order.cancelled", {
    "orderId": "ORD-002", "reason": "payment_failed"
})
```

## Routing on Data Fields

Use CEL to route based on message content:

```python
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "routes": {
                "rules": [
                    # High-value orders get priority processing
                    {
                        "match": "int(event.data.amount) >= 1000",
                        "path": "/orders/high-value"
                    },
                    # VIP customers get express processing
                    {
                        "match": "event.data.customerTier == \"vip\"",
                        "path": "/orders/vip"
                    }
                ],
                "default": "/orders/standard"
            }
        }
    ])
```

## Node.js Example

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([{
    pubsubname: 'pubsub',
    topic: 'orders',
    routes: {
      rules: [
        {
          match: 'event.type == "order.created"',
          path: '/orders/created'
        },
        {
          match: 'event.type == "order.updated"',
          path: '/orders/updated'
        }
      ],
      default: '/orders/other'
    }
  }]);
});

app.post('/orders/created', (req, res) => {
  const { data } = req.body;
  console.log('Order created:', data.orderId);
  res.json({ status: 'SUCCESS' });
});

app.post('/orders/updated', (req, res) => {
  const { data } = req.body;
  console.log('Order updated:', data.orderId, data.status);
  res.json({ status: 'SUCCESS' });
});

app.post('/orders/other', (req, res) => {
  console.log('Unknown order event:', req.body.type);
  res.json({ status: 'SUCCESS' });
});

app.listen(3001);
```

## Combining Multiple Conditions

```json
{
  "match": "event.type == \"order.created\" && int(event.data.amount) > 500",
  "path": "/orders/high-value-new"
}
```

## Summary

Dapr pub/sub message routing lets you dispatch messages to different application endpoints based on their content using CEL expressions. Instead of building routing logic inside a single handler, you declare routing rules in the subscription configuration. This keeps handlers focused on a single responsibility and enables clean event-driven architectures where different event types are processed by the most appropriate code path.
