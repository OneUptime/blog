# How to Implement Error Handling Strategies in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Error Handling, Retry Strategies, Fault Tolerance, Resilience

Description: A comprehensive guide to implementing error handling strategies in BullMQ, including retry patterns, error classification, graceful degradation, circuit breakers, and building resilient job processing systems.

---

Robust error handling is essential for building reliable BullMQ applications. Jobs can fail for many reasons - network issues, service unavailability, invalid data, or bugs. This guide covers comprehensive error handling strategies to make your queue system resilient.

## Error Classification

Start by classifying errors to handle them appropriately:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

// Error types
class RetryableError extends Error {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = 'RetryableError';
  }
}

class PermanentError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'PermanentError';
  }
}

class ValidationError extends PermanentError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class RateLimitError extends RetryableError {
  constructor(retryAfter: number) {
    super(`Rate limited, retry after ${retryAfter}ms`, retryAfter);
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends RetryableError {
  constructor(service: string) {
    super(`Service ${service} is unavailable`);
    this.name = 'ServiceUnavailableError';
  }
}

// Error classifier
function classifyError(error: Error): 'retryable' | 'permanent' | 'unknown' {
  if (error instanceof RetryableError) return 'retryable';
  if (error instanceof PermanentError) return 'permanent';

  // Classify by error properties
  const message = error.message.toLowerCase();
  const code = (error as any).code;

  // Network errors are usually retryable
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(code)) {
    return 'retryable';
  }

  // HTTP status codes
  if (message.includes('429') || message.includes('503') || message.includes('502')) {
    return 'retryable';
  }

  if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
    return 'permanent';
  }

  return 'unknown';
}
```

## Smart Retry Handler

Implement intelligent retry logic:

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
  permanentErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 60000,
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ServiceUnavailableError', 'RateLimitError'],
  permanentErrors: ['ValidationError', 'PermanentError'],
};

class SmartRetryHandler {
  constructor(private config: RetryConfig = defaultRetryConfig) {}

  shouldRetry(error: Error, attemptsMade: number): boolean {
    if (attemptsMade >= this.config.maxRetries) {
      return false;
    }

    const errorType = classifyError(error);

    if (errorType === 'permanent') {
      return false;
    }

    if (errorType === 'retryable') {
      return true;
    }

    // For unknown errors, check against configured patterns
    const errorName = error.name;
    const errorCode = (error as any).code;

    if (this.config.permanentErrors.some(e => errorName.includes(e) || errorCode === e)) {
      return false;
    }

    if (this.config.retryableErrors.some(e => errorName.includes(e) || errorCode === e)) {
      return true;
    }

    // Default: retry unknown errors
    return true;
  }

  getRetryDelay(error: Error, attemptsMade: number): number {
    // If error specifies retry delay, use it
    if (error instanceof RetryableError && error.retryAfter) {
      return error.retryAfter;
    }

    // Exponential backoff with jitter
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attemptsMade);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelay);

    return Math.round(delay);
  }
}

const retryHandler = new SmartRetryHandler();
```

## Worker with Error Handling

Create a worker with comprehensive error handling:

```typescript
const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

interface ProcessorContext {
  attempt: number;
  maxAttempts: number;
  previousErrors: string[];
}

type JobProcessor<T, R> = (job: Job<T>, context: ProcessorContext) => Promise<R>;

function createResilientWorker<T, R>(
  queueName: string,
  processor: JobProcessor<T, R>,
  options: {
    connection: Redis;
    concurrency?: number;
    retryConfig?: Partial<RetryConfig>;
  }
): Worker {
  const retryHandler = new SmartRetryHandler({
    ...defaultRetryConfig,
    ...options.retryConfig,
  });

  const worker = new Worker<T, R>(
    queueName,
    async (job) => {
      const context: ProcessorContext = {
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts || 1,
        previousErrors: job.stacktrace || [],
      };

      try {
        await job.log(`Starting attempt ${context.attempt}/${context.maxAttempts}`);
        const result = await processor(job, context);
        await job.log('Job completed successfully');
        return result;
      } catch (error) {
        const err = error as Error;
        await job.log(`Attempt ${context.attempt} failed: ${err.message}`);

        // Determine if we should retry
        const shouldRetry = retryHandler.shouldRetry(err, job.attemptsMade);

        if (!shouldRetry) {
          // Mark as permanent failure
          await job.log('Error classified as permanent, will not retry');
          throw new Error(`[PERMANENT] ${err.message}`);
        }

        // Let BullMQ handle the retry
        throw error;
      }
    },
    {
      connection: options.connection,
      concurrency: options.concurrency || 1,
    }
  );

  // Handle worker-level errors
  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  worker.on('failed', (job, error) => {
    if (job) {
      const isPermanent = error.message.startsWith('[PERMANENT]');
      console.error(`Job ${job.id} failed ${isPermanent ? 'permanently' : 'temporarily'}:`, error.message);
    }
  });

  return worker;
}
```

