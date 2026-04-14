# How to Implement Materialized Views with Dapr State and Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Pub/Sub, Materialized View, CQRS

Description: Learn how to build materialized views using Dapr state and pub/sub to maintain pre-computed read models that update automatically when source data changes.

---

## What Are Materialized Views?

A materialized view is a pre-computed, denormalized representation of data optimized for fast reads. Instead of joining tables on every query, you maintain a ready-to-serve projection that updates whenever the underlying data changes. Dapr pub/sub delivers change events while Dapr state stores the projection.

## Architecture

1. Write service saves an order and publishes an `order.created` event.
2. Projection service subscribes to `order.created` and updates the user's order summary in state.
3. Read service fetches the materialized view from state directly.

## Configure State and Pub/Sub

```yaml
# state store for projections
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: projection-store
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
---
# pub/sub broker for events
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: events-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Write Service - Publish on Change

```javascript
const { DaprClient, DaprServer } = require('@dapr/dapr');
const client = new DaprClient();

async function createOrder(order) {
  // Save to primary store (database)
  await db.query('INSERT INTO orders ...', order);

  // Publish event for projection consumers
  await client.pubsub.publish('events-pubsub', 'order.created', {
    orderId: order.id,
    userId: order.userId,
    total: order.total,
    items: order.items,
    createdAt: order.createdAt
  });
}
```

## Projection Service - Subscribe and Update View

```javascript
const server = new DaprServer();
const client = new DaprClient();

await server.pubsub.subscribe('events-pubsub', 'order.created', async (event) => {
  const viewKey = `user:${event.userId}:order-summary`;

  // Get current view or initialize
  const current = await client.state.get('projection-store', viewKey) || {
    userId: event.userId,
    orderCount: 0,
    totalSpent: 0,
    recentOrders: []
  };

  // Update the projection
  const updated = {
    ...current,
    orderCount: current.orderCount + 1,
    totalSpent: current.totalSpent + event.total,
    recentOrders: [
      { id: event.orderId, total: event.total, createdAt: event.createdAt },
      ...current.recentOrders.slice(0, 9)   // keep last 10
    ]
  };

  await client.state.save('projection-store', [
    { key: viewKey, value: updated }
  ]);
});

await server.start();
```

## Read Service - Serve the View

```javascript
app.get('/users/:userId/order-summary', async (req, res) => {
  const view = await client.state.get(
    'projection-store',
    `user:${req.params.userId}:order-summary`
  );
  res.json(view || { orderCount: 0, totalSpent: 0, recentOrders: [] });
});
```

## Rebuilding a Stale View

If a projection consumer crashes and misses events, replay by republishing historical events:

```javascript
async function rebuildProjection(userId) {
  const viewKey = `user:${userId}:order-summary`;

  // Clear existing projection before replaying
  await client.state.delete('projection-store', viewKey);

  const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
  for (const order of orders) {
    await client.pubsub.publish('events-pubsub', 'order.created', order);
  }
}
```

## Summary

Materialized views built on Dapr state and pub/sub decouple the write path from read optimizations. The projection service asynchronously maintains fast read models, allowing query services to return results in constant time regardless of the total number of orders or joins required.
