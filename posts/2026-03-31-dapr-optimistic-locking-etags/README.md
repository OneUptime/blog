# How to Implement Optimistic Locking with Dapr ETags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, ETag, Optimistic Locking, Concurrency

Description: Learn how to implement optimistic locking using Dapr ETags to prevent lost updates when multiple service instances write to the same state key concurrently.

---

## What Is Optimistic Locking?

Optimistic locking assumes conflicts are rare. Instead of holding a lock during the read-modify-write cycle, you attach a version token (ETag) to each write. If another writer has changed the value since you read it, the write fails and you retry. Dapr state management exposes ETags natively.

## Reading a Value with Its ETag

```javascript
async function getWithETag(storeName, key) {
  // The raw HTTP API returns etag in the response header
  const response = await fetch(
    `http://localhost:${process.env.DAPR_HTTP_PORT}/v1.0/state/${storeName}/${key}`,
    { method: 'GET' }
  );
  const eTag = response.headers.get('etag');
  const data = await response.json();
  return { data, eTag };
}
```

## Writing with ETag Enforcement

```javascript
async function updateWithOptimisticLock(storeName, key, updater) {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, eTag } = await getWithETag(storeName, key);
    const newValue = updater(data);

    const response = await fetch(
      `http://localhost:${process.env.DAPR_HTTP_PORT}/v1.0/state/${storeName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            key,
            value: newValue,
            etag: eTag,
            options: { concurrency: 'first-write' }
          }
        ])
      }
    );

    if (response.ok) return newValue;

    if (response.status === 409) {
      // ETag mismatch - another writer beat us, retry
      const delay = Math.pow(2, attempt) * 100;
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    throw new Error(`State write failed: ${response.status}`);
  }

  throw new Error('Max retries exceeded - too many concurrent writers');
}
```

## Practical Example: Incrementing a Counter

```javascript
async function incrementCounter(counterId) {
  return updateWithOptimisticLock('state-store', `counter:${counterId}`, (current) => {
    return { count: (current?.count || 0) + 1, updatedAt: Date.now() };
  });
}
```

## Concurrency Modes

Dapr supports two concurrency options:

- `first-write` - the first writer with a matching ETag wins; subsequent writers with the old ETag get a 409 conflict
- `last-write` - the last writer always wins; ETags are ignored

```javascript
// last-write mode (no optimistic locking)
const payload = [{
  key: 'my-key',
  value: newValue,
  options: { concurrency: 'last-write' }
}];
```

## When to Use Optimistic vs Pessimistic Locking

| Scenario | Recommended Approach |
|---|---|
| Low contention, short writes | Optimistic (ETag) |
| High contention, critical section | Pessimistic (Dapr lock API) |
| Append-only events | Optimistic (ETag) |
| Leader election | Pessimistic (Dapr lock API) |

## Summary

Dapr ETags provide a lightweight optimistic locking mechanism that prevents lost updates without holding database locks. By pairing reads with their ETag and retrying on conflict, concurrent service instances safely modify shared state without coordination overhead.
