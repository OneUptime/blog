# How to Implement Retry Logic with Exponential Backoff in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Retry Logic, Exponential Backoff, API, Resilience, Frontend

Description: Learn how to build robust React applications by implementing retry logic with exponential backoff to handle transient failures gracefully and improve user experience.

---

## Introduction

In modern web applications, network requests are fundamental to functionality. However, networks are inherently unreliable. Servers can be temporarily unavailable, connections can drop, and rate limits can be exceeded. Without proper error handling, these transient failures can lead to poor user experiences and frustrated customers.

Retry logic with exponential backoff is a battle-tested pattern that helps applications recover gracefully from temporary failures. Instead of immediately failing when a request errors out, the application retries the request after progressively longer intervals, giving the server time to recover.

In this comprehensive guide, we will explore how to implement retry logic with exponential backoff in React applications. We will cover various patterns, from simple implementations to production-ready solutions, and discuss best practices for handling different types of failures.

## Why Exponential Backoff?

Before diving into implementation, let us understand why exponential backoff is preferred over other retry strategies.

### The Problem with Immediate Retries

Consider a scenario where a server is temporarily overloaded. If hundreds of clients immediately retry their failed requests, they will flood the server with even more traffic, potentially making the situation worse. This is known as a "retry storm."

### How Exponential Backoff Helps

Exponential backoff solves this by:

1. **Spreading out retry attempts** - Each retry waits progressively longer
2. **Reducing server load** - Failed requests do not immediately hammer the server
3. **Improving success rates** - More time between retries increases the chance of recovery
4. **Preventing thundering herd** - Adding jitter prevents synchronized retries from multiple clients

### The Math Behind Exponential Backoff

The basic formula for exponential backoff is:

```
delay = baseDelay * (2 ^ attemptNumber)
```

For example, with a base delay of 1 second:
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 16 seconds

## Basic Implementation

Let us start with a simple implementation to understand the core concepts.

### Simple Retry Function

```typescript
interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Using the Basic Implementation

```typescript
async function fetchUserData(userId: string) {
  const response = await retryWithExponentialBackoff(
    () => fetch(`/api/users/${userId}`),
    {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
```

## Adding Jitter

Pure exponential backoff can still cause synchronized retries when multiple clients start at the same time. Adding jitter (randomness) helps distribute retry attempts more evenly.

### Types of Jitter

There are several jitter strategies:

1. **Full Jitter** - Random delay between 0 and the calculated delay
2. **Equal Jitter** - Half the delay plus random portion of the other half
3. **Decorrelated Jitter** - Each delay is based on the previous delay with randomness

### Implementation with Full Jitter

```typescript
interface JitteredRetryOptions extends RetryOptions {
  jitterType: 'full' | 'equal' | 'decorrelated';
}

function calculateDelayWithJitter(
  baseDelay: number,
  attempt: number,
  maxDelay: number,
  jitterType: 'full' | 'equal' | 'decorrelated',
  previousDelay?: number
): number {
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt),
    maxDelay
  );

  switch (jitterType) {
    case 'full':
      return Math.random() * exponentialDelay;

    case 'equal':
      return exponentialDelay / 2 + Math.random() * (exponentialDelay / 2);

    case 'decorrelated':
      const previous = previousDelay || baseDelay;
      return Math.min(
        maxDelay,
        Math.random() * (previous * 3 - baseDelay) + baseDelay
      );

    default:
      return exponentialDelay;
  }
}

async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: JitteredRetryOptions
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, jitterType } = options;

  let lastError: Error;
  let previousDelay = baseDelay;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      const delay = calculateDelayWithJitter(
        baseDelay,
        attempt,
        maxDelay,
        jitterType,
        previousDelay
      );

      previousDelay = delay;
      await sleep(delay);
    }
  }

  throw lastError!;
}
```

## React Custom Hook Implementation

Now let us create a reusable React hook that encapsulates retry logic with exponential backoff.

### useRetry Hook

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
  retryCondition?: (error: Error) => boolean;
}

interface UseRetryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  attempt: number;
  isRetrying: boolean;
}

interface UseRetryReturn<T> extends UseRetryState<T> {
  execute: () => Promise<T | null>;
  reset: () => void;
  cancel: () => void;
}

function useRetry<T>(
  asyncFunction: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryReturn<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = true,
    onRetry,
    retryCondition = () => true
  } = options;

  const [state, setState] = useState<UseRetryState<T>>({
    data: null,
    error: null,
    isLoading: false,
    attempt: 0,
    isRetrying: false
  });

  const cancelledRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt),
      maxDelay
    );

    if (jitter) {
      return Math.random() * exponentialDelay;
    }

    return exponentialDelay;
  }, [baseDelay, maxDelay, jitter]);

  const execute = useCallback(async (): Promise<T | null> => {
    cancelledRef.current = false;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      attempt: 0,
      isRetrying: false
    }));

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (cancelledRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isRetrying: false
        }));
        return null;
      }

      try {
        const result = await asyncFunction();

        if (cancelledRef.current) {
          return null;
        }

        setState({
          data: result,
          error: null,
          isLoading: false,
          attempt: attempt + 1,
          isRetrying: false
        });

        return result;
      } catch (error) {
        lastError = error as Error;

        const shouldRetry = retryCondition(lastError);
        const hasMoreAttempts = attempt < maxAttempts - 1;

        if (shouldRetry && hasMoreAttempts && !cancelledRef.current) {
          onRetry?.(attempt + 1, lastError);

          setState(prev => ({
            ...prev,
            attempt: attempt + 1,
            isRetrying: true,
            error: lastError
          }));

          const delay = calculateDelay(attempt);

          await new Promise<void>(resolve => {
            timeoutRef.current = setTimeout(resolve, delay);
          });
        }
      }
    }

    if (!cancelledRef.current) {
      setState({
        data: null,
        error: lastError,
        isLoading: false,
        attempt: maxAttempts,
        isRetrying: false
      });
    }

    return null;
  }, [asyncFunction, maxAttempts, calculateDelay, onRetry, retryCondition]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState({
      data: null,
      error: null,
      isLoading: false,
      attempt: 0,
      isRetrying: false
    });
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false
    }));
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel
  };
}

export default useRetry;
```

