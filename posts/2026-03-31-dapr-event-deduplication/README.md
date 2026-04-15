# How to Implement Event Deduplication with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Deduplication, Pub/Sub, Idempotency, Exactly Once

Description: Implement idempotent event deduplication for Dapr pub/sub subscribers using state management to detect and discard duplicate messages in at-least-once delivery systems.

---

## Overview

Dapr pub/sub provides at-least-once delivery, meaning the same message may be delivered multiple times during retries or redelivery. Implementing deduplication ensures your service processes each logical event exactly once, even when the broker delivers duplicates.

## CloudEvents Message ID Deduplication

Dapr wraps messages in CloudEvents envelopes with a unique `id` field. However, the Dapr JS SDK unwraps the envelope before passing data to your callback. Include a unique event ID in the message payload for deduplication:

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');
const server = new DaprServer();
const client = new DaprClient();

const DEDUP_TTL_SECONDS = 3600; // Track seen IDs for 1 hour

await server.pubsub.subscribe('pubsub', 'orders', async (data) => {
  const eventId = data.eventId;

  if (!eventId) {
    console.warn('Event missing ID - processing without deduplication');
    await processOrder(data);
    return;
  }

  const dedupKey = `dedup-${eventId}`;

  // Check if already processed
  const existing = await client.state.get('statestore', dedupKey);
  if (existing) {
    console.log(`Duplicate event ${eventId} - skipping`);
    return 'DROP';
  }

  // Mark as processing
  await client.state.save('statestore', [{
    key: dedupKey,
    value: JSON.stringify({ processedAt: new Date().toISOString() }),
    metadata: { ttlInSeconds: String(DEDUP_TTL_SECONDS) }
  }]);

  await processOrder(data);
  console.log(`Processed event ${eventId}`);
});
```

## Business-Level Deduplication

For events without reliable IDs, use business keys:

```javascript
async function deduplicateByBusinessKey(orderId, action) {
  const dedupKey = `dedup-${action}-${orderId}`;

  const existing = await client.state.get('statestore', dedupKey);
  if (existing) {
    console.log(`Action ${action} already performed for order ${orderId}`);
    return false;
  }

  await client.state.save('statestore', [{
    key: dedupKey,
    value: JSON.stringify({ timestamp: Date.now() }),
    metadata: { ttlInSeconds: '86400' }
  }]);

  return true;
}

// Usage
app.post('/orders', async (req, res) => {
  const { orderId } = req.body.data;
  const canProcess = await deduplicateByBusinessKey(orderId, 'create');

  if (!canProcess) {
    return res.status(200).json({ status: 'DROP' });
  }

  await processOrder(req.body.data);
  res.status(200).json({ status: 'SUCCESS' });
});
```

## Atomic Deduplication with Concurrency Control

Use Dapr state concurrency options for optimistic locking during deduplication:

```javascript
async function atomicDedup(eventId) {
  const dedupKey = `dedup-${eventId}`;

  // Check if already processed
  const existing = await client.state.get('statestore', dedupKey);
  if (existing) {
    return false; // Already processed
  }

  try {
    // Save with first-write-wins - fails if another instance saved first
    await client.state.save('statestore', [{
      key: dedupKey,
      value: 'processed',
      options: {
        concurrency: 'first-write',
        consistency: 'strong'
      }
    }]);
    return true;
  } catch (err) {
    // Race condition - another instance processed it first
    return false;
  }
}
```

## Monitoring Deduplication Rates

Track duplicate rates with a counter:

```javascript
async function trackDuplicateRate(isDuplicate) {
  const counterKey = `dup-counter-${Math.floor(Date.now() / 60000)}`;
  const raw = await client.state.get('statestore', counterKey);
  const counter = raw ? JSON.parse(raw) : { total: 0, duplicates: 0 };

  counter.total += 1;
  if (isDuplicate) counter.duplicates += 1;

  await client.state.save('statestore', [{ key: counterKey, value: JSON.stringify(counter), metadata: { ttlInSeconds: '120' } }]);
}
```

## Summary

Effective event deduplication in Dapr requires storing processed event IDs in a state store with appropriate TTLs. Use CloudEvents `id` fields as the deduplication key when available, fall back to business keys for events without reliable IDs, and consider first-write-wins concurrency control for high-concurrency scenarios. Set deduplication window TTLs based on your maximum expected message redelivery delay plus a safety margin.
