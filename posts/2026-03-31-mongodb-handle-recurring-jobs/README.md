# How to Handle Recurring Jobs with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Job, Scheduling, Node.js, Automation

Description: Learn how to implement reliable recurring job execution with MongoDB, covering next-run calculation, distributed locking, skipped-run detection, and backfill handling.

---

## Recurring Job Challenges

Recurring jobs in distributed systems face specific challenges that simple cron does not address: multiple instances may try to run the same job simultaneously (double execution), a server restart may cause a scheduled execution to be missed (skipped runs), and long-running jobs may prevent the next execution from starting on time (execution overlap). MongoDB provides the primitives to solve all three.

## Core Recurring Job Schema

```javascript
// models/RecurringJob.js
const mongoose = require('mongoose');

const ExecutionSchema = new mongoose.Schema({
  startedAt: Date,
  finishedAt: Date,
  status: { type: String, enum: ['success', 'failure'] },
  durationMs: Number,
  error: String
}, { _id: false });

const RecurringJobSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  cronExpression: { type: String, required: true },
  nextRunAt: { type: Date, required: true, index: true },
  lockedAt: Date,
  lockedBy: String,
  enabled: { type: Boolean, default: true },
  catchUpMissed: { type: Boolean, default: false }, // run missed executions?
  maxConcurrency: { type: Number, default: 1 },
  recentExecutions: { type: [ExecutionSchema], default: [] }  // last 10
});

module.exports = mongoose.model('RecurringJob', RecurringJobSchema);
```

## Implementing the Job Runner

```javascript
const parser = require('cron-parser');
const os = require('os');
const RecurringJob = require('./models/RecurringJob');

const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const WORKER_ID = `${os.hostname()}-${process.pid}`;

async function runNextDueJob(handlers) {
  const now = new Date();
  const lockExpiry = new Date(now - LOCK_TIMEOUT_MS);

  const job = await RecurringJob.findOneAndUpdate(
    {
      enabled: true,
      nextRunAt: { $lte: now },
      $or: [
        { lockedAt: null },
        { lockedAt: { $lt: lockExpiry } }
      ]
    },
    {
      $set: { lockedAt: now, lockedBy: WORKER_ID }
    },
    { new: true, sort: { nextRunAt: 1 } }  // run most overdue first
  );

  if (!job) return false;

  const executionStart = new Date();
  let status = 'failure';
  let error = null;

  try {
    const handler = handlers[job.name];
    if (!handler) throw new Error(`No handler for: ${job.name}`);
    await handler(job);
    status = 'success';
  } catch (err) {
    error = err.message;
    console.error(`Job ${job.name} failed:`, err.message);
  }

  const finishedAt = new Date();
  const durationMs = finishedAt - executionStart;

  const nextInterval = parser.parseExpression(job.cronExpression);
  const nextRunAt = nextInterval.next().toDate();

  // Record execution in recent history (cap at 10 entries)
  const execution = { startedAt: executionStart, finishedAt, status, durationMs, error };

  await RecurringJob.findByIdAndUpdate(job._id, {
    $set: { nextRunAt, lockedAt: null, lockedBy: null },
    $push: {
      recentExecutions: {
        $each: [execution],
        $slice: -10  // keep last 10 executions
      }
    }
  });

  return true;
}
```

## Handling Skipped Runs

When a server restarts after downtime, scheduled runs may have been missed. Handle this based on job policy:

```javascript
async function handleMissedRuns(job, handlers) {
  if (!job.catchUpMissed) {
    // Just reschedule to next future time
    const interval = parser.parseExpression(job.cronExpression);
    let next = interval.next().toDate();
    // Keep advancing until we're in the future
    while (next <= new Date()) {
      next = interval.next().toDate();
    }
    return next;
  }

  // Catch up: run all missed executions
  const interval = parser.parseExpression(job.cronExpression, {
    currentDate: job.nextRunAt
  });

  let nextRun;
  while (true) {
    const next = interval.next().toDate();
    if (next > new Date()) {
      nextRun = next;
      break;
    }
    console.log(`Catching up missed run for ${job.name} at ${next}`);
    await handlers[job.name]?.(job);
  }

  return nextRun;
}
```

## Preventing Execution Overlap

For long-running jobs where the execution time may exceed the interval, check if the job is still running before starting a new execution:

```javascript
async function checkForOverlap(jobName) {
  const job = await RecurringJob.findOne({ name: jobName });
  if (!job.lockedAt) return false;

  const lockAge = Date.now() - job.lockedAt.getTime();
  const isExpiredLock = lockAge > LOCK_TIMEOUT_MS;

  if (!isExpiredLock) {
    console.warn(`Job ${jobName} is still running (locked ${lockAge}ms ago). Skipping.`);
    return true;  // overlap detected, skip
  }

  console.warn(`Job ${jobName} has an expired lock (${lockAge}ms). Assuming dead worker.`);
  return false;
}
```

## Monitoring Recurring Job Health

```javascript
// Check jobs that haven't run in twice their expected interval
async function findStuckJobs() {
  const jobs = await RecurringJob.find({ enabled: true });
  const stuck = [];

  for (const job of jobs) {
    const interval = parser.parseExpression(job.cronExpression);
    const next1 = interval.next().toDate();
    const next2 = interval.next().toDate();
    const intervalMs = next2 - next1;
    const overdueMs = Date.now() - job.nextRunAt;

    if (overdueMs > intervalMs * 2) {
      stuck.push({ name: job.name, overdueMinutes: Math.round(overdueMs / 60000) });
    }
  }

  return stuck;
}
```

## Summary

Reliable recurring jobs in MongoDB require atomic locking with expiry to prevent double execution, next-run calculation using a cron parser after each execution, and a policy for handling skipped runs. Store recent execution history in the job document for operational visibility. Combine this with a monitoring loop that checks for overdue jobs and alerts when execution gaps exceed acceptable thresholds.
