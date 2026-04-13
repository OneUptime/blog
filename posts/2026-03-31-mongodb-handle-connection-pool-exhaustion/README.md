# How to Handle Connection Pool Exhaustion in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pool, Exhaustion, Performance, Troubleshooting

Description: Diagnose and resolve MongoDB connection pool exhaustion errors by identifying the root cause, tuning pool settings, and implementing circuit breakers and backpressure.

---

## What is Connection Pool Exhaustion

Pool exhaustion occurs when all connections are checked out and new requests must wait. When the wait queue timeout expires, the application receives:

```text
MongoTimeoutError: Timed out waiting for a connection from the connection pool after 30000ms
MongoWaitQueueFullError: wait queue for server localhost:27017 is full
```

## Common Root Causes

1. **Slow queries holding connections**: Long-running operations occupy connections for extended periods
2. **Too many concurrent requests**: Traffic spikes exceed pool capacity
3. **Connection leaks**: Code paths that open sessions without closing them
4. **Undersized pool**: `maxPoolSize` too small for the application's concurrency

## Step 1: Identify Slow Queries

Find operations holding connections for extended periods:

```javascript
// Operations running longer than 5 seconds
db.adminCommand({
  currentOp: true,
  active: true,
  microsecs_running: { $gte: 5000000 }
}).inprog.forEach(op => {
  print(`${op.ns}: ${op.op} running ${op.microsecs_running / 1e6}s`);
  print(`  query: ${JSON.stringify(op.command)}`);
})
```

Kill a specific long-running operation:

```javascript
db.adminCommand({ killOp: 1, op: 12345 })
```

## Step 2: Check for Connection Leaks

A connection leak occurs when sessions or cursors are not closed properly. Check for open cursors:

```javascript
db.adminCommand({ serverStatus: 1 }).metrics.cursor
// If open.total keeps growing, there is a cursor leak
```

In Node.js, always close cursors:

```javascript
// Leaking pattern - cursor never closed on error
const cursor = db.collection("orders").find({});
const result = await cursor.toArray(); // If this throws, cursor leaks

// Safe pattern
const cursor = db.collection("orders").find({});
try {
  const result = await cursor.toArray();
  return result;
} finally {
  await cursor.close();
}
```

## Step 3: Tune Pool Settings

Increase `maxPoolSize` and add a wait queue timeout:

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 100,
  minPoolSize: 10,
  waitQueueTimeoutMS: 5000,     // Fail fast rather than queue indefinitely
  serverSelectionTimeoutMS: 5000
});
```

## Step 4: Implement Application-Level Rate Limiting

Use a semaphore to limit concurrent database operations:

```javascript
class Semaphore {
  constructor(limit) {
    this.limit = limit;
    this.active = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    await new Promise(resolve => this.queue.push(resolve));
    this.active++;
  }

  release() {
    this.active--;
    if (this.queue.length > 0) {
      this.queue.shift()();
    }
  }
}

const dbSemaphore = new Semaphore(100); // Match maxPoolSize

async function safeQuery(fn) {
  await dbSemaphore.acquire();
  try {
    return await fn();
  } finally {
    dbSemaphore.release();
  }
}
```

## Step 5: Add Circuit Breaker Logic

Stop sending requests when pool is exhausted to allow recovery:

```javascript
let consecutiveTimeouts = 0;
const CIRCUIT_OPEN_THRESHOLD = 5;

async function queryWithCircuitBreaker(fn) {
  if (consecutiveTimeouts >= CIRCUIT_OPEN_THRESHOLD) {
    throw new Error("Circuit open: MongoDB pool exhausted");
  }

  try {
    const result = await fn();
    consecutiveTimeouts = 0;
    return result;
  } catch (err) {
    if (err.name === "MongoTimeoutError") {
      consecutiveTimeouts++;
    }
    throw err;
  }
}
```

## Summary

MongoDB connection pool exhaustion is resolved by identifying and fixing slow queries that hold connections, closing cursors and sessions properly to prevent leaks, increasing `maxPoolSize` to match peak concurrency, and setting a `waitQueueTimeoutMS` to fail fast rather than queue indefinitely. For protection during traffic spikes, add application-level semaphores to bound concurrent database operations and circuit breakers to stop flooding MongoDB when the pool is already overwhelmed.
