# How to Mock BullMQ for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Testing, Mocking, Jest, Vitest, Test Doubles, Test Utilities

Description: A comprehensive guide to mocking BullMQ queues, workers, and events for testing, including creating test doubles, simulating job processing, and building reusable mock utilities for reliable test suites.

---

Mocking BullMQ components enables fast, isolated tests without requiring a Redis instance. By creating test doubles for queues, workers, and events, you can verify your application logic without the overhead of integration testing. This guide covers comprehensive mocking strategies for BullMQ.

## Basic Queue Mock

Create a simple mock queue:

```typescript
// test/mocks/mockQueue.ts
import { vi } from 'vitest';

interface MockJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts: any;
  attemptsMade: number;
  timestamp: number;
  progress: number | object;
  returnvalue?: any;
  failedReason?: string;
  updateProgress: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  getState: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  retry: ReturnType<typeof vi.fn>;
  waitUntilFinished: ReturnType<typeof vi.fn>;
}

export function createMockJob<T = any>(
  name: string,
  data: T,
  options: Partial<MockJob<T>> = {}
): MockJob<T> {
  return {
    id: options.id || `job-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    data,
    opts: options.opts || {},
    attemptsMade: options.attemptsMade || 0,
    timestamp: options.timestamp || Date.now(),
    progress: options.progress || 0,
    returnvalue: options.returnvalue,
    failedReason: options.failedReason,
    updateProgress: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue('waiting'),
    remove: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
    waitUntilFinished: vi.fn().mockResolvedValue(options.returnvalue),
  };
}

export class MockQueue<T = any> {
  name: string;
  jobs: Map<string, MockJob<T>> = new Map();
  private jobCounter = 0;

  add = vi.fn();
  addBulk = vi.fn();
  getJob = vi.fn();
  getJobs = vi.fn();
  getWaiting = vi.fn();
  getActive = vi.fn();
  getCompleted = vi.fn();
  getFailed = vi.fn();
  getDelayed = vi.fn();
  getWaitingCount = vi.fn();
  getActiveCount = vi.fn();
  getCompletedCount = vi.fn();
  getFailedCount = vi.fn();
  getDelayedCount = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  isPaused = vi.fn();
  drain = vi.fn();
  clean = vi.fn();
  close = vi.fn();

  constructor(name: string = 'mock-queue') {
    this.name = name;
    this.setupDefaultBehavior();
  }

  private setupDefaultBehavior(): void {
    this.add.mockImplementation((name: string, data: T, opts?: any) => {
      const job = createMockJob(name, data, { opts });
      this.jobs.set(job.id, job);
      return Promise.resolve(job);
    });

    this.addBulk.mockImplementation((jobs: Array<{ name: string; data: T; opts?: any }>) => {
      return Promise.all(
        jobs.map((j) => this.add(j.name, j.data, j.opts))
      );
    });

    this.getJob.mockImplementation((id: string) => {
      return Promise.resolve(this.jobs.get(id) || null);
    });

    this.getJobs.mockImplementation(() => {
      return Promise.resolve(Array.from(this.jobs.values()));
    });

    this.getWaiting.mockResolvedValue([]);
    this.getActive.mockResolvedValue([]);
    this.getCompleted.mockResolvedValue([]);
    this.getFailed.mockResolvedValue([]);
    this.getDelayed.mockResolvedValue([]);

    this.getWaitingCount.mockResolvedValue(0);
    this.getActiveCount.mockResolvedValue(0);
    this.getCompletedCount.mockResolvedValue(0);
    this.getFailedCount.mockResolvedValue(0);
    this.getDelayedCount.mockResolvedValue(0);

    this.isPaused.mockResolvedValue(false);
    this.drain.mockResolvedValue(undefined);
    this.clean.mockResolvedValue([]);
    this.close.mockResolvedValue(undefined);
  }

