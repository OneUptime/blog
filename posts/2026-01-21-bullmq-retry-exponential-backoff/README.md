# How to Implement Job Retries with Exponential Backoff in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Retry Logic, Exponential Backoff, Error Handling, Resilience

Description: A comprehensive guide to implementing robust job retry strategies with BullMQ, including exponential backoff, custom retry logic, dead letter queues, and best practices for handling transient failures.

---

Retry logic is crucial for building resilient job processing systems. Transient failures like network timeouts, rate limits, and temporary service unavailability are common in distributed systems. BullMQ provides powerful built-in retry mechanisms with exponential backoff. This guide covers how to implement effective retry strategies.

## Understanding BullMQ Retry Options

BullMQ supports several retry configurations:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('retryable-jobs', { connection });

// Basic retry configuration
await queue.add('task', { data: 'example' }, {
  attempts: 5,           // Maximum number of attempts
  backoff: {
    type: 'exponential', // or 'fixed'
    delay: 1000,         // Initial delay in ms
  },
});
```

## Backoff Strategies

### Exponential Backoff

Delay increases exponentially with each retry:

```typescript
// Exponential backoff
// Attempt 1: 1000ms
// Attempt 2: 2000ms
// Attempt 3: 4000ms
// Attempt 4: 8000ms
// Attempt 5: 16000ms

await queue.add('api-call', { url: 'https://api.example.com' }, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1 second base delay
  },
});
```

### Fixed Backoff

Same delay between each retry:

```typescript
// Fixed backoff
// Every retry waits 5000ms

await queue.add('email-send', { to: 'user@example.com' }, {
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000, // 5 seconds between retries
  },
});
```

### Custom Backoff Strategy

Implement custom backoff logic:

```typescript
// Custom backoff using a function
const queue = new Queue('custom-backoff', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'custom',
    },
  },
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      // Custom strategy: exponential with jitter
      const baseDelay = 1000;
      const maxDelay = 60000;
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attemptsMade - 1),
        maxDelay
      );
      // Add random jitter (0-25% of delay)
      const jitter = Math.random() * 0.25 * exponentialDelay;
      return Math.floor(exponentialDelay + jitter);
    },
  },
});
```

## Queue-Level Default Retry Configuration

Set default retry options for all jobs in a queue:

```typescript
const queue = new Queue('api-calls', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 3600,
    },
    removeOnFail: {
      count: 500,
      age: 24 * 3600,
    },
  },
});

// All jobs inherit these defaults
await queue.add('fetch-data', { endpoint: '/users' });
await queue.add('fetch-data', { endpoint: '/orders' });

// Override defaults for specific jobs
await queue.add('critical-fetch', { endpoint: '/payments' }, {
  attempts: 10, // More retries for critical operations
});
```

## Handling Retries in Workers

Access retry information in your worker:

```typescript
const worker = new Worker('api-calls', async (job: Job) => {
  const { attemptsMade, attemptsStarted } = job;

  console.log(`Processing job ${job.id}, attempt ${attemptsMade + 1}/${job.opts.attempts}`);

  try {
    const result = await callExternalAPI(job.data);
    return result;
  } catch (error) {
    // Log which attempt failed
    console.error(`Attempt ${attemptsMade + 1} failed:`, error.message);

    // Check if this is the last attempt
    if (attemptsMade + 1 >= (job.opts.attempts || 1)) {
      console.error(`Job ${job.id} exhausted all retries`);
      // Perform cleanup or notification
      await notifyFailure(job);
    }

    throw error; // Re-throw to trigger retry
  }
}, { connection });
```

## Conditional Retry Logic

Decide whether to retry based on error type:

```typescript
class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

const worker = new Worker('smart-retry', async (job: Job) => {
  try {
    return await processJob(job.data);
  } catch (error) {
    // Categorize errors
    if (isTransientError(error)) {
      // Will be retried
      throw new RetryableError(error.message);
    } else if (isValidationError(error)) {
      // No point retrying - mark as failed immediately
      throw new NonRetryableError(error.message);
    }
    throw error;
  }
}, {
  connection,
});