### Using the useRetry Hook

```typescript
import React, { useEffect } from 'react';
import useRetry from './useRetry';

interface User {
  id: string;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: string }) {
  const {
    data: user,
    error,
    isLoading,
    attempt,
    isRetrying,
    execute,
    cancel
  } = useRetry<User>(
    () => fetch(`/api/users/${userId}`).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }),
    {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 16000,
      jitter: true,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} after error: ${error.message}`);
      },
      retryCondition: (error) => {
        // Only retry on network errors or 5xx responses
        return error.message.includes('fetch') ||
               error.message.includes('5');
      }
    }
  );

  useEffect(() => {
    execute();
    return () => cancel();
  }, [userId, execute, cancel]);

  if (isLoading) {
    return (
      <div className="loading-container">
        {isRetrying ? (
          <p>Retrying... Attempt {attempt}</p>
        ) : (
          <p>Loading user data...</p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Failed to load user after {attempt} attempts</p>
        <p>Error: {error.message}</p>
        <button onClick={execute}>Try Again</button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

export default UserProfile;
```

## Advanced Retry Hook with Query Integration

For more complex applications, let us create an advanced hook that integrates with query state management.

### useRetryQuery Hook

```typescript
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

type QueryStatus = 'idle' | 'loading' | 'success' | 'error' | 'retrying';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  backoffMultiplier: number;
}

interface QueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
  retry?: boolean | number | RetryConfig;
  retryDelay?: number | ((attempt: number, error: Error) => number);
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number, error: Error) => void;
  staleTime?: number;
  cacheTime?: number;
}

interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isRetrying: boolean;
  failureCount: number;
  refetch: () => Promise<void>;
  remove: () => void;
}

