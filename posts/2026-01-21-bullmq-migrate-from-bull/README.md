# How to Migrate from Bull to BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Bull, Migration, Node.js, Redis, Job Queue, TypeScript, Upgrade

Description: A comprehensive migration guide for upgrading from Bull to BullMQ, covering API differences, breaking changes, and step-by-step migration strategies for a smooth transition.

---

Migrating from Bull to BullMQ brings significant improvements in performance, TypeScript support, and modern features. This guide provides a complete roadmap for a successful migration with minimal downtime.

## Understanding the Key Differences

Before migrating, understand what has changed between Bull and BullMQ:

```typescript
// Bull (old way)
import Queue from 'bull';
import { Job, DoneCallback } from 'bull';

const queue = new Queue('my-queue', 'redis://localhost:6379');

// Process function with callback
queue.process(async (job: Job, done: DoneCallback) => {
  try {
    const result = await processJob(job.data);
    done(null, result);
  } catch (error) {
    done(error as Error);
  }
});

// Add job
queue.add({ data: 'value' }, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
});

// BullMQ (new way)
import { Queue, Worker, Job } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

const queue = new Queue('my-queue', { connection });

// Worker is separate from Queue
const worker = new Worker('my-queue', async (job: Job) => {
  const result = await processJob(job.data);
  return result; // Just return the result
}, { connection });

// Add job
await queue.add('jobName', { data: 'value' }, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
});
```

## Migration Strategy Overview

### Option 1: Big Bang Migration

Complete migration in one deployment:

```typescript
// migration-plan.ts
interface MigrationPlan {
  phase: 'preparation' | 'execution' | 'verification' | 'cleanup';
  steps: string[];
  rollbackPlan: string[];
}

const bigBangMigration: MigrationPlan = {
  phase: 'execution',
  steps: [
    '1. Stop all Bull workers',
    '2. Wait for in-progress jobs to complete',
    '3. Deploy BullMQ code',
    '4. Start BullMQ workers',
    '5. Verify job processing',
  ],
  rollbackPlan: [
    '1. Stop BullMQ workers',
    '2. Revert to Bull code',
    '3. Start Bull workers',
  ],
};

// Check if queues are empty before migration
import Queue from 'bull';

async function checkQueueState(queueName: string): Promise<{
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
}> {
  const queue = new Queue(queueName, process.env.REDIS_URL);

  const [waiting, active, delayed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
  ]);

  await queue.close();

  return { waiting, active, delayed, failed };
}

async function isQueueReadyForMigration(queueName: string): Promise<boolean> {
  const state = await checkQueueState(queueName);

  console.log(`Queue ${queueName} state:`, state);

  // Only migrate when no active jobs
  return state.active === 0;
}
```

### Option 2: Gradual Migration (Recommended)

Run both systems in parallel:

```typescript
// dual-queue-processor.ts
import OldQueue from 'bull';
import { Queue as NewQueue, Worker } from 'bullmq';

interface DualQueueConfig {
  queueName: string;
  redisUrl: string;
  useBullMQ: boolean; // Feature flag
}

class DualQueueProcessor {
  private oldQueue: OldQueue.Queue | null = null;
  private newQueue: NewQueue | null = null;
  private newWorker: Worker | null = null;
  private config: DualQueueConfig;

  constructor(config: DualQueueConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.config.useBullMQ) {
      // New BullMQ setup
      const connection = { url: this.config.redisUrl };

      this.newQueue = new NewQueue(this.config.queueName, { connection });

      this.newWorker = new Worker(
        this.config.queueName,
        async (job) => this.processJob(job.data),
        { connection }
      );

      console.log('Using BullMQ');
    } else {
      // Old Bull setup
      this.oldQueue = new OldQueue(
        this.config.queueName,
        this.config.redisUrl
      );

      this.oldQueue.process(async (job) => {
        return this.processJob(job.data);
      });

      console.log('Using Bull');
    }
  }

  async addJob(data: any, options?: any): Promise<string> {
    if (this.config.useBullMQ && this.newQueue) {
      const job = await this.newQueue.add('default', data, options);
      return job.id!;
    } else if (this.oldQueue) {
      const job = await this.oldQueue.add(data, options);
      return job.id.toString();
    }

    throw new Error('No queue initialized');
  }

  private async processJob(data: any): Promise<any> {
    // Your existing processing logic
    return { processed: true, data };
  }

  async close(): Promise<void> {
    await this.oldQueue?.close();
    await this.newQueue?.close();
    await this.newWorker?.close();
  }
}

// Usage with feature flag
const processor = new DualQueueProcessor({
  queueName: 'my-queue',
  redisUrl: process.env.REDIS_URL!,
  useBullMQ: process.env.USE_BULLMQ === 'true',
});

await processor.initialize();
```

