# How to Migrate from Redis Direct Usage to Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, State Management, Migration, Key-Value Store

Description: Learn how to replace direct ioredis or node-redis calls with Dapr State Management to decouple your application from Redis and gain portability.

---

## Why Abstract Redis Behind Dapr?

Direct Redis clients expose every Redis-specific operation: HSET, EXPIRE, WATCH, MULTI. This couples your code to Redis's API. Dapr State Management provides a key-value abstraction that works with Redis, Cosmos DB, DynamoDB, PostgreSQL, and more. Swapping the backing store requires only a component YAML change.

## Before: Direct ioredis

```javascript
// cart-service.js - direct ioredis
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

async function saveCart(userId, cartItems) {
  await redis.set(
    `cart:${userId}`,
    JSON.stringify(cartItems),
    'EX', 86400 // 24-hour TTL
  );
}

async function getCart(userId) {
  const data = await redis.get(`cart:${userId}`);
  return data ? JSON.parse(data) : null;
}

async function deleteCart(userId) {
  await redis.del(`cart:${userId}`);
}

async function addItem(userId, item) {
  const cart = await getCart(userId) || [];
  const existing = cart.findIndex(i => i.productId === item.productId);
  if (existing >= 0) {
    cart[existing].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  await saveCart(userId, cart);
  return cart;
}
```

## After: Dapr State Management

Component configuration:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cartstore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: keyPrefix
    value: "name"
  - name: ttlInSeconds
    value: "86400"
```

Refactored service using the Dapr SDK:

```javascript
// cart-service.js - via Dapr SDK
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();
const STORE = 'cartstore';

async function saveCart(userId, cartItems) {
  await client.state.save(STORE, [
    {
      key: userId,
      value: cartItems,
      metadata: { ttlInSeconds: '86400' }
    }
  ]);
}

async function getCart(userId) {
  return await client.state.get(STORE, userId);
}

async function deleteCart(userId) {
  await client.state.delete(STORE, userId);
}

async function addItem(userId, item) {
  const cart = await getCart(userId) || [];
  const existing = cart.findIndex(i => i.productId === item.productId);
  if (existing >= 0) {
    cart[existing].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  await saveCart(userId, cart);
  return cart;
}
```

## Atomic State Transactions

For multi-key operations, use Dapr's state transaction API:

```javascript
await client.state.transaction(STORE, [
  {
    operation: 'upsert',
    request: { key: `cart:${userId}`, value: cartItems }
  },
  {
    operation: 'upsert',
    request: { key: `cart-updated:${userId}`, value: Date.now().toString() }
  }
]);
```

## Querying State (Alpha Feature)

If your state store supports it, query across keys:

```javascript
const result = await client.state.query(STORE, {
  filter: {
    EQ: { 'status': 'active' }
  },
  sort: [{ key: 'createdAt', order: 'DESC' }],
  page: { limit: 10 }
});
```

## Switching to PostgreSQL

To swap from Redis to PostgreSQL, change only the component:

```yaml
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    value: "host=localhost user=postgres password=secret dbname=dapr port=5432"
```

No application code changes required.

## Summary

Migrating from direct ioredis to Dapr State Management replaces Redis-specific commands with a portable key-value API. The component YAML controls which backing store is used, so moving from Redis to PostgreSQL or Cosmos DB requires zero code changes. Dapr's transaction support handles atomic multi-key updates, and the TTL metadata parameter replaces Redis's `EX` option.
