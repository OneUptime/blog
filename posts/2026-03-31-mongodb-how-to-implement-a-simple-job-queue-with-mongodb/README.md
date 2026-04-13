# How to Implement a Simple Job Queue with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Job Queue, Background Job, findOneAndUpdate, Worker Pattern

Description: Learn how to build a reliable job queue in MongoDB using findOneAndUpdate for atomic job claiming and status tracking for deferred processing.

---

## Why Use MongoDB as a Job Queue?

A MongoDB-backed job queue is a practical choice when you already use MongoDB and want to:
- Process background tasks without introducing a separate message broker
- Maintain job history and audit trails in the same database
- Use familiar MongoDB queries to inspect and debug queued work
- Keep infrastructure simple for small to medium workloads

## Creating the Jobs Collection

```javascript
// Create the jobs collection with an index for efficient polling
db.createCollection("jobs")

// Index for finding pending jobs by priority and creation time
db.jobs.createIndex({ status: 1, priority: -1, createdAt: 1 })

// TTL index to auto-delete completed jobs after 7 days
db.jobs.createIndex(
  { completedAt: 1 },
  { expireAfterSeconds: 604800, partialFilterExpression: { completedAt: { $exists: true } } }
)
```

## Job Document Schema

```javascript
// Example job document
{
  _id: ObjectId(),
  type: "sendEmail",              // job type for routing to correct handler
  status: "pending",              // pending | processing | completed | failed
  priority: 10,                   // higher = processed first
  payload: {
    to: "user@example.com",
    subject: "Welcome!",
    templateId: "welcome-email"
  },
  attempts: 0,                    // retry counter
  maxAttempts: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  scheduledFor: new Date(),       // null = run immediately
  processingStartedAt: null,
  completedAt: null,
  failedAt: null,
  error: null,
  workerId: null                  // which worker instance claimed this job
}
```

## Enqueuing Jobs

```javascript
async function enqueue(collection, type, payload, options = {}) {
  const job = {
    type,
    status: "pending",
    priority: options.priority ?? 5,
    payload,
    attempts: 0,
    maxAttempts: options.maxAttempts ?? 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduledFor: options.scheduledFor ?? new Date(),
    processingStartedAt: null,
    completedAt: null,
    failedAt: null,
    error: null,
    workerId: null
  }

  const result = await collection.insertOne(job)
  return result.insertedId
}

// Enqueue a job
const jobId = await enqueue(db.collection("jobs"), "sendEmail", {
  to: "alice@example.com",
  subject: "Welcome to our platform!"
}, { priority: 10 })
```

## Claiming Jobs Atomically

Use `findOneAndUpdate` to atomically claim a job - this prevents two workers from picking up the same job:

```javascript
const WORKER_ID = require("os").hostname() + "-" + process.pid

async function claimNextJob(collection) {
  const now = new Date()

  const job = await collection.findOneAndUpdate(
    {
      status: "pending",
      scheduledFor: { $lte: now }
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: now,
        updatedAt: now,
        workerId: WORKER_ID
      },
      $inc: { attempts: 1 }
    },
    {
      sort: { priority: -1, createdAt: 1 },  // highest priority first, then FIFO
      returnDocument: "after"
    }
  )

  return job  // null if no jobs available
}
```

## Processing Jobs

```javascript
const jobHandlers = {
  sendEmail: async (payload) => {
    // send email using payload.to, payload.subject
    console.log("Sending email to:", payload.to)
    await sendEmailService(payload)
  },
  generateReport: async (payload) => {
    await buildReport(payload.reportId)
  }
}

async function processJob(job, collection) {
  const handler = jobHandlers[job.type]
  if (!handler) {
    throw new Error(`Unknown job type: ${job.type}`)
  }

  try {
    await handler(job.payload)

    // Mark as completed
    await collection.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )
    console.log(`Job ${job._id} completed`)
  } catch (err) {
    const isFinalAttempt = job.attempts >= job.maxAttempts

    await collection.updateOne(
      { _id: job._id },
      {
        $set: {
          status: isFinalAttempt ? "failed" : "pending",
          failedAt: isFinalAttempt ? new Date() : null,
          error: err.message,
          updatedAt: new Date(),
          workerId: null,
          processingStartedAt: null,
          // Re-schedule with backoff if retrying
          scheduledFor: isFinalAttempt
            ? null
            : new Date(Date.now() + Math.pow(2, job.attempts) * 5000)
        }
      }
    )

    console.error(`Job ${job._id} ${isFinalAttempt ? "failed permanently" : "will retry"}`)
  }
}
```

## Worker Loop

```javascript
async function runWorker(collection, pollIntervalMs = 1000) {
  console.log("Worker started:", WORKER_ID)

  while (true) {
    const job = await claimNextJob(collection)

    if (job) {
      await processJob(job, collection)
    } else {
      // No jobs available - wait before polling again
      await new Promise(r => setTimeout(r, pollIntervalMs))
    }
  }
}

runWorker(db.collection("jobs"))
```

## Handling Stuck Jobs

Jobs claimed but never completed (e.g., worker crashed) need to be reclaimed:

```javascript
// Reset jobs stuck in "processing" for more than 5 minutes
async function reclaimStuckJobs(collection, timeoutMs = 300000) {
  const stuckBefore = new Date(Date.now() - timeoutMs)

  const result = await collection.updateMany(
    {
      status: "processing",
      processingStartedAt: { $lt: stuckBefore }
    },
    {
      $set: {
        status: "pending",
        workerId: null,
        processingStartedAt: null,
        updatedAt: new Date()
      }
    }
  )

  if (result.modifiedCount > 0) {
    console.log(`Reclaimed ${result.modifiedCount} stuck jobs`)
  }
}

// Run periodically
setInterval(() => reclaimStuckJobs(db.collection("jobs")), 60000)
```

## Summary

A MongoDB job queue uses `findOneAndUpdate` for atomic job claiming, status fields to track job lifecycle (pending, processing, completed, failed), priority and creation time indexes for efficient polling, and exponential backoff for retry scheduling. Handle stuck jobs by periodically resetting jobs in processing state that exceed a timeout threshold.
