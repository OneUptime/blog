# How to Use Agenda.js with MongoDB for Job Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Agenda, Scheduling, Node.js, Job

Description: Learn how to use Agenda.js with MongoDB as a job store for reliable, distributed background job scheduling in Node.js applications.

---

## What Is Agenda.js

Agenda.js is a lightweight Node.js job scheduling library that uses MongoDB as its persistence layer. It stores job definitions, schedules, and execution history in a MongoDB collection, providing durability across restarts and distributed locking for multi-instance deployments. Agenda supports cron-style recurring jobs, one-time jobs, and job prioritization.

## Installation

```bash
npm install agenda@5
```

The examples in this guide use Agenda v5, which supports CommonJS (`require`). Agenda v6 and later are ESM-only and have a different configuration API.

Agenda requires a running MongoDB instance and stores jobs in the `agendaJobs` collection by default.

## Basic Setup

```javascript
// scheduler.js
const Agenda = require('agenda');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';

const agenda = new Agenda({
  db: {
    address: mongoUri,
    collection: 'agendaJobs',
  },
  processEvery: '30 seconds',   // how often to check for due jobs
  maxConcurrency: 5,            // max simultaneous jobs
  defaultConcurrency: 1         // default per job type
});

module.exports = agenda;
```

## Defining Jobs

Define job handlers using `agenda.define()`:

```javascript
// jobs/emailJobs.js
const agenda = require('../scheduler');
const nodemailer = require('nodemailer');

agenda.define('send welcome email', { priority: 'high' }, async (job) => {
  const { userId, email } = job.attrs.data;
  console.log(`Sending welcome email to ${email}`);
  // send email logic
});

agenda.define('weekly report', async (job) => {
  console.log('Generating weekly report...');
  // generate and email report
});

agenda.define('cleanup old notifications', async (job) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await require('../models/Notification').deleteMany({
    createdAt: { $lt: cutoff },
    read: true
  });
  console.log(`Deleted ${result.deletedCount} old notifications`);
});
```

## Starting Agenda and Scheduling Jobs

```javascript
// app.js
const agenda = require('./scheduler');
require('./jobs/emailJobs');

async function startAgenda() {
  await agenda.start();
  console.log('Agenda started');

  // Schedule recurring jobs (idempotent - won't duplicate if already scheduled)
  await agenda.every('1 week', 'weekly report');
  await agenda.every('0 2 * * *', 'cleanup old notifications'); // cron syntax

  console.log('Recurring jobs scheduled');
}

startAgenda().catch(console.error);

// Graceful shutdown
async function gracefulShutdown() {
  await agenda.stop();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Enqueueing One-Time Jobs

Trigger a job immediately from your application code:

```javascript
// In a route handler or service
const agenda = require('./scheduler');

async function onUserRegistration(user) {
  // Schedule immediately
  await agenda.now('send welcome email', {
    userId: user._id,
    email: user.email
  });

  // Schedule for later
  await agenda.schedule('in 1 week', 'send retention email', {
    userId: user._id
  });
}
```

## Error Handling and Retries

Agenda does not retry by default. Implement retry logic within the job definition:

```javascript
agenda.define('process payment', async (job) => {
  try {
    const { orderId, amount } = job.attrs.data;
    await processPayment(orderId, amount);
  } catch (err) {
    if (job.attrs.failCount < 3) {
      // Reschedule with increasing delay
      await job.schedule(new Date(Date.now() + (job.attrs.failCount + 1) * 60000));
      await job.save();
    }
    throw err; // let Agenda record the failure
  }
});
```

## Monitoring Job Status

Query job status directly from MongoDB:

```javascript
// Get all failed jobs
const failedJobs = await agenda.jobs({
  lastFinishedAt: { $exists: true },
  failedAt: { $exists: true }
});

// Get jobs currently running
const runningJobs = await agenda.jobs({ lockedAt: { $exists: true } });

// Cancel a recurring job
await agenda.cancel({ name: 'weekly report' });
```

## Summary

Agenda.js provides a simple, MongoDB-backed job scheduler for Node.js with support for recurring cron-style jobs, one-time jobs, prioritization, and distributed locking. Jobs survive application restarts and can run across multiple instances safely. Define job handlers separately from scheduling logic, always implement graceful shutdown with `agenda.stop()`, and monitor job failures by querying the `agendaJobs` collection directly.
