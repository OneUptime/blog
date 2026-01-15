# How to Implement Rate Limiting for React API Calls

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Rate Limiting, API, Performance, Throttling, Frontend

Description: Learn how to implement effective rate limiting strategies in React applications using throttling, debouncing, and request queuing to optimize API calls and improve application performance.

---

## Introduction

Rate limiting is a critical technique for managing API calls in modern React applications. Without proper rate limiting, your application can overwhelm backend servers, hit API rate limits, degrade user experience, and waste valuable resources. This comprehensive guide will walk you through various strategies to implement rate limiting in React applications.

In this article, we will cover:

- Understanding rate limiting and why it matters
- Implementing throttling for API calls
- Using debouncing for search and input fields
- Building a request queue system
- Creating custom React hooks for rate limiting
- Best practices and common pitfalls

## Why Rate Limiting Matters

Before diving into implementation details, let us understand why rate limiting is essential:

### 1. API Rate Limits

Most APIs impose rate limits to prevent abuse. For example:
- GitHub API: 5,000 requests per hour for authenticated requests
- Twitter API: 300 requests per 15-minute window
- Google Maps API: Variable limits based on your plan

### 2. Server Protection

Uncontrolled API calls can:
- Overwhelm your backend servers
- Increase infrastructure costs
- Cause service degradation for all users

### 3. User Experience

Excessive API calls can:
- Slow down your application
- Drain mobile device batteries
- Consume user bandwidth unnecessarily

### 4. Cost Management

Many cloud services charge per API call, making rate limiting a cost-saving measure.

## Understanding the Basics

### What is Rate Limiting?

Rate limiting is a technique to control the number of requests a client can make to a server within a specific time window. There are several approaches to implement this:

1. **Throttling**: Limiting the rate of function execution
2. **Debouncing**: Delaying function execution until a pause in calls
3. **Request Queuing**: Managing requests in a queue with controlled processing

Let us explore each approach in detail.

## Implementing Throttling

Throttling ensures that a function is called at most once within a specified time interval, regardless of how many times it is triggered.

### Basic Throttle Implementation

```typescript
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function(this: unknown, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
```

### Using Throttle in React Components

Here is how to use throttling in a React component:

```typescript
import React, { useCallback, useEffect, useRef } from 'react';

interface ScrollData {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

const useThrottle = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const lastRan = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, delay - (now - lastRan.current));
      }
    },
    [callback, delay]
  );
};

interface InfiniteScrollListProps {
  onLoadMore: () => Promise<void>;
}

const InfiniteScrollList: React.FC<InfiniteScrollListProps> = ({ onLoadMore }) => {
  const handleScroll = useCallback((event: Event): void => {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      onLoadMore();
    }
  }, [onLoadMore]);

  const throttledScroll = useThrottle(handleScroll, 200);

  useEffect(() => {
    const container = document.getElementById('scroll-container');
    if (container) {
      container.addEventListener('scroll', throttledScroll);
      return () => container.removeEventListener('scroll', throttledScroll);
    }
  }, [throttledScroll]);

  return (
    <div id="scroll-container" style={{ height: '400px', overflow: 'auto' }}>
      {/* List items */}
    </div>
  );
};

export default InfiniteScrollList;
```

### Advanced Throttle with Leading and Trailing Options

```typescript
interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

function advancedThrottle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options: ThrottleOptions = {}
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  const { leading = true, trailing = true } = options;

  return function(this: unknown, ...args: Parameters<T>): void {
    const now = Date.now();

    if (!previous && !leading) {
      previous = now;
    }

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}
```

### Throttling API Calls Example

