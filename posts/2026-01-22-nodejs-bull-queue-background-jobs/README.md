# How to Use Bull Queue for Background Jobs in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Bull, Redis, Queue, BackgroundJobs

Description: Learn how to use Bull queue for background job processing in Node.js with Redis, including job priorities, retries, concurrency, and monitoring.

---

Bull is a powerful Redis-based queue system for Node.js that handles background job processing, delayed jobs, and job retries with ease.

## Installation and Setup

```bash
npm install bull
```

You need Redis running:

```bash
# Using Docker
docker run -d -p 6379:6379 redis

# Or install locally
brew install redis  # macOS
apt install redis-server  # Ubuntu
```

## Basic Queue Usage

### Creating a Queue

```javascript
const Queue = require('bull');

// Create queue with Redis connection
const emailQueue = new Queue('email', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

// Or with connection string
const emailQueue = new Queue('email', 'redis://127.0.0.1:6379');

// Or with default localhost
const emailQueue = new Queue('email');
```

### Adding Jobs

```javascript
const Queue = require('bull');
const emailQueue = new Queue('email');

// Add a job
await emailQueue.add({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up.',
});

// Add job with options
await emailQueue.add(
  { to: 'user@example.com', subject: 'Hello' },
  {
    attempts: 3,           // Retry 3 times on failure
    backoff: 5000,         // Wait 5 seconds between retries
    delay: 60000,          // Delay job by 1 minute
    priority: 1,           // Higher priority (lower number = higher priority)
    removeOnComplete: true, // Remove job after success
    removeOnFail: false,   // Keep failed jobs for inspection
  }
);

// Named jobs
await emailQueue.add('welcome', { to: 'user@example.com' });
await emailQueue.add('newsletter', { to: 'user@example.com' });
```

### Processing Jobs

```javascript
const Queue = require('bull');
const emailQueue = new Queue('email');

// Process jobs
emailQueue.process(async (job) => {
  console.log('Processing job:', job.id);
  console.log('Job data:', job.data);
  
  // Send email
  await sendEmail(job.data.to, job.data.subject, job.data.body);
  
  return { sent: true };  // Return value stored in job.returnvalue
});

// Process named jobs
emailQueue.process('welcome', async (job) => {
  await sendWelcomeEmail(job.data.to);
});

emailQueue.process('newsletter', async (job) => {
  await sendNewsletter(job.data.to);
});
```

### Concurrency

```javascript
// Process 5 jobs concurrently
emailQueue.process(5, async (job) => {
  await sendEmail(job.data);
});

// Different concurrency for named jobs
emailQueue.process('bulk', 10, async (job) => {
  // Process bulk emails with higher concurrency
});

emailQueue.process('transactional', 2, async (job) => {
  // Process transactional emails with lower concurrency
});
```

## Job Events

### Queue Events

```javascript
const Queue = require('bull');
const emailQueue = new Queue('email');

// Job lifecycle events
emailQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

emailQueue.on('failed', (job, error) => {
  console.log(`Job ${job.id} failed:`, error.message);
});

emailQueue.on('active', (job) => {
  console.log(`Job ${job.id} started`);
});

emailQueue.on('stalled', (job) => {
  console.log(`Job ${job.id} stalled`);
});

emailQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} is ${progress}% complete`);
});

emailQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Global events (including events from other processes)
emailQueue.on('global:completed', (jobId, result) => {
  console.log(`Job ${jobId} completed globally`);
});
```

### Progress Updates

```javascript
// In processor
emailQueue.process(async (job) => {
  const items = job.data.items;
  
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    
    // Update progress
    await job.progress((i + 1) / items.length * 100);
  }
  
  return { processed: items.length };
});

// In producer
emailQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id}: ${progress}%`);
});
```

## Delayed and Scheduled Jobs

### Delayed Jobs

