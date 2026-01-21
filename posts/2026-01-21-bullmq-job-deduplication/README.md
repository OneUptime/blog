# How to Implement Job Deduplication in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Deduplication, Idempotency, Job Queue, Best Practices

Description: A comprehensive guide to implementing job deduplication in BullMQ to prevent duplicate job execution, including custom job IDs, deduplication strategies, and patterns for ensuring exactly-once job processing.

---

Job deduplication ensures that the same job isn't processed multiple times, which is critical for operations that should happen exactly once - like sending emails, charging payments, or updating records. This guide covers various strategies for implementing deduplication in BullMQ.

## Understanding Job Deduplication

BullMQ provides built-in deduplication through custom job IDs. When you add a job with an ID that already exists, the duplicate is rejected:

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('orders', { connection });

// First job added successfully
await queue.add('process-order', { orderId: '12345' }, {
  jobId: 'order-12345',
});

// Second job with same ID is rejected (returns existing job)
const duplicateJob = await queue.add('process-order', { orderId: '12345' }, {
  jobId: 'order-12345',
});
// duplicateJob.id === 'order-12345' (same as original)
```

## Custom Job ID Strategies

### Entity-Based IDs

Use the entity identifier as the job ID:

```typescript
interface OrderJobData {
  orderId: string;
  action: 'process' | 'cancel' | 'refund';
  amount: number;
}

class OrderQueue {
  private queue: Queue<OrderJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('order-processing', { connection });
  }

  async addOrderJob(data: OrderJobData) {
    // Use orderId as job ID to prevent duplicate processing
    return this.queue.add('order-job', data, {
      jobId: `order_${data.orderId}`,
    });
  }
}

// Usage
const orderQueue = new OrderQueue(connection);

// First call creates the job
await orderQueue.addOrderJob({ orderId: 'ORD-001', action: 'process', amount: 99.99 });

// Second call returns existing job (no duplicate)
await orderQueue.addOrderJob({ orderId: 'ORD-001', action: 'process', amount: 99.99 });
```

### Action-Based IDs

Include the action in the ID when the same entity can have multiple job types:

```typescript
async addOrderJob(data: OrderJobData) {
  // Prevents duplicate of same action on same order
  return this.queue.add('order-job', data, {
    jobId: `order_${data.orderId}_${data.action}`,
  });
}

// Different actions on same order are allowed
await orderQueue.addOrderJob({ orderId: 'ORD-001', action: 'process', amount: 99.99 });
await orderQueue.addOrderJob({ orderId: 'ORD-001', action: 'cancel', amount: 99.99 });
```

### Time-Window IDs

Allow the same job after a time window:

```typescript
class RateLimitedQueue {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('rate-limited', { connection });
  }

  async addWithTimeWindow(data: any, windowMinutes: number = 60) {
    const windowStart = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
    const jobId = `${data.entityId}_window_${windowStart}`;

    return this.queue.add('job', data, { jobId });
  }
}

// Same entity, same hour = deduplicated
await queue.addWithTimeWindow({ entityId: 'user-123', action: 'sync' }, 60);
await queue.addWithTimeWindow({ entityId: 'user-123', action: 'sync' }, 60);

// After the hour passes, a new job can be created
```

## Content-Based Deduplication

Generate job IDs from job content:

```typescript
import crypto from 'crypto';

class ContentDeduplicatedQueue {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('content-dedupe', { connection });
  }

  async addJob(name: string, data: Record<string, unknown>) {
    // Generate hash from job content
    const contentHash = this.generateContentHash(name, data);

    return this.queue.add(name, data, {
      jobId: `content_${contentHash}`,
    });
  }

  private generateContentHash(name: string, data: Record<string, unknown>): string {
    const content = JSON.stringify({ name, data });
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}

// Identical content = same job ID = deduplicated
await queue.addJob('process', { userId: '123', action: 'sync' });
await queue.addJob('process', { userId: '123', action: 'sync' }); // Deduplicated