```typescript
import React, { useState, useCallback, useRef } from 'react';

interface ApiResponse<T> {
  data: T;
  status: number;
}

interface UseThrottledApiOptions {
  throttleMs?: number;
}

function useThrottledApi<T>(
  apiFunction: () => Promise<ApiResponse<T>>,
  options: UseThrottledApiOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: () => void;
} {
  const { throttleMs = 1000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const lastCallTime = useRef<number>(0);
  const pendingCall = useRef<boolean>(false);

  const execute = useCallback(async (): Promise<void> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;

    if (timeSinceLastCall < throttleMs) {
      if (!pendingCall.current) {
        pendingCall.current = true;
        setTimeout(() => {
          pendingCall.current = false;
          execute();
        }, throttleMs - timeSinceLastCall);
      }
      return;
    }

    lastCallTime.current = now;
    setLoading(true);
    setError(null);

    try {
      const response = await apiFunction();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [apiFunction, throttleMs]);

  return { data, loading, error, execute };
}

// Usage example
const DataFetcher: React.FC = () => {
  const fetchData = useCallback(async () => {
    const response = await fetch('/api/data');
    const data = await response.json();
    return { data, status: response.status };
  }, []);

  const { data, loading, error, execute } = useThrottledApi(fetchData, {
    throttleMs: 2000,
  });

  return (
    <div>
      <button onClick={execute} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      {error && <p>Error: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

export default DataFetcher;
```

## Implementing Debouncing

Debouncing delays the execution of a function until after a specified period has elapsed since the last time it was invoked. This is particularly useful for search inputs and form validation.

### Basic Debounce Implementation

```typescript
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(this: unknown, ...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}
```

### React Hook for Debouncing

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

export { useDebounce, useDebouncedCallback };
```

### Search Input with Debouncing

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce, useDebouncedCallback } from './useDebounce';

interface SearchResult {
  id: string;
  title: string;
  description: string;
}

interface SearchComponentProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  minSearchLength?: number;
  debounceMs?: number;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  onSearch,
  minSearchLength = 2,
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    const performSearch = async (): Promise<void> => {
      if (debouncedQuery.length < minSearchLength) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchResults = await onSearch(debouncedQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, onSearch, minSearchLength]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setQuery(event.target.value);
    },
    []
  );

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search..."
        className="search-input"
      />

      {loading && <div className="loading-indicator">Searching...</div>}

      {error && <div className="error-message">{error}</div>}

      <ul className="search-results">
        {results.map((result) => (
          <li key={result.id} className="search-result-item">
            <h3>{result.title}</h3>
            <p>{result.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchComponent;
```

### Advanced Debounce with Immediate Option

```typescript
interface DebounceOptions {
  immediate?: boolean;
  maxWait?: number;
}

function advancedDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
} {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let result: ReturnType<T> | undefined;

  const { immediate = false, maxWait } = options;
  const maxing = maxWait !== undefined;

  function invokeFunc(time: number): ReturnType<T> | undefined {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;
    lastInvokeTime = time;
    if (args) {
      result = func.apply(thisArg, args) as ReturnType<T>;
    }
    return result;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = lastCallTime === null ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= (maxWait as number))
    );
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeout = null;

    if (lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = lastCallTime === null ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? Math.min(timeWaiting, (maxWait as number) - timeSinceLastInvoke)
      : timeWaiting;
  }

  function timerExpired(): void {
    const time = Date.now();

    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }

    timeout = setTimeout(timerExpired, remainingWait(time));
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);

    return immediate ? invokeFunc(time) : result;
  }

  function debounced(this: unknown, ...args: Parameters<T>): void {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        leadingEdge(time);
        return;
      }
      if (maxing) {
        timeout = setTimeout(timerExpired, wait);
        invokeFunc(time);
        return;
      }
    }

    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
  }

  debounced.cancel = function(): void {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastThis = null;
    lastCallTime = null;
    timeout = null;
  };

  debounced.flush = function(): void {
    if (timeout === null) {
      return;
    }
    trailingEdge(Date.now());
  };

  return debounced;
}

export { advancedDebounce };
```

## Implementing Request Queuing

Request queuing provides fine-grained control over API calls by managing them in a queue with configurable concurrency and rate limits.

### Basic Request Queue