function isTransientError(error: Error): boolean {
  const transientPatterns = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'rate limit',
    '503',
    '429',
    'temporarily unavailable',
  ];
  return transientPatterns.some(pattern =>
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

function isValidationError(error: Error): boolean {
  return error.message.includes('validation') ||
         error.message.includes('invalid') ||
         error.message.includes('400');
}
```

## Moving Failed Jobs to Dead Letter Queue

Handle permanently failed jobs:

```typescript
interface JobData {
  taskId: string;
  payload: Record<string, unknown>;
}

class RetryableQueue {
  private mainQueue: Queue<JobData>;
  private deadLetterQueue: Queue<JobData & { originalError: string; failedAt: string }>;

  constructor(connection: Redis) {
    this.mainQueue = new Queue('main-tasks', { connection });
    this.deadLetterQueue = new Queue('dead-letter', { connection });
  }

  async addJob(data: JobData) {
    return this.mainQueue.add('task', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  createWorker() {
    const worker = new Worker<JobData>('main-tasks', async (job) => {
      return await this.processJob(job);
    }, {
      connection: this.mainQueue.opts.connection,
    });

    // Handle final failure
    worker.on('failed', async (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
        // Move to dead letter queue
        await this.deadLetterQueue.add('failed-task', {
          ...job.data,
          originalError: error.message,
          failedAt: new Date().toISOString(),
        });
        console.log(`Job ${job.id} moved to dead letter queue`);
      }
    });

    return worker;
  }

  private async processJob(job: Job<JobData>) {
    // Processing logic
    return { success: true };
  }

  // Retry jobs from dead letter queue
  async retryFromDeadLetter(count: number = 10) {
    const jobs = await this.deadLetterQueue.getWaiting(0, count);

    for (const job of jobs) {
      const { originalError, failedAt, ...originalData } = job.data;

      // Add back to main queue
      await this.mainQueue.add('task', originalData as JobData, {
        attempts: 3, // Fewer retries for reprocessed jobs
        backoff: { type: 'exponential', delay: 2000 },
      });

      // Remove from dead letter queue
      await job.remove();
    }

    return jobs.length;
  }
}
```

## Implementing Rate Limit Handling

Handle API rate limits with smart retries:

```typescript
interface RateLimitedJobData {
  apiEndpoint: string;
  payload: Record<string, unknown>;
}

class RateLimitAwareQueue {
  private queue: Queue<RateLimitedJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('rate-limited-api', {
      connection,
      defaultJobOptions: {
        attempts: 10,
        backoff: { type: 'custom' },
      },
      settings: {
        backoffStrategy: (attemptsMade: number, type: string, error: Error) => {
          // Check for rate limit response
          const rateLimitReset = this.extractRateLimitReset(error);
          if (rateLimitReset) {
            // Wait until rate limit resets
            return rateLimitReset;
          }

          // Default exponential backoff
          return Math.min(1000 * Math.pow(2, attemptsMade), 60000);
        },
      },
    });
  }

  private extractRateLimitReset(error: Error): number | null {
    // Parse rate limit headers from error
    // This depends on how your HTTP client reports errors
    const match = error.message.match(/retry-after[:\s]+(\d+)/i);
    if (match) {
      return parseInt(match[1]) * 1000; // Convert to milliseconds
    }
    return null;
  }

  async addAPICall(data: RateLimitedJobData) {
    return this.queue.add('api-call', data);
  }
}

// Worker with rate limit awareness
const worker = new Worker<RateLimitedJobData>('rate-limited-api', async (job) => {
  try {
    const response = await fetch(job.data.apiEndpoint, {
      method: 'POST',
      body: JSON.stringify(job.data.payload),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited. Retry-After: ${retryAfter}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed (attempt ${job.attemptsMade + 1}):`, error);
    throw error;
  }
}, { connection });
```

## Progressive Backoff with Circuit Breaker

Combine retry logic with circuit breaker pattern:

```typescript
class CircuitBreaker {
  private failures: number = 0;
  private lastFailure: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState() {
    return this.state;
  }
}

// Using circuit breaker in worker
const circuitBreakers = new Map<string, CircuitBreaker>();

const worker = new Worker('protected-api', async (job) => {
  const service = job.data.service;

  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, new CircuitBreaker());
  }

  const breaker = circuitBreakers.get(service)!;

  return breaker.execute(async () => {
    return await callService(job.data);
  });
}, {
  connection,
});

// Check circuit breaker state in failed handler
worker.on('failed', (job, error) => {
  if (error.message === 'Circuit breaker is open') {
    console.log(`Circuit breaker open for ${job?.data.service}, job will be retried later`);
  }
});
```

## Monitoring Retry Metrics

Track retry statistics:

```typescript
class RetryMetrics {
  private queue: Queue;
  private metrics: {
    totalRetries: number;
    retriesByAttempt: Record<number, number>;
    finalFailures: number;
    successAfterRetry: number;
  } = {
    totalRetries: 0,
    retriesByAttempt: {},
    finalFailures: 0,
    successAfterRetry: 0,
  };

  constructor(queue: Queue, worker: Worker) {
    this.queue = queue;
    this.setupListeners(worker);
  }

  private setupListeners(worker: Worker) {
    worker.on('completed', (job) => {
      if (job.attemptsMade > 0) {
        this.metrics.successAfterRetry++;
      }
    });

    worker.on('failed', (job, error) => {
      if (job) {
        this.metrics.totalRetries++;
        const attempt = job.attemptsMade;
        this.metrics.retriesByAttempt[attempt] =
          (this.metrics.retriesByAttempt[attempt] || 0) + 1;

        if (attempt >= (job.opts.attempts || 1)) {
          this.metrics.finalFailures++;
        }
      }
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      retrySuccessRate:
        this.metrics.successAfterRetry /
        (this.metrics.successAfterRetry + this.metrics.finalFailures) || 0,
    };
  }

  async getQueueRetryStats() {
    const [completed, failed] = await Promise.all([
      this.queue.getCompleted(0, 1000),
      this.queue.getFailed(0, 1000),
    ]);

    const retryDistribution = [...completed, ...failed].reduce(
      (acc, job) => {
        const attempts = job.attemptsMade;
        acc[attempts] = (acc[attempts] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    return retryDistribution;
  }
}
```

## Complete Retry System Example

```typescript
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

interface WebhookJobData {
  webhookId: string;
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface WebhookJobResult {
  statusCode: number;
  responseTime: number;
  attempt: number;
}

class RobustWebhookQueue {
  private queue: Queue<WebhookJobData, WebhookJobResult>;
  private deadLetterQueue: Queue;
  private worker: Worker<WebhookJobData, WebhookJobResult>;

  constructor(private connection: Redis) {
    this.queue = new Queue('webhooks', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: false, // Keep failed jobs for analysis
      },
    });

    this.deadLetterQueue = new Queue('webhook-dlq', { connection });
    this.worker = this.createWorker();
    this.setupEventHandlers();
  }

  private createWorker(): Worker<WebhookJobData, WebhookJobResult> {
    return new Worker(
      'webhooks',
      async (job: Job<WebhookJobData, WebhookJobResult>) => {
        const startTime = Date.now();

        console.log(
          `Delivering webhook ${job.data.webhookId}, attempt ${job.attemptsMade + 1}`
        );

        const response = await fetch(job.data.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...job.data.headers,
          },
          body: JSON.stringify(job.data.payload),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Webhook delivery failed: ${response.status} - ${errorText}`
          );
        }

        return {
          statusCode: response.status,
          responseTime: Date.now() - startTime,
          attempt: job.attemptsMade + 1,
        };
      },
      {
        connection: this.connection,
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 1000,
        },
      }
    );
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job, result) => {
      if (job.attemptsMade > 0) {
        console.log(
          `Webhook ${job.data.webhookId} succeeded after ${result.attempt} attempts`
        );
      }
    });

    this.worker.on('failed', async (job, error) => {
      if (!job) return;

      const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 1);

      if (isLastAttempt) {
        console.error(
          `Webhook ${job.data.webhookId} permanently failed after ${job.attemptsMade} attempts`
        );

        // Move to dead letter queue
        await this.deadLetterQueue.add('failed-webhook', {
          ...job.data,
          error: error.message,
          failedAt: new Date().toISOString(),
          attempts: job.attemptsMade,
        });
      } else {
        console.warn(
          `Webhook ${job.data.webhookId} failed attempt ${job.attemptsMade}, will retry`
        );
      }
    });
  }

  async deliverWebhook(data: WebhookJobData) {
    return this.queue.add('deliver', data, {
      jobId: `webhook_${data.webhookId}`,
    });
  }

  async getFailedWebhooks() {
    return this.queue.getFailed();
  }

  async retryFailed(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  async close() {
    await this.worker.close();
    await this.queue.close();
    await this.deadLetterQueue.close();
  }
}
```

## Best Practices

1. **Use exponential backoff** - Prevents overwhelming struggling services.

2. **Add jitter** - Random variation prevents thundering herd problems.

3. **Set reasonable maximums** - Cap both retry count and maximum delay.

4. **Distinguish error types** - Only retry transient failures.

5. **Implement dead letter queues** - Capture permanently failed jobs for analysis.

6. **Monitor retry rates** - High retry rates indicate system issues.

7. **Consider circuit breakers** - Stop retrying when services are completely down.

8. **Log retry attempts** - Include attempt number in logs.

9. **Handle rate limits specially** - Respect Retry-After headers.

10. **Test failure scenarios** - Verify retry behavior under various failure modes.

## Conclusion

Effective retry strategies are essential for building resilient job processing systems. BullMQ provides flexible retry options with exponential backoff that handle most transient failures automatically. By implementing custom backoff strategies, dead letter queues, and proper monitoring, you can build systems that gracefully handle failures while maintaining visibility into what's going wrong.