function useRetryQuery<T>(options: QueryOptions<T>): QueryResult<T> {
  const {
    queryFn,
    enabled = true,
    retry = 3,
    retryDelay,
    onSuccess,
    onError,
    onRetry,
    staleTime = 0,
    cacheTime = 5 * 60 * 1000
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [failureCount, setFailureCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const retryConfig = useMemo((): RetryConfig => {
    if (typeof retry === 'boolean') {
      return {
        maxAttempts: retry ? 3 : 0,
        baseDelay: 1000,
        maxDelay: 30000,
        jitter: true,
        backoffMultiplier: 2
      };
    }

    if (typeof retry === 'number') {
      return {
        maxAttempts: retry,
        baseDelay: 1000,
        maxDelay: 30000,
        jitter: true,
        backoffMultiplier: 2
      };
    }

    return retry;
  }, [retry]);

  const calculateRetryDelay = useCallback((attempt: number, err: Error): number => {
    if (typeof retryDelay === 'function') {
      return retryDelay(attempt, err);
    }

    if (typeof retryDelay === 'number') {
      return retryDelay;
    }

    const { baseDelay, maxDelay, jitter, backoffMultiplier } = retryConfig;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, attempt),
      maxDelay
    );

    return jitter ? Math.random() * exponentialDelay : exponentialDelay;
  }, [retryDelay, retryConfig]);

  const fetchWithRetry = useCallback(async () => {
    const { maxAttempts } = retryConfig;

    // Check if data is still fresh
    if (data && Date.now() - lastFetchTimeRef.current < staleTime) {
      return;
    }

    abortControllerRef.current = new AbortController();
    setStatus('loading');
    setError(null);
    setFailureCount(0);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      try {
        const result = await queryFn();

        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setData(result);
        setStatus('success');
        setError(null);
        lastFetchTimeRef.current = Date.now();
        onSuccess?.(result);
        return;
      } catch (err) {
        lastError = err as Error;
        setFailureCount(attempt + 1);

        if (attempt < maxAttempts && !abortControllerRef.current?.signal.aborted) {
          setStatus('retrying');
          setError(lastError);
          onRetry?.(attempt + 1, lastError);

          const delay = calculateRetryDelay(attempt, lastError);

          await new Promise<void>((resolve) => {
            timeoutRef.current = setTimeout(resolve, delay);
          });
        }
      }
    }

    if (!abortControllerRef.current?.signal.aborted) {
      setStatus('error');
      setError(lastError);
      onError?.(lastError!);
    }
  }, [
    queryFn,
    retryConfig,
    staleTime,
    data,
    calculateRetryDelay,
    onSuccess,
    onError,
    onRetry
  ]);

  const refetch = useCallback(async () => {
    lastFetchTimeRef.current = 0; // Force refetch
    await fetchWithRetry();
  }, [fetchWithRetry]);

  const remove = useCallback(() => {
    abortControllerRef.current?.abort();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setData(undefined);
    setError(null);
    setStatus('idle');
    setFailureCount(0);
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchWithRetry();
    }

    return () => {
      abortControllerRef.current?.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, fetchWithRetry]);

  // Cache cleanup
  useEffect(() => {
    if (status === 'success' && cacheTime > 0) {
      const cleanupTimeout = setTimeout(() => {
        if (Date.now() - lastFetchTimeRef.current > cacheTime) {
          setData(undefined);
        }
      }, cacheTime);

      return () => clearTimeout(cleanupTimeout);
    }
  }, [status, cacheTime]);

  return {
    data,
    error,
    status,
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    isRetrying: status === 'retrying',
    failureCount,
    refetch,
    remove
  };
}

export default useRetryQuery;
```

## Retry Strategy Patterns

Different scenarios call for different retry strategies. Let us explore common patterns.

### Pattern 1: Conditional Retry Based on Error Type

```typescript
interface HttpError extends Error {
  status?: number;
  code?: string;
}

function shouldRetry(error: HttpError): boolean {
  // Do not retry on client errors (4xx) except 429 (rate limit)
  if (error.status && error.status >= 400 && error.status < 500) {
    return error.status === 429;
  }

  // Retry on server errors (5xx)
  if (error.status && error.status >= 500) {
    return true;
  }

  // Retry on network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Retry on fetch failures
  if (error.message.includes('Failed to fetch')) {
    return true;
  }

  return false;
}

