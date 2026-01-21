# How to Handle Worker Crashes in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Crash Recovery, Stalled Jobs, Fault Tolerance, Reliability

Description: A comprehensive guide to handling worker crashes in BullMQ, including stalled job recovery, automatic cleanup, crash detection, and strategies for building fault-tolerant job processing systems.

---

Worker crashes are inevitable in production systems. Whether due to OOM kills, hardware failures, or bugs, your BullMQ setup must handle crashes gracefully. This guide covers how BullMQ handles crashed workers, stalled job recovery, and strategies for building resilient systems.

## Understanding Worker Crashes

When a BullMQ worker crashes, several things happen:
- Active jobs become "stalled" (no longer being processed)
- The worker's Redis connection closes
- Job locks expire after a timeout
- Other workers can recover stalled jobs

```typescript
import { Worker, Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Worker with stall recovery configuration
const worker = new Worker('tasks', async (job) => {
  console.log(`Processing job ${job.id}`);
  return { success: true };
}, {
  connection,
  // Stall detection settings
  lockDuration: 30000,      // Lock jobs for 30 seconds
  stalledInterval: 15000,   // Check for stalled jobs every 15 seconds
  maxStalledCount: 2,       // Max times a job can be recovered before failing
});
```

## Stalled Job Detection and Recovery

BullMQ automatically detects and recovers stalled jobs:

```typescript
// Configure stalled job handling
const worker = new Worker('critical-tasks', async (job) => {
  // Long-running task
  await processLongTask(job.data);
  return { completed: true };
}, {
  connection,
  lockDuration: 60000,      // 1 minute lock
  stalledInterval: 30000,   // Check every 30 seconds
  maxStalledCount: 3,       // Allow 3 stall recoveries
  concurrency: 5,
});

// Listen for stalled events
worker.on('stalled', (jobId, prev) => {
  console.warn(`Job ${jobId} has stalled (previous state: ${prev})`);
  // Alert monitoring system
  alertStalledJob(jobId);
});

// Handle jobs that exceed maxStalledCount
worker.on('failed', (job, error) => {
  if (error.message.includes('stalled')) {
    console.error(`Job ${job?.id} failed due to repeated stalls`);
    // Move to manual review queue
    handleRepeatedStalledJob(job);
  }
});
```

## Extending Lock Duration for Long Jobs

Prevent false stall detection for long-running jobs:

```typescript
const worker = new Worker('long-tasks', async (job) => {
  const lockExtensionMs = 30000;

  // Set up periodic lock extension
  const lockExtender = setInterval(async () => {
    try {
      await job.extendLock(job.token!, lockExtensionMs);
      console.log(`Extended lock for job ${job.id}`);
    } catch (error) {
      console.error(`Failed to extend lock for job ${job.id}:`, error);
      clearInterval(lockExtender);
    }
  }, lockExtensionMs - 5000); // Extend 5 seconds before expiry

  try {
    // Long-running process
    for (let i = 0; i < 100; i++) {
      await processChunk(job.data, i);
      await job.updateProgress(i + 1);
    }
    return { completed: true };
  } finally {
    clearInterval(lockExtender);
  }
}, {
  connection,
  lockDuration: 30000,
});
```

## Crash-Safe Job Processing

Design jobs to handle crashes gracefully:

```typescript
interface CrashSafeJobData {
  taskId: string;
  items: string[];
  checkpointKey?: string;
}

interface Checkpoint {
  processedCount: number;
  lastProcessedItem: string;
  intermediateResults: any[];
}

class CrashSafeProcessor {
  private redis: Redis;
  private queue: Queue<CrashSafeJobData>;

  constructor(connection: Redis) {
    this.redis = connection;
    this.queue = new Queue('crash-safe', { connection });
  }

  async process(job: Job<CrashSafeJobData>) {
    const { taskId, items } = job.data;
    const checkpointKey = `checkpoint:${taskId}`;

    // Load checkpoint if exists (recovering from crash)
    let checkpoint = await this.loadCheckpoint(checkpointKey);
    const startIndex = checkpoint?.processedCount || 0;
    const results = checkpoint?.intermediateResults || [];

    if (startIndex > 0) {
      console.log(`Resuming job ${job.id} from checkpoint at index ${startIndex}`);
    }

    for (let i = startIndex; i < items.length; i++) {
      try {
        const result = await this.processItem(items[i]);
        results.push(result);

        // Save checkpoint every 10 items
        if ((i + 1) % 10 === 0) {
          await this.saveCheckpoint(checkpointKey, {
            processedCount: i + 1,
            lastProcessedItem: items[i],
            intermediateResults: results,
          });
        }

        await job.updateProgress(((i + 1) / items.length) * 100);
      } catch (error) {
        // Save checkpoint on error for recovery
        await this.saveCheckpoint(checkpointKey, {
          processedCount: i,
          lastProcessedItem: items[i - 1] || '',
          intermediateResults: results,
        });
        throw error;
      }
    }

    // Clear checkpoint on successful completion
    await this.clearCheckpoint(checkpointKey);

    return { taskId, processedCount: items.length, results };
  }

  private async loadCheckpoint(key: string): Promise<Checkpoint | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async saveCheckpoint(key: string, checkpoint: Checkpoint) {
    await this.redis.set(key, JSON.stringify(checkpoint), 'EX', 86400);
  }

  private async clearCheckpoint(key: string) {
    await this.redis.del(key);
  }

  private async processItem(item: string) {
    // Process individual item
    return { item, processed: true };
  }
}
```

