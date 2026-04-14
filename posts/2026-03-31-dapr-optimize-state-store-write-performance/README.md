# How to Optimize Dapr State Store Write Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, State Store, Write, Batch

Description: Improve Dapr state store write throughput using bulk save operations, transactional batching, write-behind caching patterns, and state store backend tuning.

---

## Overview

Dapr state store writes are synchronous by default, and each write incurs sidecar proxy overhead. For write-intensive workloads, batching writes, using transactions, and tuning the backend state store can multiply throughput significantly.

## Bulk State Save

Save multiple state entries in a single API call:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Inefficient: sequential writes
async function saveOrdersSequential(orders) {
  for (const order of orders) {
    await client.state.save('statestore', [{ key: `order:${order.id}`, value: JSON.stringify(order) }]);
  }
}

// Efficient: bulk save
async function saveOrdersBulk(orders) {
  const items = orders.map(order => ({
    key: `order:${order.id}`,
    value: JSON.stringify(order),
    metadata: { contentType: 'application/json' }
  }));

  await client.state.save('statestore', items);
  console.log(`Saved ${items.length} orders in bulk`);
}
```

## Transactional State Operations

Group related writes into a single transaction for atomicity and efficiency:

```javascript
async function processOrderTransaction(orderId, orderData, inventoryUpdate) {
  await client.state.transaction('statestore', [
    {
      operation: 'upsert',
      request: { key: `order:${orderId}`, value: JSON.stringify(orderData) }
    },
    {
      operation: 'upsert',
      request: { key: `inventory:${inventoryUpdate.itemId}`, value: JSON.stringify(inventoryUpdate) }
    },
    {
      operation: 'delete',
      request: { key: `cart:${orderId}` }
    }
  ]);
}
```

## Write-Behind Pattern

Buffer writes in memory and flush to the state store asynchronously:

```javascript
class WriteBehindBuffer {
  constructor(client, flushInterval = 1000, maxSize = 100) {
    this.client = client;
    this.buffer = new Map();
    this.timer = setInterval(() => this.flush(), flushInterval);
    this.maxSize = maxSize;
  }

  async write(key, value) {
    this.buffer.set(key, value);
    if (this.buffer.size >= this.maxSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.buffer.size === 0) return;

    const items = Array.from(this.buffer.entries()).map(([key, value]) => ({
      key,
      value: JSON.stringify(value)
    }));

    this.buffer.clear();

    await this.client.state.save('statestore', items);
    console.log(`Flushed ${items.length} buffered writes`);
  }

  destroy() {
    clearInterval(this.timer);
  }
}

const buffer = new WriteBehindBuffer(client);

// Usage - returns immediately
await buffer.write('user:123', { name: 'Alice', score: 100 });
```

## Avoiding ETags for Write-Heavy Paths

ETag-based optimistic concurrency adds a read-before-write. Skip it when not needed:

```javascript
// With ETag (slower) - requires a prior read to obtain the current ETag
const [item] = await client.state.getBulk('statestore', ['counter']);

await client.state.save('statestore', [{
  key: 'counter',
  value: '42',
  etag: item.etag,
  options: { concurrency: 'first-write' }
}]);

// Without ETag (faster) - use for non-conflicting writes
await client.state.save('statestore', [{
  key: 'session:xyz',
  value: JSON.stringify(sessionData),
  options: { concurrency: 'last-write' }
}]);
```

## Redis Write Tuning

For Redis-backed state stores, tune persistence and pipeline settings:

```bash
# Check Redis write performance
redis-cli -h redis info stats | grep total_commands_processed

# Enable Redis pipelining by using Dapr bulk operations
# which internally uses Redis MSET for multiple keys
```

## Summary

Dapr state store write performance scales with bulk operations, transactions that batch related writes together, and write-behind patterns that buffer high-frequency writes before flushing. Avoid unnecessary ETag-based concurrency on write-heavy hot paths, tune the Redis connection pool for concurrent writers, and use Dapr's Prometheus metrics to track write latency percentiles and validate throughput improvements.