  reset(): void {
    this.jobs.clear();
    vi.clearAllMocks();
    this.setupDefaultBehavior();
  }
}

export function createMockQueue<T = any>(name?: string): MockQueue<T> {
  return new MockQueue<T>(name);
}
```

## Mock Queue Events

Create mock queue events:

```typescript
// test/mocks/mockQueueEvents.ts
import { vi } from 'vitest';
import { EventEmitter } from 'events';

export class MockQueueEvents extends EventEmitter {
  name: string;
  close = vi.fn().mockResolvedValue(undefined);

  constructor(name: string = 'mock-queue') {
    super();
    this.name = name;
  }

  // Simulate events
  simulateWaiting(jobId: string): void {
    this.emit('waiting', { jobId });
  }

  simulateActive(jobId: string, prev?: string): void {
    this.emit('active', { jobId, prev });
  }

  simulateCompleted(jobId: string, returnvalue?: any): void {
    this.emit('completed', { jobId, returnvalue: JSON.stringify(returnvalue) });
  }

  simulateFailed(jobId: string, failedReason: string): void {
    this.emit('failed', { jobId, failedReason });
  }

  simulateProgress(jobId: string, data: any): void {
    this.emit('progress', { jobId, data });
  }

  simulateStalled(jobId: string): void {
    this.emit('stalled', { jobId });
  }

  reset(): void {
    this.removeAllListeners();
    this.close.mockClear();
  }
}

export function createMockQueueEvents(name?: string): MockQueueEvents {
  return new MockQueueEvents(name);
}
```

## Mock Worker

Create a mock worker:

```typescript
// test/mocks/mockWorker.ts
import { vi } from 'vitest';
import { EventEmitter } from 'events';

export class MockWorker extends EventEmitter {
  name: string;
  concurrency: number;
  running: boolean = false;
  private processor: ((job: any) => Promise<any>) | null = null;

  close = vi.fn();
  pause = vi.fn();
  resume = vi.fn();

  constructor(
    name: string,
    processor?: (job: any) => Promise<any>,
    options?: { concurrency?: number }
  ) {
    super();
    this.name = name;
    this.concurrency = options?.concurrency || 1;
    this.processor = processor || null;

    this.close.mockImplementation(() => {
      this.running = false;
      return Promise.resolve();
    });

    this.pause.mockImplementation(() => {
      this.running = false;
      return Promise.resolve();
    });

    this.resume.mockImplementation(() => {
      this.running = true;
      return Promise.resolve();
    });
  }

  // Simulate processing a job
  async processJob(job: any): Promise<any> {
    if (!this.processor) {
      throw new Error('No processor defined');
    }

    this.emit('active', job);

    try {
      const result = await this.processor(job);
      this.emit('completed', job, result);
      return result;
    } catch (error) {
      this.emit('failed', job, error);
      throw error;
    }
  }

  // Simulate job progress
  simulateProgress(job: any, progress: number | object): void {
    this.emit('progress', job, progress);
  }

  // Simulate stalled job
  simulateStalled(jobId: string): void {
    this.emit('stalled', jobId);
  }

  // Simulate worker error
  simulateError(error: Error): void {
    this.emit('error', error);
  }

  reset(): void {
    this.removeAllListeners();
    this.running = false;
    vi.clearAllMocks();
  }
}

export function createMockWorker(
  name: string,
  processor?: (job: any) => Promise<any>,
  options?: { concurrency?: number }
): MockWorker {
  return new MockWorker(name, processor, options);
}
```

## Complete Mock Module

Create a complete mock module:

```typescript
// test/mocks/bullmq.ts
import { vi } from 'vitest';
import { createMockQueue, MockQueue } from './mockQueue';
import { createMockQueueEvents, MockQueueEvents } from './mockQueueEvents';
import { createMockWorker, MockWorker } from './mockWorker';

// Store mock instances for test access
const mockInstances = {
  queues: new Map<string, MockQueue>(),
  workers: new Map<string, MockWorker>(),
  queueEvents: new Map<string, MockQueueEvents>(),
};

