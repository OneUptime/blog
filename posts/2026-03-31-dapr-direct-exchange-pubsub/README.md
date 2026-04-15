# How to Implement Direct Exchange with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Routing, Messaging, Microservice

Description: Learn how to implement a direct exchange pattern with Dapr Pub/Sub using dedicated topics or routing rules to send messages to a specific single subscriber.

---

## What Is a Direct Exchange?

A direct exchange routes messages to a specific subscriber based on an exact routing key match. Unlike fanout (which broadcasts to all) or topic exchange (which uses patterns), direct exchange targets one queue precisely. In Dapr, this maps to publishing to a dedicated topic per recipient, or using routing rules that match a specific `destination` field.

## Approach 1: Dedicated Topics per Service

The simplest direct exchange is publishing to a service-specific topic:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: notifications-pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

```python
from dapr.clients import DaprClient
import json

def send_direct_notification(service_name: str, payload: dict) -> None:
    """Send a notification directly to a specific service."""
    with DaprClient() as client:
        # Topic name is the target service identifier
        topic = f"direct.{service_name}"
        client.publish_event(
            pubsub_name="notifications-pubsub",
            topic_name=topic,
            data=json.dumps(payload),
            data_content_type="application/json",
        )
        print(f"Direct message sent to {service_name}")

# Send directly to billing service
send_direct_notification("billing-service", {
    "type": "charge",
    "customerId": "cust-42",
    "amount": 99.99,
})

# Send directly to fulfillment service
send_direct_notification("fulfillment-service", {
    "type": "ship",
    "orderId": "order-123",
    "address": "123 Main St",
})
```

## Approach 2: Content-Based Routing with Destination Field

Use routing rules so a single topic routes messages to the correct handler based on a `destination` field:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: direct-routing
spec:
  pubsubname: notifications-pubsub
  topic: notifications
  routes:
    rules:
    - match: 'event.data.destination == "billing"'
      path: /notify/billing
    - match: 'event.data.destination == "fulfillment"'
      path: /notify/fulfillment
    - match: 'event.data.destination == "reporting"'
      path: /notify/reporting
    default: /notify/unrouted
  scopes:
  - notification-router
```

## Publisher with Destination Field

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function sendDirect(destination, payload) {
  await client.pubsub.publish('notifications-pubsub', 'notifications', {
    destination,
    ...payload,
    sentAt: new Date().toISOString(),
  });
}

await sendDirect('billing', { type: 'invoice', invoiceId: 'inv-001' });
await sendDirect('fulfillment', { type: 'ship', orderId: 'order-456' });
await sendDirect('reporting', { type: 'report', period: '2026-Q1' });
```

## Subscriber with Route Handlers

```javascript
const { DaprServer } = require('@dapr/dapr');

const server = new DaprServer({ serverPort: '3000' });

// Subscribe with routing rules
await server.pubsub.subscribe('notifications-pubsub', 'notifications', {
  default: '/notify/unrouted',
  rules: [
    { match: 'event.data.destination == "billing"', path: '/notify/billing' },
    { match: 'event.data.destination == "fulfillment"', path: '/notify/fulfillment' },
  ],
});

// Handle billing messages via route
server.pubsub.subscribeToRoute('notifications-pubsub', 'notifications', 'notify/billing', async (data) => {
  console.log('Billing notification:', data);
  await billingService.processNotification(data);
});

// Handle fulfillment messages via route
server.pubsub.subscribeToRoute('notifications-pubsub', 'notifications', 'notify/fulfillment', async (data) => {
  console.log('Fulfillment notification:', data);
  await fulfillmentService.processNotification(data);
});

await server.start();
```

## When to Use Each Approach

| Approach | Pros | Cons |
|---|---|---|
| Dedicated topics | Simple, clear separation | More topics to manage |
| Destination field routing | Single topic, flexible | Routing logic in subscription config |

## Summary

Direct exchange in Dapr is implemented either with dedicated topics per destination service, or with a shared topic and content-based routing rules that match a `destination` field. Dedicated topics are simpler to reason about, while routing rules reduce topic sprawl. Both approaches ensure messages reach exactly one intended recipient.
