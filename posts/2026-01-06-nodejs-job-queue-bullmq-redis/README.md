# How to Build a Job Queue in Node.js with BullMQ and Redis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Redis, Performance, Scaling, DevOps

Description: Learn to build production-ready job queues in Node.js using BullMQ and Redis, including delayed jobs, priorities, retries, and dead letter queues.

---

Background job processing is essential for scalable Node.js applications. Email sending, image processing, report generation, and data synchronization shouldn't block your API responses. BullMQ provides a robust, Redis-backed queue system with features like delayed jobs, priorities, retries, and rate limiting.

## Why BullMQ?

| Feature | BullMQ | Bull | Agenda |
|---------|--------|------|--------|
| Redis-backed | Yes | Yes | MongoDB |
| TypeScript | Native | Wrapper | Yes |
| Delayed jobs | Yes | Yes | Yes |
| Rate limiting | Yes | Yes | No |
| Job dependencies | Yes | No | No |
| Performance | Excellent | Good | Moderate |

## Basic Setup

Install BullMQ for job queue management and ioredis for Redis connectivity. BullMQ uses Redis to persist jobs and coordinate between producers and workers.

```bash
# Install BullMQ for queue management and ioredis for Redis connection
npm install bullmq ioredis
```

### Queue Producer

The producer creates jobs and adds them to the queue. Jobs are stored in Redis and processed by workers running in separate processes (or even separate servers).

```javascript
// producer.js
const { Queue } = require('bullmq');

// Create a queue connection - jobs are stored in Redis
const emailQueue = new Queue('email', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

// Function to add a job to the queue
async function sendWelcomeEmail(userId, email) {
  const job = await emailQueue.add(
    'welcome',  // Job name - used for routing in worker
    {
      // Job payload - any serializable data
      userId,
      email,
      template: 'welcome',
    },
    {
      // Job options
      attempts: 3,  // Retry up to 3 times on failure
      backoff: {
        type: 'exponential',  // Wait longer between each retry
        delay: 1000,          // Initial delay: 1s, 2s, 4s
      },
    }
  );

  console.log(`Job ${job.id} added to queue`);
  return job;
}

// Usage in API - job is queued, response returns immediately
app.post('/users', async (req, res) => {
  const user = await createUser(req.body);
  // Email is sent asynchronously - doesn't block the response
  await sendWelcomeEmail(user.id, user.email);
  res.json(user);
});
```

### Queue Worker

Workers run in separate processes and poll Redis for jobs. They execute the job processor function and report progress, completion, or failure. The concurrency option controls parallel processing.

```javascript
// worker.js - typically run as a separate process
const { Worker } = require('bullmq');

// Create a worker that processes jobs from the 'email' queue
const worker = new Worker(
  'email',  // Queue name to process
  async (job) => {
    // This function runs for each job
    console.log(`Processing job ${job.id}: ${job.name}`);

    const { userId, email, template } = job.data;

    // Report progress for long-running jobs (visible in dashboard)
    await job.updateProgress(10);

    // Fetch user data
    const user = await getUser(userId);
    await job.updateProgress(30);

    // Render email template
    const html = await renderTemplate(template, { user });
    await job.updateProgress(50);

    // Send the email
    await sendEmail({
      to: email,
      subject: getSubject(template),
      html,
    });

    await job.updateProgress(100);

    // Return value is stored as job result
    return { sent: true, email };
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 5,  // Process up to 5 jobs in parallel
  }
);

// Event handlers for monitoring
worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
  // Job will be retried if attempts remain
});

worker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});
```

## Delayed Jobs

Schedule jobs to run in the future. Delayed jobs are stored in Redis and moved to the active queue when their delay expires. This is ideal for reminders, scheduled notifications, or retry delays.

```javascript
// Schedule job for 7 days from now
await emailQueue.add(
  'reminder',
  { userId, type: 'trial-ending' },
  {
    delay: 7 * 24 * 60 * 60 * 1000,  // Delay in milliseconds
  }
);

// Schedule at a specific date/time
const targetDate = new Date('2024-12-25T09:00:00Z');
await emailQueue.add(
  'holiday-greeting',
  { campaign: 'christmas' },
  {
    // Calculate delay from now until target time
    delay: targetDate.getTime() - Date.now(),
  }
);
```