// Mock Queue class
export const Queue = vi.fn().mockImplementation((name: string) => {
  const mock = createMockQueue(name);
  mockInstances.queues.set(name, mock);
  return mock;
});

// Mock Worker class
export const Worker = vi.fn().mockImplementation(
  (name: string, processor: any, options?: any) => {
    const mock = createMockWorker(name, processor, options);
    mockInstances.workers.set(name, mock);
    return mock;
  }
);

// Mock QueueEvents class
export const QueueEvents = vi.fn().mockImplementation((name: string) => {
  const mock = createMockQueueEvents(name);
  mockInstances.queueEvents.set(name, mock);
  return mock;
});

// Mock FlowProducer
export const FlowProducer = vi.fn().mockImplementation(() => ({
  add: vi.fn().mockResolvedValue({ job: createMockQueue('flow').add('job', {}) }),
  addBulk: vi.fn().mockResolvedValue([]),
  close: vi.fn().mockResolvedValue(undefined),
}));

// Helper functions for tests
export function getMockQueue(name: string): MockQueue | undefined {
  return mockInstances.queues.get(name);
}

export function getMockWorker(name: string): MockWorker | undefined {
  return mockInstances.workers.get(name);
}

export function getMockQueueEvents(name: string): MockQueueEvents | undefined {
  return mockInstances.queueEvents.get(name);
}

export function resetAllMocks(): void {
  mockInstances.queues.forEach((q) => q.reset());
  mockInstances.workers.forEach((w) => w.reset());
  mockInstances.queueEvents.forEach((e) => e.reset());

  mockInstances.queues.clear();
  mockInstances.workers.clear();
  mockInstances.queueEvents.clear();

  vi.clearAllMocks();
}

// Re-export mock creators
export { createMockJob } from './mockQueue';
```

## Using Mocks in Tests

Example test using mocks:

```typescript
// __tests__/services/orderService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BullMQ before importing modules that use it
vi.mock('bullmq', () => import('../mocks/bullmq'));

import { OrderService } from '../../services/orderService';
import { getMockQueue, getMockWorker, resetAllMocks, createMockJob } from '../mocks/bullmq';

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    resetAllMocks();
    orderService = new OrderService();
  });

  it('should add order to queue', async () => {
    const orderData = {
      orderId: 'ORD-001',
      items: [{ productId: 'PROD-1', quantity: 2 }],
    };

    await orderService.submitOrder(orderData);

    const mockQueue = getMockQueue('orders');
    expect(mockQueue?.add).toHaveBeenCalledWith(
      'process-order',
      orderData,
      expect.any(Object)
    );
  });

  it('should add order with correct priority', async () => {
    const orderData = {
      orderId: 'ORD-002',
      items: [{ productId: 'PROD-1', quantity: 1 }],
      priority: 'high',
    };

    await orderService.submitOrder(orderData);

    const mockQueue = getMockQueue('orders');
    expect(mockQueue?.add).toHaveBeenCalledWith(
      'process-order',
      orderData,
      expect.objectContaining({ priority: 1 })
    );
  });

  it('should return job ID after submission', async () => {
    const orderData = {
      orderId: 'ORD-003',
      items: [],
    };

    const result = await orderService.submitOrder(orderData);

    expect(result.jobId).toBeDefined();
    expect(typeof result.jobId).toBe('string');
  });

  it('should handle queue errors gracefully', async () => {
    const mockQueue = getMockQueue('orders');
    mockQueue?.add.mockRejectedValueOnce(new Error('Queue unavailable'));

    const orderData = {
      orderId: 'ORD-004',
      items: [],
    };

    await expect(orderService.submitOrder(orderData)).rejects.toThrow(
      'Failed to submit order'
    );
  });
});
```

## Testing Event Handlers

Test code that listens to queue events:

```typescript
// services/orderMonitor.ts
import { QueueEvents } from 'bullmq';

