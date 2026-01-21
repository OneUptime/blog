# How to Use BullMQ Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Rate Limiting, Throttling, Job Queue, API Protection

Description: A comprehensive guide to implementing rate limiting in BullMQ, including global rate limits, per-key rate limiting, dynamic throttling, and strategies for protecting external APIs and managing job throughput.

---

Rate limiting is essential when your job queue interacts with external APIs, databases, or services that have throughput limits. BullMQ provides built-in rate limiting capabilities that help you control job processing speed and prevent overwhelming downstream services. This guide covers all aspects of rate limiting in BullMQ.

## Understanding BullMQ Rate Limiting

BullMQ supports rate limiting at the worker level using a token bucket algorithm. You specify how many jobs can be processed within a time window.

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Worker with rate limiting
const worker = new Worker('api-calls', async (job) => {
  // Process job
  return await callExternalAPI(job.data);
}, {
  connection,
  limiter: {
    max: 100,      // Maximum 100 jobs
    duration: 1000, // Per 1000ms (1 second)
  },
});
```

## Basic Rate Limiting Patterns

### Global Rate Limit

Limit all job processing across all workers:

```typescript
const queue = new Queue('global-limited', { connection });

// All workers share this rate limit
const worker = new Worker('global-limited', async (job) => {
  return await processJob(job.data);
}, {
  connection,
  limiter: {
    max: 50,       // 50 jobs per second
    duration: 1000,
  },
  concurrency: 10, // 10 concurrent jobs, but still limited to 50/sec
});
```

### Per-Second, Per-Minute, Per-Hour Limits

Configure different time windows:

```typescript
// 100 requests per second
const worker1 = new Worker('fast-queue', processor, {
  connection,
  limiter: { max: 100, duration: 1000 },
});

// 1000 requests per minute
const worker2 = new Worker('medium-queue', processor, {
  connection,
  limiter: { max: 1000, duration: 60000 },
});

// 10000 requests per hour
const worker3 = new Worker('slow-queue', processor, {
  connection,
  limiter: { max: 10000, duration: 3600000 },
});
```

## Group-Based Rate Limiting

Rate limit jobs by a specific key (e.g., per user, per API endpoint):

```typescript
interface APIJobData {
  userId: string;
  endpoint: string;
  payload: Record<string, unknown>;
}

const queue = new Queue<APIJobData>('api-calls', { connection });

// Add jobs with group key
await queue.add('call-api', {
  userId: 'user123',
  endpoint: '/api/resource',
  payload: { action: 'create' },
}, {
  // Group by user ID for per-user rate limiting
  group: { id: 'user123' },
});

// Worker with group-based rate limiting
const worker = new Worker<APIJobData>('api-calls', async (job) => {
  return await callAPI(job.data.endpoint, job.data.payload);
}, {
  connection,
  limiter: {
    max: 10,       // 10 requests per second
    duration: 1000,
    groupKey: 'group', // Use the group key for rate limiting
  },
});
```

### Per-User Rate Limiting Example

```typescript
interface UserActionJobData {
  userId: string;
  action: string;
  data: Record<string, unknown>;
}

class UserRateLimitedQueue {
  private queue: Queue<UserActionJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('user-actions', { connection });
  }

  async addUserAction(userId: string, action: string, data: Record<string, unknown>) {
    return this.queue.add(
      'user-action',
      { userId, action, data },
      {
        group: { id: userId }, // Rate limit per user
      }
    );
  }

  createWorker(): Worker<UserActionJobData> {
    return new Worker('user-actions', async (job) => {
      console.log(`Processing action for user ${job.data.userId}`);
      return await processUserAction(job.data);
    }, {
      connection: this.queue.opts.connection,
      limiter: {
        max: 5,          // 5 actions per user per second
        duration: 1000,
        groupKey: 'group',
      },
      concurrency: 50,   // Process many users concurrently
    });
  }
}
```

## Dynamic Rate Limiting

Adjust rate limits based on external factors:

```typescript
class DynamicRateLimitedQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private currentLimit: number = 100;

  constructor(private connection: Redis) {
    this.queue = new Queue('dynamic-limited', { connection });
  }

  async updateRateLimit(newLimit: number) {
    this.currentLimit = newLimit;

    // Close existing worker
    if (this.worker) {
      await this.worker.close();
    }

    // Create new worker with updated limit
    this.worker = new Worker('dynamic-limited', async (job) => {
      return await this.processJob(job);
    }, {
      connection: this.connection,
      limiter: {
        max: this.currentLimit,
        duration: 1000,
      },
    });

    console.log(`Rate limit updated to ${newLimit}/second`);
  }

  private async processJob(job: Job) {
    // Check for rate limit headers and adjust
    const result = await callExternalAPI(job.data);

    if (result.remainingRequests !== undefined) {
      const suggestedLimit = Math.floor(result.remainingRequests / 60);
      if (suggestedLimit < this.currentLimit * 0.8) {
        await this.updateRateLimit(suggestedLimit);
      }
    }

    return result;
  }
}
```

## Combining Rate Limiting with Concurrency

Properly configure both for optimal throughput:

```typescript
// Scenario: API allows 100 requests/second
// Each request takes ~200ms

