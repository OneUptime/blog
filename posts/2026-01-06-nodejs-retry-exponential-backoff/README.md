# How to Implement Retry Logic with Exponential Backoff in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Reliability, API, Distributed Systems, DevOps

Description: Learn to implement retry logic with exponential backoff, circuit breakers, jitter, and idempotency in Node.js for resilient distributed systems.

---

Network calls fail. Services go down. Timeouts happen. Retry logic makes your Node.js applications resilient to transient failures, but naive retries can cause thundering herds and cascade failures. This guide covers retry patterns that work reliably in production.

## Why Exponential Backoff?

| Retry Pattern | Problem |
|---------------|---------|
| **Immediate retry** | Overloads failing service |
| **Fixed interval** | Synchronized retries cause spikes |
| **Exponential backoff** | Gradually reduces pressure |
| **Exponential + jitter** | Desynchronizes retries |

## Basic Retry Implementation

This simple retry function uses exponential backoff - each retry waits twice as long as the previous one. A max delay cap prevents excessive waits.

```javascript
async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    retryIf = () => true,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryIf(error)) {
        throw error;
      }

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff with cap
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

// Usage
const result = await retry(
  async (attempt) => {
    console.log(`Attempt ${attempt}`);
    return await fetch('https://api.example.com/data');
  },
  {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 16000,
    factor: 2,
    retryIf: (error) => error.code === 'ETIMEDOUT' || error.status === 503,
  }
);
```

## Adding Jitter

Jitter prevents multiple clients from retrying at the same time (thundering herd problem). When many clients fail simultaneously, they would all retry at the same intervals without jitter, overwhelming the recovering service. Jitter adds randomness to spread out retries.

```javascript
// Calculate delay with different jitter strategies
// 'full' jitter: completely random between 0 and max delay
// 'equal' jitter: half fixed, half random for more predictable bounds
// 'decorrelated' jitter: AWS-style approach with wider variation
function calculateDelay(baseDelay, attempt, options = {}) {
  const { factor = 2, maxDelay = 30000, jitter = 'full' } = options;

  // Exponential delay
  let delay = Math.min(baseDelay * Math.pow(factor, attempt - 1), maxDelay);

  // Apply jitter
  switch (jitter) {
    case 'none':
      return delay;

    case 'full':
      // Random between 0 and delay
      return Math.random() * delay;

    case 'equal':
      // Half fixed, half random
      return delay / 2 + (Math.random() * delay / 2);

    case 'decorrelated':
      // AWS-style decorrelated jitter
      return Math.min(maxDelay, Math.random() * delay * 3);

    default:
      return delay;
  }
}

async function retryWithJitter(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    jitter = 'full',
    onRetry = () => {},
    retryIf = () => true,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryIf(error)) {
        throw error;
      }

      const delay = calculateDelay(initialDelay, attempt, { factor, maxDelay, jitter });

      onRetry({ attempt, error, delay, maxAttempts });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Production-Ready Retry Class

This comprehensive retry class handles real-world scenarios: HTTP status codes that indicate retryable errors, network error codes, and the Retry-After header that services use to tell clients when to retry. It also includes timeout handling using AbortController.

```javascript
// Full-featured retry class for production use
// Handles: network errors, HTTP status codes, Retry-After headers, timeouts
class RetryableOperation {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.factor = options.factor || 2;
    this.jitter = options.jitter || 'full';
    this.timeout = options.timeout || 30000;

    // Determine which errors to retry
    this.retryableErrors = options.retryableErrors || [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'EPIPE',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];

