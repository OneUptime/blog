# How to Implement Custom Job IDs in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Job IDs, Idempotency, Queue Management, Best Practices

Description: A comprehensive guide to implementing custom job IDs in BullMQ for idempotent job creation, tracking, deduplication, and building predictable job management systems.

---

Custom job IDs in BullMQ provide control over job identification, enabling idempotent job creation, easier tracking, and deduplication. Instead of letting BullMQ generate random IDs, you can assign meaningful identifiers that reflect your business logic. This guide covers strategies and patterns for effective custom job ID usage.

## Understanding Custom Job IDs

By default, BullMQ generates unique IDs for each job. Custom IDs let you define your own:

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('orders', { connection });

// Add job with custom ID
const job = await queue.add(
  'process-order',
  { orderId: 'ORD-12345', amount: 99.99 },
  { jobId: 'order-ORD-12345' } // Custom job ID
);

console.log(job.id); // 'order-ORD-12345'
```

## Idempotent Job Creation

Custom IDs enable idempotent job creation - adding the same job twice returns the existing job:

```typescript
class IdempotentQueue {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('idempotent', { connection });
  }

  async addIdempotentJob(
    entityId: string,
    data: any
  ): Promise<{ job: Job; isNew: boolean }> {
    const jobId = `entity_${entityId}`;

    // Check if job already exists
    const existingJob = await this.queue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();
      // Return existing if waiting, active, or delayed
      if (['waiting', 'active', 'delayed'].includes(state)) {
        return { job: existingJob, isNew: false };
      }
      // If completed or failed, we might want to remove and recreate
      // depending on business logic
    }

    const job = await this.queue.add('process', data, { jobId });
    return { job, isNew: true };
  }
}

// Usage
const idempotentQueue = new IdempotentQueue(connection);

// First call creates the job
const result1 = await idempotentQueue.addIdempotentJob('user-123', { action: 'sync' });
console.log(result1.isNew); // true

// Second call returns existing job
const result2 = await idempotentQueue.addIdempotentJob('user-123', { action: 'sync' });
console.log(result2.isNew); // false
console.log(result1.job.id === result2.job.id); // true
```

## Job ID Naming Conventions

Establish consistent naming patterns:

```typescript
// Job ID generators for different scenarios

class JobIdGenerator {
  // Entity-based ID
  static forEntity(entityType: string, entityId: string): string {
    return `${entityType}_${entityId}`;
  }

  // Action-based ID (same entity, different actions)
  static forAction(entityType: string, entityId: string, action: string): string {
    return `${entityType}_${entityId}_${action}`;
  }

  // Time-windowed ID (deduplicate within time window)
  static forTimeWindow(
    prefix: string,
    entityId: string,
    windowMinutes: number
  ): string {
    const windowId = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
    return `${prefix}_${entityId}_w${windowId}`;
  }

  // Versioned ID (allow same entity with different versions)
  static forVersion(entityType: string, entityId: string, version: number): string {
    return `${entityType}_${entityId}_v${version}`;
  }

  // Hierarchical ID (parent-child relationships)
  static forHierarchy(parentId: string, childId: string): string {
    return `${parentId}:${childId}`;
  }

  // Hash-based ID (from content)
  static fromContent(data: Record<string, unknown>): string {
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .slice(0, 16);
    return `content_${hash}`;
  }
}

// Usage examples
const orderId = JobIdGenerator.forEntity('order', 'ORD-12345');
// 'order_ORD-12345'

const syncId = JobIdGenerator.forAction('user', 'U-001', 'sync');
// 'user_U-001_sync'

const windowedId = JobIdGenerator.forTimeWindow('notification', 'U-001', 60);
// 'notification_U-001_w29876543'

const versionedId = JobIdGenerator.forVersion('document', 'DOC-001', 3);
// 'document_DOC-001_v3'

const hierarchyId = JobIdGenerator.forHierarchy('batch_B001', 'item_001');
// 'batch_B001:item_001'
```

## Retrieving Jobs by Custom ID

Easily retrieve jobs using their custom IDs:

```typescript
class JobManager {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('managed', { connection });
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return { exists: false };
    }

    const state = await job.getState();

    return {
      exists: true,
      id: job.id,
      name: job.name,
      state,
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      timestamps: {
        created: job.timestamp,
        processed: job.processedOn,
        finished: job.finishedOn,
      },
      attempts: {
        made: job.attemptsMade,
        total: job.opts.attempts,
      },
    };
  }

  async waitForJob(jobId: string, timeoutMs: number = 30000): Promise<any> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const result = await job.waitUntilFinished(
      new QueueEvents(this.queue.name, { connection: this.queue.opts.connection }),
      timeoutMs
    );

    return result;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }

    const state = await job.getState();
    if (['waiting', 'delayed'].includes(state)) {
      await job.remove();
      return true;
    }

    return false;
  }

  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }

    const state = await job.getState();
    if (state === 'failed') {
      await job.retry();
      return true;
    }

    return false;
  }
}
```

## Batch Operations with Custom IDs

Manage multiple related jobs:

```typescript
interface BatchJobConfig {
  batchId: string;
  items: Array<{ id: string; data: any }>;
}

