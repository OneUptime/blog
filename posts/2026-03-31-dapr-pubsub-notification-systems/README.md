# How to Use Dapr Pub/Sub for Notification Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Notification, Event-Driven, Microservice

Description: Learn how to build a scalable notification system using Dapr pub/sub to fan out messages to email, SMS, and push notification channels.

---

## Why Dapr Pub/Sub for Notifications?

A notification system needs to react to business events and dispatch messages across multiple channels (email, SMS, push, webhooks) without the event source knowing anything about notification channels. Dapr pub/sub is ideal here: services publish domain events, and a notification service subscribes and fans out to the appropriate channels.

## Architecture

```text
Order Service      --> publishes to "order-events" topic
Payment Service    --> publishes to "payment-events" topic
Notification Service --> subscribes to both, routes to channels
  |-- Email Channel (SendGrid binding)
  |-- SMS Channel (Twilio binding)
  |-- Push Channel (external push service)
```

## Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
```

## Notification Service Subscriptions

```javascript
const express = require("express");
const { DaprClient } = require("@dapr/dapr");
const app = express();
app.use(express.json());
const client = new DaprClient();

app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "order-events",
      routes: {
        rules: [
          { match: `event.data.type == "OrderConfirmed"`, path: "/notify/order-confirmed" },
          { match: `event.data.type == "OrderShipped"`, path: "/notify/order-shipped" },
        ],
      },
    },
    {
      pubsubname: "pubsub",
      topic: "payment-events",
      routes: {
        rules: [
          { match: `event.data.type == "PaymentFailed"`, path: "/notify/payment-failed" },
        ],
      },
    },
  ]);
});
```

## Sending Email via Dapr Output Binding

Use the SendGrid output binding to send emails:

```javascript
app.post("/notify/order-confirmed", async (req, res) => {
  const { orderId, customerId, email, total } = req.body.data;

  await client.binding.send("sendgrid", "create",
    `<p>Your order for $${total} has been confirmed.</p>`,
    {
      emailTo: email,
      subject: `Order ${orderId} Confirmed`,
    },
  );

  console.log(`Confirmation email sent for order ${orderId}`);
  res.sendStatus(200);
});
```

## Sending SMS via Twilio Binding

```javascript
app.post("/notify/order-shipped", async (req, res) => {
  const { orderId, phone, trackingNumber } = req.body.data;

  await client.binding.send("twilio-sms", "create",
    `Your order ${orderId} has shipped! Tracking: ${trackingNumber}`,
    { toNumber: phone },
  );

  res.sendStatus(200);
});
```

## Fan-Out to Multiple Channels

For critical events, notify across all channels simultaneously:

```javascript
app.post("/notify/payment-failed", async (req, res) => {
  const { customerId, orderId, email, phone, amount } = req.body.data;

  // Fan out to all channels in parallel
  await Promise.allSettled([
    client.binding.send("sendgrid", "create",
      `<p>Your payment of $${amount} for order ${orderId} failed. Please update your payment method.</p>`,
      {
        emailTo: email,
        subject: "Payment Failed",
      },
    ),
    client.binding.send("twilio-sms", "create",
      `Payment failed for order ${orderId}. Please update your payment details.`,
      { toNumber: phone },
    ),
  ]);

  res.sendStatus(200);
});
```

## Rate Limiting Notifications

Prevent notification flooding using Dapr state for tracking:

```javascript
async function shouldNotify(customerId, notificationType, cooldownSeconds) {
  const key = `notify-cooldown:${customerId}:${notificationType}`;
  const existing = await client.state.get("statestore", key);
  if (existing) return false;

  await client.state.save("statestore", [
    {
      key,
      value: true,
      metadata: { ttlInSeconds: cooldownSeconds.toString() },
    },
  ]);
  return true;
}
```

## Summary

Dapr pub/sub enables scalable notification systems by decoupling event sources from notification channels. Services publish domain events, and a dedicated notification service subscribes and fans out to email, SMS, and push channels using Dapr output bindings. Rate limiting via state TTLs prevents notification storms during incidents.