// Usage
const { data, error } = useRetry(
  () => fetchData(),
  {
    maxAttempts: 5,
    retryCondition: shouldRetry
  }
);
```

### Pattern 2: Retry with Circuit Breaker

```typescript
interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  state: 'closed' | 'open' | 'half-open';
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailure: null,
    state: 'closed'
  };

  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;

  constructor(failureThreshold = 5, recoveryTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private updateState(): void {
    if (
      this.state.state === 'open' &&
      this.state.lastFailure &&
      Date.now() - this.state.lastFailure > this.recoveryTimeout
    ) {
      this.state.state = 'half-open';
    }
  }

  private onSuccess(): void {
    this.state.failures = 0;
    this.state.state = 'closed';
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.failures >= this.failureThreshold) {
      this.state.state = 'open';
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// Hook integration
function useRetryWithCircuitBreaker<T>(
  asyncFunction: () => Promise<T>,
  options: UseRetryOptions & { circuitBreaker: CircuitBreaker }
) {
  const { circuitBreaker, ...retryOptions } = options;

  return useRetry(
    () => circuitBreaker.execute(asyncFunction),
    {
      ...retryOptions,
      retryCondition: (error) => {
        if (error.message === 'Circuit breaker is open') {
          return false;
        }
        return retryOptions.retryCondition?.(error) ?? true;
      }
    }
  );
}
```

### Pattern 3: Retry with Rate Limiting

```typescript
class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(maxTokens = 10, refillRate = 1000) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<boolean> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  getWaitTime(): number {
    if (this.tokens > 0) {
      return 0;
    }
    return this.refillRate - (Date.now() - this.lastRefill);
  }
}

async function retryWithRateLimit<T>(
  fn: () => Promise<T>,
  rateLimiter: RateLimiter,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Wait for rate limiter
    while (!(await rateLimiter.acquire())) {
      await sleep(rateLimiter.getWaitTime());
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts - 1) {
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}
```

### Pattern 4: Retry with Timeout

```typescript
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { timeout: number }
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, timeout } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await withTimeout(fn(), timeout);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts - 1) {
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}
```

## Production-Ready Implementation

Here is a comprehensive implementation suitable for production use.

### RetryService Class

```typescript
interface RetryServiceOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  timeout: number;
  retryCondition: (error: Error) => boolean;
  onRetry: (context: RetryContext) => void;
  onSuccess: (context: SuccessContext) => void;
  onFailure: (context: FailureContext) => void;
}

interface RetryContext {
  attempt: number;
  error: Error;
  delay: number;
  totalTime: number;
}

interface SuccessContext {
  attempts: number;
  totalTime: number;
}

interface FailureContext {
  attempts: number;
  lastError: Error;
  totalTime: number;
}

class RetryService {
  private options: RetryServiceOptions;

  constructor(options: Partial<RetryServiceOptions> = {}) {
    this.options = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true,
      timeout: 30000,
      retryCondition: () => true,
      onRetry: () => {},
      onSuccess: () => {},
      onFailure: () => {},
      ...options
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationOptions?: Partial<RetryServiceOptions>
  ): Promise<T> {
    const options = { ...this.options, ...operationOptions };
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          operation,
          options.timeout
        );

        options.onSuccess({
          attempts: attempt,
          totalTime: Date.now() - startTime
        });

        return result;
      } catch (error) {
        lastError = error as Error;

        const shouldRetry =
          attempt < options.maxAttempts &&
          options.retryCondition(lastError);

        if (shouldRetry) {
          const delay = this.calculateDelay(attempt, options);

          options.onRetry({
            attempt,
            error: lastError,
            delay,
            totalTime: Date.now() - startTime
          });

          await this.sleep(delay);
        }
      }
    }

    options.onFailure({
      attempts: options.maxAttempts,
      lastError: lastError!,
      totalTime: Date.now() - startTime
    });

    throw lastError!;
  }

  private calculateDelay(
    attempt: number,
    options: RetryServiceOptions
  ): number {
    const { baseDelay, maxDelay, jitter } = options;

    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt - 1),
      maxDelay
    );

    if (jitter) {
      return Math.random() * exponentialDelay;
    }

    return exponentialDelay;
  }

  private executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default RetryService;