## API Migration Reference

### Queue Creation

```typescript
// Bull
import Queue from 'bull';

const bullQueue = new Queue('my-queue', {
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
  },
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
  },
});

// BullMQ equivalent
import { Queue, DefaultJobOptions } from 'bullmq';

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  removeOnComplete: true,
};

const bullmqQueue = new Queue('my-queue', {
  connection: {
    host: 'localhost',
    port: 6379,
    password: 'secret',
  },
  defaultJobOptions,
});
```

### Job Processing

```typescript
// Bull - processor on queue
import Queue, { Job, DoneCallback } from 'bull';

const queue = new Queue('tasks');

// Callback style (deprecated in Bull too)
queue.process((job: Job, done: DoneCallback) => {
  doWork(job.data)
    .then((result) => done(null, result))
    .catch((err) => done(err));
});

// Promise style
queue.process(async (job: Job) => {
  const result = await doWork(job.data);
  return result;
});

// Named processors
queue.process('type1', async (job) => processType1(job.data));
queue.process('type2', async (job) => processType2(job.data));

// BullMQ - separate Worker class
import { Queue, Worker, Job } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };
const queue = new Queue('tasks', { connection });

// Single processor
const worker = new Worker('tasks', async (job: Job) => {
  const result = await doWork(job.data);
  return result;
}, { connection });

// Named processors using job name
const namedWorker = new Worker('tasks', async (job: Job) => {
  switch (job.name) {
    case 'type1':
      return processType1(job.data);
    case 'type2':
      return processType2(job.data);
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}, { connection });
```

### Event Handling

```typescript
// Bull events
import Queue from 'bull';

const bullQueue = new Queue('events');

bullQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

bullQueue.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed with error:`, err.message);
});

bullQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress:`, progress);
});

bullQueue.on('stalled', (job) => {
  console.log(`Job ${job.id} stalled`);
});

// BullMQ events - use QueueEvents class
import { Queue, Worker, QueueEvents } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };
const queue = new Queue('events', { connection });
const worker = new Worker('events', processor, { connection });
const queueEvents = new QueueEvents('events', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed with result:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`Job ${jobId} failed with error:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress:`, data);
});

// Worker events (different from queue events)
worker.on('completed', (job, result) => {
  // Local worker completion
  console.log(`Worker processed job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.log(`Worker failed job ${job?.id}:`, err.message);
});

worker.on('stalled', (jobId) => {
  console.log(`Job ${jobId} stalled`);
});
```

### Job Options Migration

```typescript
// Bull job options
interface BullJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number | { type: string; delay: number };
  lifo?: boolean;
  timeout?: number;
  jobId?: string;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  stackTraceLimit?: number;
  repeat?: {
    cron?: string;
    tz?: string;
    startDate?: Date | string | number;
    endDate?: Date | string | number;
    limit?: number;
    every?: number;
    count?: number;
  };
}

// BullMQ job options
interface BullMQJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  lifo?: boolean;
  // timeout is now in worker options, not job options
  jobId?: string;
  removeOnComplete?: boolean | number | { count: number; age: number };
  removeOnFail?: boolean | number | { count: number; age: number };
  stackTraceLimit?: number;
  repeat?: {
    pattern?: string; // renamed from cron
    tz?: string;
    startDate?: Date | string | number;
    endDate?: Date | string | number;
    limit?: number;
    every?: number;
    count?: number;
    immediately?: boolean; // new option
  };
  // New options in BullMQ
  parent?: {
    id: string;
    queue: string;
  };
}

