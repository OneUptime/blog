# How to Handle Stalled Jobs in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Stalled Jobs, Job Recovery, Worker Crashes, Lock Management, Reliability

Description: A comprehensive guide to handling stalled jobs in BullMQ, including understanding why jobs stall, configuring stall detection, implementing recovery strategies, and preventing stalls in production systems.

---

Stalled jobs occur when a worker picks up a job but fails to complete it or renew its lock within the expected timeframe. This typically happens when workers crash, become unresponsive, or encounter infinite loops. Understanding and handling stalled jobs is critical for building reliable BullMQ systems.

## Understanding Stalled Jobs

Jobs stall when the worker processing them stops renewing the job lock:

```typescript
import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Configure stall detection
const worker = new Worker('orders', async (job) => {
  // Process job
  return processOrder(job.data);
}, {
  connection,
  lockDuration: 30000, // Lock expires after 30 seconds
  stalledInterval: 15000, // Check for stalled jobs every 15 seconds
  maxStalledCount: 2, // Max times a job can stall before failing
});

// Listen for stalled jobs
worker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} has stalled!`);
});

// Queue events for monitoring
const queueEvents = new QueueEvents('orders', { connection });

queueEvents.on('stalled', ({ jobId }) => {
  console.warn(`Job ${jobId} detected as stalled`);
});
```

## Why Jobs Stall

Common causes of job stalling:

```typescript
// 1. Worker crash during processing
const crashyWorker = new Worker('risky', async (job) => {
  // Simulate crash
  if (Math.random() < 0.1) {
    process.exit(1); // Worker dies, job stalls
  }
  return process(job.data);
}, { connection });

// 2. Blocking operations that exceed lock duration
const slowWorker = new Worker('slow', async (job) => {
  // This takes longer than lock duration
  await verySlowOperation(); // 60 seconds
  // Lock expired at 30 seconds, job marked as stalled
  return 'done';
}, {
  connection,
  lockDuration: 30000,
});

// 3. Infinite loops or deadlocks
const loopyWorker = new Worker('loopy', async (job) => {
  while (true) {
    // Infinite loop, lock never renewed
    doSomething();
  }
}, { connection });

// 4. Unhandled promise rejections that don't throw
const silentFailWorker = new Worker('silent', async (job) => {
  // This promise rejection isn't caught or thrown
  somethingAsync().catch(() => {}); // Bad practice
  await new Promise(() => {}); // Never resolves
}, { connection });
```

## Configuring Stall Detection

Properly configure stall detection parameters:

```typescript
interface StallConfig {
  lockDuration: number;
  stalledInterval: number;
  maxStalledCount: number;
}

function calculateStallConfig(
  expectedJobDuration: number,
  safetyMargin: number = 2
): StallConfig {
  // Lock should be longer than expected job duration
  const lockDuration = expectedJobDuration * safetyMargin;

  // Check interval should be less than lock duration
  const stalledInterval = lockDuration / 2;

  return {
    lockDuration,
    stalledInterval,
    maxStalledCount: 2, // Usually 1-3 is reasonable
  };
}

// For a job that typically takes 10 seconds
const config = calculateStallConfig(10000);
console.log(config);
// { lockDuration: 20000, stalledInterval: 10000, maxStalledCount: 2 }

