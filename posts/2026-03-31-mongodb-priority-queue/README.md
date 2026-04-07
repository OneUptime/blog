# How to Implement a Priority Queue with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queue, Priority Queue, Node.js, Pattern

Description: Build a priority queue in MongoDB using findOneAndUpdate with sort to atomically dequeue the highest-priority job without external queue services.

---

## Overview

A priority queue dequeues jobs in priority order rather than arrival order. MongoDB's `findOneAndUpdate` with an atomic fetch-and-lock pattern and a compound sort on priority and creation time makes this straightforward to implement without Redis or a dedicated message broker.

## Collection Design

```javascript
// Job document schema
{
  _id: ObjectId,
  payload: Object,       // Task data
  priority: Number,      // Higher = more urgent (e.g., 10 = critical, 1 = low)
  status: String,        // 'pending' | 'processing' | 'done' | 'failed'
  createdAt: Date,
  lockedAt: Date,        // Set when a worker picks up the job
  lockedBy: String,      // Worker ID
  attempts: Number
}
```

Create indexes to support efficient dequeue queries.

```javascript
await col.createIndexes([
  // Primary dequeue index: pending jobs, highest priority first, oldest first
  { key: { status: 1, priority: -1, createdAt: 1 } },
  // Stalled job recovery: find jobs locked too long
  { key: { status: 1, lockedAt: 1 } }
]);
```

## Enqueueing Jobs

```javascript
async function enqueue(col, payload, priority = 5) {
  const job = {
    payload,
    priority,
    status: 'pending',
    createdAt: new Date(),
    lockedAt: null,
    lockedBy: null,
    attempts: 0
  };

  const result = await col.insertOne(job);
  return result.insertedId;
}

// Enqueue with different priorities
await enqueue(col, { type: 'send_invoice', userId: 'u1' }, 10); // critical
await enqueue(col, { type: 'send_newsletter', listId: 'l1' }, 1); // low
```

## Dequeuing: Atomic Fetch and Lock

```javascript
const WORKER_ID = `worker-${process.pid}`;
const LOCK_TIMEOUT_MS = 60_000; // 1 minute

async function dequeue(col) {
  const job = await col.findOneAndUpdate(
    {
      // Pick up pending jobs or stalled jobs from other workers
      $or: [
        { status: 'pending' },
        { status: 'processing', lockedAt: { $lt: new Date(Date.now() - LOCK_TIMEOUT_MS) } }
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
      sort: { priority: -1, createdAt: 1 }, // Highest priority first, then oldest
      returnDocument: 'after'
    }
  );

  return job; // null if queue is empty
}
```

## Processing Jobs

```javascript
async function processJobs(col) {
  while (true) {
    const job = await dequeue(col);

    if (!job) {
      // Queue is empty - wait before polling again
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    try {
      console.log(`Processing job ${job._id} (priority: ${job.priority})`);
      await handleJob(job.payload);

      await col.updateOne(
        { _id: job._id },
        { $set: { status: 'done', completedAt: new Date() } }
      );
    } catch (err) {
      console.error(`Job ${job._id} failed:`, err.message);

      const update = job.attempts >= 3
        ? { $set: { status: 'failed', error: err.message } }
        : { $set: { status: 'pending', lockedAt: null, lockedBy: null } };

      await col.updateOne({ _id: job._id }, update);
    }
  }
}

async function handleJob(payload) {
  // Dispatch based on job type
  if (payload.type === 'send_invoice') {
    // ... send invoice logic
  }
}
```

## Boosting Priority at Runtime

You can promote a job to a higher priority without dequeuing and re-enqueueing it.

```javascript
async function boostPriority(col, jobId, newPriority) {
  await col.updateOne(
    { _id: jobId, status: 'pending' },
    { $set: { priority: newPriority } }
  );
}

// Promote a low-priority job to urgent
await boostPriority(col, jobId, 9);
```

## Summary

A MongoDB priority queue uses a compound index on `{ status, priority, createdAt }` and an atomic `findOneAndUpdate` with `sort: { priority: -1, createdAt: 1 }` to always dequeue the most urgent, oldest job first. Lock timeout recovery ensures stalled jobs are picked up by another worker, and runtime priority boosting lets you promote jobs without re-enqueueing.