    this.retryableStatusCodes = options.retryableStatusCodes || [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];
  }

  isRetryable(error) {
    // Network errors
    if (this.retryableErrors.includes(error.code)) {
      return true;
    }

    // HTTP status codes
    if (error.response && this.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    // Respect Retry-After header
    if (error.response?.headers?.['retry-after']) {
      return true;
    }

    return false;
  }

  getRetryAfter(error) {
    const retryAfter = error.response?.headers?.['retry-after'];
    if (!retryAfter) return null;

    // Retry-After can be seconds or HTTP date
    const seconds = parseInt(retryAfter);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return null;
  }

  calculateDelay(attempt, error) {
    // Check for Retry-After header
    const retryAfter = this.getRetryAfter(error);
    if (retryAfter !== null) {
      return Math.min(retryAfter, this.maxDelay);
    }

    // Exponential backoff with jitter
    let delay = Math.min(
      this.initialDelay * Math.pow(this.factor, attempt - 1),
      this.maxDelay
    );

    // Apply jitter
    if (this.jitter === 'full') {
      delay = Math.random() * delay;
    } else if (this.jitter === 'equal') {
      delay = delay / 2 + (Math.random() * delay / 2);
    }

    return delay;
  }

  async execute(fn) {
    const controller = new AbortController();
    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        // Wrap with timeout
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const result = await fn({ attempt, signal: controller.signal });
          clearTimeout(timeoutId);
          return result;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error;

        // Don't retry if aborted or not retryable
        if (error.name === 'AbortError') {
          throw new Error(`Operation timed out after ${this.timeout}ms`);
        }

        if (attempt === this.maxAttempts || !this.isRetryable(error)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, error);

        console.log(
          `Attempt ${attempt}/${this.maxAttempts} failed: ${error.message}. ` +
          `Retrying in ${Math.round(delay)}ms...`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Usage
const retry = new RetryableOperation({
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 16000,
  timeout: 10000,
});

const data = await retry.execute(async ({ attempt, signal }) => {
  const response = await fetch('https://api.example.com/data', { signal });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.response = response;
    throw error;
  }
  return response.json();
});
```

## Circuit Breaker Pattern

Circuit breakers prevent repeated calls to a failing service by "opening" after a threshold of failures. Once open, calls fail immediately without hitting the service. After a timeout, the circuit enters "half-open" state to test if the service recovered. This protects both your application and the failing service.

```javascript
// Circuit breaker with three states:
// CLOSED: Normal operation, requests pass through
// OPEN: Service is down, fail fast without calling
// HALF_OPEN: Testing if service recovered with limited requests
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.halfOpenRequests = options.halfOpenRequests || 1;

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.halfOpenAttempts = 0;
  }

  async execute(fn) {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        console.log('Circuit breaker: OPEN -> HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.halfOpenRequests) {
      throw new Error('Circuit breaker is HALF_OPEN, waiting for test requests');
    }

    try {
      if (this.state === 'HALF_OPEN') {
        this.halfOpenAttempts++;
      }

      const result = await fn();

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.halfOpenRequests) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        console.log('Circuit breaker: HALF_OPEN -> CLOSED');
      }
    } else {
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successes = 0;
      console.log('Circuit breaker: HALF_OPEN -> OPEN');
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('Circuit breaker: CLOSED -> OPEN');
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
    };
  }
}

// Combine with retry
class ResilientClient {
  constructor(options = {}) {
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.retry = new RetryableOperation(options.retry);
  }

  async execute(fn) {
    return this.circuitBreaker.execute(() => this.retry.execute(fn));
  }
}

// Usage
const client = new ResilientClient({
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
  },
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
  },
});

const data = await client.execute(async () => {
  return await fetchExternalApi('/data');
});
```

## Idempotency for Safe Retries

When retrying operations that have side effects (like payments or creating records), you need idempotency to prevent duplicates. This class stores operation results by a unique key, so retrying the same operation returns the cached result instead of executing again.

```javascript
// Idempotent retry wrapper that prevents duplicate side effects
// Uses a key to track operations and return cached results on retry
class IdempotentRetry {
  constructor(options = {}) {
    this.store = options.store || new Map(); // Use Redis in production
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours
    this.retry = new RetryableOperation(options.retry);
  }

  // Generate idempotency key from request
  generateKey(operation, params) {
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify({ operation, params }))
      .digest('hex');
    return `idempotent:${hash}`;
  }

  async execute(key, fn) {
    // Check for existing result
    const existing = this.store.get(key);
    if (existing) {
      if (existing.status === 'completed') {
        return existing.result;
      }
      if (existing.status === 'processing') {
        // Another request is processing, wait for it
        return this.waitForResult(key);
      }
    }

    // Mark as processing
    this.store.set(key, {
      status: 'processing',
      startedAt: Date.now(),
    });

    try {
      const result = await this.retry.execute(fn);

      // Store successful result
      this.store.set(key, {
        status: 'completed',
        result,
        completedAt: Date.now(),
      });

      // Schedule cleanup
      setTimeout(() => this.store.delete(key), this.ttl);

      return result;
    } catch (error) {
      // Store error
      this.store.set(key, {
        status: 'failed',
        error: error.message,
        failedAt: Date.now(),
      });

      throw error;
    }
  }

  async waitForResult(key, timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const entry = this.store.get(key);

      if (!entry || entry.status === 'failed') {
        throw new Error('Operation failed');
      }

      if (entry.status === 'completed') {
        return entry.result;
      }

      await new Promise(r => setTimeout(r, 100));
    }

    throw new Error('Timeout waiting for result');
  }
}

