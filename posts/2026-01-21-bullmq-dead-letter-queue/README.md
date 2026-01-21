# How to Implement Dead Letter Queues in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Dead Letter Queue, DLQ, Error Handling, Failed Jobs, Job Recovery

Description: A comprehensive guide to implementing dead letter queues in BullMQ for handling permanently failed jobs, including DLQ patterns, job inspection, retry strategies, and building robust failure handling systems.

---

Dead letter queues (DLQ) provide a safety net for jobs that fail repeatedly or cannot be processed. Instead of losing these jobs or letting them retry forever, they are moved to a separate queue for inspection, analysis, and potential recovery. This guide covers implementing effective DLQ patterns in BullMQ.

## Understanding Dead Letter Queues

BullMQ does not have built-in DLQ support, but implementing one is straightforward:

```typescript
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Main processing queue
const mainQueue = new Queue('orders', { connection });

// Dead letter queue for failed jobs
const dlq = new Queue('orders-dlq', { connection });

// Move failed jobs to DLQ after max retries
const mainWorker = new Worker('orders', async (job) => {
  // Process job
  return processOrder(job.data);
}, {
  connection,
  settings: {
    backoffStrategy: (attemptsMade) => {
      return Math.min(1000 * Math.pow(2, attemptsMade), 30000);
    },
  },
});

// Listen for final failures
mainWorker.on('failed', async (job, error) => {
  if (!job) return;

  const maxAttempts = job.opts.attempts || 1;

  if (job.attemptsMade >= maxAttempts) {
    // Move to DLQ
    await dlq.add('failed-order', {
      originalJob: {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
      },
      failure: {
        reason: error.message,
        stacktrace: job.stacktrace,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
      },
    });

    console.log(`Job ${job.id} moved to DLQ after ${job.attemptsMade} attempts`);
  }
});
```

## DLQ Manager Class

Create a comprehensive DLQ manager:

```typescript
interface DLQJobData {
  originalJob: {
    id: string;
    name: string;
    data: any;
    opts: any;
    queueName: string;
  };
  failure: {
    reason: string;
    stacktrace: string[];
    attemptsMade: number;
    failedAt: string;
    errorType?: string;
  };
  metadata?: {
    movedAt: string;
    sourceWorker?: string;
    tags?: string[];
  };
}

class DeadLetterQueueManager {
  private mainQueue: Queue;
  private dlq: Queue;
  private dlqEvents: QueueEvents;

  constructor(
    mainQueueName: string,
    connection: Redis,
    private options: {
      dlqSuffix?: string;
      maxDLQSize?: number;
      retentionDays?: number;
    } = {}
  ) {
    this.mainQueue = new Queue(mainQueueName, { connection });
    this.dlq = new Queue(
      `${mainQueueName}${options.dlqSuffix || '-dlq'}`,
      { connection }
    );
    this.dlqEvents = new QueueEvents(
      `${mainQueueName}${options.dlqSuffix || '-dlq'}`,
      { connection }
    );
  }

  async moveToDeadLetter(
    job: Job,
    error: Error,
    additionalMetadata?: Record<string, any>
  ): Promise<Job> {
    const dlqData: DLQJobData = {
      originalJob: {
        id: job.id || 'unknown',
        name: job.name,
        data: job.data,
        opts: job.opts,
        queueName: job.queueName,
      },
      failure: {
        reason: error.message,
        stacktrace: job.stacktrace || [],
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
        errorType: error.name,
      },
      metadata: {
        movedAt: new Date().toISOString(),
        ...additionalMetadata,
      },
    };

    const dlqJob = await this.dlq.add(
      `dlq_${job.name}`,
      dlqData,
      {
        jobId: `dlq_${job.id}_${Date.now()}`,
        removeOnComplete: false, // Keep for inspection
        removeOnFail: false,
      }
    );

    // Optionally remove from main queue's failed set
    await job.remove();

    return dlqJob;
  }

  async getDLQJobs(
    start: number = 0,
    end: number = 99
  ): Promise<Array<{ job: Job; data: DLQJobData }>> {
    const jobs = await this.dlq.getJobs(['waiting', 'completed', 'failed'], start, end);

    return jobs.map((job) => ({
      job,
      data: job.data as DLQJobData,
    }));
  }

  async retryFromDLQ(dlqJobId: string): Promise<Job | null> {
    const dlqJob = await this.dlq.getJob(dlqJobId);
    if (!dlqJob) {
      throw new Error(`DLQ job ${dlqJobId} not found`);
    }

    const dlqData = dlqJob.data as DLQJobData;

    // Re-add to main queue
    const newJob = await this.mainQueue.add(
      dlqData.originalJob.name,
      dlqData.originalJob.data,
      {
        ...dlqData.originalJob.opts,
        jobId: undefined, // Generate new ID
      }
    );

    // Mark DLQ job as processed
    await dlqJob.remove();

    console.log(`Retried DLQ job ${dlqJobId} as ${newJob.id}`);
    return newJob;
  }

  async retryAllFromDLQ(filter?: (data: DLQJobData) => boolean): Promise<number> {
    const dlqJobs = await this.getDLQJobs(0, -1);
    let retried = 0;

    for (const { job, data } of dlqJobs) {
      if (filter && !filter(data)) {
        continue;
      }

      try {
        await this.retryFromDLQ(job.id!);
        retried++;
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    return retried;
  }

  async purgeDLQ(olderThanDays?: number): Promise<number> {
    const jobs = await this.getDLQJobs(0, -1);
    let purged = 0;

    const cutoffDate = olderThanDays
      ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
      : null;

    for (const { job, data } of jobs) {
      const movedAt = new Date(data.metadata?.movedAt || data.failure.failedAt);

      if (!cutoffDate || movedAt < cutoffDate) {
        await job.remove();
        purged++;
      }
    }

    return purged;
  }

  async getDLQStats(): Promise<{
    total: number;
    byErrorType: Record<string, number>;
    byJobName: Record<string, number>;
    oldestJob?: Date;
  }> {
    const jobs = await this.getDLQJobs(0, -1);

    const stats = {
      total: jobs.length,
      byErrorType: {} as Record<string, number>,
      byJobName: {} as Record<string, number>,
      oldestJob: undefined as Date | undefined,
    };

    for (const { data } of jobs) {
      // Count by error type
      const errorType = data.failure.errorType || 'Unknown';
      stats.byErrorType[errorType] = (stats.byErrorType[errorType] || 0) + 1;

      // Count by job name
      const jobName = data.originalJob.name;
      stats.byJobName[jobName] = (stats.byJobName[jobName] || 0) + 1;

      // Track oldest
      const failedAt = new Date(data.failure.failedAt);
      if (!stats.oldestJob || failedAt < stats.oldestJob) {
        stats.oldestJob = failedAt;
      }
    }

    return stats;
  }

  async close(): Promise<void> {
    await this.mainQueue.close();
    await this.dlq.close();
    await this.dlqEvents.close();
  }
}
```

## Conditional DLQ Routing

Route jobs to different DLQs based on failure type:

```typescript
interface DLQRouter {
  match: (error: Error, job: Job) => boolean;
  dlqName: string;
  transform?: (job: Job, error: Error) => any;
}

class ConditionalDLQManager {
  private queues: Map<string, Queue> = new Map();
  private routers: DLQRouter[] = [];

  constructor(
    private connection: Redis,
    private defaultDLQName: string
  ) {
    this.queues.set(defaultDLQName, new Queue(defaultDLQName, { connection }));
  }

  addRouter(router: DLQRouter): void {
    if (!this.queues.has(router.dlqName)) {
      this.queues.set(router.dlqName, new Queue(router.dlqName, { connection: this.connection }));
    }
    this.routers.push(router);
  }

  async routeToDeadLetter(job: Job, error: Error): Promise<Job> {
    // Find matching router
    const router = this.routers.find((r) => r.match(error, job));
    const dlqName = router?.dlqName || this.defaultDLQName;
    const dlq = this.queues.get(dlqName)!;

    const data = router?.transform
      ? router.transform(job, error)
      : this.defaultTransform(job, error);

    return dlq.add(`dlq_${job.name}`, data, {
      jobId: `dlq_${job.id}_${Date.now()}`,
    });
  }

  private defaultTransform(job: Job, error: Error): DLQJobData {
    return {
      originalJob: {
        id: job.id || 'unknown',
        name: job.name,
        data: job.data,
        opts: job.opts,
        queueName: job.queueName,
      },
      failure: {
        reason: error.message,
        stacktrace: job.stacktrace || [],
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
        errorType: error.name,
      },
    };
  }
}

// Usage
const conditionalDLQ = new ConditionalDLQManager(connection, 'default-dlq');

// Route validation errors to a separate DLQ
conditionalDLQ.addRouter({
  match: (error) => error.name === 'ValidationError',
  dlqName: 'validation-errors-dlq',
  transform: (job, error) => ({
    originalJob: {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      queueName: job.queueName,
    },
    failure: {
      reason: error.message,
      stacktrace: [],
      attemptsMade: job.attemptsMade,
      failedAt: new Date().toISOString(),
      errorType: 'ValidationError',
    },
    validationDetails: (error as any).details,
  }),
});

// Route timeout errors
conditionalDLQ.addRouter({
  match: (error) => error.message.includes('timeout'),
  dlqName: 'timeout-errors-dlq',
});

// Route external service errors
conditionalDLQ.addRouter({
  match: (error) => error.name === 'ServiceUnavailableError',
  dlqName: 'service-errors-dlq',
});
```