```typescript
interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  priority: number;
  timestamp: number;
}

interface QueueOptions {
  maxConcurrent?: number;
  maxRequestsPerSecond?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeRequests = 0;
  private requestTimestamps: number[] = [];
  private options: Required<QueueOptions>;

  constructor(options: QueueOptions = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? 3,
      maxRequestsPerSecond: options.maxRequestsPerSecond ?? 10,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };
  }

  async add<T>(
    execute: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: Math.random().toString(36).substr(2, 9),
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
        timestamp: Date.now(),
      };

      this.insertByPriority(request);
      this.processQueue();
    });
  }

  private insertByPriority<T>(request: QueuedRequest<T>): void {
    const index = this.queue.findIndex((r) => r.priority < request.priority);
    if (index === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(index, 0, request);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    if (this.activeRequests >= this.options.maxConcurrent) {
      return;
    }

    if (!this.canMakeRequest()) {
      const delay = this.getDelayUntilNextRequest();
      setTimeout(() => this.processQueue(), delay);
      return;
    }

    const request = this.queue.shift();
    if (!request) {
      return;
    }

    this.activeRequests++;
    this.recordRequest();

    try {
      const result = await this.executeWithRetry(request);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private async executeWithRetry<T>(
    request: QueuedRequest<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await request.execute();
    } catch (error) {
      if (attempt < this.options.retryAttempts) {
        await this.delay(this.options.retryDelay * Math.pow(2, attempt));
        return this.executeWithRetry(request, attempt + 1);
      }
      throw error;
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - 1000;
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > windowStart
    );
    return this.requestTimestamps.length < this.options.maxRequestsPerSecond;
  }

  private getDelayUntilNextRequest(): number {
    if (this.requestTimestamps.length === 0) {
      return 0;
    }
    const oldestTimestamp = this.requestTimestamps[0];
    if (oldestTimestamp === undefined) {
      return 0;
    }
    return Math.max(0, oldestTimestamp + 1000 - Date.now());
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clear(): void {
    this.queue.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.activeRequests;
  }
}

export { RequestQueue };
export type { QueueOptions, QueuedRequest };
```

### React Hook for Request Queue

```typescript
import { useRef, useCallback, useMemo } from 'react';
import { RequestQueue, QueueOptions } from './RequestQueue';

interface UseRequestQueueResult {
  enqueue: <T>(request: () => Promise<T>, priority?: number) => Promise<T>;
  clear: () => void;
  pendingCount: number;
  activeCount: number;
}

function useRequestQueue(options?: QueueOptions): UseRequestQueueResult {
  const queueRef = useRef<RequestQueue | null>(null);

  if (!queueRef.current) {
    queueRef.current = new RequestQueue(options);
  }

  const enqueue = useCallback(
    <T>(request: () => Promise<T>, priority?: number): Promise<T> => {
      return queueRef.current!.add(request, priority);
    },
    []
  );

  const clear = useCallback((): void => {
    queueRef.current?.clear();
  }, []);

  return useMemo(
    () => ({
      enqueue,
      clear,
      get pendingCount() {
        return queueRef.current?.pendingCount ?? 0;
      },
      get activeCount() {
        return queueRef.current?.activeCount ?? 0;
      },
    }),
    [enqueue, clear]
  );
}

export { useRequestQueue };
```

### Using the Request Queue in Components