const worker = new Worker('optimized-queue', async (job) => {
  const startTime = Date.now();
  const result = await callAPI(job.data);
  console.log(`Job took ${Date.now() - startTime}ms`);
  return result;
}, {
  connection,
  limiter: {
    max: 100,      // API limit
    duration: 1000,
  },
  concurrency: 25, // 25 concurrent jobs (100/sec * 0.2sec = 20 needed, add buffer)
});
```

### Concurrency vs Rate Limit Calculation

```typescript
function calculateOptimalConcurrency(
  rateLimit: number,      // requests per second
  avgJobDuration: number  // milliseconds
): number {
  // Concurrent jobs needed = rate limit * job duration in seconds
  const minConcurrency = Math.ceil(rateLimit * (avgJobDuration / 1000));

  // Add 20% buffer for variance
  return Math.ceil(minConcurrency * 1.2);
}

// Example: 50 requests/second, 500ms average duration
const concurrency = calculateOptimalConcurrency(50, 500);
// Result: ceil(50 * 0.5 * 1.2) = 30
```

## Rate Limiting Multiple External APIs

Handle different rate limits for different services:

```typescript
interface MultiAPIJobData {
  service: 'stripe' | 'sendgrid' | 'twilio';
  action: string;
  payload: Record<string, unknown>;
}

class MultiServiceQueue {
  private queues: Map<string, Queue<MultiAPIJobData>> = new Map();
  private workers: Map<string, Worker<MultiAPIJobData>> = new Map();

  private serviceConfig = {
    stripe: { max: 100, duration: 1000 },   // 100/sec
    sendgrid: { max: 50, duration: 1000 },  // 50/sec
    twilio: { max: 10, duration: 1000 },    // 10/sec
  };

  constructor(private connection: Redis) {
    this.initializeQueues();
  }

  private initializeQueues() {
    for (const [service, config] of Object.entries(this.serviceConfig)) {
      const queue = new Queue<MultiAPIJobData>(`api-${service}`, {
        connection: this.connection,
      });

      const worker = new Worker<MultiAPIJobData>(`api-${service}`, async (job) => {
        return await this.callService(job.data.service, job.data);
      }, {
        connection: this.connection,
        limiter: config,
      });

      this.queues.set(service, queue);
      this.workers.set(service, worker);
    }
  }

  async addJob(service: keyof typeof this.serviceConfig, action: string, payload: Record<string, unknown>) {
    const queue = this.queues.get(service);
    if (!queue) {
      throw new Error(`Unknown service: ${service}`);
    }

    return queue.add('api-call', { service, action, payload });
  }

  private async callService(service: string, data: MultiAPIJobData) {
    switch (service) {
      case 'stripe':
        return await callStripeAPI(data.action, data.payload);
      case 'sendgrid':
        return await callSendGridAPI(data.action, data.payload);
      case 'twilio':
        return await callTwilioAPI(data.action, data.payload);
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }
}
```

## Burst Handling

Allow temporary bursts while maintaining overall rate:

```typescript
class BurstCapableQueue {
  private queue: Queue;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  private readonly baseLimit = 100;     // Normal rate
  private readonly burstLimit = 200;    // Burst allowance
  private readonly burstDuration = 5000; // 5 seconds
  private readonly cooldownDuration = 60000; // 1 minute

  constructor(connection: Redis) {
    this.queue = new Queue('burst-queue', { connection });
  }

  async addJob(data: any) {
    const now = Date.now();
    const elapsed = now - this.windowStart;

    // Reset window
    if (elapsed > this.cooldownDuration) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Determine current limit
    const currentLimit = elapsed < this.burstDuration
      ? this.burstLimit
      : this.baseLimit;

    // Check rate
    if (this.requestCount >= currentLimit) {
      // Queue with delay
      const delay = this.cooldownDuration - elapsed;
      return this.queue.add('task', data, { delay });
    }

    this.requestCount++;
    return this.queue.add('task', data);
  }
}
```

## Monitoring Rate Limit Metrics

Track rate limiting effectiveness:

```typescript
class RateLimitMonitor {
  private metrics = {
    totalProcessed: 0,
    rateLimitedCount: 0,
    throughputHistory: [] as { timestamp: number; count: number }[],
  };