// Migration helper
function migrateJobOptions(bullOptions: any): any {
  const bullmqOptions: any = { ...bullOptions };

  // Handle cron -> pattern rename
  if (bullOptions.repeat?.cron) {
    bullmqOptions.repeat = {
      ...bullOptions.repeat,
      pattern: bullOptions.repeat.cron,
    };
    delete bullmqOptions.repeat.cron;
  }

  // Handle backoff number to object
  if (typeof bullOptions.backoff === 'number') {
    bullmqOptions.backoff = {
      type: 'fixed',
      delay: bullOptions.backoff,
    };
  }

  // Remove timeout (handled differently in BullMQ)
  delete bullmqOptions.timeout;

  return bullmqOptions;
}
```

### Concurrency Configuration

```typescript
// Bull - concurrency in process()
import Queue from 'bull';

const queue = new Queue('concurrent');

// Global concurrency
queue.process(5, async (job) => {
  return processJob(job.data);
});

// Per-processor concurrency
queue.process('heavy', 2, async (job) => {
  return processHeavyJob(job.data);
});

// BullMQ - concurrency in Worker constructor
import { Worker } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Global concurrency
const worker = new Worker('concurrent', async (job) => {
  return processJob(job.data);
}, {
  connection,
  concurrency: 5,
});

// For different concurrencies, use separate workers
const heavyWorker = new Worker('concurrent', async (job) => {
  if (job.name === 'heavy') {
    return processHeavyJob(job.data);
  }
  throw new Error('Not a heavy job');
}, {
  connection,
  concurrency: 2,
});
```

## Data Migration

### Migrating Existing Jobs

```typescript
// migrate-jobs.ts
import OldQueue from 'bull';
import { Queue as NewQueue } from 'bullmq';

interface MigrationResult {
  migrated: number;
  failed: number;
  errors: Error[];
}

async function migrateJobs(
  queueName: string,
  redisUrl: string
): Promise<MigrationResult> {
  const oldQueue = new OldQueue(queueName, redisUrl);
  const newQueue = new NewQueue(`${queueName}-v2`, {
    connection: { url: redisUrl },
  });

  const result: MigrationResult = {
    migrated: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Migrate waiting jobs
    const waitingJobs = await oldQueue.getWaiting();
    console.log(`Found ${waitingJobs.length} waiting jobs`);

    for (const job of waitingJobs) {
      try {
        const options = migrateJobOptions(job.opts);
        await newQueue.add(job.name || 'default', job.data, {
          ...options,
          jobId: `migrated-${job.id}`,
        });

        // Remove from old queue after successful migration
        await job.remove();
        result.migrated++;
      } catch (error) {
        result.failed++;
        result.errors.push(error as Error);
      }
    }

    // Migrate delayed jobs
    const delayedJobs = await oldQueue.getDelayed();
    console.log(`Found ${delayedJobs.length} delayed jobs`);

    for (const job of delayedJobs) {
      try {
        const options = migrateJobOptions(job.opts);
        const delay = job.opts.delay || 0;

        await newQueue.add(job.name || 'default', job.data, {
          ...options,
          delay,
          jobId: `migrated-${job.id}`,
        });

        await job.remove();
        result.migrated++;
      } catch (error) {
        result.failed++;
        result.errors.push(error as Error);
      }
    }

    // Migrate failed jobs for retry
    const failedJobs = await oldQueue.getFailed();
    console.log(`Found ${failedJobs.length} failed jobs`);

    for (const job of failedJobs) {
      try {
        const options = migrateJobOptions(job.opts);

        // Add to new queue for retry
        await newQueue.add(job.name || 'default', job.data, {
          ...options,
          jobId: `migrated-failed-${job.id}`,
        });

        await job.remove();
        result.migrated++;
      } catch (error) {
        result.failed++;
        result.errors.push(error as Error);
      }
    }

  } finally {
    await oldQueue.close();
    await newQueue.close();
  }

  return result;
}

