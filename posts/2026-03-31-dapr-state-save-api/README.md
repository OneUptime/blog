# How to Save State Using the Dapr State Management API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, API, Key-Value, Persistence

Description: Learn how to save application state using the Dapr State Management HTTP and gRPC APIs, including single saves, bulk saves, and setting consistency options.

---

## Dapr State Management Overview

The Dapr State Management API lets you persist key-value state in a configured state store (Redis, Cosmos DB, DynamoDB, etc.) without writing database-specific code. Your application calls Dapr, and Dapr handles the storage backend.

## Configuring a State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
    - name: actorStateStore
      value: "false"
```

```bash
kubectl apply -f statestore.yaml
```

## Saving State via HTTP API

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {
      "key": "order-123",
      "value": {
        "item": "widget",
        "qty": 5,
        "status": "pending"
      }
    }
  ]'
```

## Saving Multiple Keys at Once

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "user:alice", "value": {"name": "Alice", "role": "admin"}},
    {"key": "user:bob",   "value": {"name": "Bob",   "role": "viewer"}},
    {"key": "config:app", "value": {"theme": "dark", "lang": "en"}}
  ]'
```

## Using the Node.js SDK

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Save single item
await client.state.save('statestore', [
  { key: 'order-123', value: { item: 'widget', qty: 5 } }
]);

// Save multiple items
await client.state.save('statestore', [
  { key: 'session:abc', value: { userId: 'user-1', expires: Date.now() + 3600000 } },
  { key: 'session:def', value: { userId: 'user-2', expires: Date.now() + 3600000 } },
]);
```

## Using the Python SDK

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    client.save_state(
        store_name='statestore',
        key='order-123',
        value='{"item": "widget", "qty": 5}'
    )
```

## Save Options: Consistency and Concurrency

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {
      "key": "order-123",
      "value": {"status": "completed"},
      "options": {
        "concurrency": "last-write",
        "consistency": "strong"
      }
    }
  ]'
```

## Saving with an ETag for Optimistic Locking

```bash
# First, get the current ETag
ETAG=$(curl -s -I http://localhost:3500/v1.0/state/statestore/order-123 | grep -i etag | awk '{print $2}' | tr -d '"\r')

# Save with ETag check
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d "[{\"key\": \"order-123\", \"value\": {\"status\": \"shipped\"}, \"etag\": \"${ETAG}\", \"options\": {\"concurrency\": \"first-write\"}}]"
```

## Summary

Save state in Dapr using a POST to `/v1.0/state/{statestore}` with an array of key-value objects. Batch saves are supported natively. Use the `options` field to control concurrency (`first-write` or `last-write`) and consistency (`strong` or `eventual`). ETags enable optimistic locking to prevent conflicting concurrent writes.
