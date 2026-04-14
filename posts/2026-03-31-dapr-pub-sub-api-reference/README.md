# How to Use the Dapr Pub/Sub API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, API, Messaging, Event-Driven

Description: A practical reference for the Dapr Pub/Sub API covering publish, subscribe, bulk publish, and CloudEvents envelope format.

---

## Overview

The Dapr Pub/Sub API lets applications publish messages to topics and subscribe to receive them, without coupling to a specific message broker. Publishers and subscribers communicate through the Dapr sidecar, which handles broker-specific protocols, retries, and message ordering.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0/publish/{pubsubName}/{topic}
```

## Publishing a Message

**POST** `/v1.0/publish/{pubsubName}/{topic}`

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ord-123",
    "customerId": "cust-456",
    "amount": 99.99
  }'
```

## Publishing with Metadata

Pass metadata to control message TTL and other broker-specific behaviors:

```bash
curl -X POST \
  "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.ttlInSeconds=300&metadata.rawPayload=false" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-124"}'
```

## Bulk Publishing

**POST** `/v1.0/publish/bulk/{pubsubName}/{topic}`

```bash
curl -X POST http://localhost:3500/v1.0/publish/bulk/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '[
    {
      "entryId": "entry-1",
      "event": {"orderId": "ord-200"},
      "contentType": "application/json"
    },
    {
      "entryId": "entry-2",
      "event": {"orderId": "ord-201"},
      "contentType": "application/json"
    }
  ]'
```

## Subscribing with a Programmatic Subscription

Return the subscription list from your app's `/dapr/subscribe` endpoint:

```javascript
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders",
      routes: {
        default: "/orders-handler"
      },
      metadata: {
        rawPayload: "false"
      }
    }
  ]);
});
```

## Handling Incoming Messages

```javascript
app.post("/orders-handler", (req, res) => {
  const cloudEvent = req.body;
  console.log("Received:", cloudEvent.data);

  // Return 200 with status SUCCESS to ACK the message
  res.status(200).json({ status: "SUCCESS" });

  // Return 200 with status DROP to drop the message
  // res.status(200).json({ status: "DROP" });

  // Return 200 with status RETRY to retry the message
  // res.status(200).json({ status: "RETRY" });
});
```

## CloudEvents Envelope

Dapr wraps all published messages in the CloudEvents 1.0 spec:

```json
{
  "specversion": "1.0",
  "type": "com.dapr.event.sent",
  "source": "order-service",
  "id": "a1b2c3d4-1234-1234-1234-a1b2c3d4e5f6",
  "time": "2026-03-31T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "ord-123"
  }
}
```

## Dead Letter Topics

Configure a dead letter topic for messages that fail all retries:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders-handler
  deadLetterTopic: orders-dead-letter
```

## Summary

The Dapr Pub/Sub API decouples message producers from consumers and supports at-least-once delivery with automatic retries. Use bulk publishing for high-throughput scenarios, return appropriate HTTP status codes to control retry behavior, and configure dead letter topics to handle persistent failures gracefully.