// Run migration
async function runMigration(): Promise<void> {
  const queues = ['orders', 'emails', 'notifications'];

  for (const queueName of queues) {
    console.log(`Migrating queue: ${queueName}`);

    const result = await migrateJobs(
      queueName,
      process.env.REDIS_URL!
    );

    console.log(`Queue ${queueName} migration complete:`, {
      migrated: result.migrated,
      failed: result.failed,
    });

    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }
  }
}
```

### Migrating Repeatable Jobs

```typescript
// migrate-repeatables.ts
import OldQueue from 'bull';
import { Queue as NewQueue } from 'bullmq';

interface RepeatableJobConfig {
  name: string;
  data: any;
  cron?: string;
  every?: number;
  tz?: string;
}

async function migrateRepeatableJobs(
  queueName: string,
  redisUrl: string
): Promise<void> {
  const oldQueue = new OldQueue(queueName, redisUrl);
  const newQueue = new NewQueue(queueName, {
    connection: { url: redisUrl },
  });

  try {
    // Get repeatable jobs from Bull
    const repeatableJobs = await oldQueue.getRepeatableJobs();

    console.log(`Found ${repeatableJobs.length} repeatable jobs`);

    for (const repeatJob of repeatableJobs) {
      // Remove from old queue
      await oldQueue.removeRepeatableByKey(repeatJob.key);

      // Add to new queue with BullMQ syntax
      const repeatOptions: any = {};

      if (repeatJob.cron) {
        repeatOptions.pattern = repeatJob.cron; // cron -> pattern
      }

      if (repeatJob.every) {
        repeatOptions.every = repeatJob.every;
      }

      if (repeatJob.tz) {
        repeatOptions.tz = repeatJob.tz;
      }

      await newQueue.add(
        repeatJob.name || 'default',
        {}, // Repeatable jobs usually don't have data
        { repeat: repeatOptions }
      );

      console.log(`Migrated repeatable job: ${repeatJob.name}`);
    }

  } finally {
    await oldQueue.close();
    await newQueue.close();
  }
}
```

## Code Refactoring Patterns

### Service Layer Migration

```typescript
// Before: Bull-based service
// queue.service.ts (Bull)
import Queue, { Job, JobOptions } from 'bull';

export class QueueService {
  private queue: Queue.Queue;

  constructor(queueName: string) {
    this.queue = new Queue(queueName, process.env.REDIS_URL!);
  }

  async addJob(data: any, options?: JobOptions): Promise<Job> {
    return this.queue.add(data, options);
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.queue.getJob(jobId);
  }

  registerProcessor(processor: (job: Job) => Promise<any>): void {
    this.queue.process(processor);
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

// After: BullMQ-based service
// queue.service.ts (BullMQ)
import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';

interface QueueServiceConfig {
  queueName: string;
  connection: {
    host: string;
    port: number;
    password?: string;
  };
  concurrency?: number;
}

export class QueueService {
  private queue: Queue;
  private worker: Worker | null = null;
  private queueEvents: QueueEvents;
  private config: QueueServiceConfig;

  constructor(config: QueueServiceConfig) {
    this.config = config;

    this.queue = new Queue(config.queueName, {
      connection: config.connection,
    });

    this.queueEvents = new QueueEvents(config.queueName, {
      connection: config.connection,
    });
  }

  async addJob(
    name: string,
    data: any,
    options?: JobsOptions
  ): Promise<Job> {
    return this.queue.add(name, data, options);
  }

  async getJob(jobId: string): Promise<Job | undefined> {
    return this.queue.getJob(jobId);
  }

  registerProcessor(
    processor: (job: Job) => Promise<any>
  ): void {
    this.worker = new Worker(
      this.config.queueName,
      processor,
      {
        connection: this.config.connection,
        concurrency: this.config.concurrency || 1,
      }
    );

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }

  onCompleted(
    callback: (jobId: string, result: any) => void
  ): void {
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      callback(jobId, returnvalue);
    });
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queueEvents.close();
    await this.queue.close();
  }
}
```

### Repository Pattern Migration

```typescript
// job-repository.ts - Abstraction layer
import { Job } from 'bullmq';

export interface JobRepository {
  create(name: string, data: any, options?: any): Promise<string>;
  find(id: string): Promise<Job | null>;
  findByStatus(status: string): Promise<Job[]>;
  remove(id: string): Promise<void>;
}

