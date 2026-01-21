# How to Implement Graceful Shutdown for BullMQ Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Graceful Shutdown, SIGTERM, Process Management, Production

Description: A comprehensive guide to implementing graceful shutdown for BullMQ workers, including handling SIGTERM signals, completing in-flight jobs, timeout strategies, and ensuring reliable deployments with zero job loss.

---

Graceful shutdown is critical for production BullMQ applications. When a worker needs to stop - whether for deployment, scaling, or maintenance - you must ensure in-flight jobs complete successfully and no jobs are lost. This guide covers everything you need to implement reliable graceful shutdown.

## Understanding Graceful Shutdown

Graceful shutdown involves:
1. Stopping acceptance of new jobs
2. Waiting for active jobs to complete
3. Cleaning up resources
4. Exiting the process

```typescript
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker('tasks', async (job) => {
  console.log(`Processing job ${job.id}`);
  return { processed: true };
}, { connection });

// Basic graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  await worker.close();
  await connection.quit();

  console.log('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## Complete Graceful Shutdown Implementation

A production-ready implementation with timeout and status tracking:

```typescript
import { Worker, Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';

interface ShutdownConfig {
  timeout: number;        // Maximum time to wait for jobs
  forceAfter: number;     // Force exit after this time
  drainDelay: number;     // Delay before starting drain
}

class GracefulWorker {
  private worker: Worker;
  private connection: Redis;
  private isShuttingDown = false;
  private activeJobs = new Set<string>();
  private config: ShutdownConfig;

  constructor(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    config: Partial<ShutdownConfig> = {}
  ) {
    this.config = {
      timeout: config.timeout || 30000,
      forceAfter: config.forceAfter || 60000,
      drainDelay: config.drainDelay || 1000,
    };

    this.connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(queueName, async (job) => {
      return this.wrappedProcessor(job, processor);
    }, {
      connection: this.connection,
      concurrency: 5,
    });

    this.setupEventHandlers();
    this.setupSignalHandlers();
  }

  private async wrappedProcessor(job: Job, processor: (job: Job) => Promise<any>) {
    this.activeJobs.add(job.id!);

    try {
      const result = await processor(job);
      return result;
    } finally {
      this.activeJobs.delete(job.id!);
    }
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
    });
  }

  private setupSignalHandlers() {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGQUIT'];

    signals.forEach(signal => {
      process.on(signal, () => this.shutdown(signal));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.shutdown('uncaughtException');
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await this.shutdown('unhandledRejection');
    });
  }

  async shutdown(signal: string) {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\n[${new Date().toISOString()}] Received ${signal}. Starting graceful shutdown...`);

    // Set force exit timer
    const forceExitTimer = setTimeout(() => {
      console.error('Force exit after timeout');
      process.exit(1);
    }, this.config.forceAfter);

    try {
      // Step 1: Pause worker (stop accepting new jobs)
      console.log('Pausing worker...');
      await this.worker.pause();

      // Step 2: Wait for active jobs with timeout
      console.log(`Waiting for ${this.activeJobs.size} active jobs...`);
      await this.waitForActiveJobs();

      // Step 3: Close worker
      console.log('Closing worker...');
      await this.worker.close();

      // Step 4: Close Redis connection
      console.log('Closing Redis connection...');
      await this.connection.quit();

      clearTimeout(forceExitTimer);
      console.log(`[${new Date().toISOString()}] Graceful shutdown complete`);
      process.exit(0);

    } catch (error) {
      console.error('Error during shutdown:', error);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  }

  private async waitForActiveJobs(): Promise<void> {
    const startTime = Date.now();

    while (this.activeJobs.size > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.config.timeout) {
        console.warn(`Timeout waiting for jobs. ${this.activeJobs.size} jobs still active.`);
        console.warn('Active job IDs:', [...this.activeJobs]);
        break;
      }

      console.log(`Waiting for ${this.activeJobs.size} active jobs... (${Math.round(elapsed / 1000)}s)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.activeJobs.size === 0) {
      console.log('All active jobs completed');
    }
  }

  async start() {
    console.log('Worker started');
  }

  isRunning(): boolean {
    return !this.isShuttingDown;
  }
}

// Usage
const worker = new GracefulWorker('tasks', async (job) => {
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 5000));
  return { processed: true };
}, {
  timeout: 30000,
  forceAfter: 60000,
});

worker.start();
```

## Handling Multiple Queues

Gracefully shutdown workers for multiple queues:

```typescript
class MultiQueueWorkerManager {
  private workers: Map<string, Worker> = new Map();
  private connection: Redis;
  private isShuttingDown = false;

  constructor(connection: Redis) {
    this.connection = connection;
    this.setupSignalHandlers();
  }