```

### React Context Provider

```typescript
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import RetryService from './RetryService';

interface RetryContextValue {
  retryService: RetryService;
}

const RetryContext = createContext<RetryContextValue | null>(null);

interface RetryProviderProps {
  children: ReactNode;
  options?: Partial<RetryServiceOptions>;
}

function RetryProvider({ children, options }: RetryProviderProps) {
  const retryService = useMemo(
    () => new RetryService(options),
    [options]
  );

  const value = useMemo(
    () => ({ retryService }),
    [retryService]
  );

  return (
    <RetryContext.Provider value={value}>
      {children}
    </RetryContext.Provider>
  );
}

function useRetryService(): RetryService {
  const context = useContext(RetryContext);

  if (!context) {
    throw new Error('useRetryService must be used within RetryProvider');
  }

  return context.retryService;
}

export { RetryProvider, useRetryService };
```

### Using the Retry Context

```typescript
import React from 'react';
import { RetryProvider, useRetryService } from './RetryContext';

// App setup
function App() {
  return (
    <RetryProvider
      options={{
        maxAttempts: 5,
        baseDelay: 1000,
        jitter: true,
        onRetry: ({ attempt, error }) => {
          console.log(`Retry ${attempt}: ${error.message}`);
        }
      }}
    >
      <Dashboard />
    </RetryProvider>
  );
}