// bull-job-repository.ts
import Queue from 'bull';
import { JobRepository } from './job-repository';

export class BullJobRepository implements JobRepository {
  constructor(private queue: Queue.Queue) {}

  async create(name: string, data: any, options?: any): Promise<string> {
    const job = await this.queue.add(data, { ...options, jobId: name });
    return job.id.toString();
  }

  async find(id: string): Promise<any | null> {
    return this.queue.getJob(id);
  }

  async findByStatus(status: string): Promise<any[]> {
    switch (status) {
      case 'waiting': return this.queue.getWaiting();
      case 'active': return this.queue.getActive();
      case 'completed': return this.queue.getCompleted();
      case 'failed': return this.queue.getFailed();
      default: return [];
    }
  }

  async remove(id: string): Promise<void> {
    const job = await this.queue.getJob(id);
    await job?.remove();
  }
}

// bullmq-job-repository.ts
import { Queue, Job } from 'bullmq';
import { JobRepository } from './job-repository';

export class BullMQJobRepository implements JobRepository {
  constructor(private queue: Queue) {}

  async create(name: string, data: any, options?: any): Promise<string> {
    const job = await this.queue.add(name, data, options);
    return job.id!;
  }

  async find(id: string): Promise<Job | null> {
    const job = await this.queue.getJob(id);
    return job || null;
  }

  async findByStatus(status: string): Promise<Job[]> {
    switch (status) {
      case 'waiting': return this.queue.getWaiting();
      case 'active': return this.queue.getActive();
      case 'completed': return this.queue.getCompleted();
      case 'failed': return this.queue.getFailed();
      default: return [];
    }
  }

  async remove(id: string): Promise<void> {
    const job = await this.queue.getJob(id);
    await job?.remove();
  }
}
```

## Testing During Migration

```typescript
// migration-tests.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import OldQueue from 'bull';
import { Queue, Worker } from 'bullmq';