```typescript
import React, { useState, useCallback } from 'react';
import { useRequestQueue } from './useRequestQueue';

interface Item {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  data?: unknown;
  error?: string;
}

const BulkProcessor: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const { enqueue, clear, pendingCount, activeCount } = useRequestQueue({
    maxConcurrent: 3,
    maxRequestsPerSecond: 5,
    retryAttempts: 2,
  });

  const updateItemStatus = useCallback(
    (id: string, updates: Partial<Item>): void => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const processItem = useCallback(
    async (item: Item): Promise<void> => {
      updateItemStatus(item.id, { status: 'loading' });

      try {
        const data = await enqueue(
          async () => {
            const response = await fetch(`/api/process/${item.id}`);
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
          },
          1 // priority
        );

        updateItemStatus(item.id, { status: 'success', data });
      } catch (error) {
        updateItemStatus(item.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [enqueue, updateItemStatus]
  );

  const processAll = useCallback((): void => {
    items.forEach((item) => {
      if (item.status === 'pending' || item.status === 'error') {
        processItem(item);
      }
    });
  }, [items, processItem]);

  const addItems = useCallback((): void => {
    const newItems: Item[] = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${Date.now()}-${i}`,
      name: `Item ${i + 1}`,
      status: 'pending' as const,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  return (
    <div className="bulk-processor">
      <div className="controls">
        <button onClick={addItems}>Add 10 Items</button>
        <button onClick={processAll}>Process All</button>
        <button onClick={clear}>Clear Queue</button>
      </div>

      <div className="status">
        <span>Pending: {pendingCount}</span>
        <span>Active: {activeCount}</span>
      </div>

      <ul className="items-list">
        {items.map((item) => (
          <li key={item.id} className={`item-${item.status}`}>
            <span>{item.name}</span>
            <span>{item.status}</span>
            {item.error && <span className="error">{item.error}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BulkProcessor;
```

## Token Bucket Algorithm

The token bucket algorithm is a more sophisticated rate limiting approach that allows for burst handling while maintaining an average rate limit.

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  tryConsume(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  async waitAndConsume(tokens: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    const tokensNeeded = tokens - this.tokens;
    const waitTime = (tokensNeeded / this.refillRate) * 1000;

    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.refill();
    this.tokens -= tokens;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

// React hook for token bucket
import { useRef, useCallback } from 'react';

interface UseTokenBucketOptions {
  capacity: number;
  refillRate: number;
}

function useTokenBucket(options: UseTokenBucketOptions): {
  tryConsume: (tokens?: number) => boolean;
  waitAndConsume: (tokens?: number) => Promise<void>;
  availableTokens: () => number;
} {
  const bucketRef = useRef<TokenBucket | null>(null);

  if (!bucketRef.current) {
    bucketRef.current = new TokenBucket(options.capacity, options.refillRate);
  }

  const tryConsume = useCallback((tokens?: number): boolean => {
    return bucketRef.current!.tryConsume(tokens);
  }, []);

  const waitAndConsume = useCallback(async (tokens?: number): Promise<void> => {
    return bucketRef.current!.waitAndConsume(tokens);
  }, []);

  const availableTokens = useCallback((): number => {
    return bucketRef.current!.getAvailableTokens();
  }, []);

  return { tryConsume, waitAndConsume, availableTokens };
}

export { TokenBucket, useTokenBucket };
```

## Sliding Window Rate Limiter

The sliding window algorithm provides more accurate rate limiting by considering a continuous time window.

```typescript
class SlidingWindowRateLimiter {
  private timestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  private cleanOldTimestamps(): void {
    const windowStart = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > windowStart);
  }

  canMakeRequest(): boolean {
    this.cleanOldTimestamps();
    return this.timestamps.length < this.maxRequests;
  }

  recordRequest(): boolean {
    if (!this.canMakeRequest()) {
      return false;
    }
    this.timestamps.push(Date.now());
    return true;
  }

  getTimeUntilNextSlot(): number {
    this.cleanOldTimestamps();

    if (this.timestamps.length < this.maxRequests) {
      return 0;
    }

    const oldestTimestamp = this.timestamps[0];
    if (oldestTimestamp === undefined) {
      return 0;
    }
    return Math.max(0, oldestTimestamp + this.windowMs - Date.now());
  }

  getRemainingRequests(): number {
    this.cleanOldTimestamps();
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }
}

// React hook for sliding window rate limiter
import { useRef, useCallback, useState, useEffect } from 'react';

interface UseSlidingWindowOptions {
  windowMs: number;
  maxRequests: number;
}

function useSlidingWindowRateLimiter(options: UseSlidingWindowOptions): {
  canMakeRequest: () => boolean;
  recordRequest: () => boolean;
  remainingRequests: number;
  timeUntilNextSlot: number;
} {
  const limiterRef = useRef<SlidingWindowRateLimiter | null>(null);
  const [remainingRequests, setRemainingRequests] = useState(options.maxRequests);
  const [timeUntilNextSlot, setTimeUntilNextSlot] = useState(0);

  if (!limiterRef.current) {
    limiterRef.current = new SlidingWindowRateLimiter(
      options.windowMs,
      options.maxRequests
    );
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (limiterRef.current) {
        setRemainingRequests(limiterRef.current.getRemainingRequests());
        setTimeUntilNextSlot(limiterRef.current.getTimeUntilNextSlot());
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const canMakeRequest = useCallback((): boolean => {
    return limiterRef.current?.canMakeRequest() ?? false;
  }, []);

  const recordRequest = useCallback((): boolean => {
    const result = limiterRef.current?.recordRequest() ?? false;
    if (limiterRef.current) {
      setRemainingRequests(limiterRef.current.getRemainingRequests());
    }
    return result;
  }, []);

  return {
    canMakeRequest,
    recordRequest,
    remainingRequests,
    timeUntilNextSlot,
  };
}

export { SlidingWindowRateLimiter, useSlidingWindowRateLimiter };
```

## Combining Techniques: A Comprehensive API Client

Here is a complete example that combines all the rate limiting techniques:

```typescript
import { useCallback, useRef, useState } from 'react';

interface RateLimitConfig {
  requestsPerSecond: number;
  maxConcurrent: number;
  burstCapacity: number;
  debounceMs: number;
  retryAttempts: number;
  retryBaseDelay: number;
}

interface ApiClientState {
  pendingRequests: number;
  activeRequests: number;
  availableTokens: number;
  isThrottled: boolean;
}

interface ApiRequest<T> {
  url: string;
  options?: RequestInit;
  priority?: number;
  skipRateLimit?: boolean;
}

class RateLimitedApiClient {
  private config: RateLimitConfig;
  private tokenBucket: TokenBucket;
  private requestQueue: RequestQueue;
  private state: ApiClientState;
  private stateListeners: Set<(state: ApiClientState) => void>;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      requestsPerSecond: config.requestsPerSecond ?? 10,
      maxConcurrent: config.maxConcurrent ?? 5,
      burstCapacity: config.burstCapacity ?? 20,
      debounceMs: config.debounceMs ?? 300,
      retryAttempts: config.retryAttempts ?? 3,
      retryBaseDelay: config.retryBaseDelay ?? 1000,
    };

    this.tokenBucket = new TokenBucket(
      this.config.burstCapacity,
      this.config.requestsPerSecond
    );

    this.requestQueue = new RequestQueue({
      maxConcurrent: this.config.maxConcurrent,
      maxRequestsPerSecond: this.config.requestsPerSecond,
      retryAttempts: this.config.retryAttempts,
      retryDelay: this.config.retryBaseDelay,
    });

    this.state = {
      pendingRequests: 0,
      activeRequests: 0,
      availableTokens: this.config.burstCapacity,
      isThrottled: false,
    };

    this.stateListeners = new Set();
  }

  private updateState(updates: Partial<ApiClientState>): void {
    this.state = { ...this.state, ...updates };
    this.stateListeners.forEach((listener) => listener(this.state));
  }

  subscribe(listener: (state: ApiClientState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  async request<T>(apiRequest: ApiRequest<T>): Promise<T> {
    const { url, options, priority = 0, skipRateLimit = false } = apiRequest;

    if (!skipRateLimit) {
      await this.tokenBucket.waitAndConsume();
    }

    this.updateState({
      availableTokens: this.tokenBucket.getAvailableTokens(),
    });

    return this.requestQueue.add<T>(
      async () => {
        const response = await fetch(url, options);

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.config.retryBaseDelay;

          this.updateState({ isThrottled: true });
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.updateState({ isThrottled: false });

          throw new Error('Rate limited by server');
        }

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        return response.json() as Promise<T>;
      },
      priority
    );
  }

  getState(): ApiClientState {
    return { ...this.state };
  }
}

// React hook for the rate-limited API client
function useRateLimitedApi(config?: Partial<RateLimitConfig>): {
  request: <T>(apiRequest: ApiRequest<T>) => Promise<T>;
  state: ApiClientState;
} {
  const clientRef = useRef<RateLimitedApiClient | null>(null);
  const [state, setState] = useState<ApiClientState>({
    pendingRequests: 0,
    activeRequests: 0,
    availableTokens: config?.burstCapacity ?? 20,
    isThrottled: false,
  });

  if (!clientRef.current) {
    clientRef.current = new RateLimitedApiClient(config);
    clientRef.current.subscribe(setState);
  }

  const request = useCallback(
    <T>(apiRequest: ApiRequest<T>): Promise<T> => {
      return clientRef.current!.request(apiRequest);
    },
    []
  );

  return { request, state };
}

export { RateLimitedApiClient, useRateLimitedApi };
export type { RateLimitConfig, ApiClientState, ApiRequest };
```

## Best Practices

### 1. Choose the Right Strategy

| Use Case | Recommended Strategy |
|----------|---------------------|
| Search inputs | Debouncing (300-500ms) |
| Scroll events | Throttling (100-200ms) |
| Button clicks | Throttling (1000ms) |
| Bulk operations | Request Queue |
| API rate limits | Token Bucket / Sliding Window |
| Form validation | Debouncing (200-400ms) |
| Auto-save | Debouncing (1000-2000ms) |
| Real-time updates | Throttling (500-1000ms) |

### 2. Handle Errors Gracefully

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < config.maxAttempts - 1) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### 3. Provide User Feedback

```typescript
import React from 'react';

interface RateLimitIndicatorProps {
  remainingRequests: number;
  maxRequests: number;
  isThrottled: boolean;
  timeUntilReset?: number;
}

const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
  remainingRequests,
  maxRequests,
  isThrottled,
  timeUntilReset,
}) => {
  const percentage = (remainingRequests / maxRequests) * 100;

  return (
    <div className="rate-limit-indicator">
      <div
        className="progress-bar"
        style={{ width: `${percentage}%` }}
      />
      <span>
        {remainingRequests} / {maxRequests} requests remaining
      </span>
      {isThrottled && (
        <span className="throttled-warning">
          Rate limited. Retry in {Math.ceil((timeUntilReset ?? 0) / 1000)}s
        </span>
      )}
    </div>
  );
};

export default RateLimitIndicator;
```

### 4. Clean Up Resources

```typescript
import { useEffect, useRef } from 'react';

function useCleanup<T extends { cancel?: () => void; clear?: () => void }>(
  createResource: () => T
): T {
  const resourceRef = useRef<T | null>(null);

  if (!resourceRef.current) {
    resourceRef.current = createResource();
  }

  useEffect(() => {
    return () => {
      if (resourceRef.current) {
        resourceRef.current.cancel?.();
        resourceRef.current.clear?.();
      }
    };
  }, []);

  return resourceRef.current;
}
```

## Summary Table

| Technique | Best For | Pros | Cons |
|-----------|----------|------|------|
| **Throttling** | Continuous events (scroll, resize, mousemove) | Guarantees regular execution, smooth UX | May miss final state updates |
| **Debouncing** | User input (search, form fields) | Only fires after user stops, reduces API calls | Delayed response, may feel laggy |
| **Request Queue** | Bulk operations, batch processing | Fine control, priority support, retry logic | More complex implementation |
| **Token Bucket** | API rate limits with burst allowance | Handles bursts well, smooth rate limiting | Requires careful tuning |
| **Sliding Window** | Strict rate limiting | Accurate rate control, predictable behavior | Memory overhead for timestamps |

## Conclusion

Implementing rate limiting in React applications is essential for building performant, reliable, and cost-effective applications. By combining throttling, debouncing, and request queuing, you can create a robust system that:

- Protects your backend servers from overload
- Stays within API rate limits
- Provides a smooth user experience
- Reduces infrastructure costs

Key takeaways:

1. **Start simple**: Begin with basic throttling or debouncing before implementing more complex solutions
2. **Measure first**: Use profiling tools to identify which API calls need rate limiting
3. **Provide feedback**: Always inform users when rate limiting is active
4. **Handle errors**: Implement proper retry logic with exponential backoff
5. **Clean up**: Always dispose of timers and cancel pending requests when components unmount

By following these patterns and best practices, you can build React applications that efficiently manage API calls while maintaining an excellent user experience.

## Additional Resources

- [React Documentation on Effects](https://react.dev/reference/react/useEffect)
- [MDN Web Docs: Throttle and Debounce](https://developer.mozilla.org/en-US/docs/Glossary/Debounce)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
