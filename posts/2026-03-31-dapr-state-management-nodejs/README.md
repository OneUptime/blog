# How to Use Dapr State Management with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Node.js, Redis, Microservice

Description: Learn how to save, get, delete, and transact state in Node.js using the Dapr State Management API with Redis and other backing stores.

---

## Introduction

Dapr's State Management building block provides a key-value API for storing and retrieving application state. Your Node.js code stays the same regardless of whether Redis, Cosmos DB, or DynamoDB backs the state store.

## Setting Up

```bash
npm install @dapr/dapr
```

Configure a Redis state store:

```yaml
# dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
    - name: actorStateStore
      value: "true"
```

## Creating the Client

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
});
```

## Saving State

Save one or more key-value pairs:

```javascript
// Save a single item
await client.state.save("statestore", [
  { key: "session:user-42", value: { userId: "user-42", cart: ["item-1", "item-2"] } },
]);

// Save multiple items
await client.state.save("statestore", [
  { key: "product:101", value: { name: "Widget", price: 9.99, stock: 100 } },
  { key: "product:102", value: { name: "Gadget", price: 29.99, stock: 50 } },
]);
```

## Getting State

Retrieve a value by key:

```javascript
const session = await client.state.get("statestore", "session:user-42");
console.log("Cart items:", session.cart);
```

## Getting Bulk State

Fetch multiple keys in one call:

```javascript
const items = await client.state.getBulk("statestore", [
  "product:101",
  "product:102",
]);

items.forEach(({ key, value }) => {
  console.log(`${key}: ${value.name} - $${value.price}`);
});
```

## Deleting State

```javascript
await client.state.delete("statestore", "session:user-42");
console.log("Session deleted");
```

## State Transactions

Perform atomic multi-operation transactions:

```javascript
await client.state.transaction("statestore", [
  {
    operation: "upsert",
    request: { key: "order:500", value: { status: "pending", items: 3 } },
  },
  {
    operation: "upsert",
    request: { key: "product:101", value: { stock: 97 } },
  },
  {
    operation: "delete",
    request: { key: "cart:user-42" },
  },
]);
```

## ETags and Optimistic Concurrency

Use ETags to prevent concurrent overwrites. Since `state.get()` does not return ETags, use `getBulk()` to retrieve the value along with its ETag:

```javascript
const [item] = await client.state.getBulk("statestore", ["product:101"]);
const etag = item.etag;

// Update only if etag matches
await client.state.save("statestore", [
  {
    key: "product:101",
    value: { ...item.value, stock: item.value.stock - 1 },
    etag,
    options: { concurrency: "first-write", consistency: "strong" },
  },
]);
```

## Summary

Dapr's State Management API in Node.js provides a simple, consistent interface for working with key-value state regardless of the underlying store. Transactions, bulk reads, and ETag-based concurrency control give you the building blocks for reliable state management in any distributed application.
