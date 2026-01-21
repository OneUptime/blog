# How to Implement Job Timeouts in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Timeouts, Job Processing, Error Handling, Reliability, Best Practices

Description: A comprehensive guide to implementing job timeouts in BullMQ, including timeout strategies, graceful cancellation, partial result handling, and building robust timeout mechanisms for reliable job processing.

---

Timeouts are essential for preventing jobs from running indefinitely. Without proper timeout handling, a single hung job can block workers, consume resources, and degrade system performance. This guide covers implementing effective timeout strategies in BullMQ.

## Basic Job Timeout

BullMQ does not have built-in job-level timeouts, but you can implement them:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Timeout wrapper function
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

// Worker with timeout
const worker = new Worker('tasks', async (job) => {
  const timeout = job.data.timeout || 30000; // Default 30 seconds

  return withTimeout(
    processJob(job),
    timeout,
    `Job ${job.id} timed out after ${timeout}ms`
  );
}, { connection });
```

## Timeout Configuration Per Job

Configure timeouts at the job level:

```typescript
interface JobWithTimeout {
  data: any;
  timeout: number;
}

const queue = new Queue<JobWithTimeout>('timed-tasks', { connection });

// Add job with custom timeout
await queue.add('process', {
  data: { userId: '123' },
  timeout: 60000, // 1 minute
});

await queue.add('quick-task', {
  data: { action: 'ping' },
  timeout: 5000, // 5 seconds
});

// Worker reads timeout from job data
const worker = new Worker<JobWithTimeout>('timed-tasks', async (job) => {
  return withTimeout(
    handleJob(job.data.data),
    job.data.timeout,
    `Job timed out after ${job.data.timeout}ms`
  );
}, { connection });
```

## Timeout with Cleanup

Handle cleanup when timeout occurs:

```typescript
interface TimeoutContext {
  abortController: AbortController;
  cleanup: () => Promise<void>;
}