## DLQ Worker for Processing

Create a worker to process DLQ jobs:

```typescript
type DLQAction = 'retry' | 'discard' | 'archive' | 'manual';

interface DLQProcessingResult {
  action: DLQAction;
  reason?: string;
  newJobId?: string;
}

class DLQProcessor {
  private dlqWorker: Worker;
  private mainQueue: Queue;
  private archiveQueue: Queue;

  constructor(
    dlqName: string,
    mainQueueName: string,
    connection: Redis,
    private analyzer: (data: DLQJobData) => Promise<DLQAction>
  ) {
    this.mainQueue = new Queue(mainQueueName, { connection });
    this.archiveQueue = new Queue(`${dlqName}-archive`, { connection });

    this.dlqWorker = new Worker(
      dlqName,
      async (job) => this.processJob(job),
      {
        connection,
        concurrency: 1, // Process one at a time for safety
      }
    );
  }

  private async processJob(job: Job<DLQJobData>): Promise<DLQProcessingResult> {
    const data = job.data;
    const action = await this.analyzer(data);

    switch (action) {
      case 'retry':
        return this.retryJob(data);

      case 'discard':
        return { action: 'discard', reason: 'Discarded by analyzer' };

      case 'archive':
        return this.archiveJob(data);

      case 'manual':
        // Move back to waiting state for manual review
        throw new Error('MANUAL_REVIEW_REQUIRED');

      default:
        return { action: 'discard', reason: 'Unknown action' };
    }
  }

  private async retryJob(data: DLQJobData): Promise<DLQProcessingResult> {
    const newJob = await this.mainQueue.add(
      data.originalJob.name,
      data.originalJob.data,
      {
        ...data.originalJob.opts,
        jobId: undefined,
        attempts: 3, // Reset attempts
      }
    );

    return {
      action: 'retry',
      newJobId: newJob.id,
    };
  }

  private async archiveJob(data: DLQJobData): Promise<DLQProcessingResult> {
    await this.archiveQueue.add('archived', {
      ...data,
      archivedAt: new Date().toISOString(),
    });

    return { action: 'archive' };
  }
}

// Example analyzer function
async function analyzeDLQJob(data: DLQJobData): Promise<DLQAction> {
  const errorType = data.failure.errorType;
  const attemptsMade = data.failure.attemptsMade;
  const failedAt = new Date(data.failure.failedAt);

  // Auto-retry transient errors after some time
  if (errorType === 'ServiceUnavailableError') {
    const hoursSinceFailed = (Date.now() - failedAt.getTime()) / 3600000;
    if (hoursSinceFailed > 1) {
      return 'retry'; // Retry after 1 hour
    }
    return 'manual'; // Wait longer
  }

  // Discard validation errors - they won't succeed on retry
  if (errorType === 'ValidationError') {
    return 'discard';
  }

  // Archive old jobs
  const daysSinceFailed = (Date.now() - failedAt.getTime()) / 86400000;
  if (daysSinceFailed > 7) {
    return 'archive';
  }

  // Everything else needs manual review
  return 'manual';
}

const dlqProcessor = new DLQProcessor(
  'orders-dlq',
  'orders',
  connection,
  analyzeDLQJob
);
```