const worker = new Worker('tasks', processor, {
  connection,
  ...config,
});
```

## Extending Lock Duration

For long-running jobs, extend the lock:

```typescript
const longRunningWorker = new Worker('long-tasks', async (job) => {
  const items = job.data.items;
  const results = [];

  for (let i = 0; i < items.length; i++) {
    // Process item
    const result = await processItem(items[i]);
    results.push(result);

    // Extend lock every N items
    if (i % 10 === 0) {
      await job.extendLock(job.token!, 30000);
      await job.updateProgress((i / items.length) * 100);
    }
  }

  return results;
}, {
  connection,
  lockDuration: 30000,
  stalledInterval: 15000,
});
```

## Auto-Extend Lock Utility

Create a utility to automatically extend locks:

```typescript
class LockExtender {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private job: Job,
    private extensionMs: number = 30000,
    private intervalMs: number = 15000
  ) {}

  start(): void {
    this.intervalId = setInterval(async () => {
      try {
        if (this.job.token) {
          await this.job.extendLock(this.job.token, this.extensionMs);
          console.log(`Extended lock for job ${this.job.id}`);
        }
      } catch (error) {
        console.error(`Failed to extend lock for job ${this.job.id}:`, error);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Usage in worker
const worker = new Worker('long-tasks', async (job) => {
  const lockExtender = new LockExtender(job);
  lockExtender.start();

  try {
    return await longRunningProcess(job.data);
  } finally {
    lockExtender.stop();
  }
}, { connection });
```

## Stall Recovery Strategies

Implement different recovery strategies:

```typescript
interface StallRecoveryConfig {
  strategy: 'retry' | 'fail' | 'custom';
  maxRetries?: number;
  customHandler?: (job: Job) => Promise<void>;
}

class StallRecoveryManager {
  private stalledCounts: Map<string, number> = new Map();

  constructor(
    private queue: Queue,
    private worker: Worker,
    private config: StallRecoveryConfig
  ) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.worker.on('stalled', async (jobId) => {
      const count = (this.stalledCounts.get(jobId) || 0) + 1;
      this.stalledCounts.set(jobId, count);

      console.log(`Job ${jobId} stalled (count: ${count})`);

      const job = await this.queue.getJob(jobId);
      if (!job) return;

      await this.handleStall(job, count);
    });
  }

  private async handleStall(job: Job, stallCount: number): Promise<void> {
    switch (this.config.strategy) {
      case 'retry':
        if (stallCount <= (this.config.maxRetries || 3)) {
          console.log(`Allowing job ${job.id} to be retried`);
          // Job will be automatically moved back to waiting
        } else {
          console.log(`Job ${job.id} exceeded max stall retries, marking as failed`);
          await job.moveToFailed(new Error('Max stall count exceeded'), job.token || '');
        }
        break;

      case 'fail':
        await job.moveToFailed(new Error('Job stalled'), job.token || '');
        break;

      case 'custom':
        if (this.config.customHandler) {
          await this.config.customHandler(job);
        }
        break;
    }
  }

  clearStalledCount(jobId: string): void {
    this.stalledCounts.delete(jobId);
  }
}

// Usage
const recoveryManager = new StallRecoveryManager(queue, worker, {
  strategy: 'custom',
  customHandler: async (job) => {
    // Send alert
    await sendAlert(`Job ${job.id} has stalled`);

    // Move to DLQ
    await dlq.add('stalled-job', {
      originalJob: job.data,
      stalledAt: new Date().toISOString(),
    });

    // Remove from main queue
    await job.remove();
  },
});
```

## Monitoring Stalled Jobs

Track and alert on stalled jobs:

```typescript
interface StallMetrics {
  totalStalls: number;
  uniqueJobsStalled: number;
  stalledByJobName: Record<string, number>;
  recentStalls: Array<{
    jobId: string;
    jobName: string;
    timestamp: Date;
  }>;
}

class StallMonitor {
  private metrics: StallMetrics = {
    totalStalls: 0,
    uniqueJobsStalled: 0,
    stalledByJobName: {},
    recentStalls: [],
  };
  private stalledJobs: Set<string> = new Set();

  constructor(
    private queueEvents: QueueEvents,
    private queue: Queue,
    private alertThreshold: number = 5
  ) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.queueEvents.on('stalled', async ({ jobId }) => {
      this.metrics.totalStalls++;

      if (!this.stalledJobs.has(jobId)) {
        this.stalledJobs.add(jobId);
        this.metrics.uniqueJobsStalled++;
      }

      const job = await this.queue.getJob(jobId);
      if (job) {
        const jobName = job.name;
        this.metrics.stalledByJobName[jobName] =
          (this.metrics.stalledByJobName[jobName] || 0) + 1;

        this.metrics.recentStalls.push({
          jobId,
          jobName,
          timestamp: new Date(),
        });

        // Keep only last 100 stalls
        if (this.metrics.recentStalls.length > 100) {
          this.metrics.recentStalls.shift();
        }
      }

      // Check for alert threshold
      const recentCount = this.getRecentStallCount(60000); // Last minute
      if (recentCount >= this.alertThreshold) {
        this.sendAlert(recentCount);
      }
    });
  }

  private getRecentStallCount(windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    return this.metrics.recentStalls.filter(
      (s) => s.timestamp.getTime() > cutoff
    ).length;
  }

  private sendAlert(count: number): void {
    console.error(`ALERT: ${count} jobs stalled in the last minute!`);
    // Integrate with alerting system
  }

  getMetrics(): StallMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalStalls: 0,
      uniqueJobsStalled: 0,
      stalledByJobName: {},
      recentStalls: [],
    };
    this.stalledJobs.clear();
  }
}
```

## Preventing Stalls

Best practices to prevent job stalls:

```typescript
// 1. Use appropriate timeouts for external calls
async function safeExternalCall(
  operation: () => Promise<any>,
  timeoutMs: number
): Promise<any> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}

const worker = new Worker('external-calls', async (job) => {
  // Won't hang forever
  const result = await safeExternalCall(
    () => callExternalService(job.data),
    25000 // Less than lock duration
  );
  return result;
}, {
  connection,
  lockDuration: 30000,
});