  private intervalCount = 0;
  private intervalStart = Date.now();

  constructor(private worker: Worker) {
    this.setupListeners();
    this.startThroughputTracking();
  }

  private setupListeners() {
    this.worker.on('completed', () => {
      this.metrics.totalProcessed++;
      this.intervalCount++;
    });

    this.worker.on('waiting', () => {
      // Job is waiting due to rate limit
      this.metrics.rateLimitedCount++;
    });
  }

  private startThroughputTracking() {
    setInterval(() => {
      this.metrics.throughputHistory.push({
        timestamp: Date.now(),
        count: this.intervalCount,
      });

      // Keep last 60 intervals (1 minute of data)
      if (this.metrics.throughputHistory.length > 60) {
        this.metrics.throughputHistory.shift();
      }

      this.intervalCount = 0;
    }, 1000);
  }

  getMetrics() {
    const history = this.metrics.throughputHistory;
    const avgThroughput = history.length > 0
      ? history.reduce((sum, h) => sum + h.count, 0) / history.length
      : 0;

    return {
      ...this.metrics,
      averageThroughput: avgThroughput,
      currentThroughput: this.intervalCount,
    };
  }
}
```

## Practical Example: Email Sending Service

```typescript
interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  priority: 'high' | 'normal' | 'low';
}

class EmailService {
  private highPriorityQueue: Queue<EmailJobData>;
  private normalQueue: Queue<EmailJobData>;
  private lowPriorityQueue: Queue<EmailJobData>;

  // Email provider limit: 100 emails/second
  private readonly providerLimit = 100;

  constructor(connection: Redis) {
    this.highPriorityQueue = new Queue('email-high', { connection });
    this.normalQueue = new Queue('email-normal', { connection });
    this.lowPriorityQueue = new Queue('email-low', { connection });

    this.createWorkers(connection);
  }

  private createWorkers(connection: Redis) {
    // High priority: 50% of rate limit
    new Worker<EmailJobData>('email-high', this.sendEmail, {
      connection,
      limiter: { max: 50, duration: 1000 },
      concurrency: 20,
    });

    // Normal: 35% of rate limit
    new Worker<EmailJobData>('email-normal', this.sendEmail, {
      connection,
      limiter: { max: 35, duration: 1000 },
      concurrency: 15,
    });

    // Low priority: 15% of rate limit
    new Worker<EmailJobData>('email-low', this.sendEmail, {
      connection,
      limiter: { max: 15, duration: 1000 },
      concurrency: 5,
    });
  }

  private async sendEmail(job: Job<EmailJobData>) {
    // Send email via provider
    console.log(`Sending email to ${job.data.to}`);
    await emailProvider.send(job.data);
    return { sent: true, timestamp: Date.now() };
  }

  async queueEmail(data: EmailJobData) {
    switch (data.priority) {
      case 'high':
        return this.highPriorityQueue.add('send', data);
      case 'low':
        return this.lowPriorityQueue.add('send', data);
      default:
        return this.normalQueue.add('send', data);
    }
  }

  async getStats() {
    const [highCounts, normalCounts, lowCounts] = await Promise.all([
      this.highPriorityQueue.getJobCounts(),
      this.normalQueue.getJobCounts(),
      this.lowPriorityQueue.getJobCounts(),
    ]);

    return { high: highCounts, normal: normalCounts, low: lowCounts };
  }
}
```

## Best Practices

1. **Know your limits** - Understand the rate limits of external services you're calling.

2. **Set conservative limits** - Leave headroom for other clients or services.

3. **Use group-based limiting** - When different entities have different quotas.

4. **Monitor throughput** - Track actual vs. configured rate.

5. **Handle rate limit errors** - External services may still reject requests.

6. **Combine with retries** - Rate-limited retries for rejected requests.

7. **Size concurrency appropriately** - Match concurrency to rate limit and job duration.

8. **Distribute limits fairly** - When using priority queues, allocate rate limits proportionally.

9. **Test under load** - Verify rate limiting works correctly at scale.

10. **Document rate limits** - Make limits visible in configuration.

## Conclusion

Rate limiting in BullMQ is essential for building respectful and reliable integrations with external services. By properly configuring rate limits at the worker level and using group-based limiting for per-entity quotas, you can maximize throughput while staying within acceptable bounds. Remember to monitor your actual throughput and adjust limits based on real-world performance.