## Automatic Worker Restart

Implement automatic restart after crashes:

```typescript
import cluster from 'cluster';
import { Worker as BullMQWorker } from 'bullmq';

class ResilientWorkerManager {
  private workerProcess: BullMQWorker | null = null;
  private restartCount = 0;
  private maxRestarts = 10;
  private restartDelay = 5000;
  private lastCrashTime = 0;
  private resetWindow = 60000; // Reset restart count after 1 minute of stability

  constructor(
    private queueName: string,
    private processor: (job: Job) => Promise<any>,
    private connection: Redis
  ) {}

  async start() {
    await this.createWorker();
    this.setupCrashHandling();
  }

  private async createWorker() {
    this.workerProcess = new BullMQWorker(this.queueName, this.processor, {
      connection: this.connection,
      concurrency: 5,
    });

    this.workerProcess.on('error', (error) => {
      console.error('Worker error:', error);
      this.handleCrash(error);
    });

    this.workerProcess.on('closed', () => {
      console.log('Worker closed');
    });

    console.log(`Worker started for queue: ${this.queueName}`);
  }

  private setupCrashHandling() {
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.handleCrash(error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await this.handleCrash(reason instanceof Error ? reason : new Error(String(reason)));
    });
  }

  private async handleCrash(error: Error) {
    const now = Date.now();

    // Reset restart count if stable for a while
    if (now - this.lastCrashTime > this.resetWindow) {
      this.restartCount = 0;
    }

    this.lastCrashTime = now;
    this.restartCount++;

    console.log(`Crash detected (${this.restartCount}/${this.maxRestarts}):`, error.message);

    if (this.restartCount >= this.maxRestarts) {
      console.error('Max restarts exceeded. Exiting.');
      process.exit(1);
    }

    // Close existing worker
    if (this.workerProcess) {
      try {
        await this.workerProcess.close();
      } catch (e) {
        console.error('Error closing worker:', e);
      }
      this.workerProcess = null;
    }

    // Wait before restart
    console.log(`Restarting in ${this.restartDelay}ms...`);
    await new Promise(resolve => setTimeout(resolve, this.restartDelay));

    // Exponential backoff
    this.restartDelay = Math.min(this.restartDelay * 1.5, 60000);

    // Restart
    await this.createWorker();
  }

  async stop() {
    if (this.workerProcess) {
      await this.workerProcess.close();
    }
  }
}
```

## Cluster Mode with Worker Supervision

Use Node.js cluster for process isolation:

```typescript
// cluster-supervisor.ts
import cluster from 'cluster';
import os from 'os';

interface WorkerState {
  restarts: number;
  lastRestart: number;
}

if (cluster.isPrimary) {
  const numWorkers = parseInt(process.env.WORKER_COUNT || String(os.cpus().length));
  const workerStates = new Map<number, WorkerState>();

  console.log(`Starting ${numWorkers} workers`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    workerStates.set(worker.id, { restarts: 0, lastRestart: Date.now() });
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.id} died (${signal || code})`);

    const state = workerStates.get(worker.id) || { restarts: 0, lastRestart: Date.now() };

    // Reset restart count if stable for 5 minutes
    if (Date.now() - state.lastRestart > 300000) {
      state.restarts = 0;
    }

    state.restarts++;
    state.lastRestart = Date.now();

    if (state.restarts > 5) {
      console.error(`Worker ${worker.id} has restarted too many times, not restarting`);
      workerStates.delete(worker.id);
      return;
    }

    // Delay restart based on restart count
    const delay = Math.min(1000 * Math.pow(2, state.restarts), 30000);

    console.log(`Restarting worker in ${delay}ms (restart ${state.restarts})`);

    setTimeout(() => {
      const newWorker = cluster.fork();
      workerStates.set(newWorker.id, state);
    }, delay);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down cluster...');
    for (const id in cluster.workers) {
      cluster.workers[id]?.send('shutdown');
    }
  });

} else {
  // Worker process - see worker-process.ts below
  import('./worker-process');
}
```

```typescript
// worker-process.ts
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const worker = new Worker('tasks', async (job) => {
  console.log(`Worker ${process.pid} processing job ${job.id}`);
  return { success: true, worker: process.pid };
}, {
  connection,
  concurrency: 5,
});