describe('Migration Compatibility Tests', () => {
  const redisUrl = 'redis://localhost:6379';
  let oldQueue: OldQueue.Queue;
  let newQueue: Queue;
  let newWorker: Worker;

  beforeAll(async () => {
    oldQueue = new OldQueue('test-migration', redisUrl);
    newQueue = new Queue('test-migration-v2', {
      connection: { url: redisUrl },
    });
  });

  afterAll(async () => {
    await oldQueue.empty();
    await oldQueue.close();
    await newQueue.obliterate({ force: true });
    await newWorker?.close();
    await newQueue.close();
  });

  it('should migrate job data correctly', async () => {
    const testData = {
      userId: 123,
      action: 'process',
      metadata: { key: 'value' },
    };

    // Add to old queue
    const oldJob = await oldQueue.add(testData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    // Migrate to new queue
    const newJob = await newQueue.add('default', testData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    expect(newJob.data).toEqual(oldJob.data);
    expect(newJob.opts.attempts).toBe(oldJob.opts.attempts);
  });

  it('should process migrated jobs correctly', async () => {
    const processedJobs: any[] = [];

    newWorker = new Worker(
      'test-migration-v2',
      async (job) => {
        processedJobs.push(job.data);
        return { success: true };
      },
      { connection: { url: redisUrl } }
    );

    await newQueue.add('test', { id: 1 });
    await newQueue.add('test', { id: 2 });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(processedJobs).toHaveLength(2);
  });

  it('should handle repeatable job migration', async () => {
    // Add repeatable to old queue
    await oldQueue.add({}, {
      repeat: { cron: '0 * * * *' },
    });

    // Add equivalent to new queue
    await newQueue.add('hourly', {}, {
      repeat: { pattern: '0 * * * *' },
    });

    const repeatableJobs = await newQueue.getRepeatableJobs();
    expect(repeatableJobs).toHaveLength(1);
    expect(repeatableJobs[0].pattern).toBe('0 * * * *');
  });
});
```

## Rollback Strategy

```typescript
// rollback-manager.ts
import OldQueue from 'bull';
import { Queue as NewQueue, Worker } from 'bullmq';

interface RollbackConfig {
  queueName: string;
  redisUrl: string;
}

export class RollbackManager {
  private oldQueue: OldQueue.Queue | null = null;
  private newQueue: NewQueue | null = null;
  private newWorker: Worker | null = null;
  private config: RollbackConfig;
  private isRolledBack = false;

  constructor(config: RollbackConfig) {
    this.config = config;
  }

  async initializeBullMQ(
    processor: (job: any) => Promise<any>
  ): Promise<void> {
    this.newQueue = new NewQueue(this.config.queueName, {
      connection: { url: this.config.redisUrl },
    });

    this.newWorker = new Worker(
      this.config.queueName,
      processor,
      { connection: { url: this.config.redisUrl } }
    );

    // Monitor for critical failures
    this.newWorker.on('error', (err) => {
      console.error('Worker error:', err);
      this.triggerRollback();
    });
  }

  async triggerRollback(): Promise<void> {
    if (this.isRolledBack) return;

    console.warn('Triggering rollback to Bull...');
    this.isRolledBack = true;

    // Stop BullMQ worker
    await this.newWorker?.pause();

    // Get pending jobs from BullMQ
    const waitingJobs = await this.newQueue?.getWaiting() || [];
    const delayedJobs = await this.newQueue?.getDelayed() || [];

    // Initialize Bull queue
    this.oldQueue = new OldQueue(
      `${this.config.queueName}-rollback`,
      this.config.redisUrl
    );

    // Migrate jobs back to Bull
    for (const job of [...waitingJobs, ...delayedJobs]) {
      await this.oldQueue.add(job.data, {
        attempts: job.opts.attempts,
        delay: job.opts.delay,
        priority: job.opts.priority,
      });
    }

    // Close BullMQ
    await this.newWorker?.close();
    await this.newQueue?.close();

    console.log('Rollback complete. Jobs migrated to Bull queue.');
  }

  async close(): Promise<void> {
    await this.oldQueue?.close();
    await this.newWorker?.close();
    await this.newQueue?.close();
  }
}
```

## Post-Migration Cleanup

```typescript
// cleanup.ts
import { Redis } from 'ioredis';

async function cleanupOldBullKeys(
  redisUrl: string,
  queueName: string
): Promise<void> {
  const redis = new Redis(redisUrl);

  try {
    // Bull key patterns
    const patterns = [
      `bull:${queueName}:*`,
      `bull:${queueName}`,
    ];

    for (const pattern of patterns) {
      let cursor = '0';

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          console.log(`Deleting ${keys.length} keys matching ${pattern}`);
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    }

    console.log(`Cleanup complete for queue: ${queueName}`);
  } finally {
    await redis.quit();
  }
}

// Run cleanup after successful migration
async function postMigrationCleanup(): Promise<void> {
  const queues = ['orders', 'emails', 'notifications'];

  for (const queueName of queues) {
    await cleanupOldBullKeys(process.env.REDIS_URL!, queueName);
  }
}
```

## Checklist for Migration

Use this checklist to ensure a complete migration:

```typescript
interface MigrationChecklist {
  preparation: {
    reviewed_api_differences: boolean;
    created_migration_plan: boolean;
    set_up_dual_running: boolean;
    written_migration_tests: boolean;
    documented_rollback_plan: boolean;
  };
  code_changes: {
    updated_queue_initialization: boolean;
    separated_workers_from_queues: boolean;
    updated_event_handlers: boolean;
    migrated_job_options: boolean;
    updated_concurrency_config: boolean;
  };
  data_migration: {
    migrated_waiting_jobs: boolean;
    migrated_delayed_jobs: boolean;
    migrated_repeatable_jobs: boolean;
    handled_failed_jobs: boolean;
  };
  verification: {
    tested_job_processing: boolean;
    verified_event_handling: boolean;
    checked_metrics_and_monitoring: boolean;
    validated_error_handling: boolean;
  };
  cleanup: {
    removed_old_bull_code: boolean;
    cleaned_redis_keys: boolean;
    updated_dependencies: boolean;
    updated_documentation: boolean;
  };
}
```

Migrating from Bull to BullMQ requires careful planning but brings substantial benefits including better TypeScript support, improved performance, and access to modern features like job flows. Follow this guide step by step, test thoroughly, and keep a rollback plan ready for a smooth transition.