// Component using retry service
function Dashboard() {
  const retryService = useRetryService();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await retryService.execute(
        () => fetch('/api/dashboard').then(r => r.json())
      );
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

## Testing Retry Logic

Proper testing is crucial for retry implementations.

### Unit Tests

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import useRetry from './useRetry';

describe('useRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');

    const { result } = renderHook(() =>
      useRetry(mockFn, { maxAttempts: 3 })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('success');
    expect(result.current.error).toBeNull();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const { result } = renderHook(() =>
      useRetry(mockFn, {
        maxAttempts: 3,
        baseDelay: 1000,
        jitter: false
      })
    );

    act(() => {
      result.current.execute();
    });

    // First attempt fails
    await waitFor(() => {
      expect(result.current.isRetrying).toBe(true);
    });

    // Advance timer for first retry
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Advance timer for second retry
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.data).toBe('success');
    });

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should respect retry condition', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('permanent'));

    const { result } = renderHook(() =>
      useRetry(mockFn, {
        maxAttempts: 3,
        retryCondition: () => false
      })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error?.message).toBe('permanent');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const onRetry = jest.fn();
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const { result } = renderHook(() =>
      useRetry(mockFn, {
        maxAttempts: 3,
        baseDelay: 100,
        jitter: false,
        onRetry
      })
    );

    act(() => {
      result.current.execute();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  it('should handle cancellation', async () => {
    const mockFn = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('data'), 5000))
    );

    const { result } = renderHook(() =>
      useRetry(mockFn, { maxAttempts: 3 })
    );

    act(() => {
      result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isLoading).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import UserProfile from './UserProfile';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserProfile with retry', () => {
  it('should display user after successful retry', async () => {
    let attempts = 0;

    server.use(
      rest.get('/api/users/:id', (req, res, ctx) => {
        attempts++;
        if (attempts < 3) {
          return res(ctx.status(500));
        }
        return res(ctx.json({ id: '1', name: 'John', email: 'john@test.com' }));
      })
    );

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(attempts).toBe(3);
  });

  it('should show error after max retries', async () => {
    server.use(
      rest.get('/api/users/:id', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    }, { timeout: 30000 });
  });
});
```

## Best Practices

### 1. Choose Appropriate Retry Conditions

Not all errors should trigger retries. Be selective:

```typescript
function createRetryCondition(options: {
  retryServerErrors: boolean;
  retryNetworkErrors: boolean;
  retryRateLimits: boolean;
  customConditions: ((error: Error) => boolean)[];
}) {
  return (error: Error): boolean => {
    const httpStatus = extractHttpStatus(error);

    // Server errors (5xx)
    if (options.retryServerErrors && httpStatus >= 500) {
      return true;
    }

    // Rate limiting (429)
    if (options.retryRateLimits && httpStatus === 429) {
      return true;
    }

    // Network errors
    if (options.retryNetworkErrors && isNetworkError(error)) {
      return true;
    }

    // Custom conditions
    return options.customConditions.some(condition => condition(error));
  };
}
```

### 2. Implement Proper Logging

```typescript
const retryService = new RetryService({
  onRetry: ({ attempt, error, delay, totalTime }) => {
    console.warn({
      event: 'retry_attempt',
      attempt,
      error: error.message,
      delay,
      totalTime,
      timestamp: new Date().toISOString()
    });
  },
  onFailure: ({ attempts, lastError, totalTime }) => {
    console.error({
      event: 'retry_exhausted',
      attempts,
      error: lastError.message,
      totalTime,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 3. Use Appropriate Timeouts

```typescript
// Different timeouts for different operations
const timeouts = {
  fast: 5000,     // Quick lookups
  normal: 15000,  // Standard API calls
  slow: 60000     // Large data transfers
};

await retryService.execute(
  () => fetchUserProfile(userId),
  { timeout: timeouts.fast }
);

await retryService.execute(
  () => uploadLargeFile(file),
  { timeout: timeouts.slow }
);
```

### 4. Handle Idempotency

Ensure operations are safe to retry:

```typescript
// Use idempotency keys for non-idempotent operations
async function createOrderWithRetry(orderData: OrderData) {
  const idempotencyKey = generateUUID();

  return retryService.execute(
    () => fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(orderData)
    })
  );
}
```

## Summary Table

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Basic Exponential Backoff** | Simple API calls | Easy to implement, effective | Can cause synchronized retries |
| **Full Jitter** | High-traffic scenarios | Best distribution of retries | Unpredictable delays |
| **Equal Jitter** | Balanced approach | Good distribution with minimum delay | Slightly more complex |
| **Decorrelated Jitter** | Long-running operations | Smoothest retry distribution | Most complex to implement |
| **Circuit Breaker** | Unreliable services | Prevents cascade failures | Additional state management |
| **Rate Limited Retry** | Rate-limited APIs | Respects API limits | May increase total wait time |
| **Timeout + Retry** | Variable latency services | Prevents hanging requests | May cause premature failures |

## Backoff Algorithm Comparison

| Algorithm | Formula | Delay Pattern (base=1s) |
|-----------|---------|------------------------|
| Linear | `base * attempt` | 1s, 2s, 3s, 4s, 5s |
| Exponential | `base * 2^attempt` | 1s, 2s, 4s, 8s, 16s |
| Fibonacci | `fib(attempt) * base` | 1s, 1s, 2s, 3s, 5s |
| Polynomial | `base * attempt^2` | 1s, 4s, 9s, 16s, 25s |

## Configuration Recommendations

| Scenario | Max Attempts | Base Delay | Max Delay | Jitter |
|----------|-------------|------------|-----------|--------|
| User-facing API | 3 | 1000ms | 10000ms | Yes |
| Background sync | 5 | 2000ms | 60000ms | Yes |
| Critical operations | 10 | 500ms | 30000ms | Yes |
| Real-time features | 2 | 100ms | 1000ms | No |
| Webhooks | 5 | 5000ms | 300000ms | Yes |

## Conclusion

Implementing retry logic with exponential backoff is essential for building resilient React applications. By following the patterns and best practices outlined in this guide, you can create robust error handling that gracefully recovers from transient failures while providing a smooth user experience.

Key takeaways:

1. **Always use jitter** to prevent synchronized retry storms
2. **Set appropriate retry conditions** - not all errors should be retried
3. **Implement timeouts** to prevent indefinite waiting
4. **Use circuit breakers** for unreliable external services
5. **Log retry attempts** for monitoring and debugging
6. **Test thoroughly** with various failure scenarios
7. **Consider idempotency** when retrying mutating operations

With these tools and techniques, your React applications will be better equipped to handle the unpredictable nature of network communications and provide a more reliable experience for your users.
