# How to Use First-Write-Wins Concurrency in Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Concurrency, ETag, Optimistic Locking

Description: Learn how to implement first-write-wins optimistic locking in Dapr state management using ETags to prevent concurrent overwrites of critical state.

---

## What Is First-Write-Wins?

First-write-wins (also called optimistic concurrency) means the first update to a key wins and all subsequent concurrent updates with the same ETag are rejected. This pattern prevents lost updates when multiple processes read and write the same key.

## How ETags Work in Dapr

When you save a state key, Dapr stores an ETag alongside the value. When you read the key, the ETag is returned in the response header. To update with first-write-wins semantics, include the ETag in your save request with `concurrency: first-write`.

## Reading State with ETag

```bash
# Use -I to get response headers including ETag
curl -I http://localhost:3500/v1.0/state/statestore/order-123
# HTTP/1.1 200 OK
# ETag: "v1:a1b2c3d4"
```

## Saving with First-Write-Wins

```bash
ETAG="v1:a1b2c3d4"

curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d "[{
    \"key\": \"order-123\",
    \"value\": {\"status\": \"processing\"},
    \"etag\": \"${ETAG}\",
    \"options\": {
      \"concurrency\": \"first-write\",
      \"consistency\": \"strong\"
    }
  }]"
```

If another process already updated the key (changing the ETag), Dapr returns HTTP 409 Conflict.

## Implementing Optimistic Locking in Node.js

```javascript
const axios = require('axios');

async function updateOrderStatus(orderId, newStatus) {
  // Step 1: Read current state and ETag
  const getRes = await axios.get(
    `http://localhost:3500/v1.0/state/statestore/${orderId}?consistency=strong`
  );
  const etag = getRes.headers['etag'];
  const current = getRes.data;

  // Step 2: Modify
  const updated = { ...current, status: newStatus };

  // Step 3: Save with ETag (first-write-wins)
  try {
    await axios.post('http://localhost:3500/v1.0/state/statestore', [
      {
        key: orderId,
        value: updated,
        etag: etag,
        options: { concurrency: 'first-write', consistency: 'strong' }
      }
    ]);
    console.log('Update succeeded');
  } catch (err) {
    if (err.response?.status === 409) {
      console.log('Conflict: another process updated this order first, retry');
      throw new ConflictError('Concurrent modification detected');
    }
    throw err;
  }
}
```

## Retry Loop with Backoff

```javascript
async function updateWithRetry(key, updateFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.get(`http://localhost:3500/v1.0/state/statestore/${key}`);
      const updated = updateFn(res.data);
      await saveWithEtag(key, updated, res.headers['etag']);
      return;
    } catch (err) {
      if (err.response?.status === 409 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 100 * attempt));
        continue;
      }
      throw err;
    }
  }
}
```

## Using the Go SDK

```go
item, err := client.GetState(ctx, "statestore", "order-123", nil)
if err != nil {
    log.Fatal(err)
}
updated := applyUpdate(item.Value)

err = client.SaveStateWithETag(ctx, "statestore", "order-123", updated, item.Etag, nil,
    dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite),
    dapr.WithConsistency(dapr.StateConsistencyStrong),
)
if status.Code(err) == codes.Aborted {
    log.Println("ETag mismatch - concurrent modification")
}
```

## Summary

First-write-wins concurrency in Dapr uses ETags as version tokens. Read the current state to get the ETag, then save with the ETag and `concurrency: first-write`. If another process wrote first, Dapr returns 409 Conflict. Implement a retry loop with exponential backoff to handle contention gracefully.