```javascript
const Queue = require('bull');
const reminderQueue = new Queue('reminders');

// Delay job by 1 hour
await reminderQueue.add(
  { userId: 123, message: 'Check your cart!' },
  { delay: 60 * 60 * 1000 }  // 1 hour in milliseconds
);

// Delay until specific time
const targetTime = new Date('2024-12-25T10:00:00Z');
const delay = targetTime.getTime() - Date.now();
await reminderQueue.add(
  { message: 'Merry Christmas!' },
  { delay }
);
```

### Repeating Jobs

```javascript
const Queue = require('bull');
const cronQueue = new Queue('cron');

// Repeat every minute
await cronQueue.add(
  { task: 'cleanup' },
  {
    repeat: {
      every: 60000,  // Every 60 seconds
    },
  }
);

// Cron expression
await cronQueue.add(
  { task: 'daily-report' },
  {
    repeat: {
      cron: '0 9 * * *',  // Every day at 9 AM
    },
  }
);

// Limited repeats
await cronQueue.add(
  { task: 'trial-reminder' },
  {
    repeat: {
      every: 86400000,  // Every day
      limit: 7,         // Only 7 times
    },
  }
);

// Process repeating jobs
cronQueue.process(async (job) => {
  console.log('Running scheduled task:', job.data.task);
});
```

### Managing Repeatable Jobs

```javascript
// Get all repeatable jobs
const repeatableJobs = await cronQueue.getRepeatableJobs();
console.log(repeatableJobs);

// Remove repeatable job
await cronQueue.removeRepeatable({
  every: 60000,
});

// Remove by key
await cronQueue.removeRepeatableByKey(repeatableJobs[0].key);
```

## Error Handling and Retries

### Automatic Retries

```javascript
const Queue = require('bull');
const apiQueue = new Queue('api-calls');

// Add job with retry options
await apiQueue.add(
  { url: 'https://api.example.com/data' },
  {
    attempts: 5,  // Retry up to 5 times
    backoff: {
      type: 'exponential',  // Exponential backoff
      delay: 1000,          // Start with 1 second
    },
  }
);

// Fixed backoff
await apiQueue.add(
  { url: 'https://api.example.com/data' },
  {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 5000,  // Always wait 5 seconds
    },
  }
);
```

### Custom Backoff Strategy

```javascript
const Queue = require('bull');

const apiQueue = new Queue('api-calls', {
  settings: {
    backoffStrategies: {
      jitter: (attemptsMade, err) => {
        // Add randomness to prevent thundering herd
        return Math.random() * attemptsMade * 1000;
      },
    },
  },
});

await apiQueue.add(
  { url: 'https://api.example.com' },
  {
    attempts: 5,
    backoff: {
      type: 'jitter',
    },
  }
);
```

### Error Handling in Processor

```javascript
const Queue = require('bull');
const apiQueue = new Queue('api-calls');

apiQueue.process(async (job) => {
  try {
    const response = await fetch(job.data.url);
    
    if (!response.ok) {
      // Throw to trigger retry
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Log and rethrow to trigger retry
    console.error(`Attempt ${job.attemptsMade} failed:`, error.message);
    throw error;
  }
});

// Handle final failure
apiQueue.on('failed', (job, error) => {
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`Job ${job.id} failed permanently:`, error);
    // Send alert, log to database, etc.
  }
});
```

## Priority Queues

```javascript
const Queue = require('bull');
const taskQueue = new Queue('tasks');

// Lower number = higher priority
await taskQueue.add({ type: 'urgent' }, { priority: 1 });
await taskQueue.add({ type: 'normal' }, { priority: 5 });
await taskQueue.add({ type: 'low' }, { priority: 10 });

// Jobs processed in priority order
taskQueue.process(async (job) => {
  console.log('Processing:', job.data.type);
});
```

## Job Management

### Query Jobs

