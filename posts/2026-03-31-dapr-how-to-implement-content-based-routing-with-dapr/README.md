# How to Implement Content-Based Routing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Content-Based Routing, Messaging, Microservice

Description: Implement content-based routing in Dapr pub/sub to route messages to different handlers based on CloudEvent attributes or payload content.

---

## Overview

Content-based routing allows a subscriber to direct incoming messages to different handler endpoints based on message attributes or payload values. Dapr supports this through the programmatic subscription API with routing rules using CloudEvent expression matching. This guide walks through implementing content-based routing with both expression-based and code-based approaches.

## CloudEvent Structure in Dapr

Every message published through Dapr is wrapped in a CloudEvent envelope:

```json
{
  "specversion": "1.0",
  "type": "com.example.order.created",
  "source": "order-service",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "time": "2026-03-31T12:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "order-001",
    "priority": "high",
    "region": "us-east",
    "amount": 1250.00
  }
}
```

## Routing with the Programmatic Subscription API

Return routing rules from your `/dapr/subscribe` endpoint:

```javascript
// Node.js subscriber with content-based routing
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      routes: {
        rules: [
          {
            // Route high-priority orders
            match: 'event.data.priority == "high"',
            path: '/orders/high-priority'
          },
          {
            // Route large orders to review queue
            match: 'event.data.amount > 1000',
            path: '/orders/review'
          },
          {
            // Route by region
            match: 'event.data.region == "us-east"',
            path: '/orders/us-east'
          }
        ],
        // Default route for unmatched messages
        default: '/orders/standard'
      }
    }
  ]);
});

app.post('/orders/high-priority', (req, res) => {
  const { data } = req.body;
  console.log(`HIGH PRIORITY: ${data.orderId} - $${data.amount}`);
  // Expedite processing
  res.sendStatus(200);
});

app.post('/orders/review', (req, res) => {
  const { data } = req.body;
  console.log(`REVIEW REQUIRED: ${data.orderId} - $${data.amount}`);
  // Flag for manual review
  res.sendStatus(200);
});

app.post('/orders/us-east', (req, res) => {
  const { data } = req.body;
  console.log(`US-EAST order: ${data.orderId}`);
  res.sendStatus(200);
});

app.post('/orders/standard', (req, res) => {
  const { data } = req.body;
  console.log(`Standard order: ${data.orderId}`);
  res.sendStatus(200);
});

app.listen(3000, () => console.log('Subscriber on port 3000'));
```

## Routing with CloudEvent Type

Route based on the CloudEvent `type` attribute set during publishing:

```python
# Publisher - set event type
import requests

def publish_order(order_data, event_type):
    url = "http://localhost:3500/v1.0/publish/pubsub/orders"
    headers = {
        "Content-Type": "application/cloudevents+json"
    }
    event = {
        "specversion": "1.0",
        "type": event_type,
        "source": "order-service",
        "id": f"evt-{order_data['orderId']}",
        "datacontenttype": "application/json",
        "data": order_data
    }
    requests.post(url, json=event, headers=headers)

# Publish different event types
publish_order({"orderId": "001", "amount": 50}, "order.created")
publish_order({"orderId": "002", "amount": 5000}, "order.created.bulk")
publish_order({"orderId": "003"}, "order.cancelled")
```

Subscriber routing on event type:

```python
# Subscriber routing on type
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
                        "match": 'event.type == "order.created.bulk"',
                        "path": "/orders/bulk"
                    },
                    {
                        "match": 'event.type == "order.cancelled"',
                        "path": "/orders/cancelled"
                    }
                ],
                "default": "/orders/created"
            }
        }
    ])

@app.route('/orders/created', methods=['POST'])
def handle_created():
    data = request.get_json().get('data', {})
    print(f"New order: {data}")
    return '', 200

@app.route('/orders/bulk', methods=['POST'])
def handle_bulk():
    data = request.get_json().get('data', {})
    print(f"Bulk order: {data}")
    return '', 200

@app.route('/orders/cancelled', methods=['POST'])
def handle_cancelled():
    data = request.get_json().get('data', {})
    print(f"Cancelled: {data}")
    return '', 200

if __name__ == '__main__':
    app.run(port=5000)
```

## Declarative Routing with Subscription YAML

Define routing rules in a Subscription manifest for Kubernetes:

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
    - match: 'event.data.priority == "high" && event.data.amount > 500'
      path: /orders/vip
    - match: 'event.data.region == "eu-west"'
      path: /orders/eu
    - match: 'event.data.amount > 10000'
      path: /orders/enterprise
    default: /orders/standard
  scopes:
  - order-processor
```

## Combining Multiple Conditions

CEL (Common Expression Language) expressions support complex conditions:

```javascript
// Complex routing rules
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'pubsub',
      topic: 'orders',
      routes: {
        rules: [
          {
            // VIP: high priority AND large amount
            match: 'event.data.priority == "high" && event.data.amount > 500',
            path: '/orders/vip'
          },
          {
            // International: non-US regions
            match: '!(event.data.region.startsWith("us-"))',
            path: '/orders/international'
          },
          {
            // Weekend orders need different processing
            match: 'event.data.dayOfWeek in ["Saturday", "Sunday"]',
            path: '/orders/weekend'
          }
        ],
        default: '/orders/standard'
      }
    }
  ]);
});
```

## Testing Routing Rules

Test each routing path:

```bash
# High priority order
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"priority": "high", "orderId": "001", "amount": 750}'

# International order
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"region": "eu-west-1", "orderId": "002", "amount": 200}'

# Standard order (goes to default)
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"region": "us-east-1", "orderId": "003", "amount": 50}'
```

## Summary

Dapr content-based routing enables routing messages to specific handler endpoints based on CloudEvent attributes or data payload values using CEL expressions. Both programmatic (via `/dapr/subscribe`) and declarative (via Subscription YAML) approaches support multi-rule routing with a fallback default route. This pattern is powerful for splitting a single high-volume topic into specialized processing pipelines without creating separate topics or requiring a dedicated message router service.