// Different content = different job
await queue.addJob('process', { userId: '123', action: 'update' }); // New job
```

## Deduplication with TTL

Allow reprocessing after job completes and TTL expires:

```typescript
class TTLDeduplicationQueue {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('ttl-dedupe', {
      connection,
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });
  }

  async addJob(entityId: string, data: any) {
    const jobId = `entity_${entityId}`;

    // Check if job exists and get its state
    const existingJob = await this.queue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();

      // If job is waiting or active, don't add duplicate
      if (state === 'waiting' || state === 'active' || state === 'delayed') {
        console.log(`Job ${jobId} already in queue (${state})`);
        return existingJob;
      }

      // If completed, check when it finished
      if (state === 'completed' && existingJob.finishedOn) {
        const hoursSinceCompletion = (Date.now() - existingJob.finishedOn) / 3600000;
        if (hoursSinceCompletion < 1) {
          console.log(`Job ${jobId} completed recently, skipping`);
          return existingJob;
        }
        // Job completed more than 1 hour ago, allow new job
        await existingJob.remove();
      }
    }

    return this.queue.add('process', data, { jobId });
  }
}
```

## Idempotency Key Pattern

Use external idempotency keys for deduplication:

```typescript
class IdempotentJobQueue {
  private queue: Queue;
  private redis: Redis;
  private idempotencyTTL: number = 86400; // 24 hours

  constructor(connection: Redis) {
    this.queue = new Queue('idempotent', { connection });
    this.redis = connection;
  }

  async addIdempotentJob(
    idempotencyKey: string,
    name: string,
    data: any
  ): Promise<{ job: Job | null; deduplicated: boolean }> {
    const lockKey = `idempotency:${idempotencyKey}`;

    // Try to set idempotency key (only succeeds if not exists)
    const wasSet = await this.redis.set(
      lockKey,
      'pending',
      'EX',
      this.idempotencyTTL,
      'NX'
    );

    if (!wasSet) {
      // Key already exists - this is a duplicate
      const existingJobId = await this.redis.get(`${lockKey}:jobId`);
      if (existingJobId) {
        const job = await this.queue.getJob(existingJobId);
        return { job, deduplicated: true };
      }
      return { job: null, deduplicated: true };
    }

    // Create the job
    const job = await this.queue.add(name, data, {
      jobId: `idem_${idempotencyKey}`,
    });

    // Store job ID with idempotency key
    await this.redis.set(
      `${lockKey}:jobId`,
      job.id!,
      'EX',
      this.idempotencyTTL
    );

    // Update status to 'created'
    await this.redis.set(lockKey, 'created', 'EX', this.idempotencyTTL);

    return { job, deduplicated: false };
  }

  async getIdempotencyStatus(idempotencyKey: string) {
    const status = await this.redis.get(`idempotency:${idempotencyKey}`);
    const jobId = await this.redis.get(`idempotency:${idempotencyKey}:jobId`);

    if (!status) {
      return { exists: false };
    }

    const job = jobId ? await this.queue.getJob(jobId) : null;
    const jobState = job ? await job.getState() : null;

    return {
      exists: true,
      status,
      jobId,
      jobState,
      result: job?.returnvalue,
    };
  }
}

