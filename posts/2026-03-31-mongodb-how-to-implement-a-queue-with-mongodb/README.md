# How to Implement a Queue with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Queue, Job Processing, Background Task, Node.js

Description: Learn how to implement a reliable job queue with MongoDB using findOneAndUpdate for atomic dequeue, status tracking, and dead letter handling.

---

## Why Use MongoDB as a Queue

MongoDB can serve as a lightweight message queue for background job processing without introducing a separate message broker. It works well for:

- Low-to-medium throughput workloads (up to thousands of jobs/minute)
- Jobs that need persistence and auditability
- Teams already using MongoDB who want to avoid additional infrastructure

For very high throughput, use a dedicated queue like Redis Streams or RabbitMQ.

## Queue Document Schema

```javascript
// jobs collection schema
{
  _id: ObjectId(),
  type: "sendEmail",           // job type
  status: "queued",            // queued | processing | completed | dead
  priority: 1,                 // lower number = higher priority
  payload: {                   // job-specific data
    to: "alice@example.com",
    subject: "Welcome!",
    templateId: "welcome"
  },
  attempts: 0,                 // number of processing attempts
  maxAttempts: 3,              // max retries before marking dead
  createdAt: ISODate(),
  scheduledAt: ISODate(),      // earliest time to process
  processAfter: ISODate(),     // for delayed jobs
  startedAt: null,             // set when processing begins
  completedAt: null,           // set when done
  failedAt: null,
  error: null,                 // last error message
  workerId: null               // ID of the worker processing this job
}
```

## Indexes for the Queue

```javascript
// Index for dequeue operation - most critical
db.jobs.createIndex(
  { status: 1, priority: 1, processAfter: 1 },
  { name: "dequeue_idx" }
);

// Index for finding stuck jobs (worker crash recovery)
db.jobs.createIndex(
  { status: 1, startedAt: 1 },
  { name: "stuck_jobs_idx" }
);

// TTL index to auto-clean completed jobs after 7 days
db.jobs.createIndex(
  { completedAt: 1 },
  { expireAfterSeconds: 604800, sparse: true }
);
```

## Enqueuing Jobs

```javascript
// jobQueue.js
class JobQueue {
  constructor(db) {
    this.jobs = db.collection('jobs');
  }

  async enqueue(type, payload, options = {}) {
    const {
      priority = 5,
      delay = 0,          // ms to delay processing
      maxAttempts = 3
    } = options;

    const processAfter = new Date(Date.now() + delay);

    const job = {
      type,
      status: 'queued',
      priority,
      payload,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      scheduledAt: new Date(),
      processAfter,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      error: null,
      workerId: null
    };

    const result = await this.jobs.insertOne(job);
    return { ...job, _id: result.insertedId };
  }

  async enqueueBatch(jobsArray) {
    const now = new Date();
    const docs = jobsArray.map(({ type, payload, options = {} }) => ({
      type,
      status: 'queued',
      priority: options.priority || 5,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: now,
      scheduledAt: now,
      processAfter: new Date(Date.now() + (options.delay || 0)),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      error: null,
      workerId: null
    }));

    const result = await this.jobs.insertMany(docs, { ordered: false });
    return result.insertedCount;
  }
}
```

## Dequeuing - Atomic Claim with findOneAndUpdate

```javascript
async dequeue(workerId, jobTypes = null) {
  const now = new Date();
  const filter = {
    status: 'queued',
    processAfter: { $lte: now }
  };
  if (jobTypes) filter.type = { $in: jobTypes };

  const update = {
    $set: {
      status: 'processing',
      startedAt: now,
      workerId
    },
    $inc: { attempts: 1 }
  };

  const options = {
    sort: { priority: 1, processAfter: 1 },
    returnDocument: 'after'
  };

  // findOneAndUpdate is atomic - prevents two workers from claiming the same job
  return this.jobs.findOneAndUpdate(filter, update, options);
}
```

## Completing and Failing Jobs

```javascript
async complete(jobId) {
  await this.jobs.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        workerId: null
      }
    }
  );
}

async fail(jobId, error, retryDelayMs = 5000) {
  const job = await this.jobs.findOne({ _id: jobId });
  if (!job) return;

  const isExhausted = job.attempts >= job.maxAttempts;

  await this.jobs.updateOne(
    { _id: jobId },
    {
      $set: {
        status: isExhausted ? 'dead' : 'queued',
        failedAt: new Date(),
        error: error.message,
        workerId: null,
        processAfter: isExhausted ? null : new Date(Date.now() + retryDelayMs)
      }
    }
  );
}
```

## Worker Implementation

```javascript
// worker.js
const { v4: uuidv4 } = require('uuid');

class Worker {
  constructor(queue, handlers, options = {}) {
    this.queue = queue;
    this.handlers = handlers;
    this.workerId = uuidv4();
    this.pollIntervalMs = options.pollIntervalMs || 1000;
    this.jobTypes = Object.keys(handlers);
    this.running = false;
  }

  async start() {
    this.running = true;
    console.log(`Worker ${this.workerId} started`);
    while (this.running) {
      const job = await this.queue.dequeue(this.workerId, this.jobTypes);
      if (job) {
        await this.processJob(job);
      } else {
        await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
      }
    }
  }

  async processJob(job) {
    const handler = this.handlers[job.type];
    if (!handler) {
      await this.queue.fail(job._id, new Error(`No handler for job type: ${job.type}`));
      return;
    }

    try {
      await handler(job.payload);
      await this.queue.complete(job._id);
      console.log(`Job ${job._id} (${job.type}) completed`);
    } catch (err) {
      console.error(`Job ${job._id} (${job.type}) failed:`, err.message);
      await this.queue.fail(job._id, err);
    }
  }

  stop() {
    this.running = false;
  }
}

// Usage
const worker = new Worker(queue, {
  sendEmail: async (payload) => {
    await emailService.send(payload.to, payload.subject, payload.templateId);
  },
  generateReport: async (payload) => {
    await reportService.generate(payload.reportId);
  }
});

worker.start();
```

## Recovering Stuck Jobs

Jobs that were processing when a worker crashed need to be re-queued:

```javascript
async recoverStuckJobs(stuckThresholdMs = 300000) {
  const stuckBefore = new Date(Date.now() - stuckThresholdMs);
  const result = await this.jobs.updateMany(
    {
      status: 'processing',
      startedAt: { $lt: stuckBefore }
    },
    {
      $set: {
        status: 'queued',
        workerId: null,
        startedAt: null,
        processAfter: new Date()
      }
    }
  );
  return result.modifiedCount;
}
```

## Summary

Implementing a MongoDB job queue relies on `findOneAndUpdate` for atomic job claiming to prevent duplicate processing, status fields to track job lifecycle, and compound indexes on `status` plus `processAfter` for efficient polling. Use a retry delay (or exponential backoff for production workloads) and a `maxAttempts` field to prevent poison-pill jobs from blocking the queue. A separate recovery process that re-queues stuck `processing` jobs handles worker crashes without data loss.