  addWorker(queueName: string, processor: (job: Job) => Promise<any>, options?: WorkerOptions) {
    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      ...options,
    });

    worker.on('error', (error) => {
      console.error(`Worker ${queueName} error:`, error);
    });

    this.workers.set(queueName, worker);
    console.log(`Added worker for queue: ${queueName}`);
  }

  private setupSignalHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async shutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log(`Received ${signal}. Shutting down ${this.workers.size} workers...`);

    // Pause all workers first
    console.log('Pausing all workers...');
    await Promise.all(
      [...this.workers.values()].map(worker => worker.pause())
    );

    // Close all workers in parallel
    console.log('Closing all workers...');
    await Promise.all(
      [...this.workers.entries()].map(async ([name, worker]) => {
        try {
          await worker.close();
          console.log(`Worker ${name} closed`);
        } catch (error) {
          console.error(`Error closing worker ${name}:`, error);
        }
      })
    );

    // Close Redis connection
    await this.connection.quit();

    console.log('All workers shut down');
    process.exit(0);
  }
}

// Usage
const manager = new MultiQueueWorkerManager(connection);

manager.addWorker('emails', async (job) => {
  // Process email
}, { concurrency: 10 });

manager.addWorker('notifications', async (job) => {
  // Process notification
}, { concurrency: 20 });

manager.addWorker('reports', async (job) => {
  // Process report
}, { concurrency: 2 });
```

## Kubernetes Integration

Handle Kubernetes termination properly:

```typescript
import express from 'express';

class KubernetesGracefulWorker {
  private worker: Worker;
  private connection: Redis;
  private isShuttingDown = false;
  private isReady = false;
  private app: express.Application;

