# How to Unit Test BullMQ Workers and Processors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Testing, Unit Testing, Jest, Vitest, Mocking, Test Patterns

Description: A comprehensive guide to unit testing BullMQ workers and job processors, including mocking strategies, testing patterns, isolated processor testing, and best practices for writing reliable tests.

---

Unit testing BullMQ code requires isolating job processors from the queue infrastructure. By separating business logic from queue mechanics, you can write fast, reliable tests that verify your processors work correctly. This guide covers strategies and patterns for effective BullMQ unit testing.

## Separating Business Logic

The key to testable BullMQ code is separating business logic from queue integration:

```typescript
// processors/orderProcessor.ts - Business logic (testable)
export interface OrderData {
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
  customerId: string;
}

export interface OrderResult {
  orderId: string;
  status: 'processed' | 'failed';
  totalAmount: number;
}

export interface OrderDependencies {
  inventoryService: {
    checkAvailability: (productId: string, quantity: number) => Promise<boolean>;
    reserve: (productId: string, quantity: number) => Promise<void>;
  };
  pricingService: {
    getPrice: (productId: string) => Promise<number>;
  };
  notificationService: {
    sendOrderConfirmation: (customerId: string, orderId: string) => Promise<void>;
  };
}

export async function processOrder(
  data: OrderData,
  deps: OrderDependencies
): Promise<OrderResult> {
  let totalAmount = 0;

  // Check availability for all items
  for (const item of data.items) {
    const available = await deps.inventoryService.checkAvailability(
      item.productId,
      item.quantity
    );

    if (!available) {
      return {
        orderId: data.orderId,
        status: 'failed',
        totalAmount: 0,
      };
    }
  }

  // Reserve inventory and calculate total
  for (const item of data.items) {
    await deps.inventoryService.reserve(item.productId, item.quantity);
    const price = await deps.pricingService.getPrice(item.productId);
    totalAmount += price * item.quantity;
  }

  // Send notification
  await deps.notificationService.sendOrderConfirmation(
    data.customerId,
    data.orderId
  );

  return {
    orderId: data.orderId,
    status: 'processed',
    totalAmount,
  };
}
```

```typescript
// workers/orderWorker.ts - Queue integration
import { Worker, Job } from 'bullmq';
import { processOrder, OrderData, OrderDependencies } from '../processors/orderProcessor';

export function createOrderWorker(
  connection: Redis,
  dependencies: OrderDependencies
): Worker {
  return new Worker<OrderData>(
    'orders',
    async (job) => {
      return processOrder(job.data, dependencies);
    },
    { connection }
  );
}
```

## Unit Testing Processors

Test processors in isolation with mocked dependencies:

```typescript
// __tests__/processors/orderProcessor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processOrder, OrderData, OrderDependencies } from '../../processors/orderProcessor';

describe('processOrder', () => {
  let mockDependencies: OrderDependencies;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockDependencies = {
      inventoryService: {
        checkAvailability: vi.fn().mockResolvedValue(true),
        reserve: vi.fn().mockResolvedValue(undefined),
      },
      pricingService: {
        getPrice: vi.fn().mockResolvedValue(10.00),
      },
      notificationService: {
        sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('should process order successfully when inventory is available', async () => {
    const orderData: OrderData = {
      orderId: 'ORD-001',
      items: [
        { productId: 'PROD-1', quantity: 2 },
        { productId: 'PROD-2', quantity: 1 },
      ],
      customerId: 'CUST-001',
    };

    const result = await processOrder(orderData, mockDependencies);

    expect(result.status).toBe('processed');
    expect(result.orderId).toBe('ORD-001');
    expect(result.totalAmount).toBe(30); // (2 * 10) + (1 * 10)

    // Verify inventory was reserved
    expect(mockDependencies.inventoryService.reserve).toHaveBeenCalledTimes(2);
    expect(mockDependencies.inventoryService.reserve).toHaveBeenCalledWith('PROD-1', 2);
    expect(mockDependencies.inventoryService.reserve).toHaveBeenCalledWith('PROD-2', 1);

    // Verify notification was sent
    expect(mockDependencies.notificationService.sendOrderConfirmation).toHaveBeenCalledWith(
      'CUST-001',
      'ORD-001'
    );
  });

  it('should fail when inventory is not available', async () => {
    mockDependencies.inventoryService.checkAvailability = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false); // Second item not available

    const orderData: OrderData = {
      orderId: 'ORD-002',
      items: [
        { productId: 'PROD-1', quantity: 1 },
        { productId: 'PROD-2', quantity: 100 }, // Not available
      ],
      customerId: 'CUST-001',
    };

    const result = await processOrder(orderData, mockDependencies);

    expect(result.status).toBe('failed');
    expect(result.totalAmount).toBe(0);

    // Verify inventory was NOT reserved
    expect(mockDependencies.inventoryService.reserve).not.toHaveBeenCalled();

    // Verify notification was NOT sent
    expect(mockDependencies.notificationService.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('should calculate total correctly with different prices', async () => {
    mockDependencies.pricingService.getPrice = vi
      .fn()
      .mockResolvedValueOnce(25.00)
      .mockResolvedValueOnce(15.50);

    const orderData: OrderData = {
      orderId: 'ORD-003',
      items: [
        { productId: 'PROD-1', quantity: 2 },
        { productId: 'PROD-2', quantity: 3 },
      ],
      customerId: 'CUST-001',
    };

    const result = await processOrder(orderData, mockDependencies);

    expect(result.totalAmount).toBe(96.50); // (2 * 25) + (3 * 15.50)
  });

  it('should handle empty order', async () => {
    const orderData: OrderData = {
      orderId: 'ORD-004',
      items: [],
      customerId: 'CUST-001',
    };

    const result = await processOrder(orderData, mockDependencies);

    expect(result.status).toBe('processed');
    expect(result.totalAmount).toBe(0);
  });
});
```

