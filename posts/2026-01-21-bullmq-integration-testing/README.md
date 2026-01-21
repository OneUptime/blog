# How to Integration Test BullMQ Queues and Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Testing, Integration Testing, Redis, Test Containers, End-to-End Testing

Description: A comprehensive guide to integration testing BullMQ queues and workers, including setting up test Redis instances, testing full job lifecycles, handling async operations, and building reliable integration test suites.

---

Integration tests verify that your BullMQ queues, workers, and processors work together correctly with real Redis instances. Unlike unit tests that mock dependencies, integration tests exercise the full stack. This guide covers strategies for effective BullMQ integration testing.

## Setting Up Test Infrastructure

Use a dedicated Redis instance for testing:

```typescript
// test/setup/redis.ts
import { Redis } from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';

export class TestRedis {
  private connection: Redis;
  private queues: Queue[] = [];
  private workers: Worker[] = [];
  private queueEvents: QueueEvents[] = [];

  constructor() {
    this.connection = new Redis({
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
      db: parseInt(process.env.TEST_REDIS_DB || '1'), // Use separate DB for tests
    });
  }

  getConnection(): Redis {
    return this.connection;
  }

  createQueue(name: string, options?: any): Queue {
    const queue = new Queue(name, {
      connection: this.connection,
      ...options,
    });
    this.queues.push(queue);
    return queue;
  }

  createWorker(
    name: string,
    processor: (job: any) => Promise<any>,
    options?: any
  ): Worker {
    const worker = new Worker(name, processor, {
      connection: this.connection,
      ...options,
    });
    this.workers.push(worker);
    return worker;
  }

  createQueueEvents(name: string): QueueEvents {
    const events = new QueueEvents(name, {
      connection: this.connection,
    });
    this.queueEvents.push(events);
    return events;
  }

  async cleanup(): Promise<void> {
    // Close all workers first
    await Promise.all(this.workers.map((w) => w.close()));

    // Close queue events
    await Promise.all(this.queueEvents.map((e) => e.close()));

    // Drain and close queues
    for (const queue of this.queues) {
      await queue.drain();
      await queue.close();
    }

    // Flush test database
    await this.connection.flushdb();
    await this.connection.quit();
  }
}

// Global test setup
let testRedis: TestRedis;

export function getTestRedis(): TestRedis {
  if (!testRedis) {
    testRedis = new TestRedis();
  }
  return testRedis;
}

export async function cleanupTestRedis(): Promise<void> {
  if (testRedis) {
    await testRedis.cleanup();
    testRedis = null as any;
  }
}
```

## Using Test Containers

Use Docker containers for isolated testing:

```typescript
// test/setup/testcontainers.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Redis } from 'ioredis';

export class RedisTestContainer {
  private container: StartedTestContainer | null = null;
  private connection: Redis | null = null;

  async start(): Promise<Redis> {
    this.container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(6379);

    this.connection = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    return this.connection;
  }

  getConnection(): Redis {
    if (!this.connection) {
      throw new Error('Container not started');
    }
    return this.connection;
  }

  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.quit();
    }
    if (this.container) {
      await this.container.stop();
    }
  }
}

// Usage in tests
describe('BullMQ Integration Tests', () => {
  let container: RedisTestContainer;
  let connection: Redis;

  beforeAll(async () => {
    container = new RedisTestContainer();
    connection = await container.start();
  }, 30000); // Container startup can take time

  afterAll(async () => {
    await container.stop();
  });

  // Tests here...
});
```

## Testing Job Lifecycle

Test the full job lifecycle:

