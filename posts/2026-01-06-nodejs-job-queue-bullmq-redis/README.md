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

```bash
npm install bullmq ioredis
```

### Queue Producer

```javascript
// producer.js
const { Queue } = require('bullmq');

const emailQueue = new Queue('email', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

// Add a job
async function sendWelcomeEmail(userId, email) {
  const job = await emailQueue.add(
    'welcome', // Job name
    {
      userId,
      email,
      template: 'welcome',
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );

  console.log(`Job ${job.id} added to queue`);
  return job;
}

// Usage in API
app.post('/users', async (req, res) => {
  const user = await createUser(req.body);
  await sendWelcomeEmail(user.id, user.email);
  res.json(user);
});
```

### Queue Worker

```javascript
// worker.js
const { Worker } = require('bullmq');

const worker = new Worker(
  'email',
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    const { userId, email, template } = job.data;

    // Update progress
    await job.updateProgress(10);

    // Fetch user data
    const user = await getUser(userId);
    await job.updateProgress(30);

    // Render template
    const html = await renderTemplate(template, { user });
    await job.updateProgress(50);

    // Send email
    await sendEmail({
      to: email,
      subject: getSubject(template),
      html,
    });

    await job.updateProgress(100);

    return { sent: true, email };
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 5, // Process 5 jobs simultaneously
  }
);

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

worker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});
```

## Delayed Jobs

Schedule jobs to run in the future:

```javascript
// Schedule for later
await emailQueue.add(
  'reminder',
  { userId, type: 'trial-ending' },
  {
    delay: 7 * 24 * 60 * 60 * 1000, // 7 days
  }
);

// Schedule at specific time
const targetDate = new Date('2024-12-25T09:00:00Z');
await emailQueue.add(
  'holiday-greeting',
  { campaign: 'christmas' },
  {
    delay: targetDate.getTime() - Date.now(),
  }
);
```

## Job Priorities

Higher priority jobs are processed first:

```javascript
// Critical job - process immediately
await notificationQueue.add(
  'security-alert',
  { userId, type: 'password-changed' },
  {
    priority: 1, // Highest priority
  }
);

// Normal priority
await notificationQueue.add(
  'weekly-digest',
  { userId },
  {
    priority: 10, // Default priority
  }
);

// Low priority - process when idle
await notificationQueue.add(
  'marketing',
  { campaign: 'new-feature' },
  {
    priority: 100, // Low priority
  }
);
```

## Retry and Backoff Strategies

```javascript
// Exponential backoff
await queue.add('job', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, 8s, 16s
  },
});

// Fixed delay
await queue.add('job', data, {
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000, // Always wait 5s
  },
});

// Custom backoff
await queue.add('job', data, {
  attempts: 5,
  backoff: {
    type: 'custom',
  },
});

// In worker, define custom backoff
const worker = new Worker('queue', processor, {
  settings: {
    backoffStrategy: (attemptsMade) => {
      // Custom logic: 1s, 5s, 30s, 2m, 10m
      const delays = [1000, 5000, 30000, 120000, 600000];
      return delays[Math.min(attemptsMade, delays.length - 1)];
    },
  },
});
```

## Dead Letter Queue

Handle failed jobs after all retries:

```javascript
// Create DLQ
const deadLetterQueue = new Queue('email-dlq', { connection });

// Worker with failed job handling
const worker = new Worker('email', async (job) => {
  // Process job
}, {
  connection,
});

worker.on('failed', async (job, err) => {
  // Check if all attempts exhausted
  if (job.attemptsMade >= job.opts.attempts) {
    // Move to DLQ
    await deadLetterQueue.add('failed-email', {
      originalJob: {
        id: job.id,
        name: job.name,
        data: job.data,
      },
      error: {
        message: err.message,
        stack: err.stack,
      },
      failedAt: new Date().toISOString(),
    });

    console.log(`Job ${job.id} moved to DLQ after ${job.attemptsMade} attempts`);
  }
});

// DLQ processor for alerting/manual review
const dlqWorker = new Worker('email-dlq', async (job) => {
  // Alert team
  await sendSlackAlert({
    channel: '#alerts',
    text: `Email job failed: ${job.data.originalJob.id}`,
    details: job.data,
  });

  // Store for manual review
  await db.failedJobs.create(job.data);
}, { connection });
```

## Rate Limiting

