# How to Handle Lock Contention in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Contention, Retry, Concurrency

Description: Learn strategies for handling lock contention in Dapr, including exponential backoff, queue-based coordination, and reducing contention through better resource partitioning.

---

Lock contention occurs when multiple service instances simultaneously attempt to acquire the same lock. High contention degrades throughput and increases latency. This guide covers strategies to detect, handle, and reduce lock contention in Dapr applications.

## Detecting Contention

A `success: false` response from `TryLock` indicates contention. Track this in your metrics:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

let contentionCount = 0;
let successCount = 0;

async function tryAcquireLock(resourceId, owner) {
  const resp = await client.lock.lock("lockstore", resourceId, owner, 30);
  if (resp.success) {
    successCount++;
  } else {
    contentionCount++;
  }
  return resp.success;
}
```

## Strategy 1: Exponential Backoff with Jitter

Retry with increasing delays to reduce thundering herd:

```javascript
async function acquireWithBackoff(resourceId, owner, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const acquired = await tryAcquireLock(resourceId, owner);
    if (acquired) return true;

    // Exponential backoff with jitter: base * 2^attempt + random 0-100ms
    const delay = Math.min(100 * Math.pow(2, i) + Math.random() * 100, 5000);
    console.log(`Retry ${i + 1} in ${delay.toFixed(0)}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
}
```

## Strategy 2: Reducing Hot Spots via Key Partitioning

If many instances fight for the same key, partition the resource:

```javascript
// Instead of one lock for all users:
// BAD: resourceId = "user-profile-lock"

// Partition by user ID modulo number of partitions:
function getPartitionedLockKey(userId, partitions = 16) {
  const partition = parseInt(userId, 16) % partitions;
  return `user-profile-lock-${partition}`;
}

const lockKey = getPartitionedLockKey(userId);
```

This distributes lock acquisition across 16 independent keys, reducing contention by 16x.

## Strategy 3: Work Queue with Lock Guard

Instead of every instance competing for the same lock, funnel work through a queue:

```javascript
const workQueue = [];

async function enqueueWork(item) {
  workQueue.push(item);
  processQueue();
}

let isProcessing = false;
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  const acquired = await tryAcquireLock("work-processor", INSTANCE_ID);
  if (!acquired) {
    isProcessing = false;
    return;
  }

  try {
    while (workQueue.length > 0) {
      const item = workQueue.shift();
      await processItem(item);
    }
  } finally {
    await client.lock.unlock("lockstore", "work-processor", INSTANCE_ID);
    isProcessing = false;
  }
}
```

## Strategy 4: Skip-on-Contention

For non-critical tasks, simply skip when the lock is unavailable:

```javascript
async function runIfAvailable(taskName) {
  const acquired = await tryAcquireLock(taskName, INSTANCE_ID);
  if (!acquired) {
    console.log(`Task ${taskName} already running elsewhere - skipping this cycle`);
    return;
  }
  try {
    await runTask(taskName);
  } finally {
    await client.lock.unlock("lockstore", taskName, INSTANCE_ID);
  }
}
```

## Monitoring Lock Wait Times

Measure how long it takes to acquire locks to identify contention hot spots:

```javascript
async function timedLockAcquire(resourceId, owner) {
  const start = Date.now();
  const acquired = await acquireWithBackoff(resourceId, owner);
  const elapsed = Date.now() - start;
  console.log(`Lock ${resourceId}: acquired=${acquired}, wait=${elapsed}ms`);
  return acquired;
}
```

## Summary

Lock contention in Dapr is best handled through a combination of exponential backoff with jitter for retries, resource partitioning to reduce hot spots, and skip-on-contention logic for non-critical tasks. Tracking contention rates and lock wait times in your observability stack helps identify when your locking strategy needs refinement before it impacts service performance.
