# How to Handle Queue Workers and Concurrency with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queue, Worker, Concurrency, Node.js

Description: Design concurrent MongoDB queue workers using atomic locking, worker pools, and stalled-job recovery to maximize throughput without duplicate processing.

---

## Overview

Running multiple queue workers against a MongoDB job queue improves throughput, but naive implementations lead to duplicate job processing. MongoDB's `findOneAndUpdate` provides the atomic fetch-and-lock primitive needed to safely coordinate concurrent workers.

## Atomic Locking to Prevent Duplicate Processing

The core of safe concurrency is a single atomic operation that finds a pending job and marks it as processing in one step. No two workers can claim the same job.

```javascript
const WORKER_ID = `worker-${process.pid}-${Date.now()}`;
const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

async function claimJob(col) {
  return col.findOneAndUpdate(
    {
      status: 'pending',
      $or: [
        { lockedAt: null },
        { lockedAt: { $lt: new Date(Date.now() - LOCK_TIMEOUT_MS) } }
      ]
    },
    {
      $set: {
        status: 'processing',
        lockedAt: new Date(),
        lockedBy: WORKER_ID
      },
      $inc: { attempts: 1 }
    },
    {
      sort: { createdAt: 1 },
      returnDocument: 'after'
    }
  );
}
```

## Running a Concurrent Worker Pool

Use `Promise.all` to run multiple worker loops in parallel within a single Node.js process.

```javascript
async function runWorkerPool(col, concurrency = 4) {
  console.log(`Starting ${concurrency} concurrent workers`);

  const workers = Array.from({ length: concurrency }, (_, i) =>
    runWorker(col, `pool-worker-${i}`)
  );

  await Promise.all(workers);
}

async function runWorker(col, workerId) {
  while (true) {
    const job = await claimJob(col);

    if (!job) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    try {
      console.log(`[${workerId}] Processing ${job._id}`);
      await processJob(job.payload);

      await col.updateOne(
        { _id: job._id, lockedBy: WORKER_ID },
        { $set: { status: 'done', completedAt: new Date() } }
      );
    } catch (err) {
      console.error(`[${workerId}] Job ${job._id} failed:`, err.message);

      const update = job.attempts >= 3
        ? { $set: { status: 'failed', failedAt: new Date(), error: err.message } }
        : { $set: { status: 'pending', lockedAt: null, lockedBy: null } };

      await col.updateOne({ _id: job._id, lockedBy: WORKER_ID }, update);
    }
  }
}
```

## Heartbeating Long-Running Jobs

For jobs that take longer than the lock timeout, extend the lock periodically.

```javascript
async function processJobWithHeartbeat(col, job, processFn) {
  const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

  const heartbeat = setInterval(async () => {
    await col.updateOne(
      { _id: job._id, lockedBy: WORKER_ID },
      { $set: { lockedAt: new Date() } }
    );
    console.log(`Heartbeat for job ${job._id}`);
  }, HEARTBEAT_INTERVAL);

  try {
    await processFn(job.payload);
  } finally {
    clearInterval(heartbeat);
  }
}
```

## Recovering Stalled Jobs

A dedicated recovery task re-queues jobs locked by workers that crashed.

```javascript
async function recoverStalledJobs(col) {
  const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MS);

  const result = await col.updateMany(
    {
      status: 'processing',
      lockedAt: { $lt: cutoff }
    },
    {
      $set: { status: 'pending', lockedAt: null, lockedBy: null }
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Recovered ${result.modifiedCount} stalled jobs`);
  }
}

// Run recovery every minute
setInterval(() => recoverStalledJobs(col), 60_000);
```

## Scaling Across Multiple Machines

The same pattern works across multiple Node.js processes or machines. Each worker uses its own `WORKER_ID` (e.g., `hostname-pid`) and the lock on `lockedBy` ensures only the owning worker completes the job. The stalled job recovery handles crashes transparently.

```javascript
const os = require('os');
const WORKER_ID = `${os.hostname()}-${process.pid}`;
```

## Summary

Concurrent MongoDB queue workers rely on atomic `findOneAndUpdate` to claim jobs safely. Run multiple async loops with `Promise.all` for in-process concurrency, use heartbeating for long-running jobs, and run a periodic stalled-job recovery task to re-queue jobs from workers that crashed. The same design scales to multiple machines without changes.
