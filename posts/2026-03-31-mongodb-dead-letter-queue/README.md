# How to Implement Dead Letter Queues with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queue, Dead Letter Queue, Error Handling, Node.js

Description: Implement a dead letter queue in MongoDB to capture persistently failing jobs, preserve their context, and enable manual inspection and replay.

---

## Overview

A dead letter queue (DLQ) is a holding area for jobs that have exhausted their retry attempts. Instead of silently discarding failed jobs, the DLQ preserves them with full context - payload, error history, and attempt count - so operators can inspect failures, fix root causes, and replay jobs when ready.

## Collection Design

Use two collections: one for the active job queue and one for the dead letter queue.

```javascript
// Active jobs collection: 'jobs'
// Dead letter collection: 'jobs_dlq'

// Create indexes on both collections
await db.collection('jobs').createIndexes([
  { key: { status: 1, createdAt: 1 } },
  { key: { status: 1, attempts: 1 } }
]);

await db.collection('jobs_dlq').createIndexes([
  { key: { 'payload.type': 1 } },
  // Auto-delete DLQ entries after 90 days
  { key: { movedAt: 1 }, expireAfterSeconds: 7776000 }
]);
```

## Moving Jobs to the DLQ

When a job exceeds its maximum retry count, move it to the DLQ collection and remove it from the active queue. For true atomicity, wrap the insert and delete in a multi-document transaction.

```javascript
const MAX_ATTEMPTS = 3;

async function failJob(db, job, error) {
  const jobs = db.collection('jobs');
  const dlq = db.collection('jobs_dlq');

  const nextAttempt = (job.attempts || 0) + 1;

  if (nextAttempt >= MAX_ATTEMPTS) {
    // Move to dead letter queue
    await dlq.insertOne({
      originalId: job._id,
      payload: job.payload,
      attempts: nextAttempt,
      errors: job.errors || [],
      lastError: {
        message: error.message,
        stack: error.stack,
        at: new Date()
      },
      movedAt: new Date(),
      status: 'dead',
      replayStatus: null
    });

    await jobs.deleteOne({ _id: job._id });
    console.error(`Job ${job._id} moved to DLQ after ${nextAttempt} attempts`);
  } else {
    // Reschedule for retry with back-off
    const retryDelay = Math.pow(2, nextAttempt) * 5000;
    const nextRunAt = new Date(Date.now() + retryDelay);
    await jobs.updateOne(
      { _id: job._id },
      {
        $set: { status: 'pending', lockedAt: null, nextRunAt },
        $inc: { attempts: 1 },
        $push: {
          errors: { message: error.message, at: new Date(), attempt: nextAttempt }
        }
      }
    );
    console.warn(`Job ${job._id} rescheduled, attempt ${nextAttempt + 1} at ${nextRunAt.toISOString()}`);
  }
}
```

## Worker Integration

```javascript
async function runWorker(db) {
  const jobs = db.collection('jobs');

  while (true) {
    const job = await jobs.findOneAndUpdate(
      { status: 'pending' },
      { $set: { status: 'processing', lockedAt: new Date() } },
      { sort: { createdAt: 1 }, returnDocument: 'after' }
    );

    if (!job) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    try {
      await processJob(job.payload);
      await jobs.updateOne({ _id: job._id }, { $set: { status: 'done' } });
    } catch (err) {
      await failJob(db, job, err);
    }
  }
}
```

## Inspecting the DLQ

```javascript
// Count dead jobs by type
const summary = await db.collection('jobs_dlq').aggregate([
  { $match: { status: 'dead' } },
  { $group: { _id: '$payload.type', count: { $sum: 1 }, lastError: { $last: '$lastError.message' } } },
  { $sort: { count: -1 } }
]).toArray();

console.table(summary);
```

## Replaying Dead Jobs

```javascript
async function replayDead(db, filter = {}) {
  const dlq = db.collection('jobs_dlq');
  const jobs = db.collection('jobs');

  const deadJobs = await dlq.find({ status: 'dead', ...filter }).toArray();

  for (const dead of deadJobs) {
    await jobs.insertOne({
      payload: dead.payload,
      status: 'pending',
      attempts: 0,
      errors: [],
      createdAt: new Date(),
      replayedFrom: dead._id
    });

    await dlq.updateOne({ _id: dead._id }, { $set: { replayStatus: 'replayed', replayedAt: new Date() } });
  }

  console.log(`Replayed ${deadJobs.length} jobs from DLQ`);
}

// Replay all dead email jobs
await replayDead(db, { 'payload.type': 'send_email' });
```

## Summary

A MongoDB dead letter queue uses a separate collection to capture jobs that have exhausted their retries. Move failed jobs with `insertOne` on the DLQ followed by `deleteOne` from the active queue, using a multi-document transaction if atomicity is required. Store the full error history and attempt count for diagnosis. Use aggregation to summarize failure patterns, and replay dead jobs by re-inserting them into the active queue with zeroed attempt counters.