Control job processing rate:

```javascript
// Global rate limit: 100 jobs per minute
const rateLimitedQueue = new Queue('api-calls', {
  connection,
  limiter: {
    max: 100,
    duration: 60000, // 1 minute
  },
});

// Per-key rate limit (e.g., per user)
await rateLimitedQueue.add(
  'api-call',
  { userId: 123, action: 'fetch-data' },
  {
    limiter: {
      groupKey: 'userId:123',
      max: 10,
      duration: 60000, // 10 requests per minute per user
    },
  }
);
```

## Job Dependencies (Flows)

Create workflows where jobs depend on other jobs:

```javascript
const { FlowProducer } = require('bullmq');

const flowProducer = new FlowProducer({ connection });

// Create a flow: process order -> send email -> update analytics
const flow = await flowProducer.add({
  name: 'update-analytics',
  queueName: 'analytics',
  data: { orderId: '123' },
  children: [
    {
      name: 'send-confirmation',
      queueName: 'email',
      data: { orderId: '123', type: 'order-confirmation' },
      children: [
        {
          name: 'process-order',
          queueName: 'orders',
          data: { orderId: '123', items: [...] },
        },
      ],
    },
  ],
});

// Children run first, then parents
// process-order -> send-confirmation -> update-analytics
```

## Repeatable Jobs (Cron)

Schedule recurring jobs:

```javascript
// Every hour
await reportQueue.add(
  'hourly-stats',
  {},
  {
    repeat: {
      pattern: '0 * * * *', // Cron expression
    },
  }
);

// Every 5 minutes
await healthCheckQueue.add(
  'check-services',
  { services: ['api', 'db', 'cache'] },
  {
    repeat: {
      every: 5 * 60 * 1000, // 5 minutes in ms
    },
  }
);

// Daily at 9 AM
await digestQueue.add(
  'daily-digest',
  {},
  {
    repeat: {
      pattern: '0 9 * * *',
      tz: 'America/New_York',
    },
  }
);

// Remove repeatable job
await reportQueue.removeRepeatableByKey(
  'hourly-stats:::0 * * * *'
);
```

## Queue Events and Monitoring

```javascript
const { QueueEvents } = require('bullmq');

const queueEvents = new QueueEvents('email', { connection });

queueEvents.on('waiting', ({ jobId }) => {
  console.log(`Job ${jobId} is waiting`);
});

queueEvents.on('active', ({ jobId, prev }) => {
  console.log(`Job ${jobId} is now active; previous status was ${prev}`);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed with result:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress: ${data}%`);
});

// Metrics
async function getQueueMetrics(queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}
```

## Production Configuration

```javascript
// queue.js
const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

// Shared Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// Queue configuration
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000, // Keep last 1000 completed jobs
    age: 24 * 60 * 60, // Keep for 24 hours
  },
  removeOnFail: {
    count: 5000, // Keep last 5000 failed jobs
    age: 7 * 24 * 60 * 60, // Keep for 7 days
  },
};

function createQueue(name) {
  return new Queue(name, {
    connection,
    defaultJobOptions,
  });
}

function createWorker(name, processor, options = {}) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency: options.concurrency || 5,
    limiter: options.limiter,
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log(`Shutting down worker ${name}...`);
    await worker.close();
    process.exit(0);
  });

  return worker;
}

module.exports = { createQueue, createWorker, connection };
```

## Bull Board Dashboard

```javascript
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(orderQueue),
    new BullMQAdapter(reportQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

## Prometheus Metrics

```javascript
const prometheus = require('prom-client');

const jobsProcessed = new prometheus.Counter({
  name: 'bullmq_jobs_processed_total',
  help: 'Total jobs processed',
  labelNames: ['queue', 'status'],
});

const jobDuration = new prometheus.Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['queue', 'job'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

const queueDepth = new prometheus.Gauge({
  name: 'bullmq_queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue', 'status'],
});

// Update metrics in worker
worker.on('completed', (job) => {
  jobsProcessed.inc({ queue: 'email', status: 'completed' });
  const duration = (Date.now() - job.timestamp) / 1000;
  jobDuration.observe({ queue: 'email', job: job.name }, duration);
});

worker.on('failed', (job) => {
  jobsProcessed.inc({ queue: 'email', status: 'failed' });
});

// Periodic queue stats
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