## Job Priorities

Priorities determine processing order when multiple jobs are waiting. Lower numbers mean higher priority. Use this to ensure critical jobs (security alerts) are processed before less urgent work (marketing emails).

```javascript
// Critical job - process immediately (priority 1 = highest)
await notificationQueue.add(
  'security-alert',
  { userId, type: 'password-changed' },
  {
    priority: 1,  // Processed before all lower priority jobs
  }
);

// Normal priority jobs
await notificationQueue.add(
  'weekly-digest',
  { userId },
  {
    priority: 10,  // Default priority level
  }
);

// Low priority - process when queue is otherwise empty
await notificationQueue.add(
  'marketing',
  { campaign: 'new-feature' },
  {
    priority: 100,  // Processed last
  }
);
```

## Retry and Backoff Strategies

Configure how jobs are retried when they fail. Different backoff strategies suit different scenarios - exponential for rate limits, fixed for transient errors, and custom for complex retry logic.

```javascript
// Exponential backoff - doubles delay between attempts
// Good for rate limiting scenarios where you need to back off progressively
await queue.add('job', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // Delays: 1s, 2s, 4s, 8s, 16s
  },
});

// Fixed delay - same wait time between every retry
// Good for transient failures that resolve quickly
await queue.add('job', data, {
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000, // Always wait 5s between attempts
  },
});

// Custom backoff - define your own delay logic
// Useful for complex scenarios with specific timing requirements
await queue.add('job', data, {
  attempts: 5,
  backoff: {
    type: 'custom',
  },
});

// In worker, define custom backoff strategy
const worker = new Worker('queue', processor, {
  settings: {
    backoffStrategy: (attemptsMade) => {
      // Custom delay sequence: 1s, 5s, 30s, 2m, 10m
      // Useful when you need non-linear backoff patterns
      const delays = [1000, 5000, 30000, 120000, 600000];
      return delays[Math.min(attemptsMade, delays.length - 1)];
    },
  },
});
```

## Dead Letter Queue

Handle permanently failed jobs after all retries are exhausted. A Dead Letter Queue (DLQ) captures failed jobs for alerting, debugging, and potential manual retry.

```javascript
// Create a separate queue for failed jobs (Dead Letter Queue)
const deadLetterQueue = new Queue('email-dlq', { connection });

// Worker with failed job handling
const worker = new Worker('email', async (job) => {
  // Process job - may throw if processing fails
}, {
  connection,
});

// Listen for failed jobs to implement DLQ logic
worker.on('failed', async (job, err) => {
  // Check if all retry attempts have been exhausted
  if (job.attemptsMade >= job.opts.attempts) {
    // Move failed job to DLQ with full context for debugging
    await deadLetterQueue.add('failed-email', {
      originalJob: {
        id: job.id,
        name: job.name,
        data: job.data,  // Original job payload
      },
      error: {
        message: err.message,
        stack: err.stack,  // Full stack trace for debugging
      },
      failedAt: new Date().toISOString(),
    });

    console.log(`Job ${job.id} moved to DLQ after ${job.attemptsMade} attempts`);
  }
});

// DLQ processor - alert team and store for manual review
const dlqWorker = new Worker('email-dlq', async (job) => {
  // Send alert to ops team about the failure
  await sendSlackAlert({
    channel: '#alerts',
    text: `Email job failed: ${job.data.originalJob.id}`,
    details: job.data,
  });

  // Persist to database for manual investigation and potential retry
  await db.failedJobs.create(job.data);
}, { connection });
```

## Rate Limiting

Control job processing rate to respect external API limits or prevent system overload. Rate limiting is essential when integrating with third-party services that enforce quotas.

```javascript
// Global rate limit: 100 jobs per minute across all workers
// Useful for respecting API rate limits
const rateLimitedQueue = new Queue('api-calls', {
  connection,
  limiter: {
    max: 100,          // Maximum jobs to process
    duration: 60000,   // Time window in milliseconds (1 minute)
  },
});

// Per-key rate limit - limits are applied per group key
// Useful for fair usage limits per user/tenant
await rateLimitedQueue.add(
  'api-call',
  { userId: 123, action: 'fetch-data' },
  {
    limiter: {
      groupKey: 'userId:123',  // Rate limit key - usually user or tenant ID
      max: 10,                  // 10 requests max
      duration: 60000,          // Per minute per user
    },
  }
);
```

