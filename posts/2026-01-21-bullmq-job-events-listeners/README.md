# How to Implement Job Events and Listeners in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Event-Driven, Job Lifecycle, Real-Time Updates, Pub/Sub

Description: A comprehensive guide to implementing job events and listeners in BullMQ, including QueueEvents for real-time job tracking, worker events, progress monitoring, and building reactive job processing systems.

---

BullMQ provides a rich event system that allows you to track job lifecycle changes in real-time. Whether you need to notify users when their job completes, update a dashboard, or trigger downstream processes, understanding BullMQ events is essential. This guide covers all aspects of job events and listeners.

## Understanding BullMQ Events

BullMQ provides events at multiple levels:

- **Worker Events**: Events on the worker processing jobs
- **Queue Events**: Global events for any job in the queue (via QueueEvents)
- **Job Events**: Events on individual job instances

```typescript
import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create queue, worker, and events listener
const queue = new Queue('events-demo', { connection });
const worker = new Worker('events-demo', async (job) => {
  return { processed: true };
}, { connection });
const queueEvents = new QueueEvents('events-demo', { connection });
```

## Worker Events

Handle events directly on the worker:

```typescript
const worker = new Worker('tasks', async (job) => {
  await job.updateProgress(50);
  return { success: true };
}, { connection });

// Job completed successfully
worker.on('completed', (job: Job, result: any) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

// Job failed
worker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

// Job became active (started processing)
worker.on('active', (job: Job) => {
  console.log(`Job ${job.id} is now active`);
});

// Job progress updated
worker.on('progress', (job: Job, progress: number | object) => {
  console.log(`Job ${job.id} progress:`, progress);
});

// Job stalled (no lock renewal)
worker.on('stalled', (jobId: string) => {
  console.warn(`Job ${jobId} has stalled`);
});

// Worker error
worker.on('error', (error: Error) => {
  console.error('Worker error:', error);
});

// Worker is ready
worker.on('ready', () => {
  console.log('Worker is ready to process jobs');
});

// Worker is closing
worker.on('closing', () => {
  console.log('Worker is closing');
});

// Worker has closed
worker.on('closed', () => {
  console.log('Worker has closed');
});

// Worker has drained (processed all jobs)
worker.on('drained', () => {
  console.log('Worker has processed all available jobs');
});
```

## QueueEvents for Global Event Tracking

Use QueueEvents to track all jobs in a queue from any process:

```typescript
const queueEvents = new QueueEvents('tasks', { connection });

// Job waiting (added to queue)
queueEvents.on('waiting', ({ jobId }) => {
  console.log(`Job ${jobId} is waiting`);
});

// Job became active
queueEvents.on('active', ({ jobId, prev }) => {
  console.log(`Job ${jobId} is active (was ${prev})`);
});

// Job completed
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed:`, returnvalue);
});

// Job failed
queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

// Job progress
queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress:`, data);
});

// Job delayed
queueEvents.on('delayed', ({ jobId, delay }) => {
  console.log(`Job ${jobId} delayed by ${delay}ms`);
});

// Job stalled
queueEvents.on('stalled', ({ jobId }) => {
  console.warn(`Job ${jobId} stalled`);
});

// Job removed
queueEvents.on('removed', ({ jobId }) => {
  console.log(`Job ${jobId} removed`);
});

// Queue drained
queueEvents.on('drained', () => {
  console.log('Queue is drained');
});

// Don't forget to close when done
process.on('SIGTERM', async () => {
  await queueEvents.close();
});
```

## Building a Real-Time Job Tracker

Create a service to track job progress in real-time:

```typescript
import { EventEmitter } from 'events';

interface JobStatus {
  id: string;
  name: string;
  state: string;
  progress: number | object;
  data: any;
  result?: any;
  error?: string;
  timestamps: {
    added?: number;
    started?: number;
    completed?: number;
    failed?: number;
  };
}

class JobTracker extends EventEmitter {
  private queueEvents: QueueEvents;
  private queue: Queue;
  private jobs: Map<string, JobStatus> = new Map();

  constructor(queueName: string, connection: Redis) {
    super();
    this.queue = new Queue(queueName, { connection });
    this.queueEvents = new QueueEvents(queueName, { connection });
    this.setupListeners();
  }

  private setupListeners() {
    this.queueEvents.on('waiting', async ({ jobId }) => {
      const job = await this.queue.getJob(jobId);
      if (job) {
        this.jobs.set(jobId, {
          id: jobId,
          name: job.name,
          state: 'waiting',
          progress: 0,
          data: job.data,
          timestamps: { added: job.timestamp },
        });
        this.emit('job:waiting', this.jobs.get(jobId));
      }
    });

    this.queueEvents.on('active', async ({ jobId }) => {
      const status = this.jobs.get(jobId);
      if (status) {
        status.state = 'active';
        status.timestamps.started = Date.now();
        this.emit('job:active', status);
      }
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      const status = this.jobs.get(jobId);
      if (status) {
        status.progress = data;
        this.emit('job:progress', status);
      }
    });

    this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      const status = this.jobs.get(jobId);
      if (status) {
        status.state = 'completed';
        status.result = returnvalue;
        status.timestamps.completed = Date.now();
        this.emit('job:completed', status);
      }
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      const status = this.jobs.get(jobId);
      if (status) {
        status.state = 'failed';
        status.error = failedReason;
        status.timestamps.failed = Date.now();
        this.emit('job:failed', status);
      }
    });
  }

  getJobStatus(jobId: string): JobStatus | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  async close() {
    await this.queueEvents.close();
    await this.queue.close();
  }
}

// Usage
const tracker = new JobTracker('tasks', connection);

tracker.on('job:completed', (status) => {
  console.log(`Job ${status.id} completed in ${status.timestamps.completed! - status.timestamps.started!}ms`);
});

tracker.on('job:failed', (status) => {
  console.error(`Job ${status.id} failed: ${status.error}`);
});

tracker.on('job:progress', (status) => {
  console.log(`Job ${status.id} progress: ${JSON.stringify(status.progress)}`);
});
```

## WebSocket Integration for Real-Time Updates

Push job updates to clients via WebSocket:

```typescript
import { WebSocketServer, WebSocket } from 'ws';

class JobWebSocketServer {
  private wss: WebSocketServer;
  private queueEvents: QueueEvents;
  private subscriptions: Map<WebSocket, Set<string>> = new Map();

  constructor(port: number, queueName: string, connection: Redis) {
    this.wss = new WebSocketServer({ port });
    this.queueEvents = new QueueEvents(queueName, { connection });

    this.setupWebSocket();
    this.setupQueueEvents();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');
      this.subscriptions.set(ws, new Set());

      ws.on('message', (message) => {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'subscribe':
            this.subscriptions.get(ws)?.add(data.jobId);
            break;
          case 'unsubscribe':
            this.subscriptions.get(ws)?.delete(data.jobId);
            break;
        }
      });

      ws.on('close', () => {
        this.subscriptions.delete(ws);
      });
    });
  }

  private setupQueueEvents() {
    const events = ['waiting', 'active', 'progress', 'completed', 'failed'];

    for (const event of events) {
      this.queueEvents.on(event, (data: any) => {
        this.broadcast(data.jobId, {
          type: `job:${event}`,
          jobId: data.jobId,
          data,
          timestamp: Date.now(),
        });
      });
    }
  }

  private broadcast(jobId: string, message: object) {
    const messageStr = JSON.stringify(message);

    for (const [ws, subscriptions] of this.subscriptions) {
      if (subscriptions.has(jobId) || subscriptions.has('*')) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      }
    }
  }

  async close() {
    this.wss.close();
    await this.queueEvents.close();
  }
}

// Client-side usage example:
/*
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Subscribe to a specific job
  ws.send(JSON.stringify({ type: 'subscribe', jobId: 'job-123' }));

  // Or subscribe to all jobs
  ws.send(JSON.stringify({ type: 'subscribe', jobId: '*' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Job update:', data);
};
*/
```

## Progress Events with Structured Data

Send detailed progress updates:

```typescript
interface ProcessingProgress {
  stage: string;
  stageProgress: number;
  overallProgress: number;
  currentItem?: string;
  itemsProcessed: number;
  totalItems: number;
  estimatedTimeRemaining?: number;
}

const worker = new Worker('data-processing', async (job) => {
  const items = job.data.items;
  const startTime = Date.now();

  for (let i = 0; i < items.length; i++) {
    const progress: ProcessingProgress = {
      stage: 'processing',
      stageProgress: 100,
      overallProgress: ((i + 1) / items.length) * 100,
      currentItem: items[i],
      itemsProcessed: i + 1,
      totalItems: items.length,
      estimatedTimeRemaining: calculateETA(startTime, i + 1, items.length),
    };

    await job.updateProgress(progress);
    await processItem(items[i]);
  }

  return { processed: items.length };
}, { connection });

function calculateETA(startTime: number, processed: number, total: number): number {
  const elapsed = Date.now() - startTime;
  const avgTimePerItem = elapsed / processed;
  const remaining = total - processed;
  return Math.round(avgTimePerItem * remaining);
}

// Listening to progress
queueEvents.on('progress', ({ jobId, data }) => {
  const progress = data as ProcessingProgress;
  console.log(`Job ${jobId}: ${progress.overallProgress.toFixed(1)}% - ${progress.itemsProcessed}/${progress.totalItems} items`);
  if (progress.estimatedTimeRemaining) {
    console.log(`  ETA: ${(progress.estimatedTimeRemaining / 1000).toFixed(0)}s`);
  }
});
```