## Testing Error Handling

Test how processors handle errors:

```typescript
describe('processOrder error handling', () => {
  let mockDependencies: OrderDependencies;

  beforeEach(() => {
    mockDependencies = {
      inventoryService: {
        checkAvailability: vi.fn().mockResolvedValue(true),
        reserve: vi.fn().mockResolvedValue(undefined),
      },
      pricingService: {
        getPrice: vi.fn().mockResolvedValue(10.00),
      },
      notificationService: {
        sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('should throw when inventory service fails', async () => {
    mockDependencies.inventoryService.checkAvailability = vi
      .fn()
      .mockRejectedValue(new Error('Inventory service unavailable'));

    const orderData: OrderData = {
      orderId: 'ORD-001',
      items: [{ productId: 'PROD-1', quantity: 1 }],
      customerId: 'CUST-001',
    };

    await expect(processOrder(orderData, mockDependencies)).rejects.toThrow(
      'Inventory service unavailable'
    );
  });

  it('should throw when pricing service fails', async () => {
    mockDependencies.pricingService.getPrice = vi
      .fn()
      .mockRejectedValue(new Error('Pricing service error'));

    const orderData: OrderData = {
      orderId: 'ORD-001',
      items: [{ productId: 'PROD-1', quantity: 1 }],
      customerId: 'CUST-001',
    };

    await expect(processOrder(orderData, mockDependencies)).rejects.toThrow(
      'Pricing service error'
    );

    // Verify inventory was reserved before error
    expect(mockDependencies.inventoryService.reserve).toHaveBeenCalled();
  });

  it('should throw when notification fails', async () => {
    mockDependencies.notificationService.sendOrderConfirmation = vi
      .fn()
      .mockRejectedValue(new Error('Notification failed'));

    const orderData: OrderData = {
      orderId: 'ORD-001',
      items: [{ productId: 'PROD-1', quantity: 1 }],
      customerId: 'CUST-001',
    };

    await expect(processOrder(orderData, mockDependencies)).rejects.toThrow(
      'Notification failed'
    );
  });
});
```

## Creating Mock Job Objects

Create realistic mock job objects for testing:

```typescript
// __tests__/helpers/mockJob.ts
import { Job } from 'bullmq';

interface MockJobOptions<T> {
  id?: string;
  name?: string;
  data: T;
  opts?: Partial<Job['opts']>;
  attemptsMade?: number;
  progress?: number | object;
  returnvalue?: any;
  failedReason?: string;
  stacktrace?: string[];
}

export function createMockJob<T>(options: MockJobOptions<T>): Partial<Job<T>> {
  const job: Partial<Job<T>> = {
    id: options.id || `job-${Date.now()}`,
    name: options.name || 'test-job',
    data: options.data,
    opts: options.opts || {},
    attemptsMade: options.attemptsMade || 0,
    progress: options.progress || 0,
    timestamp: Date.now(),
    queueName: 'test-queue',

    // Mock methods
    updateProgress: vi.fn().mockResolvedValue(undefined),
    log: vi.fn().mockResolvedValue(undefined),
    extendLock: vi.fn().mockResolvedValue(undefined),
    updateData: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue('active'),
    remove: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
  };

  if (options.returnvalue !== undefined) {
    (job as any).returnvalue = options.returnvalue;
  }

  if (options.failedReason) {
    (job as any).failedReason = options.failedReason;
    (job as any).stacktrace = options.stacktrace || [];
  }

  return job;
}
```

## Testing Processors That Use Job Methods

Test processors that interact with job object:

```typescript
// processors/reportProcessor.ts
import { Job } from 'bullmq';

export interface ReportData {
  reportId: string;
  sections: string[];
}

export async function generateReport(job: Job<ReportData>): Promise<string> {
  const { reportId, sections } = job.data;
  const results: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    await job.log(`Processing section: ${sections[i]}`);

    // Simulate processing
    const sectionResult = await processSection(sections[i]);
    results.push(sectionResult);

    // Update progress
    await job.updateProgress(((i + 1) / sections.length) * 100);
  }

  return results.join('\n');
}

async function processSection(section: string): Promise<string> {
  return `Section ${section} content`;
}
```

