# How to Get State Using the Dapr State Management API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, API, Key-Value, Retrieval

Description: Learn how to retrieve application state using the Dapr State Management HTTP and gRPC APIs, including reading ETags, consistency options, and handling missing keys.

---

## Getting State via HTTP API

```bash
curl http://localhost:3500/v1.0/state/statestore/order-123
```

If the key exists, Dapr returns the stored value:

```json
{"item": "widget", "qty": 5, "status": "pending"}
```

If the key does not exist, Dapr returns HTTP 204 with no body.

## Reading the ETag

ETags are returned as response headers. Use them for optimistic locking on subsequent writes:

```bash
curl -v http://localhost:3500/v1.0/state/statestore/order-123 2>&1 | grep -i etag
# ETag: "abc123def456"
```

## Consistency Options

Specify consistency level as a query parameter:

```bash
# Eventual consistency (default) - faster, may return stale data
curl "http://localhost:3500/v1.0/state/statestore/order-123?consistency=eventual"

# Strong consistency - slower, guaranteed latest value
curl "http://localhost:3500/v1.0/state/statestore/order-123?consistency=strong"
```

## Using the Node.js SDK

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Get state
const order = await client.state.get('statestore', 'order-123');
console.log(order); // { item: 'widget', qty: 5 }

// Get state with options
const orderStrong = await client.state.get('statestore', 'order-123', {
  consistency: 'strong',
});
```

## Handling Missing Keys

```javascript
const value = await client.state.get('statestore', 'order-999');
if (!value) {
  console.log('Key not found');
  // Return default or throw NotFoundError
}
```

## Using the Python SDK

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    result = client.get_state(
        store_name='statestore',
        key='order-123'
    )
    print(result.data)
    print(result.etag)
```

## Getting State with Metadata

Some state stores support additional metadata on retrieval:

```bash
curl "http://localhost:3500/v1.0/state/statestore/order-123?metadata.partitionKey=tenant-1"
```

## Getting State Directly via HTTP (Without SDK)

```javascript
const axios = require('axios');

async function getState(key) {
  const res = await axios.get(
    `http://localhost:3500/v1.0/state/statestore/${encodeURIComponent(key)}`
  );
  const etag = res.headers['etag'];
  return { data: res.data, etag };
}

const { data, etag } = await getState('order-123');
```

## Key Prefix Behavior

By default, Dapr prefixes stored keys with the app ID: `{app-id}||{key}`. For example, `order-service||order-123`. You can configure prefix behavior:

```yaml
spec:
  metadata:
    - name: keyPrefix
      value: none  # Store keys without prefix
```

## Summary

Retrieve Dapr state with a GET to `/v1.0/state/{statestore}/{key}`. A 204 response means the key does not exist. Read the `ETag` response header for optimistic locking. Use the `?consistency=strong` query parameter when you need the latest value rather than a cached copy. Keys are prefixed with the app ID by default.
