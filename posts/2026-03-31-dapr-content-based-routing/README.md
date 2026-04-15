# How to Use Content-Based Routing in Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Content-Based Routing, CEL, Microservice

Description: Learn how to route Dapr pub/sub messages to different handler endpoints based on message content using CEL expressions for flexible event-driven architectures.

---

## What Is Content-Based Routing?

Content-based routing allows a Dapr subscriber to direct incoming messages to different handler paths based on the content of the CloudEvent envelope or its data payload. Rather than a single catch-all handler that switches on message type, you define routing rules using CEL (Common Expression Language) expressions that Dapr evaluates for each incoming message.

## Basic Content-Based Routing Setup

Define a subscription with routing rules that evaluate CloudEvent attributes:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: events-subscription
  namespace: production
spec:
  pubsubname: pubsub
  topic: events
  routes:
    rules:
    - match: event.type == "com.example.order.placed"
      path: /handlers/order-placed
    - match: event.type == "com.example.order.shipped"
      path: /handlers/order-shipped
    - match: event.type == "com.example.payment.received"
      path: /handlers/payment-received
    default: /handlers/events-fallback
  scopes:
  - event-processor
```

## Routing on Data Fields

To route based on message body content, use the `event.data` accessor in your CEL expression. Note that `event.data` requires the message to be a CloudEvent with a structured data field:

```yaml
routes:
  rules:
  - match: event.data.priority == "CRITICAL"
    path: /handlers/critical-events
  - match: event.data.region == "EU" && event.data.amount > 1000
    path: /handlers/high-value-eu
  - match: event.data.type == "refund"
    path: /handlers/refunds
  default: /handlers/standard-events
```

## CEL Expression Examples

CEL is expressive and supports common operations:

```yaml
# Check string equality
- match: event.type == "OrderCreated"
  path: /handlers/new-orders

# Check if a field exists
- match: has(event.data.couponCode)
  path: /handlers/coupon-orders

# Numeric comparison
- match: event.data.total > 500.0
  path: /handlers/high-value-orders

# Logical AND
- match: event.source == "mobile-app" && event.data.platform == "ios"
  path: /handlers/ios-mobile-orders

# String prefix check
- match: event.type.startsWith("com.example.payment")
  path: /handlers/payment-events
```

## Implementing Handlers in Node.js

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/handlers/critical-events", (req, res) => {
  const event = req.body;
  console.log(`CRITICAL EVENT: ${event.type}`, event.data);
  // Page on-call, trigger alert
  res.sendStatus(200);
});

app.post("/handlers/high-value-eu", (req, res) => {
  const event = req.body;
  console.log(`High value EU order: ${event.data.orderId}`);
  // Apply EU tax rules, notify compliance
  res.sendStatus(200);
});

app.post("/handlers/refunds", (req, res) => {
  const event = req.body;
  console.log(`Refund request: ${event.data.orderId}`);
  // Initiate refund workflow
  res.sendStatus(200);
});

app.post("/handlers/standard-events", (req, res) => {
  const event = req.body;
  console.log(`Standard event: ${event.type}`);
  res.sendStatus(200);
});

app.listen(3000);
```

## Testing Routing Rules

Publish events with different attributes to verify routing:

```bash
# Should route to /handlers/critical-events
curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/events \
  -H "Content-Type: application/json" \
  -d '{"priority": "CRITICAL", "message": "Service degraded"}'

# Should route to /handlers/high-value-eu
curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/events \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion": "1.0",
    "type": "com.example.order",
    "source": "web",
    "id": "evt-001",
    "data": {"region": "EU", "amount": 1500, "orderId": "ord-999"}
  }'
```

## Debugging Routing Decisions

Enable debug logging on the Dapr sidecar to see routing decisions:

```bash
kubectl logs deployment/event-processor -c daprd -n production | grep -i routing
```

## Summary

Content-based routing in Dapr pub/sub uses CEL expressions in subscription `routes.rules` to direct messages to specific handler paths based on CloudEvent attributes or data fields. This eliminates monolithic handler code and replaces it with clean, declarative routing logic that is easy to extend without modifying application code.