```typescript
// __tests__/processors/reportProcessor.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateReport, ReportData } from '../../processors/reportProcessor';
import { createMockJob } from '../helpers/mockJob';

describe('generateReport', () => {
  it('should process all sections and update progress', async () => {
    const mockJob = createMockJob<ReportData>({
      data: {
        reportId: 'RPT-001',
        sections: ['intro', 'body', 'conclusion'],
      },
    });

    const result = await generateReport(mockJob as any);

    // Verify result
    expect(result).toContain('Section intro content');
    expect(result).toContain('Section body content');
    expect(result).toContain('Section conclusion content');

    // Verify progress updates
    expect(mockJob.updateProgress).toHaveBeenCalledTimes(3);
    expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, expect.closeTo(33.33, 0));
    expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, expect.closeTo(66.67, 0));
    expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 100);

    // Verify logs
    expect(mockJob.log).toHaveBeenCalledTimes(3);
    expect(mockJob.log).toHaveBeenCalledWith('Processing section: intro');
  });

  it('should handle empty sections array', async () => {
    const mockJob = createMockJob<ReportData>({
      data: {
        reportId: 'RPT-002',
        sections: [],
      },
    });

    const result = await generateReport(mockJob as any);

    expect(result).toBe('');
    expect(mockJob.updateProgress).not.toHaveBeenCalled();
  });
});
```

## Testing with Different Job States

Test processors with various job configurations:

```typescript
describe('processor with job states', () => {
  it('should handle retry scenarios', async () => {
    const mockJob = createMockJob<OrderData>({
      data: {
        orderId: 'ORD-001',
        items: [{ productId: 'PROD-1', quantity: 1 }],
        customerId: 'CUST-001',
      },
      attemptsMade: 2, // This is a retry
      opts: { attempts: 5 },
    });

    // Your processor might behave differently on retries
    const result = await processOrder(mockJob.data, mockDependencies);

    expect(result.status).toBe('processed');
  });

  it('should check job attempt count', async () => {
    const mockJob = createMockJob<OrderData>({
      attemptsMade: 4,
      opts: { attempts: 5 },
      data: {
        orderId: 'ORD-001',
        items: [{ productId: 'PROD-1', quantity: 1 }],
        customerId: 'CUST-001',
      },
    });

    // Test logic that depends on attempt count
    const isLastAttempt = mockJob.attemptsMade === (mockJob.opts?.attempts || 1) - 1;
    expect(isLastAttempt).toBe(true);
  });
});
```

## Testing Async Patterns

Test complex async scenarios:

```typescript
describe('async patterns', () => {
  it('should handle concurrent operations', async () => {
    const processingOrder: string[] = [];

    mockDependencies.inventoryService.checkAvailability = vi.fn().mockImplementation(
      async (productId) => {
        processingOrder.push(`check-${productId}`);
        return true;
      }
    );

    mockDependencies.inventoryService.reserve = vi.fn().mockImplementation(
      async (productId) => {
        processingOrder.push(`reserve-${productId}`);
      }
    );

    const orderData: OrderData = {
      orderId: 'ORD-001',
      items: [
        { productId: 'A', quantity: 1 },
        { productId: 'B', quantity: 1 },
      ],
      customerId: 'CUST-001',
    };

    await processOrder(orderData, mockDependencies);

    // Verify order of operations
    expect(processingOrder).toEqual([
      'check-A',
      'check-B',
      'reserve-A',
      'reserve-B',
    ]);
  });

  it('should handle timeouts', async () => {
    vi.useFakeTimers();

    mockDependencies.inventoryService.checkAvailability = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 5000))
    );

    const orderData: OrderData = {
      orderId: 'ORD-001',
      items: [{ productId: 'PROD-1', quantity: 1 }],
      customerId: 'CUST-001',
    };

    const promise = processOrder(orderData, mockDependencies);

    // Advance timers
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result.status).toBe('processed');

    vi.useRealTimers();
  });
});
```

## Test Configuration

Set up test configuration for BullMQ projects:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/processors/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
    setupFiles: ['./test/setup.ts'],
  },
});
```

```typescript
// test/setup.ts
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

## Best Practices

1. **Separate concerns** - Keep business logic separate from queue integration.

2. **Use dependency injection** - Pass dependencies to make testing easier.

3. **Mock at boundaries** - Mock external services, not internal functions.

4. **Test error paths** - Verify error handling works correctly.

5. **Use realistic mocks** - Make mock jobs match real job structure.

6. **Test edge cases** - Empty arrays, null values, boundary conditions.

7. **Verify side effects** - Check that services are called correctly.

8. **Keep tests fast** - Unit tests should run in milliseconds.

9. **Use descriptive names** - Test names should explain what they verify.

10. **Maintain test coverage** - Aim for high coverage of business logic.

## Conclusion

Unit testing BullMQ code effectively requires separating business logic from queue infrastructure. By using dependency injection and creating realistic mock objects, you can write fast, reliable tests that verify your processors handle all scenarios correctly. Focus on testing business logic in isolation, and save integration tests for verifying queue behavior.
