# How to Handle Stalled Jobs in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Stalled Jobs, Job Recovery, Worker Crashes, Lock Management, Reliability

Description: A comprehensive guide to handling stalled jobs in BullMQ, including understanding why jobs stall, configuring stall detection, implementing recovery strategies.

---

Stalled jobs occur when a worker picks up a job but fails to complete it or renew its lock within the expected timeframe. BullMQ workers renew locks automatically while they are able to run, so this typically happens when workers crash, lose connection, block the Node.js event loop, or encounter infinite loops. Understanding and handling stalled jobs is critical for building reliable BullMQ systems.

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
  lockDuration: 30000, // Lock expires after 30 seconds unless renewed
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

// 2. CPU-bound operations that block the event loop
const slowWorker = new Worker('slow', async (job) => {
  // This blocks the event loop longer than lockDuration
  verySlowSynchronousOperation(); // 60 seconds
  // The worker cannot renew the lock while the event loop is blocked
  return 'done';
}, {
  connection,
  lockDuration: 30000,
});

// 3. Infinite loops or deadlocks
const loopyWorker = new Worker('loopy', async (job) => {
  while (true) {
    // Infinite loop blocks the event loop, so the lock cannot be renewed
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
  maxExpectedEventLoopBlockMs: number,
  safetyMargin: number = 2
): StallConfig {
  // Lock duration should cover the longest expected event-loop block,
  // plus margin for Redis/network latency. Normal async jobs are
  // automatically renewed while the worker is healthy.
  const lockDuration = maxExpectedEventLoopBlockMs * safetyMargin;

  // Check interval should be less than lock duration
  const stalledInterval = lockDuration / 2;

  return {
    lockDuration,
    stalledInterval,
    maxStalledCount: 2, // Usually 1-3 is reasonable
  };
}

// For CPU-bound work that may block the event loop for up to 10 seconds
const config = calculateStallConfig(10000);
console.log(config);
// { lockDuration: 20000, stalledInterval: 10000, maxStalledCount: 2 }

const worker = new Worker('tasks', processor, {
  connection,
  ...config,
});
```

## Extending Lock Duration

BullMQ workers renew locks automatically by default. If you disable automatic lock renewal or manually fetch jobs, extend the lock while the job is running:

```typescript
const longRunningWorker = new Worker('long-tasks', async (job) => {
  const items = job.data.items;
  const results = [];

  for (let i = 0; i < items.length; i++) {
    // Process item
    const result = await processItem(items[i]);
    results.push(result);

    // Extend lock every N items when managing locks manually
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
  skipLockRenewal: true,
});
```

## Auto-Extend Lock Utility

Create a utility to extend locks when automatic lock renewal is disabled or when jobs are processed manually. This is not a replacement for avoiding CPU-bound event-loop blocking:

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
}, {
  connection,
  skipLockRenewal: true,
});
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
          console.log(`Job ${job.id} exceeded configured stall threshold`);
          // Set worker maxStalledCount to enforce failure after too many stalls.
        }
        break;

      case 'fail':
        console.log(`Job ${job.id} stalled; configure maxStalledCount: 0 to fail on the first stall`);
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

    // Optionally remove it if BullMQ has moved it back to waiting
    if (await job.isWaiting()) {
      await job.remove();
    }
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

    // Update progress; extend manually only if automatic renewal is disabled
    if (job.token) {
      await job.extendLock(job.token, 30000);
    }
    await job.updateProgress(((i + chunk.length) / items.length) * 100);
  }

  return results;
}

// 3. Use sandboxed processors for isolation
// See bullmq-sandboxed-processors post for details

// 4. Implement heartbeat mechanism when automatic lock renewal is disabled
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
        const lockKey = this.queue.toKey(`${job.id}:lock`);
        const lockTtlMs = await this.connection.pttl(lockKey);

        return {
          id: job.id,
          name: job.name,
          processedOn: job.processedOn ? new Date(job.processedOn) : null,
          runningFor: job.processedOn
            ? Date.now() - job.processedOn
            : null,
          lockTtlMs: lockTtlMs > 0 ? lockTtlMs : 'expired',
          progress: job.progress,
          data: job.data,
        };
      })
    );
  }

  async findPotentialStalls(): Promise<any[]> {
    const activeJobs = await this.getActiveJobDetails();

    return activeJobs.filter((job) => {
      // Active jobs without a lock are likely to be picked up by the stalled checker
      return job.lockTtlMs === 'expired';
    });
  }

  async diagnoseStall(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    const state = await job.getState();
    const lockKey = this.queue.toKey(`${job.id}:lock`);
    const lockExists = await this.connection.exists(lockKey);
    const lockTtlMs = await this.connection.pttl(lockKey);

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
        ttlMs: lockTtlMs > 0 ? lockTtlMs : 'expired',
      },
      data: job.data,
      opts: {
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
  const potentialStalls = await debugger.findPotentialStalls();
  res.json(potentialStalls);
});

app.get('/debug/stall/:jobId', async (req, res) => {
  const debugger = new StallDebugger(queue, connection);
  const diagnosis = await debugger.diagnoseStall(req.params.jobId);
  res.json(diagnosis);
});
```

## Best Practices

1. **Set appropriate lock duration** - Should cover expected event-loop blocking time and renewal delays; healthy workers renew locks automatically.

2. **Use automatic lock renewal for long jobs** - Only call job.extendLock() yourself when manual processing or skipLockRenewal requires it.

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