## Job Dependencies (Flows)

Create workflows where jobs depend on other jobs. Flows ensure child jobs complete before parent jobs start, enabling complex multi-step processes with proper ordering.

```javascript
const { FlowProducer } = require('bullmq');

// FlowProducer manages job dependencies and ordering
const flowProducer = new FlowProducer({ connection });

// Create a flow: process order -> send email -> update analytics
// The tree structure defines execution order (children first)
const flow = await flowProducer.add({
  name: 'update-analytics',         // This runs LAST
  queueName: 'analytics',
  data: { orderId: '123' },
  children: [                        // These run BEFORE parent
    {
      name: 'send-confirmation',     // This runs SECOND
      queueName: 'email',
      data: { orderId: '123', type: 'order-confirmation' },
      children: [
        {
          name: 'process-order',     // This runs FIRST
          queueName: 'orders',
          data: { orderId: '123', items: [...] },
        },
      ],
    },
  ],
});

// Execution order: children complete before parents
// 1. process-order -> 2. send-confirmation -> 3. update-analytics
```

## Repeatable Jobs (Cron)

Schedule recurring jobs using cron expressions or fixed intervals. Repeatable jobs are persisted in Redis and automatically reschedule after each execution.

```javascript
// Every hour using cron expression
// Format: minute hour day-of-month month day-of-week
await reportQueue.add(
  'hourly-stats',
  {},
  {
    repeat: {
      pattern: '0 * * * *', // Run at minute 0 of every hour
    },
  }
);

// Every 5 minutes using interval
// Useful for health checks and monitoring tasks
await healthCheckQueue.add(
  'check-services',
  { services: ['api', 'db', 'cache'] },
  {
    repeat: {
      every: 5 * 60 * 1000, // 5 minutes in milliseconds
    },
  }
);

// Daily at 9 AM in a specific timezone
// Important: always specify timezone to avoid DST issues
await digestQueue.add(
  'daily-digest',
  {},
  {
    repeat: {
      pattern: '0 9 * * *',      // 9:00 AM daily
      tz: 'America/New_York',    // Timezone-aware scheduling
    },
  }
);

// Remove a repeatable job by its key
// Key format: name:::pattern (or name:::every for interval-based)
await reportQueue.removeRepeatableByKey(
  'hourly-stats:::0 * * * *'
);
```

## Queue Events and Monitoring

Subscribe to queue events for logging, metrics, and alerting. QueueEvents provides real-time visibility into job lifecycle without impacting worker performance.

```javascript
const { QueueEvents } = require('bullmq');

// QueueEvents subscribes to Redis pub/sub for real-time updates
const queueEvents = new QueueEvents('email', { connection });

// Job added to queue, waiting for a worker
queueEvents.on('waiting', ({ jobId }) => {
  console.log(`Job ${jobId} is waiting`);
});

// Worker picked up the job and started processing
queueEvents.on('active', ({ jobId, prev }) => {
  console.log(`Job ${jobId} is now active; previous status was ${prev}`);
});

// Job completed successfully - returnvalue contains the result
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed with result:`, returnvalue);
});

// Job failed - check failedReason for error details
queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason}`);
});

// Progress update from job.updateProgress() in worker
queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress: ${data}%`);
});

// Get queue metrics for dashboards and monitoring
async function getQueueMetrics(queue) {
  // Fetch all counts in parallel for efficiency
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),   // Jobs waiting for workers
    queue.getActiveCount(),    // Jobs currently being processed
    queue.getCompletedCount(), // Successfully completed jobs
    queue.getFailedCount(),    // Failed jobs (exhausted retries)
    queue.getDelayedCount(),   // Jobs scheduled for future
  ]);

  return { waiting, active, completed, failed, delayed };
}
```

## Production Configuration

Configure BullMQ for production with proper Redis settings, job retention policies, and graceful shutdown handling. This module provides reusable factory functions for creating queues and workers.

```javascript
// queue.js - Shared configuration module
const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

