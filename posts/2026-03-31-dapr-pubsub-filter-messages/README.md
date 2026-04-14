# How to Filter Messages in Dapr Pub/Sub Subscriptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Message Filtering, Subscription, Microservice

Description: Learn how to use Dapr pub/sub message filtering with CEL expressions and routing rules so subscribers only process relevant messages.

---

## Why Filter Messages at the Broker Layer

Without filtering, every subscriber receives all messages on a topic and must discard irrelevant ones in application code. Dapr supports server-side filtering through subscription routing rules using Common Expression Language (CEL), reducing unnecessary processing.

## Basic Topic Routing with Rules

Dapr supports routing messages to different endpoints within the same topic based on message content.

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
    - match: event.type == "order.created"
      path: /orders/created
    - match: event.type == "order.cancelled"
      path: /orders/cancelled
    default: /orders/other
```

Messages are routed based on the CloudEvents `type` attribute.

## Filtering by Custom Attributes

Publish messages with custom metadata:

```bash
curl -X POST "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.region=us-east" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order.created",
    "region": "us-east",
    "orderId": "1001",
    "amount": 150
  }'
```

Route based on data fields using CEL:

```yaml
routes:
  rules:
  - match: event.data.region == "us-east"
    path: /orders/us-east
  - match: event.data.region == "eu-west"
    path: /orders/eu-west
  - match: int(event.data.amount) > 1000
    path: /orders/high-value
  default: /orders/standard
```

## Programmatic Filtering in Code

For complex filtering logic, handle routing programmatically:

```javascript
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders",
      routes: {
        rules: [
          {
            match: `event.data.priority == "high"`,
            path: "/orders/high-priority",
          },
          {
            match: `event.data.priority == "low"`,
            path: "/orders/low-priority",
          },
        ],
        default: "/orders/normal",
      },
    },
  ]);
});
```

## Drop Unwanted Messages

Return HTTP 200 with `DROP` status to silently discard messages that pass through but are not relevant:

```javascript
app.post("/orders/other", (req, res) => {
  // Acknowledge but discard
  res.status(200).json({ status: "DROP" });
});
```

## Using Multiple Topics as a Filter

Instead of one broad topic with filtering, consider publishing to narrow topics:

```bash
# Publisher routes by type at publish time
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders.created \
  -H "Content-Type: application/json" \
  -d '{"orderId": "1001"}'

curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders.cancelled \
  -H "Content-Type: application/json" \
  -d '{"orderId": "1001"}'
```

Each service subscribes only to the topics it cares about, avoiding any filtering overhead.

## Summary

Dapr pub/sub filtering is achieved through subscription routing rules using CEL expressions that match CloudEvents attributes and data fields. For complex scenarios, combine routing rules with application-level DROP responses or publish to narrow, purpose-specific topics from the start.