```javascript
const Queue = require('bull');
const queue = new Queue('tasks');

// Get job counts
const counts = await queue.getJobCounts();
console.log(counts);
// { waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1 }

// Get specific jobs
const waitingJobs = await queue.getWaiting(0, 10);  // First 10 waiting
const activeJobs = await queue.getActive(0, 10);
const failedJobs = await queue.getFailed(0, 10);
const completedJobs = await queue.getCompleted(0, 10);
const delayedJobs = await queue.getDelayed(0, 10);

// Get job by ID
const job = await queue.getJob('123');
console.log(job.data);
console.log(job.progress());
console.log(await job.getState());
```

### Manage Jobs

```javascript
const Queue = require('bull');
const queue = new Queue('tasks');

// Remove a job
const job = await queue.getJob('123');
await job.remove();

// Retry failed job
await job.retry();

// Move job to failed
await job.moveToFailed({ message: 'Manual fail' });

// Clean old jobs
await queue.clean(24 * 60 * 60 * 1000, 'completed');  // Remove completed jobs older than 24h
await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed');  // Remove failed jobs older than 7 days

// Drain queue (remove all jobs)
await queue.drain();

// Empty queue (remove all jobs including active)
await queue.empty();

// Pause/resume
await queue.pause();
await queue.resume();

// Close queue connection
await queue.close();
```

## Separate Producer and Consumer

### Producer (API Server)

```javascript
// producer.js
const Queue = require('bull');
const express = require('express');

const app = express();
const emailQueue = new Queue('email', 'redis://localhost:6379');

app.post('/send-email', async (req, res) => {
  const job = await emailQueue.add({
    to: req.body.to,
    subject: req.body.subject,
    body: req.body.body,
  });
  
  res.json({ jobId: job.id });
});

app.get('/job/:id', async (req, res) => {
  const job = await emailQueue.getJob(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    id: job.id,
    state: await job.getState(),
    progress: job.progress(),
    result: job.returnvalue,
  });
});

app.listen(3000);
```

### Consumer (Worker)

```javascript
// worker.js
const Queue = require('bull');

const emailQueue = new Queue('email', 'redis://localhost:6379');

emailQueue.process(async (job) => {
  console.log(`Processing email to ${job.data.to}`);
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { sent: true, timestamp: new Date() };
});

emailQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed`);
});

emailQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
});

console.log('Worker started');
```

## Bull Board (Monitoring UI)

```bash
npm install @bull-board/express @bull-board/api
```

```javascript
const express = require('express');
const Queue = require('bull');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const app = express();

const emailQueue = new Queue('email');
const taskQueue = new Queue('tasks');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(emailQueue),
    new BullAdapter(taskQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

app.listen(3000, () => {
  console.log('Bull Board available at http://localhost:3000/admin/queues');
});
```

## Best Practices

### Queue Configuration

```javascript
const Queue = require('bull');

const queue = new Queue('tasks', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: 1000,     // Keep last 1000 failed jobs
  },
});
```

### Graceful Shutdown

```javascript
const Queue = require('bull');
const queue = new Queue('tasks');

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  
  // Stop accepting new jobs
  await queue.pause(true);  // true = pause locally only
  
  // Wait for active jobs to complete
  await queue.close();
  
  process.exit(0);
});
```

## Summary

| Feature | Usage |
|---------|-------|
| Basic job | `queue.add(data)` |
| Delayed job | `queue.add(data, { delay: 5000 })` |
| Priority | `queue.add(data, { priority: 1 })` |
| Retries | `queue.add(data, { attempts: 3 })` |
| Repeating | `queue.add(data, { repeat: { cron: '...' } })` |
| Named jobs | `queue.add('name', data)` |
| Concurrency | `queue.process(5, handler)` |

Best practices:
- Use separate processes for producers and consumers
- Configure appropriate retry and backoff strategies
- Set `removeOnComplete` to prevent memory issues
- Implement graceful shutdown
- Monitor queues with Bull Board or Arena
- Use Redis persistence for production
