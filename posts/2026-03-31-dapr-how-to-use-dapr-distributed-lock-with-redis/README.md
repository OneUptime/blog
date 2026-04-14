# How to Use Dapr Distributed Lock with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Redis, Concurrency, Microservice

Description: Learn how to use the Dapr distributed lock API with Redis to coordinate exclusive access to shared resources across multiple microservice instances.

---

## What Is Dapr Distributed Lock

The Dapr distributed lock building block provides a mutex mechanism for coordinating access to shared resources across distributed service instances. When multiple pods or services need to execute a critical section exclusively - such as updating a shared record, processing a payment, or running a scheduled job - the distributed lock ensures only one instance proceeds at a time.

## Prerequisites

- Dapr CLI installed and initialized
- A running Redis instance (Dapr uses Redis for the lock store by default)
- Basic familiarity with Dapr components

## Define the Lock Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redislock
  namespace: default
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
```

## Acquire and Release a Lock via HTTP API

Acquire the lock:

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/lock/redislock" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "order-processor",
    "lockOwner": "pod-abc123",
    "expiryInSeconds": 30
  }'
```

Response on success:

```json
{
  "success": true
}
```

Release the lock:

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/unlock/redislock" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "order-processor",
    "lockOwner": "pod-abc123"
  }'
```

## Use Distributed Lock in Node.js

```javascript
const { DaprClient } = require('@dapr/dapr');
const { v4: uuidv4 } = require('uuid');

const client = new DaprClient();
const LOCK_STORE = 'redislock';

async function withLock(resourceId, ttlSeconds, callback) {
  const lockOwner = uuidv4(); // unique per request

  const acquired = await client.lock.lock(LOCK_STORE, resourceId, lockOwner, ttlSeconds);

  if (!acquired.success) {
    throw new Error(`Could not acquire lock for resource: ${resourceId}`);
  }

  console.log(`Lock acquired for ${resourceId} by ${lockOwner}`);

  try {
    return await callback();
  } finally {
    await client.lock.unlock(LOCK_STORE, resourceId, lockOwner);
    console.log(`Lock released for ${resourceId}`);
  }
}

// Example: process an order exactly once across all instances
async function processOrder(orderId) {
  return await withLock(`order:${orderId}`, 30, async () => {
    console.log(`Processing order ${orderId}`);

    // Check if already processed
    const status = await getOrderStatus(orderId);
    if (status === 'processed') {
      console.log('Order already processed, skipping');
      return { skipped: true };
    }

    // Process it
    await doOrderProcessing(orderId);
    await markOrderAsProcessed(orderId);

    return { success: true };
  });
}

// Example: run a scheduled job from exactly one instance
async function runDailyReport() {
  const today = new Date().toISOString().split('T')[0];
  const lockId = `daily-report:${today}`;

  try {
    const result = await withLock(lockId, 300, async () => {
      console.log('Running daily report...');
      await generateAndSendReport();
      return { ran: true };
    });
    return result;
  } catch (err) {
    console.log('Another instance is running the report, skipping');
    return { skipped: true };
  }
}
```

## Use Distributed Lock in Python

```python
from dapr.clients import DaprClient
import uuid
from contextlib import contextmanager

LOCK_STORE = 'redislock'

@contextmanager
def distributed_lock(resource_id: str, ttl_seconds: int = 30):
    lock_owner = str(uuid.uuid4())
    client = DaprClient()

    resp = client.try_lock(
        store_name=LOCK_STORE,
        resource_id=resource_id,
        lock_owner=lock_owner,
        expiry_in_seconds=ttl_seconds
    )

    if not resp.success:
        raise RuntimeError(f"Failed to acquire lock for: {resource_id}")

    print(f"Lock acquired: {resource_id}")
    try:
        yield lock_owner
    finally:
        client.unlock(
            store_name=LOCK_STORE,
            resource_id=resource_id,
            lock_owner=lock_owner
        )
        print(f"Lock released: {resource_id}")
        client.close()

# Usage
def process_payment(payment_id: str):
    with distributed_lock(f"payment:{payment_id}", ttl_seconds=60):
        print(f"Processing payment {payment_id}")
        execute_payment(payment_id)
```

## Handle Lock Contention

When a lock cannot be acquired, decide how to handle it:

```javascript
async function processWithRetry(resourceId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withLock(resourceId, 30, () => doWork(resourceId));
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`Lock attempt ${attempt} failed, retrying in ${attempt * 500}ms`);
      await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }
}
```

## Choose the Right TTL

Set the TTL slightly longer than the expected operation duration:

```text
Short operations (< 1s):   5-10 seconds TTL
Medium operations (< 30s): 60 seconds TTL
Long operations (> 30s):   Use TTL + heartbeat renewal pattern
```

## Summary

The Dapr distributed lock API with Redis provides a straightforward way to implement exclusive access control across multiple microservice instances without managing Redis Lua scripts or lock libraries directly. By using a unique `lockOwner` per request and a TTL to prevent deadlocks, you can safely coordinate critical sections like payment processing, job deduplication, and shared resource updates in distributed systems.