// Shared Redis connection with production settings
const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ blocking commands
  enableReadyCheck: false,    // Faster connection startup
});

// Default job options applied to all jobs in the queue
const defaultJobOptions = {
  attempts: 3,                 // Retry failed jobs up to 3 times
  backoff: {
    type: 'exponential',
    delay: 1000,               // Start with 1 second delay
  },
  removeOnComplete: {
    count: 1000,               // Keep last 1000 completed jobs for debugging
    age: 24 * 60 * 60,         // Or remove after 24 hours
  },
  removeOnFail: {
    count: 5000,               // Keep more failed jobs for investigation
    age: 7 * 24 * 60 * 60,     // Keep for 7 days before cleanup
  },
};

// Factory function to create queues with consistent configuration
function createQueue(name) {
  return new Queue(name, {
    connection,
    defaultJobOptions,
  });
}

// Factory function to create workers with graceful shutdown
function createWorker(name, processor, options = {}) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency: options.concurrency || 5,  // Process 5 jobs in parallel
    limiter: options.limiter,
  });

  // Handle SIGTERM for graceful shutdown (Kubernetes, Docker)
  // Allows current jobs to complete before exiting
  process.on('SIGTERM', async () => {
    console.log(`Shutting down worker ${name}...`);
    await worker.close();  // Wait for active jobs to finish
    process.exit(0);
  });

  return worker;
}

module.exports = { createQueue, createWorker, connection };
```

## Bull Board Dashboard

Bull Board provides a web-based UI for monitoring and managing your queues. It shows job status, allows retrying failed jobs, and displays real-time queue statistics.

```javascript
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');  // URL path for the dashboard

// Register all queues you want to monitor
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),   // Wrap each queue with BullMQAdapter
    new BullMQAdapter(orderQueue),
    new BullMQAdapter(reportQueue),
  ],
  serverAdapter,
});

// Mount the dashboard at /admin/queues
// Consider adding authentication middleware in production
app.use('/admin/queues', serverAdapter.getRouter());
```

## Prometheus Metrics

Export queue metrics to Prometheus for alerting and dashboards. Track job throughput, processing time, and queue depth to detect issues early.

```javascript
const prometheus = require('prom-client');

// Counter for total jobs processed (increments only)
const jobsProcessed = new prometheus.Counter({
  name: 'bullmq_jobs_processed_total',
  help: 'Total jobs processed',
  labelNames: ['queue', 'status'],  // Labels for filtering in queries
});

// Histogram for job duration distribution
// Useful for P95/P99 latency calculations
const jobDuration = new prometheus.Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['queue', 'job'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],  // Bucket boundaries in seconds
});

// Gauge for current queue depth (can go up or down)
const queueDepth = new prometheus.Gauge({
  name: 'bullmq_queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue', 'status'],
});

// Update metrics on job completion
worker.on('completed', (job) => {
  // Increment completed counter
  jobsProcessed.inc({ queue: 'email', status: 'completed' });

  // Record job duration for latency analysis
  const duration = (Date.now() - job.timestamp) / 1000;
  jobDuration.observe({ queue: 'email', job: job.name }, duration);
});

// Track failed jobs separately
worker.on('failed', (job) => {
  jobsProcessed.inc({ queue: 'email', status: 'failed' });
});

// Poll queue depth every 5 seconds for dashboard updates
setInterval(async () => {
  const metrics = await getQueueMetrics(emailQueue);
  queueDepth.set({ queue: 'email', status: 'waiting' }, metrics.waiting);
  queueDepth.set({ queue: 'email', status: 'active' }, metrics.active);
  queueDepth.set({ queue: 'email', status: 'delayed' }, metrics.delayed);
}, 5000);
```

## Summary

| Feature | Use Case |
|---------|----------|
| **Basic jobs** | Fire-and-forget tasks |
| **Delayed jobs** | Scheduled tasks |
| **Priorities** | Critical vs. batch work |
| **Retries** | Transient failures |
| **DLQ** | Permanent failures |
| **Rate limiting** | API quotas |
| **Flows** | Multi-step workflows |
| **Repeatable** | Cron jobs |

BullMQ provides everything needed for production job queues in Node.js. Combined with proper monitoring and graceful shutdown handling, you can build reliable background processing systems that scale with your application.
