# How to Handle Retry and Backoff in Notification Queues with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Retry, Backoff, Queue, Notification

Description: Implement exponential backoff and jittered retry logic for MongoDB-backed notification queues to handle transient delivery failures gracefully.

---

## Overview

Notification queues - whether for email, SMS, webhooks, or push notifications - will encounter transient failures: SMTP timeouts, provider rate limits, and network errors. A well-designed retry strategy using exponential backoff with jitter prevents thundering herd problems, respects provider rate limits, and eventually moves permanently failing jobs to a dead-letter queue.

## Retry Strategy Design

The recommended approach uses exponential backoff with equal jitter:

```text
nextRetryAt = now + (2^attempts * baseDelay) * (0.5 + random(0, 0.5))
```

This spreads retries across a window to avoid synchronized bursts.

```javascript
function calculateNextRetry(attempts, baseDelayMs = 30000) {
  const exponential = Math.pow(2, attempts) * baseDelayMs;
  const jitter = exponential * (0.5 + Math.random() * 0.5);
  return new Date(Date.now() + jitter);
}

// Retry schedule with base delay of 30 seconds:
// Attempt 1: ~30-60 seconds
// Attempt 2: ~60-120 seconds
// Attempt 3: ~120-240 seconds
// Attempt 4: ~240-480 seconds (if maxAttempts allows)
```

## Universal Notification Document Schema

```javascript
const notification = {
  channel: "email",        // email | sms | webhook | push
  recipient: "user@example.com",
  payload: {},             // channel-specific payload
  status: "pending",       // pending | processing | sent | failed | dead
  attempts: 0,
  maxAttempts: 4,
  nextRetryAt: new Date(),
  lockedAt: null,
  lockedBy: null,
  errors: [],              // history of all error messages
  sentAt: null,
  createdAt: new Date(),
};
```

## Marking a Job as Failed with Retry

```javascript
async function markFailed(db, jobId, errorMessage, maxAttempts = 4) {
  const { ObjectId } = require("mongodb");
  const job = await db.collection("notification_queue").findOne({ _id: new ObjectId(jobId) });

  if (!job) throw new Error("Job not found");

  const isDead = job.attempts >= maxAttempts;

  await db.collection("notification_queue").updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: isDead ? "dead" : "pending",
        nextRetryAt: isDead ? null : calculateNextRetry(job.attempts),
        lockedAt: null,
        lockedBy: null,
        sentAt: null,
      },
      $push: {
        errors: {
          message: errorMessage,
          occurredAt: new Date(),
          attempt: job.attempts,
        },
      },
    }
  );
}
```

## Worker with Claim and Backoff

```javascript
const workerId = `notify-worker-${process.pid}`;

async function claimJob(db, channel) {
  const lockExpiry = new Date(Date.now() - 10 * 60 * 1000);
  return db.collection("notification_queue").findOneAndUpdate(
    {
      channel,
      status: "pending",
      nextRetryAt: { $lte: new Date() },
      $or: [{ lockedAt: null }, { lockedAt: { $lt: lockExpiry } }],
    },
    {
      $set: { status: "processing", lockedAt: new Date(), lockedBy: workerId },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after", sort: { nextRetryAt: 1 } }
  );
}

async function processWithRetry(db, channel, deliverFn) {
  const job = await claimJob(db, channel);
  if (!job) return false;

  try {
    await deliverFn(job);
    await db.collection("notification_queue").updateOne(
      { _id: job._id },
      { $set: { status: "sent", sentAt: new Date(), lockedAt: null, lockedBy: null } }
    );
  } catch (err) {
    await markFailed(db, job._id, err.message, job.maxAttempts);
  }

  return true;
}
```

## Dead-Letter Queue Alerting

```javascript
async function alertDeadLetters(db) {
  const dead = await db.collection("notification_queue")
    .find({ status: "dead", sentAt: null })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  if (dead.length > 0) {
    console.error(`ALERT: ${dead.length} notifications in dead-letter queue`);
    // Send alert to Slack/PagerDuty/etc.
  }

  return dead;
}
```

## Indexes

```javascript
await db.collection("notification_queue").createIndex(
  { channel: 1, status: 1, nextRetryAt: 1 },
  { name: "idx_notify_worker" }
);
```

## Summary

Retry logic for MongoDB notification queues uses exponential backoff with equal jitter to calculate the next retry time after each failure. Store error history in the document for debugging, move jobs to dead status after exceeding `maxAttempts`, and alert on dead-letter accumulation. The atomic claim pattern prevents duplicate deliveries across multiple worker processes.