async function withTimeoutAndCleanup<T>(
  executor: (ctx: TimeoutContext) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const abortController = new AbortController();
  let cleanupFn: (() => Promise<void>) | null = null;
  let timeoutId: NodeJS.Timeout;

  const ctx: TimeoutContext = {
    abortController,
    cleanup: async () => {},
  };

  // Allow executor to register cleanup
  const setCleanup = (fn: () => Promise<void>) => {
    cleanupFn = fn;
    ctx.cleanup = fn;
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(async () => {
      abortController.abort();
      if (cleanupFn) {
        try {
          await cleanupFn();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
      reject(new Error('Operation timed out'));
    }, timeoutMs);
  });

  try {
    const resultPromise = (async () => {
      const result = await executor(ctx);
      return result;
    })();

    return await Promise.race([resultPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

// Usage in worker
const worker = new Worker('tasks', async (job) => {
  return withTimeoutAndCleanup(
    async (ctx) => {
      // Set up cleanup handler
      let tempFile: string | null = null;

      ctx.cleanup = async () => {
        if (tempFile) {
          await fs.unlink(tempFile);
          console.log('Cleaned up temp file after timeout');
        }
      };

      // Check for abort signal periodically
      tempFile = await createTempFile(job.data);

      if (ctx.abortController.signal.aborted) {
        throw new Error('Aborted');
      }

      const result = await processFile(tempFile, ctx.abortController.signal);

      // Clean up on success
      await fs.unlink(tempFile);
      tempFile = null;

      return result;
    },
    30000
  );
}, { connection });
```

## Cancellable Operations

Implement cancellable job processing:

```typescript
class CancellableProcessor {
  private abortController: AbortController;
  private cancelled: boolean = false;

  constructor() {
    this.abortController = new AbortController();
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  cancel(): void {
    this.cancelled = true;
    this.abortController.abort();
  }

  checkCancelled(): void {
    if (this.cancelled) {
      throw new Error('Operation was cancelled');
    }
  }

  async processWithCancellation<T>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> {
    const results: T[] = [];

    for (const operation of operations) {
      this.checkCancelled();
      const result = await operation();
      results.push(result);
    }

    return results;
  }
}

async function processorWithTimeout(job: Job, timeoutMs: number): Promise<any> {
  const processor = new CancellableProcessor();

  const timeoutId = setTimeout(() => {
    processor.cancel();
  }, timeoutMs);

  try {
    const operations = job.data.items.map((item: any) => async () => {
      processor.checkCancelled();
      return processItem(item);
    });

    return await processor.processWithCancellation(operations);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## Partial Results on Timeout

Save partial results when timeout occurs:

```typescript
interface PartialResult<T> {
  completed: T[];
  pending: any[];
  timedOut: boolean;
  processedCount: number;
  totalCount: number;
}

async function processWithPartialResults<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  timeoutMs: number
): Promise<PartialResult<R>> {
  const completed: R[] = [];
  const pending: T[] = [...items];
  let timedOut = false;
  const startTime = Date.now();

  for (const item of items) {
    // Check if we've exceeded timeout
    if (Date.now() - startTime > timeoutMs) {
      timedOut = true;
      break;
    }

    try {
      const result = await processor(item);
      completed.push(result);
      pending.shift();
    } catch (error) {
      // Handle individual item failure
      console.error('Item processing failed:', error);
      pending.shift();
    }
  }

  return {
    completed,
    pending,
    timedOut,
    processedCount: completed.length,
    totalCount: items.length,
  };
}

// Worker that saves partial results
const worker = new Worker('batch-process', async (job) => {
  const result = await processWithPartialResults(
    job.data.items,
    processItem,
    job.data.timeout || 60000
  );

  if (result.timedOut && result.pending.length > 0) {
    // Create follow-up job for remaining items
    await queue.add('batch-process', {
      items: result.pending,
      timeout: job.data.timeout,
      parentJobId: job.id,
    });

    // Return partial results
    return {
      partial: true,
      completed: result.completed,
      continuationJobCreated: true,
    };
  }

  return {
    partial: false,
    completed: result.completed,
  };
}, { connection });
```

## Per-Step Timeouts

Apply different timeouts to different steps:

```typescript
interface StepConfig {
  name: string;
  timeout: number;
  execute: () => Promise<any>;
  onTimeout?: () => Promise<any>;
}

async function executeStepsWithTimeouts(steps: StepConfig[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  for (const step of steps) {
    try {
      results[step.name] = await withTimeout(
        step.execute(),
        step.timeout,
        `Step '${step.name}' timed out after ${step.timeout}ms`
      );
    } catch (error) {
      if ((error as Error).message.includes('timed out') && step.onTimeout) {
        // Execute timeout handler
        results[step.name] = await step.onTimeout();
      } else {
        throw error;
      }
    }
  }

  return results;
}

// Usage
const worker = new Worker('multi-step', async (job) => {
  return executeStepsWithTimeouts([
    {
      name: 'fetch',
      timeout: 10000,
      execute: () => fetchData(job.data.url),
      onTimeout: () => ({ cached: true, data: getCachedData(job.data.url) }),
    },
    {
      name: 'process',
      timeout: 30000,
      execute: () => processData(job.data),
    },
    {
      name: 'notify',
      timeout: 5000,
      execute: () => sendNotification(job.data.userId),
      onTimeout: () => ({ notificationQueued: true }),
    },
  ]);
}, { connection });
```

## Global Timeout Configuration

Apply timeouts at the worker level:

```typescript
interface WorkerTimeoutConfig {
  defaultTimeout: number;
  maxTimeout: number;
  timeoutByJobName: Record<string, number>;
}

function createTimedWorker(
  queueName: string,
  processor: (job: Job) => Promise<any>,
  config: WorkerTimeoutConfig,
  connection: Redis
): Worker {
  return new Worker(
    queueName,
    async (job) => {
      // Determine timeout for this job
      let timeout = config.timeoutByJobName[job.name] || config.defaultTimeout;

      // Check for job-specific timeout
      if (job.data.timeout) {
        timeout = Math.min(job.data.timeout, config.maxTimeout);
      }

      // Extend lock to match timeout
      if (job.token && timeout > 30000) {
        await job.extendLock(job.token, timeout + 10000);
      }

      return withTimeout(
        processor(job),
        timeout,
        `Job ${job.name} (${job.id}) timed out after ${timeout}ms`
      );
    },
    { connection }
  );
}

// Usage
const worker = createTimedWorker(
  'tasks',
  async (job) => {
    // Process without worrying about timeouts
    return processJob(job);
  },
  {
    defaultTimeout: 30000,
    maxTimeout: 300000, // 5 minutes max
    timeoutByJobName: {
      'quick-task': 5000,
      'medium-task': 30000,
      'long-task': 120000,
    },
  },
  connection
);
```

## Timeout Monitoring

Track and alert on timeouts:

```typescript
interface TimeoutMetrics {
  totalTimeouts: number;
  timeoutsByJobName: Record<string, number>;
  averageTimeToTimeout: number;
  recentTimeouts: Array<{
    jobId: string;
    jobName: string;
    configuredTimeout: number;
    timestamp: Date;
  }>;
}

class TimeoutMonitor {
  private metrics: TimeoutMetrics = {
    totalTimeouts: 0,
    timeoutsByJobName: {},
    averageTimeToTimeout: 0,
    recentTimeouts: [],
  };
  private timeoutDurations: number[] = [];

  recordTimeout(job: Job, configuredTimeout: number): void {
    this.metrics.totalTimeouts++;

    this.metrics.timeoutsByJobName[job.name] =
      (this.metrics.timeoutsByJobName[job.name] || 0) + 1;

    const actualDuration = job.processedOn
      ? Date.now() - job.processedOn
      : configuredTimeout;

    this.timeoutDurations.push(actualDuration);
    if (this.timeoutDurations.length > 1000) {
      this.timeoutDurations.shift();
    }

    this.metrics.averageTimeToTimeout =
      this.timeoutDurations.reduce((a, b) => a + b, 0) / this.timeoutDurations.length;

    this.metrics.recentTimeouts.push({
      jobId: job.id || 'unknown',
      jobName: job.name,
      configuredTimeout,
      timestamp: new Date(),
    });

    if (this.metrics.recentTimeouts.length > 100) {
      this.metrics.recentTimeouts.shift();
    }
  }

  getMetrics(): TimeoutMetrics {
    return { ...this.metrics };
  }

  getTimeoutRate(windowMs: number = 3600000): number {
    const cutoff = Date.now() - windowMs;
    const recentCount = this.metrics.recentTimeouts.filter(
      (t) => t.timestamp.getTime() > cutoff
    ).length;

    return recentCount;
  }
}

const timeoutMonitor = new TimeoutMonitor();

// Integrate with worker
function createMonitoredTimedWorker(
  queueName: string,
  processor: (job: Job) => Promise<any>,
  timeoutMs: number,
  connection: Redis
): Worker {
  return new Worker(
    queueName,
    async (job) => {
      try {
        return await withTimeout(processor(job), timeoutMs);
      } catch (error) {
        if ((error as Error).message.includes('timed out')) {
          timeoutMonitor.recordTimeout(job, timeoutMs);
        }
        throw error;
      }
    },
    { connection }
  );
}
```

## Retry with Increasing Timeout

Increase timeout on retries:

```typescript
function calculateTimeout(
  baseTimeout: number,
  attemptsMade: number,
  maxTimeout: number = 300000
): number {
  // Increase timeout by 50% on each retry
  const timeout = baseTimeout * Math.pow(1.5, attemptsMade);
  return Math.min(timeout, maxTimeout);
}

const worker = new Worker('adaptive-timeout', async (job) => {
  const baseTimeout = job.data.timeout || 30000;
  const timeout = calculateTimeout(baseTimeout, job.attemptsMade);

  console.log(
    `Attempt ${job.attemptsMade + 1}: timeout set to ${timeout}ms`
  );

  return withTimeout(processJob(job), timeout);
}, {
  connection,
  settings: {
    backoffStrategy: (attemptsMade) => {
      // Exponential backoff
      return Math.min(1000 * Math.pow(2, attemptsMade), 30000);
    },
  },
});
```

## Timeout with Progress Checkpoint

Save progress before timeout:

```typescript
interface CheckpointedResult<T> {
  completed: boolean;
  result?: T;
  checkpoint?: {
    processedIndex: number;
    intermediateResults: any[];
    savedAt: Date;
  };
}

async function processWithCheckpoints<T>(
  job: Job,
  items: T[],
  processor: (item: T, index: number) => Promise<any>,
  timeoutMs: number,
  checkpointInterval: number = 10
): Promise<CheckpointedResult<any[]>> {
  const results: any[] = [];
  const startTime = Date.now();
  let lastCheckpointIndex = -1;

  // Resume from checkpoint if exists
  const startIndex = job.data.checkpointIndex || 0;

  for (let i = startIndex; i < items.length; i++) {
    // Check timeout
    if (Date.now() - startTime > timeoutMs * 0.9) {
      // Save checkpoint before timeout
      await job.updateData({
        ...job.data,
        checkpointIndex: i,
        checkpointResults: results,
      });

      return {
        completed: false,
        checkpoint: {
          processedIndex: i,
          intermediateResults: results,
          savedAt: new Date(),
        },
      };
    }

    const result = await processor(items[i], i);
    results.push(result);

    // Periodic checkpoint
    if (i % checkpointInterval === 0 && i > lastCheckpointIndex) {
      await job.updateProgress((i / items.length) * 100);
      lastCheckpointIndex = i;
    }
  }

  return {
    completed: true,
    result: results,
  };
}

// Worker that supports checkpointing
const worker = new Worker('checkpointed', async (job) => {
  const result = await processWithCheckpoints(
    job,
    job.data.items,
    processItem,
    job.data.timeout || 60000
  );

  if (!result.completed) {
    // Re-queue for continuation
    throw new Error('CHECKPOINT_TIMEOUT');
  }

  return result.result;
}, {
  connection,
  settings: {
    backoffStrategy: () => 1000, // Quick retry for checkpoint resumption
  },
});
```

## Best Practices

1. **Set realistic timeouts** - Based on expected job duration plus buffer.

2. **Implement cleanup** - Release resources when timeout occurs.

3. **Save partial progress** - Don't lose work done before timeout.

4. **Use per-step timeouts** - Different operations need different limits.

5. **Monitor timeout rates** - High rates indicate problems.

6. **Extend locks appropriately** - Match lock duration to timeout.

7. **Support cancellation** - Make operations cancellable.

8. **Log timeout details** - Help diagnose slow jobs.

9. **Consider retry with longer timeout** - Some jobs need more time.

10. **Test timeout handling** - Verify cleanup and retry logic.

## Conclusion

Proper timeout handling is essential for building reliable BullMQ systems. By implementing timeouts at multiple levels, supporting cancellation and cleanup, and saving partial progress, you can prevent jobs from hanging indefinitely while preserving as much work as possible. Remember that the goal is not just to timeout, but to timeout gracefully with proper resource cleanup and the ability to resume or retry.
