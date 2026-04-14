# How to Handle State Conflicts in Dapr Multi-Writer Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Conflict Resolution, Concurrency, Multi-Writer

Description: Learn strategies for handling state conflicts in Dapr when multiple service instances write to the same keys simultaneously, including merge strategies and retry logic.

---

## The Multi-Writer Problem

When multiple replicas of a service write to the same state key at the same time, one writer will overwrite the other's changes. Dapr's ETag mechanism surfaces these conflicts as HTTP 409 responses - but you need a strategy for resolving them.

## Conflict Resolution Strategies

### Strategy 1: Retry with Re-read (Optimistic)

The simplest strategy - re-read the latest value and re-apply your change:

```javascript
async function addItemToList(listKey, newItem, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(
      `http://localhost:3500/v1.0/state/state-store/${listKey}`
    );
    const eTag = response.headers.get('etag');
    const list = await response.json() || [];

    const writeResponse = await fetch('http://localhost:3500/v1.0/state/state-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        key: listKey,
        value: [...list, newItem],
        etag: eTag,
        options: { concurrency: 'first-write' }
      }])
    });

    if (writeResponse.ok) return;
    if (writeResponse.status !== 409) throw new Error('Write failed');
    // 409 - retry
    await new Promise(r => setTimeout(r, Math.random() * 100));
  }
  throw new Error('Conflict resolution failed after retries');
}
```

### Strategy 2: Last-Writer-Wins for Idempotent Writes

When overwriting a key with the same logical result, just use last-write mode:

```javascript
async function updateHeartbeat(serviceId) {
  const { DaprClient, StateConcurrencyEnum } = require('@dapr/dapr');
  const client = new DaprClient();

  // Multiple replicas writing heartbeats - last-write is fine
  await client.state.save('state-store', [{
    key: `heartbeat:${serviceId}`,
    value: { timestamp: Date.now(), instanceId: process.env.HOSTNAME },
    options: { concurrency: StateConcurrencyEnum.CONCURRENCY_LAST_WRITE }
  }]);
}
```

### Strategy 3: Append-Only Log

Avoid conflicts entirely by writing unique keys per event:

```javascript
async function logEvent(aggregateId, event) {
  const { DaprClient } = require('@dapr/dapr');
  const client = new DaprClient();

  // Use a unique key per event - no concurrent writes to the same key
  const eventKey = `event:${aggregateId}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await client.state.save('state-store', [{
    key: eventKey,
    value: event
  }]);
}
```

### Strategy 4: CRDT-Style Merge

When conflicts are frequent, implement a merge function:

```javascript
async function mergeCounters(counterKey, increment) {
  const MAX_RETRIES = 10;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const response = await fetch(`http://localhost:3500/v1.0/state/state-store/${counterKey}`);
    const eTag = response.headers.get('etag');
    const current = await response.json() || { count: 0 };

    const merged = { count: current.count + increment };
    const writeResp = await fetch('http://localhost:3500/v1.0/state/state-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        key: counterKey, value: merged, etag: eTag,
        options: { concurrency: 'first-write' }
      }])
    });

    if (writeResp.ok) return merged;
    if (writeResp.status !== 409) throw new Error('Write failed');
    await new Promise(r => setTimeout(r, 50 * (i + 1)));
  }
  throw new Error('Conflict resolution failed after retries');
}
```

## Monitoring Conflict Rates

High conflict rates indicate a hot key problem. Track 409 responses:

```javascript
let conflictCount = 0;
// Increment conflictCount on each 409
// Expose as a metric and alert when rate exceeds threshold
```

## Summary

Dapr multi-writer conflicts are surfaced cleanly via HTTP 409 responses on ETag mismatches. Choose your resolution strategy based on data semantics: retry-with-re-read for correctness, last-write for idempotent updates, append-only keys for audit logs, and CRDT merges for commutative operations under high contention.