export class OrderMonitor {
  private completedOrders: string[] = [];
  private failedOrders: Map<string, string> = new Map();

  constructor(private queueEvents: QueueEvents) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      this.completedOrders.push(jobId);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.failedOrders.set(jobId, failedReason);
    });
  }

  getCompletedOrders(): string[] {
    return [...this.completedOrders];
  }

  getFailedOrders(): Map<string, string> {
    return new Map(this.failedOrders);
  }
}
```

```typescript
// __tests__/services/orderMonitor.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { OrderMonitor } from '../../services/orderMonitor';
import { createMockQueueEvents, MockQueueEvents } from '../mocks/mockQueueEvents';

describe('OrderMonitor', () => {
  let mockQueueEvents: MockQueueEvents;
  let monitor: OrderMonitor;

  beforeEach(() => {
    mockQueueEvents = createMockQueueEvents('orders');
    monitor = new OrderMonitor(mockQueueEvents as any);
  });

  it('should track completed orders', () => {
    mockQueueEvents.simulateCompleted('job-1', { success: true });
    mockQueueEvents.simulateCompleted('job-2', { success: true });

    const completed = monitor.getCompletedOrders();

    expect(completed).toContain('job-1');
    expect(completed).toContain('job-2');
    expect(completed).toHaveLength(2);
  });

  it('should track failed orders with reasons', () => {
    mockQueueEvents.simulateFailed('job-3', 'Payment declined');
    mockQueueEvents.simulateFailed('job-4', 'Invalid address');

    const failed = monitor.getFailedOrders();

    expect(failed.get('job-3')).toBe('Payment declined');
    expect(failed.get('job-4')).toBe('Invalid address');
    expect(failed.size).toBe(2);
  });

  it('should handle mixed events', () => {
    mockQueueEvents.simulateCompleted('job-1');
    mockQueueEvents.simulateFailed('job-2', 'Error');
    mockQueueEvents.simulateCompleted('job-3');

    expect(monitor.getCompletedOrders()).toHaveLength(2);
    expect(monitor.getFailedOrders().size).toBe(1);
  });
});
```

## Testing Worker Processors

Test worker processing logic:

```typescript
// __tests__/workers/orderWorker.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWorker, MockWorker } from '../mocks/mockWorker';
import { createMockJob } from '../mocks/mockQueue';

// Processor to test
async function orderProcessor(job: any) {
  const { orderId, items } = job.data;

  if (!items || items.length === 0) {
    throw new Error('Order must have items');
  }

  await job.updateProgress(50);

  const total = items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  await job.updateProgress(100);

  return {
    orderId,
    total,
    itemCount: items.length,
  };
}

describe('Order Worker Processor', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    mockWorker = createMockWorker('orders', orderProcessor);
  });

  it('should process order and calculate total', async () => {
    const mockJob = createMockJob('process-order', {
      orderId: 'ORD-001',
      items: [
        { productId: 'A', price: 10, quantity: 2 },
        { productId: 'B', price: 15, quantity: 1 },
      ],
    });

    const result = await mockWorker.processJob(mockJob);

    expect(result.orderId).toBe('ORD-001');
    expect(result.total).toBe(35);
    expect(result.itemCount).toBe(2);
  });

  it('should update progress during processing', async () => {
    const mockJob = createMockJob('process-order', {
      orderId: 'ORD-002',
      items: [{ productId: 'A', price: 10, quantity: 1 }],
    });

    await mockWorker.processJob(mockJob);

    expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
  });

  it('should emit completed event on success', async () => {
    const completedHandler = vi.fn();
    mockWorker.on('completed', completedHandler);

    const mockJob = createMockJob('process-order', {
      orderId: 'ORD-003',
      items: [{ productId: 'A', price: 10, quantity: 1 }],
    });

    await mockWorker.processJob(mockJob);

    expect(completedHandler).toHaveBeenCalledWith(mockJob, expect.any(Object));
  });

  it('should emit failed event on error', async () => {
    const failedHandler = vi.fn();
    mockWorker.on('failed', failedHandler);

    const mockJob = createMockJob('process-order', {
      orderId: 'ORD-004',
      items: [], // Empty items should cause failure
    });

    await expect(mockWorker.processJob(mockJob)).rejects.toThrow();

    expect(failedHandler).toHaveBeenCalledWith(mockJob, expect.any(Error));
  });

  it('should reject orders without items', async () => {
    const mockJob = createMockJob('process-order', {
      orderId: 'ORD-005',
      items: [],
    });

    await expect(mockWorker.processJob(mockJob)).rejects.toThrow(
      'Order must have items'
    );
  });
});
```

## Mock Setup Configuration

Configure mocks in test setup:

```typescript
// vitest.setup.ts
import { vi, beforeEach, afterEach } from 'vitest';
import { resetAllMocks } from './test/mocks/bullmq';