## DLQ API Endpoints

Expose DLQ management via API:

```typescript
import express from 'express';

function createDLQRouter(dlqManager: DeadLetterQueueManager): express.Router {
  const router = express.Router();

  // Get DLQ statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = await dlqManager.getDLQStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // List DLQ jobs
  router.get('/jobs', async (req, res) => {
    try {
      const start = parseInt(req.query.start as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;

      const jobs = await dlqManager.getDLQJobs(start, start + limit - 1);

      res.json({
        jobs: jobs.map(({ job, data }) => ({
          id: job.id,
          originalJobId: data.originalJob.id,
          originalJobName: data.originalJob.name,
          errorType: data.failure.errorType,
          failedAt: data.failure.failedAt,
          attemptsMade: data.failure.attemptsMade,
        })),
        pagination: { start, limit },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get specific DLQ job details
  router.get('/jobs/:jobId', async (req, res) => {
    try {
      const jobs = await dlqManager.getDLQJobs(0, -1);
      const found = jobs.find(({ job }) => job.id === req.params.jobId);

      if (!found) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({
        id: found.job.id,
        data: found.data,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Retry a specific job
  router.post('/jobs/:jobId/retry', async (req, res) => {
    try {
      const newJob = await dlqManager.retryFromDLQ(req.params.jobId);
      res.json({
        success: true,
        newJobId: newJob?.id,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Retry all jobs (with optional filter)
  router.post('/retry-all', async (req, res) => {
    try {
      const { errorType, jobName } = req.body;

      const filter = errorType || jobName
        ? (data: DLQJobData) => {
            if (errorType && data.failure.errorType !== errorType) return false;
            if (jobName && data.originalJob.name !== jobName) return false;
            return true;
          }
        : undefined;

      const retried = await dlqManager.retryAllFromDLQ(filter);
      res.json({ success: true, retriedCount: retried });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Purge old jobs
  router.post('/purge', async (req, res) => {
    try {
      const { olderThanDays } = req.body;
      const purged = await dlqManager.purgeDLQ(olderThanDays);
      res.json({ success: true, purgedCount: purged });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}

// Mount the router
const dlqManager = new DeadLetterQueueManager('orders', connection);
app.use('/api/dlq', createDLQRouter(dlqManager));
```

## DLQ Alerting

Alert when DLQ grows too large:

```typescript
class DLQMonitor {
  private lastCount: number = 0;

  constructor(
    private dlqManager: DeadLetterQueueManager,
    private thresholds: {
      warning: number;
      critical: number;
    },
    private onAlert: (level: 'warning' | 'critical', count: number) => void
  ) {}

  async check(): Promise<void> {
    const stats = await this.dlqManager.getDLQStats();
    const currentCount = stats.total;

    if (currentCount >= this.thresholds.critical) {
      this.onAlert('critical', currentCount);
    } else if (currentCount >= this.thresholds.warning) {
      this.onAlert('warning', currentCount);
    }

    this.lastCount = currentCount;
  }

  startMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => this.check(), intervalMs);
  }
}

// Usage
const dlqMonitor = new DLQMonitor(
  dlqManager,
  { warning: 100, critical: 500 },
  (level, count) => {
    console.log(`[${level.toUpperCase()}] DLQ has ${count} jobs`);
    // Send to alerting system
  }
);

dlqMonitor.startMonitoring(60000);
```

## Best Practices

1. **Use separate queues** - Keep DLQ separate from main processing.

2. **Preserve original data** - Store all original job information.

3. **Include failure context** - Store error details and stack traces.

4. **Implement retention policies** - Clean up old DLQ jobs.

5. **Monitor DLQ size** - Alert when DLQ grows unexpectedly.

6. **Analyze patterns** - Look for common failure reasons.

7. **Automate safe retries** - Auto-retry transient failures.

8. **Provide manual review tools** - Build UI for inspecting DLQ.

9. **Test DLQ processing** - Verify jobs can be retried successfully.

10. **Document DLQ procedures** - Create runbooks for handling DLQ.

## Conclusion

Dead letter queues are essential for building reliable BullMQ applications. By capturing failed jobs, preserving their context, and providing tools for analysis and recovery, you ensure no job is silently lost. Implement conditional routing, automated analysis, and monitoring to make your DLQ system robust and maintainable.