```typescript
// test/integration/jobLifecycle.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { getTestRedis, cleanupTestRedis, TestRedis } from '../setup/redis';

describe('Job Lifecycle Integration', () => {
  let testRedis: TestRedis;
  let queue: Queue;
  let worker: Worker;
  let queueEvents: QueueEvents;

  beforeAll(async () => {
    testRedis = getTestRedis();
  });

  afterAll(async () => {
    await cleanupTestRedis();
  });

  beforeEach(async () => {
    // Create fresh queue for each test
    const queueName = `test-queue-${Date.now()}`;
    queue = testRedis.createQueue(queueName);
    queueEvents = testRedis.createQueueEvents(queueName);
  });

  it('should process job and return result', async () => {
    // Create worker
    worker = testRedis.createWorker(queue.name, async (job) => {
      return { processed: true, data: job.data };
    });

    // Add job
    const job = await queue.add('test-job', { value: 42 });

    // Wait for completion
    const result = await job.waitUntilFinished(queueEvents, 5000);

    expect(result).toEqual({
      processed: true,
      data: { value: 42 },
    });

    // Verify job state
    const finishedJob = await queue.getJob(job.id!);
    expect(await finishedJob?.getState()).toBe('completed');
  });

  it('should handle job failure and retry', async () => {
    let attempts = 0;

    worker = testRedis.createWorker(queue.name, async (job) => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return { success: true, attempts };
    });

    const job = await queue.add('retry-job', { test: true }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 100 },
    });

    const result = await job.waitUntilFinished(queueEvents, 10000);

    expect(result).toEqual({ success: true, attempts: 3 });
    expect(attempts).toBe(3);
  });

  it('should fail job after max retries', async () => {
    worker = testRedis.createWorker(queue.name, async () => {
      throw new Error('Always fails');
    });

    const job = await queue.add('failing-job', {}, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 50 },
    });

    // Wait for job to fail
    await expect(job.waitUntilFinished(queueEvents, 5000)).rejects.toThrow();

    const failedJob = await queue.getJob(job.id!);
    expect(await failedJob?.getState()).toBe('failed');
    expect(failedJob?.attemptsMade).toBe(2);
  });

  it('should process delayed job', async () => {
    const startTime = Date.now();

    worker = testRedis.createWorker(queue.name, async (job) => {
      return { processedAt: Date.now() };
    });

    const job = await queue.add('delayed-job', {}, {
      delay: 500,
    });

    const result = await job.waitUntilFinished(queueEvents, 5000);

    expect(result.processedAt - startTime).toBeGreaterThanOrEqual(500);
  });

  it('should update job progress', async () => {
    const progressUpdates: number[] = [];

    queueEvents.on('progress', ({ data }) => {
      progressUpdates.push(data as number);
    });

    worker = testRedis.createWorker(queue.name, async (job) => {
      for (let i = 25; i <= 100; i += 25) {
        await job.updateProgress(i);
        await new Promise((r) => setTimeout(r, 50));
      }
      return { done: true };
    });

    const job = await queue.add('progress-job', {});
    await job.waitUntilFinished(queueEvents, 5000);

    // Wait for events to be processed
    await new Promise((r) => setTimeout(r, 100));

    expect(progressUpdates).toContain(25);
    expect(progressUpdates).toContain(50);
    expect(progressUpdates).toContain(75);
    expect(progressUpdates).toContain(100);
  });
});
```

## Testing Multiple Workers

Test job distribution across workers:

