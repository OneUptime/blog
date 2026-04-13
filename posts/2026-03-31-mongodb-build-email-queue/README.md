# How to Build an Email Queue with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queue, Email, Worker, Index

Description: Implement a reliable MongoDB-backed email queue with atomic job claiming, retry logic, dead-letter handling, and monitoring for worker stalls.

---

## Why Use MongoDB as an Email Queue

MongoDB makes a practical email queue for applications that already use it as a primary database, avoiding the operational overhead of a separate message broker. The key is using atomic `findOneAndUpdate` to claim jobs, which prevents duplicate sending across multiple worker instances.

## Email Job Schema

```javascript
db.emailQueue.insertOne({
  to: "alice@example.com",
  from: "noreply@myapp.com",
  subject: "Welcome to MyApp",
  templateId: "welcome",
  templateData: { firstName: "Alice", activationLink: "https://myapp.com/activate/abc" },
  status: "pending", // pending | processing | sent | failed | dead
  attempts: 0,
  maxAttempts: 3,
  processAfter: new Date(), // Supports delayed sending
  lockedAt: null,
  lockedBy: null, // Worker ID
  sentAt: null,
  error: null,
  createdAt: new Date(),
});
```

## Required Indexes

```javascript
// Worker polling query
db.emailQueue.createIndex({ status: 1, processAfter: 1, lockedAt: 1 });

// Find jobs by recipient for debugging
db.emailQueue.createIndex({ to: 1, createdAt: -1 });

// TTL cleanup of sent emails after 30 days
db.emailQueue.createIndex(
  { sentAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { sentAt: { $ne: null } } }
);
```

## Atomic Job Claiming

The most critical part - atomically claim a job to prevent two workers from processing the same email:

```javascript
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const workerId = `worker-${process.pid}-${Date.now()}`;

async function claimNextJob() {
  const now = new Date();
  const lockExpiry = new Date(now - LOCK_DURATION_MS);

  return db.collection("emailQueue").findOneAndUpdate(
    {
      $or: [
        { status: "pending", processAfter: { $lte: now } },
        { status: "processing", lockedAt: { $lt: lockExpiry } },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedAt: now,
        lockedBy: workerId,
      },
      $inc: { attempts: 1 },
    },
    { sort: { processAfter: 1 }, returnDocument: "after" }
  );
}
```

## Worker Processing Loop

```javascript
async function processEmailWorker() {
  while (true) {
    const job = await claimNextJob();

    if (!job) {
      await new Promise((r) => setTimeout(r, 5000)); // Poll every 5s when empty
      continue;
    }

    try {
      await sendEmail(job.to, job.from, job.subject, job.templateId, job.templateData);

      await db.collection("emailQueue").updateOne(
        { _id: job._id },
        { $set: { status: "sent", sentAt: new Date(), lockedAt: null, lockedBy: null } }
      );
    } catch (err) {
      const nextStatus = job.attempts >= job.maxAttempts ? "dead" : "pending";
      const backoffMs = Math.pow(2, job.attempts) * 60 * 1000; // Exponential backoff

      await db.collection("emailQueue").updateOne(
        { _id: job._id },
        {
          $set: {
            status: nextStatus,
            error: err.message,
            lockedAt: null,
            lockedBy: null,
            processAfter: new Date(Date.now() + backoffMs),
          },
        }
      );
    }
  }
}
```

## Monitor Queue Depth

Track queue depth to detect worker stalls:

```javascript
async function getQueueStats() {
  return db.collection("emailQueue").aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).toArray();
}

// Expected output:
// [{ _id: "pending", count: 12 }, { _id: "sent", count: 847 }, { _id: "dead", count: 3 }]
```

Alert when `pending` count grows beyond your expected throughput threshold.

## Requeue Dead Letters

Inspect and requeue failed jobs:

```javascript
// List dead jobs for investigation
db.emailQueue.find({ status: "dead" }).sort({ createdAt: -1 }).limit(20);

// Requeue a dead job manually after fixing the issue
db.emailQueue.updateOne(
  { _id: deadJobId },
  { $set: { status: "pending", attempts: 0, error: null, processAfter: new Date() } }
);
```

## Summary

A MongoDB email queue uses `findOneAndUpdate` for atomic job claiming to prevent duplicate delivery across workers. The schema tracks attempt counts, lock ownership, and exponential backoff delays. Index on `status`, `processAfter`, and `lockedAt` for efficient worker polling. Use stale lock detection to recover from crashed workers, and monitor queue depth by grouping on `status` to detect backlogs.