  constructor(queueName: string, processor: (job: Job) => Promise<any>) {
    this.connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
    });

    this.app = express();
    this.setupHealthEndpoints();
    this.setupSignalHandlers();

    this.worker.on('ready', () => {
      this.isReady = true;
      console.log('Worker is ready');
    });
  }

  private setupHealthEndpoints() {
    // Liveness probe - is the process running?
    this.app.get('/health/live', (req, res) => {
      if (this.isShuttingDown) {
        res.status(503).json({ status: 'shutting_down' });
      } else {
        res.json({ status: 'alive' });
      }
    });

    // Readiness probe - can accept traffic?
    this.app.get('/health/ready', (req, res) => {
      if (!this.isReady || this.isShuttingDown) {
        res.status(503).json({
          status: 'not_ready',
          ready: this.isReady,
          shuttingDown: this.isShuttingDown,
        });
      } else {
        res.json({ status: 'ready' });
      }
    });

    // Startup probe - has the app started?
    this.app.get('/health/startup', (req, res) => {
      if (this.isReady) {
        res.json({ status: 'started' });
      } else {
        res.status(503).json({ status: 'starting' });
      }
    });

    const port = parseInt(process.env.HEALTH_PORT || '8080');
    this.app.listen(port, () => {
      console.log(`Health endpoints listening on port ${port}`);
    });
  }

  private setupSignalHandlers() {
    // Kubernetes sends SIGTERM
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async shutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.isReady = false;

    console.log(`Received ${signal}. Starting graceful shutdown...`);

    // Get termination grace period from env (default 30s)
    const gracePeriod = parseInt(process.env.TERMINATION_GRACE_PERIOD || '30000');

    // Set force exit slightly before Kubernetes kills us
    const forceTimeout = setTimeout(() => {
      console.error('Force exit before Kubernetes SIGKILL');
      process.exit(1);
    }, gracePeriod - 5000);

    try {
      // Wait a moment for load balancer to stop sending traffic
      const preStopDelay = parseInt(process.env.PRE_STOP_DELAY || '5000');
      console.log(`Waiting ${preStopDelay}ms for traffic to drain...`);
      await new Promise(resolve => setTimeout(resolve, preStopDelay));

      // Pause worker
      await this.worker.pause();
      console.log('Worker paused');

      // Wait for active jobs
      await this.waitForActiveJobs(gracePeriod - preStopDelay - 10000);

      // Close worker
      await this.worker.close();
      console.log('Worker closed');

      // Close Redis
      await this.connection.quit();
      console.log('Redis connection closed');

      clearTimeout(forceTimeout);
      console.log('Graceful shutdown complete');
      process.exit(0);

    } catch (error) {
      console.error('Shutdown error:', error);
      clearTimeout(forceTimeout);
      process.exit(1);
    }
  }

  private async waitForActiveJobs(timeout: number) {
    const startTime = Date.now();

    while (true) {
      const activeCount = await this.worker.getActiveCount?.() || 0;

      if (activeCount === 0) {
        console.log('All jobs completed');
        break;
      }

      if (Date.now() - startTime > timeout) {
        console.warn(`Timeout reached with ${activeCount} active jobs`);
        break;
      }

      console.log(`Waiting for ${activeCount} active jobs...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async start() {
    console.log('Kubernetes-ready worker started');
  }
}
```

## Saving State on Shutdown

Save job state for resumption after restart:

```typescript
interface ResumableJobData {
  taskId: string;
  checkpoint?: {
    processedItems: number;
    lastItemId: string;
    intermediateData: any;
  };
}

class ResumableWorker {
  private worker: Worker<ResumableJobData>;
  private connection: Redis;
  private activeJobs: Map<string, ResumableJobData & { progress: any }> = new Map();

  constructor() {
    this.connection = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker<ResumableJobData>('resumable', async (job) => {
      return await this.processWithCheckpoint(job);
    }, {
      connection: this.connection,
    });

    this.setupSignalHandlers();
  }

  private async processWithCheckpoint(job: Job<ResumableJobData>) {
    const { taskId, checkpoint } = job.data;

    // Track this job
    this.activeJobs.set(job.id!, { ...job.data, progress: null });

    try {
      const startIndex = checkpoint?.processedItems || 0;
      const items = await this.getItems(taskId);

      for (let i = startIndex; i < items.length; i++) {
        // Check if we're shutting down
        if (this.isShuttingDown) {
          // Save checkpoint
          await this.saveCheckpoint(job, i, items[i].id);
          throw new Error('SHUTDOWN_CHECKPOINT');
        }

        await this.processItem(items[i]);

        // Update progress
        const progress = { processedItems: i + 1, lastItemId: items[i].id };
        this.activeJobs.get(job.id!)!.progress = progress;
        await job.updateProgress(progress);
      }

      // Clear checkpoint on success
      await this.clearCheckpoint(taskId);

      return { processed: items.length };
    } finally {
      this.activeJobs.delete(job.id!);
    }
  }

  private async saveCheckpoint(job: Job<ResumableJobData>, processedItems: number, lastItemId: string) {
    const checkpoint = {
      processedItems,
      lastItemId,
      intermediateData: this.activeJobs.get(job.id!)?.progress,
    };

    // Store checkpoint in Redis
    await this.connection.set(
      `checkpoint:${job.data.taskId}`,
      JSON.stringify(checkpoint),
      'EX',
      86400 // 24 hour expiry
    );

    console.log(`Saved checkpoint for job ${job.id} at item ${processedItems}`);
  }

  private async clearCheckpoint(taskId: string) {
    await this.connection.del(`checkpoint:${taskId}`);
  }

  private isShuttingDown = false;

  private setupSignalHandlers() {
    process.on('SIGTERM', async () => {
      this.isShuttingDown = true;
      console.log('Shutdown signal received, saving checkpoints...');

      // Give jobs time to save checkpoints
      await new Promise(resolve => setTimeout(resolve, 5000));

      await this.worker.close();
      await this.connection.quit();
      process.exit(0);
    });
  }

  private async getItems(taskId: string): Promise<any[]> {
    // Fetch items to process
    return [];
  }

  private async processItem(item: any) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

## Testing Graceful Shutdown

Test your shutdown implementation:

```typescript
import { Worker, Queue } from 'bullmq';

describe('Graceful Shutdown', () => {
  let queue: Queue;
  let worker: Worker;

  beforeEach(async () => {
    queue = new Queue('test-shutdown', { connection });
  });

  afterEach(async () => {
    await worker?.close();
    await queue.close();
  });

  it('should complete active jobs before shutdown', async () => {
    const processedJobs: string[] = [];
    const jobDuration = 1000;

    worker = new Worker('test-shutdown', async (job) => {
      await new Promise(resolve => setTimeout(resolve, jobDuration));
      processedJobs.push(job.id!);
      return { done: true };
    }, { connection, concurrency: 2 });

    // Add jobs
    await queue.add('job1', {});
    await queue.add('job2', {});

    // Wait for jobs to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initiate shutdown
    const shutdownPromise = worker.close();

    // Shutdown should wait for jobs
    await shutdownPromise;

    expect(processedJobs.length).toBe(2);
  });

  it('should not accept new jobs after shutdown initiated', async () => {
    worker = new Worker('test-shutdown', async (job) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { done: true };
    }, { connection, concurrency: 1 });

    // Add initial job
    await queue.add('job1', {});

    // Wait for job to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initiate shutdown (don't await yet)
    const shutdownPromise = worker.close();

    // Add another job
    await queue.add('job2', {});

    await shutdownPromise;

    // job2 should still be in the queue
    const waitingCount = await queue.getWaitingCount();
    expect(waitingCount).toBe(1);
  });
});
```

## Best Practices

1. **Handle SIGTERM** - Kubernetes and most orchestrators send SIGTERM first.

2. **Set appropriate timeouts** - Match your termination grace period.

3. **Pause before closing** - Stop accepting new jobs before closing.

4. **Track active jobs** - Know what's still running during shutdown.

5. **Implement health checks** - Report readiness status correctly.

6. **Save checkpoints** - Allow jobs to resume after restart.

7. **Test shutdown scenarios** - Verify behavior under various conditions.

8. **Log shutdown progress** - Make debugging easier.

9. **Handle multiple signals** - SIGTERM, SIGINT, and SIGQUIT.

10. **Force exit as last resort** - Don't hang indefinitely.

## Conclusion

Graceful shutdown is essential for reliable BullMQ deployments. By properly handling termination signals, waiting for active jobs, and saving state when needed, you can ensure zero job loss during deployments and scaling operations. Always test your shutdown implementation and monitor for any issues in production.
