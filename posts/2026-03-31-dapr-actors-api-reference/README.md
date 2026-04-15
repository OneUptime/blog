# How to Use the Dapr Actors API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, API, State, Timer

Description: A practical reference for the Dapr Actors API covering actor invocation, state management, timers, reminders, and reentrancy.

---

## Overview

The Dapr Actors API implements the virtual actor pattern, where each actor instance has a unique identity, single-threaded execution, and persistent state. The Dapr sidecar manages actor placement, activation, and deactivation automatically.

## Base URL

```yaml
http://localhost:{daprPort}/v1.0/actors/{actorType}/{actorId}
```

## Invoking an Actor Method

**POST** `/v1.0/actors/{actorType}/{actorId}/method/{methodName}`

```bash
curl -X POST \
  http://localhost:3500/v1.0/actors/CartActor/user-123/method/AddItem \
  -H "Content-Type: application/json" \
  -d '{"itemId": "prod-456", "quantity": 2}'
```

## Getting Actor State

**GET** `/v1.0/actors/{actorType}/{actorId}/state/{key}`

```bash
curl http://localhost:3500/v1.0/actors/CartActor/user-123/state/cart-items
```

## Saving Actor State (from within the actor)

**POST** `/v1.0/actors/{actorType}/{actorId}/state`

```bash
curl -X POST \
  http://localhost:3500/v1.0/actors/CartActor/user-123/state \
  -H "Content-Type: application/json" \
  -d '[
    {
      "operation": "upsert",
      "request": {
        "key": "cart-items",
        "value": [{"itemId": "prod-456", "quantity": 2}]
      }
    }
  ]'
```

## Creating a Timer

Timers fire after a delay and call a specified actor method:

**POST** `/v1.0/actors/{actorType}/{actorId}/timers/{timerName}`

```bash
curl -X POST \
  http://localhost:3500/v1.0/actors/CartActor/user-123/timers/cart-expiry \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "30m",
    "period": "",
    "callback": "ExpireCart",
    "data": {"reason": "inactivity"}
  }'
```

## Deleting a Timer

**DELETE** `/v1.0/actors/{actorType}/{actorId}/timers/{timerName}`

```bash
curl -X DELETE \
  http://localhost:3500/v1.0/actors/CartActor/user-123/timers/cart-expiry
```

## Creating a Reminder

Reminders persist across actor deactivations and cluster restarts:

```bash
curl -X POST \
  http://localhost:3500/v1.0/actors/OrderActor/ord-789/reminders/payment-due \
  -H "Content-Type: application/json" \
  -d '{
    "dueTime": "24h",
    "period": "",
    "data": {"invoiceId": "inv-001"}
  }'
```

## Implementing Actor Endpoints

Your app must expose endpoints for actor method calls:

```javascript
// Actor method endpoint
app.put("/actors/CartActor/:actorId/method/AddItem", async (req, res) => {
  const { actorId } = req.params;
  const item = req.body;
  await addItemToCart(actorId, item);
  res.status(200).json({ success: true });
});

// Timer/reminder callback
app.put("/actors/CartActor/:actorId/method/ExpireCart", async (req, res) => {
  const { actorId } = req.params;
  await expireCart(actorId);
  res.status(200).send();
});
```

## Actor Configuration

Your app must expose a `GET /dapr/config` endpoint that returns the actor configuration:

```json
{
  "entities": ["CartActor"],
  "actorIdleTimeout": "1h",
  "actorScanInterval": "30s",
  "drainOngoingCallTimeout": "30s",
  "drainRebalancedActors": true,
  "reentrancy": {
    "enabled": true,
    "maxStackDepth": 32
  }
}
```

## Summary

The Dapr Actors API provides single-threaded, stateful virtual actors with built-in scheduling via timers and reminders. Timers are ephemeral and tied to actor activation, while reminders survive deactivation and restarts. Use reminders for business-critical scheduling like payment due dates and subscription renewals.