process.on('message', async (message) => {
  if (message === 'shutdown') {
    console.log(`Worker ${process.pid} received shutdown signal`);
    await worker.close();
    await connection.quit();
    process.exit(0);
  }
});
```

## Dead Letter Queue for Failed Jobs

Handle jobs that repeatedly fail after crashes:

```typescript
class CrashRecoveryService {
  private mainQueue: Queue;
  private dlq: Queue;
  private worker: Worker;

  constructor(connection: Redis) {
    this.mainQueue = new Queue('main-tasks', { connection });
    this.dlq = new Queue('dead-letter', { connection });

    this.worker = new Worker('main-tasks', async (job) => {
      return await this.processWithCrashProtection(job);
    }, {
      connection,
      maxStalledCount: 2, // Allow 2 stall recoveries before failing
    });

    this.setupEventHandlers();
  }

  private async processWithCrashProtection(job: Job) {
    // Track job attempts due to crashes
    const crashAttempts = parseInt(job.data._crashAttempts || '0');

    if (crashAttempts >= 3) {
      // Too many crash-related failures, move to DLQ
      await this.moveToDLQ(job, 'Too many crash recoveries');
      throw new Error('Job moved to DLQ due to repeated crashes');
    }

    try {
      return await this.processJob(job);
    } catch (error) {
      // Update crash attempts for next retry
      if (error.message.includes('stalled')) {
        await this.mainQueue.add(job.name, {
          ...job.data,
          _crashAttempts: crashAttempts + 1,
        });
      }
      throw error;
    }
  }

  private async processJob(job: Job) {
    // Actual job processing
    return { processed: true };
  }

  private async moveToDLQ(job: Job, reason: string) {
    await this.dlq.add('failed-job', {
      originalJob: {
        id: job.id,
        name: job.name,
        data: job.data,
        attemptsMade: job.attemptsMade,
      },
      reason,
      movedAt: new Date().toISOString(),
    });
  }

  private setupEventHandlers() {
    this.worker.on('stalled', async (jobId) => {
      console.warn(`Job ${jobId} stalled - worker may have crashed`);
      // Log to monitoring
    });

    this.worker.on('failed', async (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
        await this.moveToDLQ(job, error.message);
      }
    });
  }

  // Retry jobs from DLQ
  async retryFromDLQ(count: number = 10) {
    const jobs = await this.dlq.getWaiting(0, count);
    let retried = 0;

    for (const job of jobs) {
      const originalJob = job.data.originalJob;
      await this.mainQueue.add(originalJob.name, {
        ...originalJob.data,
        _crashAttempts: 0, // Reset crash attempts
      });
      await job.remove();
      retried++;
    }

    return retried;
  }
}
```

## Monitoring Crashes

Track and alert on worker crashes:

```typescript
class CrashMonitor {
  private crashes: { timestamp: number; workerId: string; error: string }[] = [];
  private alertThreshold = 5; // Alert if 5 crashes in window
  private alertWindow = 60000; // 1 minute

  recordCrash(workerId: string, error: string) {
    this.crashes.push({
      timestamp: Date.now(),
      workerId,
      error,
    });

    // Clean old entries
    const cutoff = Date.now() - this.alertWindow;
    this.crashes = this.crashes.filter(c => c.timestamp > cutoff);

    // Check threshold
    if (this.crashes.length >= this.alertThreshold) {
      this.triggerAlert();
    }
  }

  private triggerAlert() {
    console.error(`ALERT: ${this.crashes.length} crashes in the last ${this.alertWindow / 1000} seconds`);
    // Send to alerting system
  }

  getStats() {
    const now = Date.now();
    const lastHour = this.crashes.filter(c => now - c.timestamp < 3600000);

    return {
      crashesLastMinute: this.crashes.length,
      crashesLastHour: lastHour.length,
      uniqueWorkers: new Set(lastHour.map(c => c.workerId)).size,
      recentErrors: this.crashes.slice(-5).map(c => c.error),
    };
  }
}
```

## Best Practices

1. **Configure stall detection appropriately** - Match lockDuration to your job duration.

2. **Extend locks for long jobs** - Prevent false stall detection.

3. **Implement checkpointing** - Allow jobs to resume after crashes.

4. **Use process supervisors** - Automatically restart crashed workers.

5. **Monitor crash patterns** - Track and alert on unusual crash rates.

6. **Implement dead letter queues** - Handle jobs that repeatedly fail.

7. **Test crash scenarios** - Simulate crashes in development.

8. **Log crash context** - Capture state for debugging.

9. **Set maxStalledCount wisely** - Balance retry attempts vs. infinite loops.

10. **Handle graceful vs. hard crashes differently** - Graceful allows cleanup.

## Conclusion

Worker crashes are unavoidable, but BullMQ provides robust mechanisms for detection and recovery. By properly configuring stall detection, implementing checkpointing, and using process supervisors, you can build fault-tolerant job processing systems that recover automatically from crashes. Always monitor crash rates and investigate patterns to prevent recurring issues.