// Usage with API request
app.post('/api/payments', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header required' });
  }

  const { job, deduplicated } = await jobQueue.addIdempotentJob(
    idempotencyKey,
    'process-payment',
    req.body
  );

  if (deduplicated) {
    const status = await jobQueue.getIdempotencyStatus(idempotencyKey);
    return res.status(200).json({
      message: 'Request already processed',
      ...status,
    });
  }

  res.status(202).json({
    message: 'Payment processing started',
    jobId: job?.id,
  });
});
```

## Deduplication in High-Throughput Scenarios

Handle deduplication efficiently at scale:

```typescript
class HighThroughputDeduplicator {
  private queue: Queue;
  private redis: Redis;
  private bloomFilter: Set<string> = new Set(); // Use Redis Bloom in production
  private pendingJobs: Map<string, Promise<Job>> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('high-throughput', { connection });
    this.redis = connection;
  }

  async addJob(entityId: string, data: any): Promise<Job | null> {
    const jobId = `job_${entityId}`;

    // Quick check with local bloom filter
    if (this.bloomFilter.has(jobId)) {
      // Might be duplicate - do full check
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (['waiting', 'active', 'delayed'].includes(state)) {
          return existing;
        }
      }
    }

    // Check for pending add operations (prevent race conditions)
    if (this.pendingJobs.has(jobId)) {
      return this.pendingJobs.get(jobId)!;
    }

    // Add job with lock
    const addPromise = this.addWithLock(jobId, data);
    this.pendingJobs.set(jobId, addPromise);

    try {
      const job = await addPromise;
      this.bloomFilter.add(jobId);
      return job;
    } finally {
      this.pendingJobs.delete(jobId);
    }
  }

  private async addWithLock(jobId: string, data: any): Promise<Job> {
    // Use Redis lock for distributed deduplication
    const lockKey = `lock:${jobId}`;
    const lockValue = `${process.pid}_${Date.now()}`;

    const acquired = await this.redis.set(lockKey, lockValue, 'EX', 10, 'NX');

    if (!acquired) {
      // Another process is adding this job
      await new Promise(resolve => setTimeout(resolve, 100));
      const existing = await this.queue.getJob(jobId);
      if (existing) return existing;
    }

    try {
      return await this.queue.add('process', data, { jobId });
    } finally {
      // Release lock
      const currentValue = await this.redis.get(lockKey);
      if (currentValue === lockValue) {
        await this.redis.del(lockKey);
      }
    }
  }
}
```

## Deduplication with Bulk Operations

Handle deduplication when adding multiple jobs:

```typescript
class BulkDeduplicator {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('bulk', { connection });
  }

  async addBulkDeduplicated(
    jobs: Array<{ id: string; name: string; data: any }>
  ): Promise<{ added: Job[]; duplicates: string[] }> {
    // Get existing jobs
    const existingJobs = await Promise.all(
      jobs.map(j => this.queue.getJob(j.id))
    );

    const existingIds = new Set(
      existingJobs.filter(j => j !== null).map(j => j!.id)
    );

    // Filter out duplicates
    const newJobs = jobs.filter(j => !existingIds.has(j.id));
    const duplicates = jobs.filter(j => existingIds.has(j.id)).map(j => j.id);

    // Add non-duplicate jobs
    const addedJobs = await this.queue.addBulk(
      newJobs.map(j => ({
        name: j.name,
        data: j.data,
        opts: { jobId: j.id },
      }))
    );

    return {
      added: addedJobs,
      duplicates,
    };
  }
}
```

## Best Practices

1. **Design meaningful job IDs** - IDs should uniquely identify the logical operation.

2. **Consider time windows** - Some operations should be deduplicated only within a time period.

3. **Handle job completion** - Decide if completed jobs should block new ones.

4. **Use atomic operations** - Prevent race conditions in distributed systems.

5. **Set appropriate TTLs** - Clean up old deduplication records.

6. **Log deduplication events** - Track when duplicates are rejected.

7. **Test edge cases** - Verify behavior with concurrent requests.

8. **Document ID conventions** - Make job ID patterns clear to the team.

9. **Monitor duplicate rates** - High rates may indicate client issues.

10. **Consider idempotent processing** - Make jobs themselves idempotent as backup.

## Conclusion

Job deduplication is essential for building reliable queue-based systems. BullMQ's custom job ID feature provides a simple but powerful foundation for deduplication. By choosing the right ID strategy - whether entity-based, content-based, or time-windowed - you can prevent duplicate processing while allowing legitimate retries. Combine this with idempotent job processing for defense in depth.
