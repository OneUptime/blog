# How to Implement Event Filtering with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Filtering, Pub/Sub, Subscription, Routing

Description: Filter Dapr pub/sub events at the subscription level using CEL expressions and routing rules to route only relevant events to each microservice handler.

---

## Overview

Event filtering in Dapr allows subscribers to receive only the events they care about, reducing unnecessary processing. Dapr supports content-based routing using Common Expression Language (CEL) expressions in subscription rules.

## Basic Subscription with Routing Rules

Route events based on their data content:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-routing
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
    - match: event.data.status == "pending"
      path: /orders/pending
    - match: event.data.status == "shipped"
      path: /orders/shipped
    - match: event.data.status == "cancelled"
      path: /orders/cancelled
    default: /orders/other
```

## Filtering by Event Metadata

Filter based on CloudEvents metadata fields:

```yaml
routes:
  rules:
  - match: event.type == "com.example.order.created" && event.source == "web"
    path: /orders/web-created
  - match: event.type == "com.example.order.created" && event.source == "mobile"
    path: /orders/mobile-created
  default: /orders/generic
```

## Programmatic Filtering in the Handler

For complex filter logic, apply additional filtering within the handler:

```javascript
const { DaprServer } = require('@dapr/dapr');
const server = new DaprServer();

await server.pubsub.subscribe('pubsub', 'orders', async (data) => {
  // Secondary filter: only process high-value orders
  if (data.totalAmount < 100) {
    console.log(`Skipping low-value order: ${data.orderId}`);
    return { status: 'DROP' };
  }

  // Only process orders for specific region
  if (!['US', 'CA'].includes(data.region)) {
    return { status: 'DROP' };
  }

  await processHighValueOrder(data);
  return { status: 'SUCCESS' };
});
```

## Returning DROP vs SUCCESS

Dapr supports three return statuses from a subscriber:

```javascript
app.post('/orders/pending', async (req, res) => {
  const event = req.body;

  if (!isValidOrder(event.data)) {
    // Acknowledge but discard - prevents retry
    return res.status(200).json({ status: 'DROP' });
  }

  if (await isDuplicate(event.id)) {
    // Silently drop duplicates
    return res.status(200).json({ status: 'DROP' });
  }

  try {
    await processPendingOrder(event.data);
    res.status(200).json({ status: 'SUCCESS' });
  } catch (err) {
    // Return RETRY to trigger redelivery
    res.status(200).json({ status: 'RETRY' });
  }
});
```

## Using CEL Expressions for Numeric Ranges

Filter events by numeric field ranges:

```yaml
routes:
  rules:
  - match: event.data.priority >= 1 && event.data.priority <= 3
    path: /high-priority
  - match: event.data.priority >= 4 && event.data.priority <= 7
    path: /medium-priority
  default: /low-priority
```

## Testing Subscription Filtering

Publish test events and verify routing:

```bash
# Publish a pending order
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","orderId":"123","totalAmount":500}'

# Check which handler received it
kubectl logs deployment/order-service | grep "pending"
```

## Summary

Dapr's subscription routing rules enable declarative event filtering using CEL expressions, eliminating the need for all-or-nothing subscriptions. By routing events to specific handlers based on content and metadata, you reduce unnecessary processing and create cleaner, more focused service logic. Combine routing rules with programmatic DROP responses for complex filter scenarios that CEL expressions alone cannot express.
