# How to Perform Transactional State Operations in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Transaction, Microservice, Kubernetes

Description: Learn how to perform atomic, multi-key transactional state operations in Dapr using the state transactions API to ensure data consistency.

---

## What Are Transactional State Operations?

Dapr's state management API supports multi-key transactions, allowing you to atomically upsert and delete multiple state entries in a single request. This ensures all-or-nothing semantics - either every operation in the transaction succeeds or none of them are applied.

Not all state stores support transactions. Stores like Redis and PostgreSQL do, while others like DynamoDB have limited support. Always check the component documentation before relying on transactional guarantees.

## Configuring a Transactional State Store

First, make sure you have a state store configured. Here is an example using Redis:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

## Executing a Transaction via the HTTP API

Use the `/v1.0/state/{storeName}/transaction` endpoint to post a batch of transactional operations:

```bash
curl -s -X POST http://localhost:3500/v1.0/state/statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operation": "upsert",
        "request": {
          "key": "order-123",
          "value": {"status": "processing", "total": 99.99}
        }
      },
      {
        "operation": "upsert",
        "request": {
          "key": "inventory-456",
          "value": {"quantity": 9}
        }
      },
      {
        "operation": "delete",
        "request": {
          "key": "cart-789"
        }
      }
    ]
  }'
```

## Using Transactions in a Node.js Service

The Dapr JavaScript SDK makes transactional operations easy to express:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

async function placeOrder(orderId, cartId, item) {
  await client.state.transaction("statestore", [
    {
      operation: "upsert",
      request: {
        key: `order-${orderId}`,
        value: { status: "confirmed", item, timestamp: Date.now() },
      },
    },
    {
      operation: "upsert",
      request: {
        key: `inventory-${item.sku}`,
        value: { quantity: item.remainingStock },
      },
    },
    {
      operation: "delete",
      request: { key: `cart-${cartId}` },
    },
  ]);
  console.log(`Order ${orderId} placed transactionally`);
}
```

## Using ETags for Optimistic Concurrency

Include an ETag to prevent conflicts when multiple services update the same key:

```javascript
const [{ data: currentOrder, etag }] = await client.state.getBulk(
  "statestore",
  ["order-123"]
);

await client.state.transaction("statestore", [
  {
    operation: "upsert",
    request: {
      key: "order-123",
      value: { ...currentOrder, status: "shipped" },
      etag,
      options: { concurrency: "first-write" },
    },
  },
]);
```

If the ETag does not match, the transaction fails with a 409 conflict, and your service can retry with fresh data.

## Handling Transaction Errors

Wrap transactional calls in try/catch and implement retry logic for transient failures:

```javascript
async function retryTransaction(operations, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.state.transaction("statestore", operations);
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((res) => setTimeout(res, attempt * 200));
    }
  }
}
```

## Summary

Dapr transactional state operations let you atomically apply multiple upsert and delete actions across keys in a single request. By using ETags for optimistic concurrency and wrapping calls in retry logic, you can build robust, consistent workflows in distributed microservice applications without managing distributed transactions manually.
