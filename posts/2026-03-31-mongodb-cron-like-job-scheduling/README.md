# How to Implement Cron-Like Job Scheduling with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scheduling, Job, Node.js, Automation

Description: Learn how to implement cron-like job scheduling using MongoDB as the job store, with locking to prevent duplicate execution across multiple application instances.

---

## Why Use MongoDB for Job Scheduling

MongoDB is a natural fit for distributed job scheduling because it provides atomic operations (`findOneAndUpdate`) that enable safe distributed locking, change streams for real-time job detection, and a flexible schema for storing job metadata. Unlike in-process schedulers (node-cron, setInterval), MongoDB-backed schedulers survive process restarts and work across multiple application instances without double-execution.

## Job Document Schema

Design your job documents to capture scheduling, locking, and history:

```javascript
// schema/Job.js (using Mongoose)
const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  cronExpression: { type: String, required: true }, // e.g., "0 * * * *"
  nextRunAt: { type: Date, required: true, index: true },
  lastRunAt: Date,
  lockedAt: Date,
  lockedBy: String,  // process ID or hostname
  lastResult: { type: String, enum: ['success', 'failure', 'running'] },
  lastError: String,
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('Job', JobSchema);
```

## Computing the Next Run Time

Use a cron parser to calculate the next execution time from a cron expression:

```bash
npm install cron-parser
```

```javascript
const { CronExpressionParser } = require('cron-parser');

function getNextRunAt(cronExpression) {
  const interval = CronExpressionParser.parse(cronExpression);
  return interval.next();
}
```

## Distributed Job Executor

The key to safe distributed scheduling is atomic locking using `findOneAndUpdate`:

```javascript
const mongoose = require('mongoose');
const os = require('os');
const Job = require('./schema/Job');

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function runDueJobs(handlers) {
  const now = new Date();
  const lockExpiry = new Date(now - LOCK_TIMEOUT_MS);

  // Atomically find and lock a due job
  const job = await Job.findOneAndUpdate(
    {
      enabled: true,
      nextRunAt: { $lte: now },
      $or: [
        { lockedAt: null },
        { lockedAt: { $lt: lockExpiry } }  // expired lock
      ]
    },
    {
      $set: {
        lockedAt: now,
        lockedBy: `${os.hostname()}-${process.pid}`,
        lastResult: 'running'
      }
    },
    { new: true }
  );

  if (!job) return; // No jobs due

  console.log(`Running job: ${job.name}`);
  const handler = handlers[job.name];

  try {
    if (!handler) throw new Error(`No handler registered for job: ${job.name}`);
    await handler();

    await Job.findByIdAndUpdate(job._id, {
      $set: {
        lastRunAt: new Date(),
        nextRunAt: getNextRunAt(job.cronExpression),
        lockedAt: null,
        lockedBy: null,
        lastResult: 'success',
        lastError: null
      }
    });
    console.log(`Job completed: ${job.name}`);
  } catch (err) {
    await Job.findByIdAndUpdate(job._id, {
      $set: {
        lastRunAt: new Date(),
        nextRunAt: getNextRunAt(job.cronExpression),
        lockedAt: null,
        lockedBy: null,
        lastResult: 'failure',
        lastError: err.message
      }
    });
    console.error(`Job failed: ${job.name}`, err.message);
  }
}
```

## Registering and Starting the Scheduler

```javascript
// scheduler.js
const mongoose = require('mongoose');
const Job = require('./schema/Job');

const handlers = {
  'send-daily-digest': async () => {
    console.log('Sending daily digest emails...');
    // email logic here
  },
  'cleanup-expired-sessions': async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await mongoose.connection.db.collection('sessions').deleteMany({
      expiresAt: { $lt: cutoff }
    });
  }
};

async function initJobs() {
  // Upsert job definitions
  await Job.findOneAndUpdate(
    { name: 'send-daily-digest' },
    { cronExpression: '0 8 * * *', nextRunAt: getNextRunAt('0 8 * * *'), enabled: true },
    { upsert: true }
  );

  await Job.findOneAndUpdate(
    { name: 'cleanup-expired-sessions' },
    { cronExpression: '0 * * * *', nextRunAt: getNextRunAt('0 * * * *'), enabled: true },
    { upsert: true }
  );
}

// Poll every 30 seconds
setInterval(() => runDueJobs(handlers), 30000);
initJobs();
```

## Summary

MongoDB-backed cron-like scheduling uses atomic `findOneAndUpdate` with a lock field to ensure only one application instance executes each job. Store cron expressions and next run times in job documents, compute the next run time after each execution, and implement lock expiry to recover from crashed workers. This approach scales to multiple application instances without a dedicated scheduler service.
