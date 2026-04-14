# How to Use Dapr JavaScript Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, JavaScript, Client, Node.js, API

Description: Learn how to use the DaprClient in Node.js to interact with state stores, pub/sub, service invocation, secrets, and configuration APIs.

---

## Introduction

The `DaprClient` in the Dapr JavaScript SDK is your primary interface for calling Dapr building blocks from Node.js. It covers state management, pub/sub publishing, service invocation, secret retrieval, and configuration reads.

## Setting Up the Client

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: process.env.DAPR_HOST || "http://localhost",
  daprPort: process.env.DAPR_HTTP_PORT || "3500",
});
```

## State Management

Save, get, and delete state:

```javascript
// Save a single state entry
await client.state.save("statestore", [
  { key: "user:42", value: { name: "Alice", role: "admin" } },
]);

// Get a state value
const user = await client.state.get("statestore", "user:42");
console.log("User:", user);

// Save multiple entries in a transaction
await client.state.transaction("statestore", [
  { operation: "upsert", request: { key: "user:43", value: { name: "Bob" } } },
  { operation: "delete", request: { key: "user:10" } },
]);
```

## Pub/Sub Publishing

Publish events to a topic:

```javascript
await client.pubsub.publish("pubsub", "orders", {
  orderId: "order-123",
  product: "widget",
  quantity: 2,
});

console.log("Event published");
```

## Service Invocation

Call another Dapr-enabled service:

```javascript
const { HttpMethod } = require("@dapr/dapr");

// GET request
const inventory = await client.invoker.invoke(
  "inventory-service",
  "stock/widget",
  HttpMethod.GET
);
console.log("Inventory:", inventory);

// POST request with body
const result = await client.invoker.invoke(
  "payment-service",
  "charge",
  HttpMethod.POST,
  { orderId: "order-123", amount: 49.99 }
);
```

## Secrets Management

Retrieve secrets from a configured store:

```javascript
// Get a single secret
const secret = await client.secret.get("kubernetes-secrets", "db-password");
console.log("Password retrieved:", Object.keys(secret));

// Get all secrets
const allSecrets = await client.secret.getBulk("kubernetes-secrets");
console.log("All secrets:", Object.keys(allSecrets));
```

## Configuration API

Read and subscribe to configuration:

```javascript
// Get configuration values
const config = await client.configuration.get("configstore", [
  "feature-flag",
  "max-connections",
]);
console.log("Feature flag:", config.items["feature-flag"].value);

// Subscribe to changes
const stream = await client.configuration.subscribeWithKeys(
  "configstore",
  ["feature-flag"],
  (config) => {
    console.log("Config changed:", config.items);
  }
);

// Unsubscribe later
stream.stop();
```

## Distributed Lock

Acquire and release a distributed lock:

```javascript
const lockResponse = await client.lock.lock(
  "lockstore",
  "my-resource",
  "owner-1",
  30
);

if (lockResponse.success) {
  try {
    // Critical section work
    console.log("Lock acquired, doing work...");
  } finally {
    await client.lock.unlock("lockstore", "my-resource", "owner-1");
  }
}
```

## Summary

The `DaprClient` in the JavaScript SDK provides a clean, promise-based API for all Dapr building blocks. By centralizing these distributed systems primitives behind a single client, your Node.js application code stays focused on business logic while Dapr handles service discovery, retries, and infrastructure abstraction.