class BatchJobManager {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('batch-jobs', { connection });
  }

  async createBatch(config: BatchJobConfig): Promise<Job[]> {
    const jobs = config.items.map((item, index) => ({
      name: 'batch-item',
      data: {
        batchId: config.batchId,
        itemId: item.id,
        ...item.data,
      },
      opts: {
        jobId: `${config.batchId}:item_${item.id}`,
      },
    }));

    return this.queue.addBulk(jobs);
  }

  async getBatchStatus(batchId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    active: number;
    waiting: number;
    items: any[];
  }> {
    // Get all jobs for this batch
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
    ]);

    const filterBatch = (jobs: Job[]) =>
      jobs.filter(j => j.id?.startsWith(`${batchId}:`));

    const batchWaiting = filterBatch(waiting);
    const batchActive = filterBatch(active);
    const batchCompleted = filterBatch(completed);
    const batchFailed = filterBatch(failed);

    const allBatchJobs = [
      ...batchWaiting.map(j => ({ ...j, state: 'waiting' })),
      ...batchActive.map(j => ({ ...j, state: 'active' })),
      ...batchCompleted.map(j => ({ ...j, state: 'completed' })),
      ...batchFailed.map(j => ({ ...j, state: 'failed' })),
    ];

    return {
      total: allBatchJobs.length,
      completed: batchCompleted.length,
      failed: batchFailed.length,
      active: batchActive.length,
      waiting: batchWaiting.length,
      items: allBatchJobs.map(j => ({
        id: j.id,
        state: j.state,
        data: j.data,
      })),
    };
  }

  async cancelBatch(batchId: string): Promise<number> {
    const [waiting, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getDelayed(),
    ]);

    const toCancel = [...waiting, ...delayed].filter(j =>
      j.id?.startsWith(`${batchId}:`)
    );

    await Promise.all(toCancel.map(j => j.remove()));
    return toCancel.length;
  }
}
```

## Custom IDs with Flows

Use custom IDs in flow hierarchies:

```typescript
import { FlowProducer } from 'bullmq';

class FlowWithCustomIds {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async createOrderFlow(orderId: string, items: string[]) {
    const flowId = `order_flow_${orderId}`;

    // Create item processing jobs with predictable IDs
    const itemChildren = items.map((itemId, index) => ({
      name: 'process-item',
      queueName: 'item-processing',
      data: { orderId, itemId },
      opts: {
        jobId: `${flowId}:item_${itemId}`,
      },
    }));

    return this.flowProducer.add({
      name: 'complete-order',
      queueName: 'order-completion',
      data: { orderId },
      opts: {
        jobId: `${flowId}:complete`,
      },
      children: [
        {
          name: 'validate-order',
          queueName: 'order-validation',
          data: { orderId },
          opts: {
            jobId: `${flowId}:validate`,
          },
          children: itemChildren,
        },
      ],
    });
  }

  async getFlowStatus(orderId: string) {
    const flowId = `order_flow_${orderId}`;
    const queues = {
      items: new Queue('item-processing', { connection }),
      validation: new Queue('order-validation', { connection }),
      completion: new Queue('order-completion', { connection }),
    };

    const jobs = await Promise.all([
      queues.completion.getJob(`${flowId}:complete`),
      queues.validation.getJob(`${flowId}:validate`),
      // Item jobs would need to be fetched based on known item IDs
    ]);

    return jobs.filter(j => j !== null).map(async j => ({
      id: j!.id,
      state: await j!.getState(),
      queue: j!.queueName,
    }));
  }
}
```

## Job ID Registry

Maintain a registry of job IDs for lookup:

```typescript
class JobIdRegistry {
  private redis: Redis;
  private queue: Queue;
  private prefix = 'job_registry:';

  constructor(connection: Redis) {
    this.redis = connection;
    this.queue = new Queue('registered', { connection });
  }

  async registerJob(
    entityType: string,
    entityId: string,
    jobId: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    const key = `${this.prefix}${entityType}:${entityId}`;

    await this.redis.hset(key, {
      jobId,
      registeredAt: Date.now().toString(),
      ...metadata,
    });

    // Set expiry to match job TTL
    await this.redis.expire(key, 86400 * 7); // 7 days
  }

  async getJobIdForEntity(entityType: string, entityId: string): Promise<string | null> {
    const key = `${this.prefix}${entityType}:${entityId}`;
    const data = await this.redis.hget(key, 'jobId');
    return data;
  }

  async getJobForEntity(entityType: string, entityId: string): Promise<Job | null> {
    const jobId = await this.getJobIdForEntity(entityType, entityId);
    if (!jobId) return null;
    return this.queue.getJob(jobId);
  }

  async findJobsByEntityType(entityType: string): Promise<string[]> {
    const pattern = `${this.prefix}${entityType}:*`;
    const keys = await this.redis.keys(pattern);

    const jobIds = await Promise.all(
      keys.map(key => this.redis.hget(key, 'jobId'))
    );

    return jobIds.filter((id): id is string => id !== null);
  }

  async unregister(entityType: string, entityId: string): Promise<void> {
    const key = `${this.prefix}${entityType}:${entityId}`;
    await this.redis.del(key);
  }
}
```

## Best Practices

1. **Use meaningful prefixes** - Include entity type in job IDs for clarity.

2. **Keep IDs deterministic** - Same input should generate same ID.

3. **Avoid special characters** - Stick to alphanumeric, underscores, and hyphens.

4. **Consider ID length** - Very long IDs use more Redis memory.

5. **Document ID patterns** - Make conventions clear to the team.

6. **Handle ID collisions** - Understand what happens with duplicate IDs.

7. **Use IDs for tracking** - Custom IDs make job lookup straightforward.

8. **Version your ID schemes** - Plan for ID format changes.

9. **Clean up old jobs** - IDs don't prevent memory usage.

10. **Test ID generation** - Verify uniqueness and consistency.

## Conclusion

Custom job IDs in BullMQ provide powerful capabilities for building predictable, manageable job systems. By using consistent naming conventions and leveraging IDs for deduplication and tracking, you can build more robust applications. Remember that custom IDs are just identifiers - proper job management still requires attention to job lifecycle, cleanup, and monitoring.