// Reset mocks between tests
beforeEach(() => {
  resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Make sure timers are real by default
vi.useRealTimers();
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/mocks/**'],
    },
  },
});
```

## Advanced Mock Scenarios

Test complex scenarios:

```typescript
describe('Complex Scenarios', () => {
  it('should handle job with retries', async () => {
    let attempts = 0;

    const processor = async (job: any) => {
      attempts++;
      if (attempts < job.opts.attempts) {
        throw new Error('Temporary failure');
      }
      return { success: true };
    };

    const worker = createMockWorker('retry-test', processor);
    const job = createMockJob('job', { data: 'test' }, {
      opts: { attempts: 3 },
    });

    // Simulate retries
    for (let i = 0; i < 3; i++) {
      try {
        const result = await worker.processJob(job);
        expect(result.success).toBe(true);
        break;
      } catch {
        job.attemptsMade++;
      }
    }

    expect(attempts).toBe(3);
  });

  it('should handle delayed job scheduling', async () => {
    vi.useFakeTimers();

    const mockQueue = createMockQueue('delayed');
    const processedJobs: string[] = [];

    // Mock delayed job behavior
    mockQueue.add.mockImplementation(async (name, data, opts) => {
      const job = createMockJob(name, data, { opts });

      if (opts?.delay) {
        setTimeout(() => {
          processedJobs.push(job.id);
        }, opts.delay);
      } else {
        processedJobs.push(job.id);
      }

      return job;
    });

    await mockQueue.add('job1', {}, { delay: 1000 });
    await mockQueue.add('job2', {}, { delay: 500 });
    await mockQueue.add('job3', {});

    // Initially only non-delayed job processed
    expect(processedJobs).toHaveLength(1);

    // Advance time
    await vi.advanceTimersByTimeAsync(500);
    expect(processedJobs).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(500);
    expect(processedJobs).toHaveLength(3);

    vi.useRealTimers();
  });
});
```

## Best Practices

1. **Reset mocks between tests** - Prevent test interference.

2. **Create realistic mock objects** - Match BullMQ interface.

3. **Test event handlers** - Verify event-driven logic.

4. **Mock at the boundary** - Mock BullMQ, not internal functions.

5. **Use type-safe mocks** - Leverage TypeScript interfaces.

6. **Test error scenarios** - Verify error handling.

7. **Keep mocks simple** - Only implement what you need.

8. **Document mock behavior** - Make mock limitations clear.

9. **Combine with integration tests** - Mocks complement, not replace.

10. **Update mocks with library** - Keep mocks in sync with BullMQ updates.

## Conclusion

Mocking BullMQ enables fast, isolated unit tests that verify your application logic without Redis dependencies. By creating comprehensive mock classes for queues, workers, and events, you can test complex scenarios including retries, delays, and error handling. Use these mocks alongside integration tests for complete test coverage of your BullMQ applications.