## Circuit Breaker Pattern

Implement circuit breaker for external services:

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailure: number = 0;
  private halfOpenSuccesses: number = 0;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3,
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailure > this.options.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenSuccesses = 0;
        console.log(`Circuit ${this.name}: OPEN -> HALF_OPEN`);
      } else {
        throw new ServiceUnavailableError(`Circuit ${this.name} is open`);
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

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.options.halfOpenRequests) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        console.log(`Circuit ${this.name}: HALF_OPEN -> CLOSED`);
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.log(`Circuit ${this.name}: HALF_OPEN -> OPEN`);
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(`Circuit ${this.name}: CLOSED -> OPEN`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
  }
}

// Usage in worker
const apiCircuit = new CircuitBreaker('external-api');

const worker = createResilientWorker(
  'api-calls',
  async (job) => {
    return apiCircuit.execute(async () => {
      // Make external API call
      const response = await fetch(`https://api.example.com/process/${job.data.id}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    });
  },
  { connection }
);
```

## Error Recovery Strategies

Implement different recovery strategies:

```typescript
type RecoveryStrategy = 'retry' | 'skip' | 'fallback' | 'manual';

interface RecoveryConfig {
  strategy: RecoveryStrategy;
  fallbackValue?: any;
  fallbackProcessor?: (job: Job) => Promise<any>;
  onSkip?: (job: Job, error: Error) => Promise<void>;
}

class ErrorRecoveryManager {
  private strategies: Map<string, RecoveryConfig> = new Map();

  registerStrategy(errorType: string, config: RecoveryConfig): void {
    this.strategies.set(errorType, config);
  }

  async handleError(job: Job, error: Error): Promise<{ action: RecoveryStrategy; result?: any }> {
    const errorType = error.name;
    const config = this.strategies.get(errorType) || this.strategies.get('default');

    if (!config) {
      return { action: 'retry' };
    }

    switch (config.strategy) {
      case 'skip':
        if (config.onSkip) {
          await config.onSkip(job, error);
        }
        await job.log(`Skipping job due to ${errorType}`);
        return { action: 'skip', result: { skipped: true, reason: error.message } };

      case 'fallback':
        if (config.fallbackProcessor) {
          try {
            const result = await config.fallbackProcessor(job);
            await job.log('Used fallback processor');
            return { action: 'fallback', result };
          } catch (fallbackError) {
            await job.log(`Fallback also failed: ${(fallbackError as Error).message}`);
            return { action: 'retry' };
          }
        }
        return { action: 'fallback', result: config.fallbackValue };

      case 'manual':
        await job.log('Marked for manual review');
        // Move to a special queue for manual handling
        return { action: 'manual' };

      default:
        return { action: 'retry' };
    }
  }
}

// Configure recovery strategies
const recoveryManager = new ErrorRecoveryManager();

recoveryManager.registerStrategy('ValidationError', {
  strategy: 'skip',
  onSkip: async (job, error) => {
    // Log to dead letter queue or notification system
    console.log(`Skipping invalid job ${job.id}: ${error.message}`);
  },
});

recoveryManager.registerStrategy('RateLimitError', {
  strategy: 'retry',
});

recoveryManager.registerStrategy('ServiceUnavailableError', {
  strategy: 'fallback',
  fallbackProcessor: async (job) => {
    // Try alternative service or cached data
    return { fromCache: true, data: await getCachedData(job.data.id) };
  },
});

recoveryManager.registerStrategy('default', {
  strategy: 'retry',
});
```

## Graceful Degradation

Implement graceful degradation for partial failures:

```typescript
interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  degraded?: boolean;
}

class GracefulProcessor<T, R> {
  private steps: Array<{
    name: string;
    required: boolean;
    execute: (data: T) => Promise<any>;
    fallback?: () => Promise<any>;
  }> = [];

  addStep(
    name: string,
    execute: (data: T) => Promise<any>,
    options: { required?: boolean; fallback?: () => Promise<any> } = {}
  ): this {
    this.steps.push({
      name,
      required: options.required ?? true,
      execute,
      fallback: options.fallback,
    });
    return this;
  }

  async process(data: T, job: Job): Promise<ProcessingResult<R>> {
    const results: Record<string, any> = {};
    let degraded = false;

    for (const step of this.steps) {
      try {
        await job.log(`Executing step: ${step.name}`);
        results[step.name] = await step.execute(data);
      } catch (error) {
        const err = error as Error;
        await job.log(`Step ${step.name} failed: ${err.message}`);

        if (step.required) {
          // Required step failed, try fallback
          if (step.fallback) {
            try {
              results[step.name] = await step.fallback();
              degraded = true;
              await job.log(`Used fallback for ${step.name}`);
            } catch (fallbackError) {
              return {
                success: false,
                error: `Required step ${step.name} failed: ${err.message}`,
              };
            }
          } else {
            return {
              success: false,
              error: `Required step ${step.name} failed: ${err.message}`,
            };
          }
        } else {
          // Optional step failed, continue
          results[step.name] = null;
          degraded = true;
          await job.log(`Skipping optional step ${step.name}`);
        }
      }
    }

    return {
      success: true,
      data: results as R,
      degraded,
    };
  }
}

// Example usage
const orderProcessor = new GracefulProcessor<OrderData, OrderResult>()
  .addStep('validate', async (data) => validateOrder(data), { required: true })
  .addStep('payment', async (data) => processPayment(data), {
    required: true,
    fallback: async () => ({ pending: true, reason: 'payment_service_unavailable' }),
  })
  .addStep('inventory', async (data) => reserveInventory(data), { required: true })
  .addStep('notification', async (data) => sendNotification(data), { required: false })
  .addStep('analytics', async (data) => trackAnalytics(data), { required: false });

const worker = new Worker('orders', async (job) => {
  const result = await orderProcessor.process(job.data, job);

  if (!result.success) {
    throw new Error(result.error);
  }

  if (result.degraded) {
    await job.log('Completed with degraded functionality');
  }

  return result.data;
}, { connection });
```

## Error Aggregation and Reporting

Aggregate errors for analysis:

```typescript
interface ErrorReport {
  errorType: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  samples: Array<{
    jobId: string;
    message: string;
    timestamp: Date;
  }>;
}

class ErrorAggregator {
  private errors: Map<string, ErrorReport> = new Map();
  private maxSamples = 10;

  recordError(job: Job, error: Error): void {
    const key = `${error.name}:${this.normalizeMessage(error.message)}`;
    const existing = this.errors.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
      if (existing.samples.length < this.maxSamples) {
        existing.samples.push({
          jobId: job.id || 'unknown',
          message: error.message,
          timestamp: new Date(),
        });
      }
    } else {
      this.errors.set(key, {
        errorType: error.name,
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        samples: [{
          jobId: job.id || 'unknown',
          message: error.message,
          timestamp: new Date(),
        }],
      });
    }
  }

  private normalizeMessage(message: string): string {
    // Remove variable parts (IDs, timestamps, etc.)
    return message
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<TIMESTAMP>')
      .replace(/\d+/g, '<NUM>');
  }

  getReport(): ErrorReport[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.count - a.count);
  }

  getTopErrors(limit = 10): ErrorReport[] {
    return this.getReport().slice(0, limit);
  }

  reset(): void {
    this.errors.clear();
  }
}

const errorAggregator = new ErrorAggregator();

// Integrate with worker
worker.on('failed', (job, error) => {
  if (job) {
    errorAggregator.recordError(job, error);
  }
});

// Periodic reporting
setInterval(() => {
  const topErrors = errorAggregator.getTopErrors(5);
  if (topErrors.length > 0) {
    console.log('Top errors in the last period:');
    topErrors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.errorType}: ${err.count} occurrences`);
    });
  }
}, 300000); // Every 5 minutes
```

## Best Practices

1. **Classify errors** - Distinguish between retryable and permanent failures.

2. **Use exponential backoff** - Avoid overwhelming failing services.

3. **Implement circuit breakers** - Fail fast when services are down.

4. **Log comprehensively** - Include context for debugging.

5. **Set reasonable retry limits** - Avoid infinite retry loops.

6. **Handle partial failures** - Implement graceful degradation.

7. **Aggregate errors** - Look for patterns in failures.

8. **Test error handling** - Verify retry and recovery logic works.

9. **Monitor error rates** - Alert on unusual failure patterns.

10. **Document error types** - Help team understand failure modes.

## Conclusion

Effective error handling in BullMQ requires a multi-layered approach. By classifying errors, implementing smart retry logic, using circuit breakers, and building graceful degradation into your processors, you can create resilient queue systems that handle failures gracefully. Remember that the goal is not to prevent all failures but to handle them in ways that minimize impact on users and make debugging easier.