```typescript
describe('Multiple Workers', () => {
  it('should distribute jobs across workers', async () => {
    const processedBy: string[] = [];
    const queueName = `multi-worker-${Date.now()}`;
    const queue = testRedis.createQueue(queueName);

    // Create multiple workers
    const workers = [1, 2, 3].map((id) =>
      testRedis.createWorker(queueName, async (job) => {
        processedBy.push(`worker-${id}`);
        await new Promise((r) => setTimeout(r, 100));
        return { processedBy: `worker-${id}` };
      })
    );

    // Add multiple jobs
    const jobs = await Promise.all(
      Array.from({ length: 9 }, (_, i) =>
        queue.add('job', { index: i })
      )
    );

    // Wait for all jobs to complete
    const queueEvents = testRedis.createQueueEvents(queueName);
    await Promise.all(
      jobs.map((job) => job.waitUntilFinished(queueEvents, 10000))
    );

    // Verify distribution
    const counts = processedBy.reduce((acc, worker) => {
      acc[worker] = (acc[worker] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Each worker should have processed at least 1 job
    expect(Object.keys(counts).length).toBe(3);
  });

  it('should handle worker concurrency', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const queueName = `concurrent-${Date.now()}`;
    const queue = testRedis.createQueue(queueName);

    const worker = testRedis.createWorker(
      queueName,
      async (job) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 200));
        concurrent--;
        return { processed: true };
      },
      { concurrency: 3 }
    );

    // Add jobs
    const jobs = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        queue.add('job', { index: i })
      )
    );

    // Wait for completion
    const queueEvents = testRedis.createQueueEvents(queueName);
    await Promise.all(
      jobs.map((job) => job.waitUntilFinished(queueEvents, 10000))
    );

    expect(maxConcurrent).toBe(3);
  });
});
```

## Testing Flows

Test job flows with dependencies:

```typescript
import { FlowProducer } from 'bullmq';

describe('Flow Integration', () => {
  it('should process flow with parent-child dependencies', async () => {
    const processed: string[] = [];

    const parentQueue = testRedis.createQueue('parent');
    const childQueue = testRedis.createQueue('child');

    // Child worker
    testRedis.createWorker('child', async (job) => {
      processed.push(`child-${job.data.index}`);
      return { childResult: job.data.index };
    });

    // Parent worker - waits for children
    testRedis.createWorker('parent', async (job) => {
      const childValues = await job.getChildrenValues();
      processed.push('parent');
      return {
        parentResult: true,
        childResults: Object.values(childValues),
      };
    });

    // Create flow
    const flowProducer = new FlowProducer({
      connection: testRedis.getConnection(),
    });

    const flow = await flowProducer.add({
      name: 'parent-job',
      queueName: 'parent',
      data: { type: 'aggregate' },
      children: [
        { name: 'child-job', queueName: 'child', data: { index: 1 } },
        { name: 'child-job', queueName: 'child', data: { index: 2 } },
        { name: 'child-job', queueName: 'child', data: { index: 3 } },
      ],
    });

    // Wait for parent to complete
    const parentEvents = testRedis.createQueueEvents('parent');
    const result = await flow.job.waitUntilFinished(parentEvents, 10000);

    expect(result.parentResult).toBe(true);
    expect(result.childResults).toHaveLength(3);

    // Verify order: children before parent
    expect(processed.slice(0, 3)).toEqual(
      expect.arrayContaining(['child-1', 'child-2', 'child-3'])
    );
    expect(processed[3]).toBe('parent');

    await flowProducer.close();
  });
});
```

## Testing Event Handlers

Test queue event handling:

```typescript
describe('Event Handling', () => {
  it('should emit events for job lifecycle', async () => {
    const events: string[] = [];
    const queueName = `events-${Date.now()}`;
    const queue = testRedis.createQueue(queueName);
    const queueEvents = testRedis.createQueueEvents(queueName);

    queueEvents.on('waiting', () => events.push('waiting'));
    queueEvents.on('active', () => events.push('active'));
    queueEvents.on('completed', () => events.push('completed'));

    testRedis.createWorker(queueName, async () => {
      return { done: true };
    });

    const job = await queue.add('event-job', {});
    await job.waitUntilFinished(queueEvents, 5000);

    // Allow events to propagate
    await new Promise((r) => setTimeout(r, 100));

    expect(events).toContain('waiting');
    expect(events).toContain('active');
    expect(events).toContain('completed');

    // Verify order
    const waitingIndex = events.indexOf('waiting');
    const activeIndex = events.indexOf('active');
    const completedIndex = events.indexOf('completed');

    expect(waitingIndex).toBeLessThan(activeIndex);
    expect(activeIndex).toBeLessThan(completedIndex);
  });

  it('should emit failed event', async () => {
    let failedReason: string | undefined;
    const queueName = `fail-events-${Date.now()}`;
    const queue = testRedis.createQueue(queueName);
    const queueEvents = testRedis.createQueueEvents(queueName);

    queueEvents.on('failed', ({ failedReason: reason }) => {
      failedReason = reason;
    });

    testRedis.createWorker(queueName, async () => {
      throw new Error('Test failure');
    });

    const job = await queue.add('fail-job', {}, { attempts: 1 });

    try {
      await job.waitUntilFinished(queueEvents, 5000);
    } catch {
      // Expected
    }

    await new Promise((r) => setTimeout(r, 100));

    expect(failedReason).toBe('Test failure');
  });
});
```