// Usage for payment processing
const idempotentRetry = new IdempotentRetry({
  retry: { maxAttempts: 3 },
});

app.post('/payments', async (req, res) => {
  // Use client-provided idempotency key or generate one
  const idempotencyKey = req.headers['idempotency-key'] ||
    idempotentRetry.generateKey('payment', req.body);

  try {
    const result = await idempotentRetry.execute(
      idempotencyKey,
      async () => await processPayment(req.body)
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Retry with Timeout and Deadline

Sometimes you need to retry until a deadline rather than a fixed number of attempts. This is useful for time-sensitive operations where you have a maximum acceptable latency. The retry loop continues as long as time remains, adjusting backoff delays to fit within the deadline.

```javascript
// Deadline-based retry: keep trying until a time limit expires
// Useful when you have an SLA or user-facing timeout to meet
class DeadlineRetry {
  constructor(options = {}) {
    this.retry = new RetryableOperation(options);
  }

  // Retry until deadline, not just max attempts
  async executeUntilDeadline(fn, deadline) {
    const deadlineTime = typeof deadline === 'number'
      ? Date.now() + deadline
      : deadline.getTime();

    let attempt = 0;
    let lastError;

    while (Date.now() < deadlineTime) {
      attempt++;

      try {
        // Calculate remaining time for this attempt
        const remaining = deadlineTime - Date.now();
        if (remaining <= 0) break;

        return await Promise.race([
          fn({ attempt }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Attempt timeout')), remaining)
          ),
        ]);
      } catch (error) {
        lastError = error;

        const remaining = deadlineTime - Date.now();
        if (remaining <= 0) break;

        // Calculate backoff, but don't exceed remaining time
        const delay = Math.min(
          this.retry.calculateDelay(attempt, error),
          remaining - 100 // Leave some time for the next attempt
        );

        if (delay <= 0) break;

        console.log(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    throw lastError || new Error('Deadline exceeded');
  }
}

// Usage
const deadlineRetry = new DeadlineRetry({
  initialDelay: 100,
  maxDelay: 5000,
});

// Must complete within 30 seconds
const result = await deadlineRetry.executeUntilDeadline(
  async ({ attempt }) => {
    return await fetchData();
  },
  30000
);
```

## Retry Metrics

Tracking retry behavior is essential for understanding system health. High retry rates may indicate upstream service issues, network problems, or misconfigured timeouts. These Prometheus metrics help you monitor retry patterns and set alerts.

```javascript
// Prometheus metrics for retry observability
// Track: total attempts, success/failure rates, and duration in retry loops
const prometheus = require('prom-client');

const retryAttempts = new prometheus.Counter({
  name: 'retry_attempts_total',
  help: 'Total retry attempts',
  labelNames: ['operation', 'attempt', 'result'],
});

const retryDuration = new prometheus.Histogram({
  name: 'retry_duration_seconds',
  help: 'Total time spent in retry loop',
  labelNames: ['operation', 'result'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

class InstrumentedRetry {
  constructor(operationName, options = {}) {
    this.operationName = operationName;
    this.retry = new RetryableOperation(options);
  }

  async execute(fn) {
    const startTime = Date.now();
    let lastAttempt = 0;

    try {
      const result = await this.retry.execute(async ({ attempt }) => {
        lastAttempt = attempt;
        retryAttempts.inc({
          operation: this.operationName,
          attempt: attempt.toString(),
          result: 'started',
        });

        return await fn({ attempt });
      });

      retryAttempts.inc({
        operation: this.operationName,
        attempt: lastAttempt.toString(),
        result: 'success',
      });

      retryDuration.observe(
        { operation: this.operationName, result: 'success' },
        (Date.now() - startTime) / 1000
      );

      return result;
    } catch (error) {
      retryAttempts.inc({
        operation: this.operationName,
        attempt: lastAttempt.toString(),
        result: 'failure',
      });

      retryDuration.observe(
        { operation: this.operationName, result: 'failure' },
        (Date.now() - startTime) / 1000
      );

      throw error;
    }
  }
}
```

## Summary

| Pattern | Use Case | Benefit |
|---------|----------|---------|
| **Exponential backoff** | Transient failures | Reduces pressure on failing service |
| **Jitter** | Many clients | Prevents thundering herd |
| **Circuit breaker** | Prolonged outages | Fail fast, recover gracefully |
| **Idempotency** | Mutations | Safe to retry |
| **Deadline** | Time-sensitive ops | Bounded latency |

Retry logic is essential for resilient distributed systems. Combining exponential backoff with jitter, circuit breakers, and idempotency creates applications that gracefully handle failures without causing cascade effects.