// 2. Break long operations into chunks
async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  job: Job,
  chunkSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // Extend lock and update progress
    if (job.token) {
      await job.extendLock(job.token, 30000);
    }
    await job.updateProgress(((i + chunk.length) / items.length) * 100);
  }

  return results;
}

// 3. Use sandboxed processors for isolation
// See bullmq-sandboxed-processors post for details

// 4. Implement heartbeat mechanism
class HeartbeatProcessor {
  async process(job: Job): Promise<any> {
    const heartbeatInterval = setInterval(async () => {
      try {
        if (job.token) {
          await job.extendLock(job.token, 30000);
        }
      } catch (error) {
        // Lock might be lost
        console.error('Heartbeat failed:', error);
      }
    }, 10000);

    try {
      return await this.doWork(job);
    } finally {
      clearInterval(heartbeatInterval);
    }
  }

  private async doWork(job: Job): Promise<any> {
    // Actual processing logic
  }
}
```

## Debugging Stalled Jobs

Tools for debugging stall issues:

```typescript
class StallDebugger {
  constructor(
    private queue: Queue,
    private connection: Redis
  ) {}

  async getActiveJobDetails(): Promise<any[]> {
    const activeJobs = await this.queue.getActive();

    return Promise.all(
      activeJobs.map(async (job) => {
        const lockKey = `bull:${this.queue.name}:${job.id}:lock`;
        const lockTTL = await this.connection.ttl(lockKey);

        return {
          id: job.id,
          name: job.name,
          processedOn: job.processedOn ? new Date(job.processedOn) : null,
          runningFor: job.processedOn
            ? Date.now() - job.processedOn
            : null,
          lockTTL: lockTTL > 0 ? lockTTL * 1000 : 'expired',
          progress: job.progress,
          data: job.data,
        };
      })
    );
  }

  async findPotentialStalls(lockDuration: number): Promise<any[]> {
    const activeJobs = await this.getActiveJobDetails();

    return activeJobs.filter((job) => {
      // Jobs running longer than 80% of lock duration
      return job.runningFor && job.runningFor > lockDuration * 0.8;
    });
  }

  async diagnoseStall(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    const state = await job.getState();
    const lockKey = `bull:${this.queue.name}:${job.id}:lock`;
    const lockExists = await this.connection.exists(lockKey);
    const lockTTL = await this.connection.ttl(lockKey);

    return {
      id: job.id,
      name: job.name,
      state,
      processedOn: job.processedOn,
      runningDuration: job.processedOn ? Date.now() - job.processedOn : null,
      attemptsMade: job.attemptsMade,
      stacktrace: job.stacktrace,
      lock: {
        exists: lockExists === 1,
        ttl: lockTTL > 0 ? lockTTL * 1000 : 'expired',
      },
      data: job.data,
      opts: {
        lockDuration: (job.opts as any).lockDuration,
        attempts: job.opts.attempts,
      },
    };
  }
}

// API endpoint for debugging
app.get('/debug/active-jobs', async (req, res) => {
  const debugger = new StallDebugger(queue, connection);
  const activeJobs = await debugger.getActiveJobDetails();
  res.json(activeJobs);
});

app.get('/debug/potential-stalls', async (req, res) => {
  const debugger = new StallDebugger(queue, connection);
  const potentialStalls = await debugger.findPotentialStalls(30000);
  res.json(potentialStalls);
});

app.get('/debug/stall/:jobId', async (req, res) => {
  const debugger = new StallDebugger(queue, connection);
  const diagnosis = await debugger.diagnoseStall(req.params.jobId);
  res.json(diagnosis);
});
```

## Best Practices

1. **Set appropriate lock duration** - Should exceed max expected job time.

2. **Extend locks for long jobs** - Use job.extendLock() regularly.

3. **Use timeouts** - Prevent infinite waits on external calls.

4. **Monitor stall rates** - Alert on unusual stall patterns.

5. **Handle stalls gracefully** - Have clear recovery strategies.

6. **Test worker crashes** - Verify recovery works correctly.

7. **Use sandboxed processors** - Isolate risky operations.

8. **Log processing milestones** - Help debug stalled jobs.

9. **Keep jobs short** - Break long operations into multiple jobs.

10. **Monitor active job duration** - Catch potential stalls early.

## Conclusion

Stalled jobs are a natural part of distributed queue systems. By understanding why stalls occur, configuring detection appropriately, implementing recovery strategies, and monitoring stall rates, you can build resilient BullMQ systems that handle worker failures gracefully. Remember that preventing stalls through proper job design is always better than handling them after they occur.