## Testing Rate Limiting

Test rate-limited queues:

```typescript
describe('Rate Limiting', () => {
  it('should respect rate limits', async () => {
    const timestamps: number[] = [];
    const queueName = `rate-limit-${Date.now()}`;

    const queue = testRedis.createQueue(queueName, {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    testRedis.createWorker(
      queueName,
      async () => {
        timestamps.push(Date.now());
        return { done: true };
      },
      {
        limiter: {
          max: 2,
          duration: 1000,
        },
      }
    );

    // Add 6 jobs
    const jobs = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        queue.add('rate-job', { index: i })
      )
    );

    // Wait for all to complete
    const queueEvents = testRedis.createQueueEvents(queueName);
    await Promise.all(
      jobs.map((job) => job.waitUntilFinished(queueEvents, 10000))
    );

    // Verify rate limiting
    // With 2 jobs per 1000ms, 6 jobs should take at least 2000ms
    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    expect(duration).toBeGreaterThanOrEqual(2000);
  });
});
```

## Test Utilities

Create helper utilities for integration tests:

```typescript
// test/helpers/waitForJob.ts
import { Job, QueueEvents } from 'bullmq';

export async function waitForJobState(
  job: Job,
  targetState: string,
  timeoutMs: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const state = await job.getState();
    if (state === targetState) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(`Job did not reach state ${targetState} within ${timeoutMs}ms`);
}

export async function waitForQueueEmpty(
  queue: Queue,
  timeoutMs: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
    const total = counts.waiting + counts.active + counts.delayed;

    if (total === 0) {
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(`Queue did not empty within ${timeoutMs}ms`);
}

export function collectEvents(
  queueEvents: QueueEvents,
  eventTypes: string[]
): { events: any[]; stop: () => void } {
  const events: any[] = [];
  const handlers: Map<string, (data: any) => void> = new Map();

  for (const type of eventTypes) {
    const handler = (data: any) => {
      events.push({ type, data, timestamp: Date.now() });
    };
    handlers.set(type, handler);
    queueEvents.on(type as any, handler);
  }

  return {
    events,
    stop: () => {
      for (const [type, handler] of handlers) {
        queueEvents.off(type as any, handler);
      }
    },
  };
}
```

## Best Practices

1. **Use isolated Redis** - Separate database or container for tests.

2. **Clean up after tests** - Remove all jobs and close connections.

3. **Use unique queue names** - Prevent test interference.

4. **Set appropriate timeouts** - Allow for async operations.

5. **Test full lifecycles** - Verify jobs from creation to completion.

6. **Test error scenarios** - Verify retry and failure handling.

7. **Use test containers** - Ensure consistent Redis version.

8. **Collect events for verification** - Track job lifecycle events.

9. **Test concurrent scenarios** - Verify worker distribution.

10. **Keep tests independent** - Each test should be self-contained.

## Conclusion

Integration testing BullMQ requires a real Redis instance and careful management of test resources. By using dedicated test infrastructure, testing full job lifecycles, and verifying event handling, you can ensure your queue system works correctly in production. Remember to clean up resources and use unique queue names to prevent test interference.
