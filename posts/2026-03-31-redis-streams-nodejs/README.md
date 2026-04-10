# How to Use Redis Streams in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Node.js, Stream, node-redis

Description: Learn how to produce and consume Redis Streams in Node.js using node-redis, including consumer groups for reliable, scalable message processing.

---

Redis Streams provide a persistent, append-only log with consumer group support - combining the durability of Kafka with the simplicity of Redis. This guide uses `node-redis` to produce and consume stream messages.

## Setup

```bash
npm install redis
```

## Producing Messages (XADD)

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Add a message to the stream
const id = await client.xAdd('orders', '*', {
  orderId: 'ORD-001',
  userId: '42',
  amount: '99.99',
  status: 'pending',
});
console.log('Added message with ID:', id);
// Example: 1704067200000-0
```

The `*` tells Redis to auto-generate a timestamp-based ID.

## Consuming Messages (Simple - XREAD)

```javascript
// Read new messages (block for up to 5 seconds waiting)
const messages = await client.xRead(
  [{ key: 'orders', id: '0' }],
  { COUNT: 10, BLOCK: 5000 }
);

if (messages) {
  for (const stream of messages) {
    for (const msg of stream.messages) {
      console.log('ID:', msg.id);
      console.log('Data:', msg.message);
    }
  }
}
```

## Consumer Groups for Reliable Processing

Consumer groups allow multiple workers to share the load and track which messages have been acknowledged.

```javascript
// Create group (run once)
try {
  await client.xGroupCreate('orders', 'processors', '$', { MKSTREAM: true });
} catch (e) {
  if (!e.message.includes('BUSYGROUP')) throw e;
}
```

## Reading as a Consumer Group Member

```javascript
async function processOrders(consumerId) {
  while (true) {
    const result = await client.xReadGroup(
      'processors',
      consumerId,
      [{ key: 'orders', id: '>' }], // '>' means undelivered messages
      { COUNT: 5, BLOCK: 3000 }
    );

    if (!result) continue;

    for (const stream of result) {
      for (const msg of stream.messages) {
        console.log(`[${consumerId}] Processing:`, msg.message);

        // Process the message...
        await handleOrder(msg.message);

        // Acknowledge after successful processing
        await client.xAck('orders', 'processors', msg.id);
      }
    }
  }
}
```

## Handling Unacknowledged Messages (PEL)

Messages that were delivered but not acknowledged stay in the Pending Entry List (PEL). Reclaim stale ones:

```javascript
async function reclaimStaleMessages() {
  const pending = await client.xAutoClaim(
    'orders',
    'processors',
    'worker-1',
    60000, // claim messages idle for 60+ seconds
    '0-0'
  );

  for (const msg of pending.messages) {
    console.log('Reclaiming stale message:', msg.id);
    await handleOrder(msg.message);
    await client.xAck('orders', 'processors', msg.id);
  }
}
```

## Inspecting Stream Info

```javascript
const info = await client.xInfoStream('orders');
console.log('Length:', info.length);
console.log('Number of groups:', info.groups);

const groups = await client.xInfoGroups('orders');
for (const g of groups) {
  console.log(g.name, 'pending:', g.pending);
}
```

## Trimming Old Messages

```javascript
// Keep only the last 10,000 entries
await client.xTrim('orders', 'MAXLEN', 10000);

// Approximate trim (faster, allows slight overshoot)
await client.xTrim('orders', 'MAXLEN', 10000, { strategyModifier: '~' });
```

## Summary

Redis Streams in Node.js with node-redis enable reliable, ordered message processing with consumer groups. Producers use `xAdd` to append entries; consumers use `xReadGroup` to claim and `xAck` to confirm processing. Stale unacknowledged messages can be reclaimed with `xAutoClaim`, making the system fault-tolerant across worker restarts.