## Event-Driven Workflow Triggers

Trigger downstream processes based on job events:

```typescript
class WorkflowOrchestrator {
  private queueEvents: QueueEvents;
  private queues: Map<string, Queue> = new Map();

  constructor(connection: Redis) {
    this.queueEvents = new QueueEvents('workflow-trigger', { connection });
    this.setupTriggers();

    // Initialize downstream queues
    this.queues.set('notifications', new Queue('notifications', { connection }));
    this.queues.set('analytics', new Queue('analytics', { connection }));
    this.queues.set('cleanup', new Queue('cleanup', { connection }));
  }

  private setupTriggers() {
    // When order processing completes, trigger notifications
    this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      const result = JSON.parse(returnvalue || '{}');

      if (result.type === 'order-processed') {
        await this.queues.get('notifications')!.add('order-confirmation', {
          orderId: result.orderId,
          email: result.customerEmail,
        });

        await this.queues.get('analytics')!.add('track-order', {
          orderId: result.orderId,
          amount: result.amount,
        });
      }

      if (result.type === 'file-uploaded') {
        await this.queues.get('notifications')!.add('upload-complete', {
          fileId: result.fileId,
          userId: result.userId,
        });
      }
    });

    // When job fails, trigger cleanup
    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      await this.queues.get('cleanup')!.add('failed-job-cleanup', {
        failedJobId: jobId,
        reason: failedReason,
      });
    });
  }
}
```

## Metrics Collection from Events

Collect metrics for monitoring:

```typescript
class JobMetricsCollector {
  private metrics = {
    jobsCompleted: 0,
    jobsFailed: 0,
    totalProcessingTime: 0,
    processingTimes: [] as number[],
  };

  private jobStartTimes: Map<string, number> = new Map();

  constructor(queueEvents: QueueEvents) {
    this.setupListeners(queueEvents);
  }

  private setupListeners(queueEvents: QueueEvents) {
    queueEvents.on('active', ({ jobId }) => {
      this.jobStartTimes.set(jobId, Date.now());
    });

    queueEvents.on('completed', ({ jobId }) => {
      this.metrics.jobsCompleted++;
      this.recordProcessingTime(jobId);
    });

    queueEvents.on('failed', ({ jobId }) => {
      this.metrics.jobsFailed++;
      this.recordProcessingTime(jobId);
    });
  }

  private recordProcessingTime(jobId: string) {
    const startTime = this.jobStartTimes.get(jobId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.metrics.totalProcessingTime += duration;
      this.metrics.processingTimes.push(duration);

      // Keep last 1000 samples
      if (this.metrics.processingTimes.length > 1000) {
        this.metrics.processingTimes.shift();
      }

      this.jobStartTimes.delete(jobId);
    }
  }

  getMetrics() {
    const times = this.metrics.processingTimes;
    const sortedTimes = [...times].sort((a, b) => a - b);

    return {
      completed: this.metrics.jobsCompleted,
      failed: this.metrics.jobsFailed,
      totalProcessingTime: this.metrics.totalProcessingTime,
      avgProcessingTime: times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0,
      p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0,
      p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
      p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
    };
  }
}
```

## Best Practices

1. **Use QueueEvents for cross-process communication** - Worker events only work in the same process.

2. **Always close QueueEvents** - Prevent connection leaks.

3. **Handle event listener errors** - Wrap handlers in try-catch.

4. **Don't block in event handlers** - Use async operations.

5. **Limit event data size** - Progress updates should be small.

6. **Clean up subscriptions** - Remove listeners when no longer needed.

7. **Use structured progress data** - Makes progress meaningful.

8. **Aggregate metrics** - Don't log every event in production.

9. **Test event timing** - Events may arrive in unexpected order.

10. **Monitor event lag** - Large lag indicates processing issues.

## Conclusion

BullMQ's event system enables building reactive, real-time job processing applications. By leveraging worker events, QueueEvents, and progress updates, you can provide users with immediate feedback, trigger downstream workflows, and collect valuable metrics. Remember to handle events efficiently and clean up resources properly.
