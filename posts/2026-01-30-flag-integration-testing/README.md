# How to Build Flag Integration Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Feature Flags, Integration Testing, QA, Testing

Description: Learn how to integration test feature flag behaviors across services.

---

Feature flags are powerful tools for controlling software behavior, but they introduce complexity that requires dedicated testing strategies. When flags span multiple services, affect API contracts, or influence performance characteristics, you need integration tests that verify flag behavior in realistic conditions. This guide covers practical patterns for building comprehensive flag integration testing.

## Why Feature Flag Integration Testing Matters

Unit tests verify flag evaluation logic, but they miss the broader implications:

| Unit Tests Catch | Integration Tests Catch |
|------------------|------------------------|
| Flag parsing logic | Cross-service flag consistency |
| Default value handling | API contract changes with flags |
| Local evaluation rules | Database state with flag variations |
| Configuration loading | Performance impact of flag paths |
| Type coercion | End-to-end user experience |

Integration tests answer: "When this flag is ON across all services, does the system behave correctly?"

---

## Test Environment Setup

### Architecture Overview

A proper flag integration test environment requires isolated infrastructure that mirrors production without affecting real users or data.

```mermaid
flowchart TB
    subgraph Test Environment
        TC[Test Controller]
        FMS[Flag Management Service]
        DB[(Test Database)]

        subgraph Services Under Test
            API[API Gateway]
            SVC1[Service A]
            SVC2[Service B]
            SVC3[Service C]
        end
    end

    TC -->|Configure Flags| FMS
    TC -->|Trigger Tests| API
    FMS -->|Propagate State| API
    FMS -->|Propagate State| SVC1
    FMS -->|Propagate State| SVC2
    FMS -->|Propagate State| SVC3
    API --> SVC1
    SVC1 --> SVC2
    SVC2 --> SVC3
    SVC1 --> DB
    SVC2 --> DB
    SVC3 --> DB
```

### Docker Compose Test Environment

Create an isolated environment where flag state is fully controllable:

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  # Flag service with test-specific configuration
  flag-service:
    image: your-flag-service:latest
    environment:
      - ENV=test
      - FLAG_SYNC_INTERVAL=100ms  # Fast sync for tests
      - PERSISTENCE_MODE=memory   # Ephemeral storage
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 2s
      timeout: 5s
      retries: 3

  # Service A - consumes flags
  service-a:
    image: service-a:latest
    environment:
      - FLAG_SERVICE_URL=http://flag-service:8080
      - FLAG_POLL_INTERVAL=50ms
      - DATABASE_URL=postgres://test:test@postgres:5432/testdb
    depends_on:
      flag-service:
        condition: service_healthy
      postgres:
        condition: service_healthy

  # Service B - consumes flags
  service-b:
    image: service-b:latest
    environment:
      - FLAG_SERVICE_URL=http://flag-service:8080
      - FLAG_POLL_INTERVAL=50ms
      - SERVICE_A_URL=http://service-a:3000
    depends_on:
      flag-service:
        condition: service_healthy
      service-a:
        condition: service_healthy

  # Test database
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=test
      - POSTGRES_PASSWORD=test
      - POSTGRES_DB=testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 2s
      timeout: 5s
      retries: 3

  # Test runner
  test-runner:
    build:
      context: ./tests
      dockerfile: Dockerfile.test
    environment:
      - FLAG_SERVICE_URL=http://flag-service:8080
      - SERVICE_A_URL=http://service-a:3000
      - SERVICE_B_URL=http://service-b:3000
    depends_on:
      - service-a
      - service-b
    volumes:
      - ./test-results:/app/results
```

### Test Environment Initialization

Initialize the test environment with known state before each test suite:

```typescript
// tests/setup/environment.ts
import { FlagClient } from './flag-client';
import { DatabaseClient } from './db-client';

interface TestEnvironment {
  flags: FlagClient;
  db: DatabaseClient;
  services: ServiceClients;
}

export async function initializeTestEnvironment(): Promise<TestEnvironment> {
  const flags = new FlagClient(process.env.FLAG_SERVICE_URL!);
  const db = new DatabaseClient(process.env.DATABASE_URL!);

  // Wait for all services to be ready
  await waitForServices([
    { url: process.env.FLAG_SERVICE_URL!, name: 'flag-service' },
    { url: process.env.SERVICE_A_URL!, name: 'service-a' },
    { url: process.env.SERVICE_B_URL!, name: 'service-b' },
  ]);

  // Reset to known state
  await flags.resetAllFlags();
  await db.truncateAllTables();
  await db.seedTestData();

  return {
    flags,
    db,
    services: {
      serviceA: new ServiceAClient(process.env.SERVICE_A_URL!),
      serviceB: new ServiceBClient(process.env.SERVICE_B_URL!),
    },
  };
}

async function waitForServices(
  services: { url: string; name: string }[],
  maxAttempts = 30
): Promise<void> {
  for (const service of services) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${service.url}/health`);
        if (response.ok) break;
      } catch {
        // Service not ready yet
      }
      attempts++;
      await sleep(1000);
    }
    if (attempts === maxAttempts) {
      throw new Error(`Service ${service.name} failed to become healthy`);
    }
  }
}
```

---

## Flag State Management in Tests

### The Flag Test Client

Create a dedicated client for manipulating flag state during tests. This client should support atomic operations and provide synchronization guarantees.

```typescript
// tests/utils/flag-client.ts
interface Flag {
  key: string;
  enabled: boolean;
  variants?: Record<string, any>;
  rules?: TargetingRule[];
}

interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'contains' | 'in' | 'matches';
  value: any;
  variant: string;
}

export class FlagClient {
  private baseUrl: string;
  private originalStates: Map<string, Flag> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Set a flag and track original state for cleanup
  async setFlag(key: string, config: Partial<Flag>): Promise<void> {
    // Store original state if not already stored
    if (!this.originalStates.has(key)) {
      const original = await this.getFlag(key);
      this.originalStates.set(key, original);
    }

    await fetch(`${this.baseUrl}/api/flags/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    // Wait for propagation to all services
    await this.waitForPropagation(key, config);
  }

  // Enable a flag (simple toggle)
  async enableFlag(key: string): Promise<void> {
    await this.setFlag(key, { enabled: true });
  }

  // Disable a flag
  async disableFlag(key: string): Promise<void> {
    await this.setFlag(key, { enabled: false });
  }

  // Set flag with targeting rules
  async setFlagWithTargeting(
    key: string,
    rules: TargetingRule[]
  ): Promise<void> {
    await this.setFlag(key, { enabled: true, rules });
  }

  // Get current flag state
  async getFlag(key: string): Promise<Flag> {
    const response = await fetch(`${this.baseUrl}/api/flags/${key}`);
    return response.json();
  }

  // Wait for flag change to propagate to all services
  private async waitForPropagation(
    key: string,
    expectedConfig: Partial<Flag>,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now();
    const services = [
      process.env.SERVICE_A_URL,
      process.env.SERVICE_B_URL,
    ];

    for (const serviceUrl of services) {
      while (Date.now() - startTime < timeout) {
        const response = await fetch(
          `${serviceUrl}/internal/flags/${key}/state`
        );
        const state = await response.json();

        if (state.enabled === expectedConfig.enabled) {
          break;
        }
        await sleep(50);
      }
    }
  }

  // Reset all flags to original state (call in afterEach)
  async resetAllFlags(): Promise<void> {
    for (const [key, original] of this.originalStates) {
      await fetch(`${this.baseUrl}/api/flags/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(original),
      });
    }
    this.originalStates.clear();
  }

  // Bulk set flags atomically
  async setFlags(flags: Record<string, Partial<Flag>>): Promise<void> {
    // Store originals
    for (const key of Object.keys(flags)) {
      if (!this.originalStates.has(key)) {
        const original = await this.getFlag(key);
        this.originalStates.set(key, original);
      }
    }

    // Atomic bulk update
    await fetch(`${this.baseUrl}/api/flags/bulk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flags),
    });

    // Wait for all to propagate
    await Promise.all(
      Object.entries(flags).map(([key, config]) =>
        this.waitForPropagation(key, config)
      )
    );
  }
}
```

### Test Fixtures with Flag States

Define reusable flag configurations for common test scenarios:

```typescript
// tests/fixtures/flag-scenarios.ts
export const FlagScenarios = {
  // All flags at default (production-like)
  production: {
    'new-checkout-flow': { enabled: false },
    'enhanced-search': { enabled: false },
    'beta-analytics': { enabled: false },
  },

  // Full feature rollout
  allFeaturesEnabled: {
    'new-checkout-flow': { enabled: true },
    'enhanced-search': { enabled: true },
    'beta-analytics': { enabled: true },
  },

  // Gradual rollout simulation
  partialRollout: {
    'new-checkout-flow': {
      enabled: true,
      rules: [
        {
          attribute: 'user.percentile',
          operator: 'lessThan',
          value: 25,
          variant: 'enabled',
        },
      ],
    },
  },

  // Beta users only
  betaOnly: {
    'new-checkout-flow': {
      enabled: true,
      rules: [
        {
          attribute: 'user.tier',
          operator: 'equals',
          value: 'beta',
          variant: 'enabled',
        },
      ],
    },
  },
} as const;

// Helper to apply a scenario
export async function applyScenario(
  flags: FlagClient,
  scenario: keyof typeof FlagScenarios
): Promise<void> {
  await flags.setFlags(FlagScenarios[scenario]);
}
```

### Managing Flag State Lifecycle

The test lifecycle diagram shows how flag state flows through setup, execution, and teardown:

```mermaid
sequenceDiagram
    participant Test as Test Runner
    participant FC as Flag Client
    participant FS as Flag Service
    participant SVC as Services

    Note over Test,SVC: Test Setup
    Test->>FC: Store original flag states
    FC->>FS: GET /api/flags
    FS-->>FC: Current states
    FC->>FC: Cache in originalStates

    Test->>FC: setFlags(testConfig)
    FC->>FS: PUT /api/flags/bulk
    FS->>SVC: Push flag updates
    FC->>SVC: Poll until propagated
    SVC-->>FC: Confirmed

    Note over Test,SVC: Test Execution
    Test->>SVC: Execute test requests
    SVC->>SVC: Evaluate flags
    SVC-->>Test: Responses

    Note over Test,SVC: Test Teardown
    Test->>FC: resetAllFlags()
    FC->>FS: PUT original states
    FS->>SVC: Push original flags
```

---

## Cross-Service Flag Testing

### Testing Flag Consistency Across Services

When a flag affects multiple services, verify they all see the same state and behave consistently:

```typescript
// tests/integration/cross-service-flags.test.ts
import { initializeTestEnvironment } from '../setup/environment';

describe('Cross-Service Flag Consistency', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment();
  });

  afterEach(async () => {
    await env.flags.resetAllFlags();
  });

  it('should apply checkout flag consistently across services', async () => {
    // Enable the new checkout flow
    await env.flags.enableFlag('new-checkout-flow');

    // Create a test user context
    const userContext = {
      userId: 'test-user-123',
      sessionId: 'session-abc',
    };

    // Service A should use new checkout validation
    const validationResponse = await env.services.serviceA.validateCart(
      userContext,
      { items: [{ sku: 'ITEM-1', qty: 2 }] }
    );
    expect(validationResponse.validationVersion).toBe('v2');

    // Service B should use new checkout pricing
    const pricingResponse = await env.services.serviceB.calculatePricing(
      userContext,
      { items: [{ sku: 'ITEM-1', qty: 2 }] }
    );
    expect(pricingResponse.pricingEngine).toBe('v2');

    // End-to-end checkout should use new flow
    const checkoutResponse = await env.services.serviceA.checkout(
      userContext,
      { items: [{ sku: 'ITEM-1', qty: 2 }], paymentMethod: 'test' }
    );
    expect(checkoutResponse.flowVersion).toBe('v2');
    expect(checkoutResponse.steps).toContain('enhanced-confirmation');
  });

  it('should handle flag state changes mid-request gracefully', async () => {
    // Start with flag disabled
    await env.flags.disableFlag('new-checkout-flow');

    // Begin a long-running operation
    const operationPromise = env.services.serviceA.startLongCheckout({
      userId: 'test-user-456',
      items: [{ sku: 'ITEM-1', qty: 1 }],
    });

    // Change flag mid-operation
    await sleep(100); // Let operation start
    await env.flags.enableFlag('new-checkout-flow');

    // Operation should complete with original flag state
    // (flag state is captured at request start)
    const result = await operationPromise;
    expect(result.flowVersion).toBe('v1'); // Original version
  });

  it('should maintain flag consistency in distributed transactions', async () => {
    await env.flags.enableFlag('new-inventory-reservation');

    const orderContext = {
      orderId: 'order-789',
      userId: 'user-123',
    };

    // Start distributed transaction
    const txResult = await env.services.serviceA.createOrderWithInventory(
      orderContext,
      {
        items: [
          { sku: 'ITEM-1', qty: 5 },
          { sku: 'ITEM-2', qty: 3 },
        ],
      }
    );

    // Verify all services used the same flag state
    expect(txResult.inventoryReservationVersion).toBe('v2');
    expect(txResult.paymentProcessingVersion).toBe('v2');
    expect(txResult.allServicesConsistent).toBe(true);

    // Check database state reflects new flow
    const order = await env.db.getOrder(orderContext.orderId);
    expect(order.processingMetadata.flagVersion).toBe('new-inventory-reservation:enabled');
  });
});
```

### Testing Flag Targeting Rules

Verify that targeting rules work correctly when evaluated by different services:

```typescript
// tests/integration/targeting-rules.test.ts
describe('Flag Targeting Rules', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment();
  });

  afterEach(async () => {
    await env.flags.resetAllFlags();
  });

  it('should apply percentage-based rollout consistently', async () => {
    // Configure 50% rollout
    await env.flags.setFlagWithTargeting('new-feature', [
      {
        attribute: 'user.id',
        operator: 'percentile',
        value: 50,
        variant: 'enabled',
      },
    ]);

    const results = {
      enabled: 0,
      disabled: 0,
    };

    // Test with 100 deterministic user IDs
    for (let i = 0; i < 100; i++) {
      const userId = `test-user-${i.toString().padStart(3, '0')}`;
      const response = await env.services.serviceA.checkFeature(
        { userId },
        'new-feature'
      );

      if (response.enabled) {
        results.enabled++;
      } else {
        results.disabled++;
      }
    }

    // Should be roughly 50/50 (allow some variance)
    expect(results.enabled).toBeGreaterThan(40);
    expect(results.enabled).toBeLessThan(60);

    // Verify same users get same result on retry (deterministic)
    const user42Result1 = await env.services.serviceA.checkFeature(
      { userId: 'test-user-042' },
      'new-feature'
    );
    const user42Result2 = await env.services.serviceA.checkFeature(
      { userId: 'test-user-042' },
      'new-feature'
    );
    expect(user42Result1.enabled).toBe(user42Result2.enabled);
  });

  it('should apply attribute-based targeting across services', async () => {
    // Enable for enterprise tier only
    await env.flags.setFlagWithTargeting('enterprise-feature', [
      {
        attribute: 'account.tier',
        operator: 'equals',
        value: 'enterprise',
        variant: 'enabled',
      },
    ]);

    const enterpriseUser = {
      userId: 'ent-user-1',
      accountTier: 'enterprise',
    };
    const standardUser = {
      userId: 'std-user-1',
      accountTier: 'standard',
    };

    // Enterprise user should see feature in both services
    const entResponseA = await env.services.serviceA.checkFeature(
      enterpriseUser,
      'enterprise-feature'
    );
    const entResponseB = await env.services.serviceB.checkFeature(
      enterpriseUser,
      'enterprise-feature'
    );
    expect(entResponseA.enabled).toBe(true);
    expect(entResponseB.enabled).toBe(true);

    // Standard user should not see feature
    const stdResponseA = await env.services.serviceA.checkFeature(
      standardUser,
      'enterprise-feature'
    );
    const stdResponseB = await env.services.serviceB.checkFeature(
      standardUser,
      'enterprise-feature'
    );
    expect(stdResponseA.enabled).toBe(false);
    expect(stdResponseB.enabled).toBe(false);
  });
});
```

---

## API Contract Testing with Flags

### Testing Response Schema Changes

Feature flags often introduce new response fields or modify existing ones. Contract tests verify both old and new schemas work correctly:

```typescript
// tests/contracts/api-contracts.test.ts
import Ajv from 'ajv';

const ajv = new Ajv();

// Schema for legacy checkout response
const legacyCheckoutSchema = {
  type: 'object',
  required: ['orderId', 'total', 'status'],
  properties: {
    orderId: { type: 'string' },
    total: { type: 'number' },
    status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sku', 'price'],
        properties: {
          sku: { type: 'string' },
          price: { type: 'number' },
        },
      },
    },
  },
  additionalProperties: false,
};

// Schema for new checkout response (flag enabled)
const newCheckoutSchema = {
  type: 'object',
  required: ['orderId', 'total', 'status', 'breakdown', 'estimatedDelivery'],
  properties: {
    orderId: { type: 'string' },
    total: { type: 'number' },
    status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
    breakdown: {
      type: 'object',
      required: ['subtotal', 'tax', 'shipping', 'discount'],
      properties: {
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        shipping: { type: 'number' },
        discount: { type: 'number' },
      },
    },
    estimatedDelivery: { type: 'string', format: 'date-time' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sku', 'price', 'quantity', 'lineTotal'],
        properties: {
          sku: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'number' },
          lineTotal: { type: 'number' },
        },
      },
    },
  },
};

describe('Checkout API Contract Tests', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment();
  });

  afterEach(async () => {
    await env.flags.resetAllFlags();
  });

  it('should return legacy schema when flag disabled', async () => {
    await env.flags.disableFlag('new-checkout-response');

    const response = await env.services.serviceA.checkout(
      { userId: 'test-user' },
      { items: [{ sku: 'ITEM-1', qty: 1 }], paymentMethod: 'test' }
    );

    const validate = ajv.compile(legacyCheckoutSchema);
    const valid = validate(response);

    expect(valid).toBe(true);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }
  });

  it('should return new schema when flag enabled', async () => {
    await env.flags.enableFlag('new-checkout-response');

    const response = await env.services.serviceA.checkout(
      { userId: 'test-user' },
      { items: [{ sku: 'ITEM-1', qty: 1 }], paymentMethod: 'test' }
    );

    const validate = ajv.compile(newCheckoutSchema);
    const valid = validate(response);

    expect(valid).toBe(true);
    if (!valid) {
      console.error('Validation errors:', validate.errors);
    }

    // Verify new fields are populated correctly
    expect(response.breakdown).toBeDefined();
    expect(response.breakdown.subtotal).toBeGreaterThan(0);
    expect(response.estimatedDelivery).toBeDefined();
  });

  it('should maintain backward compatibility during transition', async () => {
    // Simulate gradual rollout - test both schemas work
    const testCases = [
      { flagEnabled: false, schema: legacyCheckoutSchema },
      { flagEnabled: true, schema: newCheckoutSchema },
    ];

    for (const testCase of testCases) {
      if (testCase.flagEnabled) {
        await env.flags.enableFlag('new-checkout-response');
      } else {
        await env.flags.disableFlag('new-checkout-response');
      }

      const response = await env.services.serviceA.checkout(
        { userId: 'test-user' },
        { items: [{ sku: 'ITEM-1', qty: 1 }], paymentMethod: 'test' }
      );

      // Core fields should always be present
      expect(response.orderId).toBeDefined();
      expect(response.total).toBeDefined();
      expect(response.status).toBeDefined();

      // Schema-specific validation
      const validate = ajv.compile(testCase.schema);
      expect(validate(response)).toBe(true);
    }
  });
});
```

### Consumer-Driven Contract Tests

Test that downstream consumers can handle both flag states:

```typescript
// tests/contracts/consumer-contracts.test.ts
import { Pact } from '@pact-foundation/pact';

describe('Consumer Contract: Mobile App -> Checkout API', () => {
  const provider = new Pact({
    consumer: 'MobileApp',
    provider: 'CheckoutService',
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  describe('with legacy checkout (flag off)', () => {
    beforeEach(async () => {
      await provider.addInteraction({
        state: 'new-checkout-response flag is disabled',
        uponReceiving: 'a checkout request',
        withRequest: {
          method: 'POST',
          path: '/api/checkout',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            items: [{ sku: 'ITEM-1', qty: 1 }],
            paymentMethod: 'card',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            orderId: Pact.string('order-123'),
            total: Pact.decimal(99.99),
            status: Pact.term({
              generate: 'completed',
              matcher: '^(pending|completed|failed)$',
            }),
          },
        },
      });
    });

    it('mobile app handles legacy response', async () => {
      const response = await mobileAppClient.checkout({
        items: [{ sku: 'ITEM-1', qty: 1 }],
        paymentMethod: 'card',
      });

      expect(response.orderId).toBeDefined();
      expect(response.total).toBeDefined();
    });
  });

  describe('with new checkout (flag on)', () => {
    beforeEach(async () => {
      await provider.addInteraction({
        state: 'new-checkout-response flag is enabled',
        uponReceiving: 'a checkout request',
        withRequest: {
          method: 'POST',
          path: '/api/checkout',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            items: [{ sku: 'ITEM-1', qty: 1 }],
            paymentMethod: 'card',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            orderId: Pact.string('order-123'),
            total: Pact.decimal(99.99),
            status: Pact.term({
              generate: 'completed',
              matcher: '^(pending|processing|completed|failed)$',
            }),
            breakdown: {
              subtotal: Pact.decimal(89.99),
              tax: Pact.decimal(7.00),
              shipping: Pact.decimal(3.00),
              discount: Pact.decimal(0),
            },
            estimatedDelivery: Pact.iso8601DateTime(),
          },
        },
      });
    });

    it('mobile app handles new response with breakdown', async () => {
      const response = await mobileAppClient.checkout({
        items: [{ sku: 'ITEM-1', qty: 1 }],
        paymentMethod: 'card',
      });

      expect(response.orderId).toBeDefined();
      expect(response.breakdown).toBeDefined();
      expect(response.estimatedDelivery).toBeDefined();
    });
  });
});
```

---

## Performance Testing with Flags

### Benchmarking Both Code Paths

Feature flags often introduce new code paths that may have different performance characteristics. Benchmark both paths:

```typescript
// tests/performance/flag-performance.test.ts
import autocannon from 'autocannon';

interface BenchmarkResult {
  flagState: string;
  requests: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  throughput: number;
  errors: number;
}

describe('Feature Flag Performance', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment();
  });

  afterEach(async () => {
    await env.flags.resetAllFlags();
  });

  async function runBenchmark(
    flagState: string,
    duration: number = 30
  ): Promise<BenchmarkResult> {
    const result = await autocannon({
      url: `${process.env.SERVICE_A_URL}/api/checkout`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'perf-test-user',
        items: [{ sku: 'ITEM-1', qty: 1 }],
        paymentMethod: 'test',
      }),
      duration,
      connections: 10,
      pipelining: 1,
    });

    return {
      flagState,
      requests: result.requests.total,
      latency: {
        p50: result.latency.p50,
        p95: result.latency.p95,
        p99: result.latency.p99,
        avg: result.latency.average,
      },
      throughput: result.throughput.average,
      errors: result.errors,
    };
  }

  it('should compare performance between flag states', async () => {
    // Benchmark with flag disabled (legacy path)
    await env.flags.disableFlag('new-checkout-flow');
    const legacyResult = await runBenchmark('disabled');

    // Benchmark with flag enabled (new path)
    await env.flags.enableFlag('new-checkout-flow');
    const newResult = await runBenchmark('enabled');

    console.table([legacyResult, newResult]);

    // New path should not be significantly slower
    const latencyRatio = newResult.latency.p95 / legacyResult.latency.p95;
    expect(latencyRatio).toBeLessThan(1.5); // Max 50% slower

    // No errors in either path
    expect(legacyResult.errors).toBe(0);
    expect(newResult.errors).toBe(0);
  });

  it('should maintain performance under flag evaluation load', async () => {
    // Set up complex targeting rules
    await env.flags.setFlagWithTargeting('complex-feature', [
      {
        attribute: 'user.segment',
        operator: 'in',
        value: ['enterprise', 'pro', 'growth'],
        variant: 'enabled',
      },
      {
        attribute: 'user.country',
        operator: 'in',
        value: ['US', 'CA', 'UK', 'DE', 'FR'],
        variant: 'enabled',
      },
      {
        attribute: 'user.createdAt',
        operator: 'greaterThan',
        value: '2024-01-01',
        variant: 'enabled',
      },
    ]);

    const result = await runBenchmark('complex-targeting');

    // Flag evaluation should not add significant latency
    expect(result.latency.p95).toBeLessThan(100); // Under 100ms
    expect(result.errors).toBe(0);
  });
});
```

### Load Testing Flag Service

Verify the flag service can handle evaluation load:

```typescript
// tests/performance/flag-service-load.test.ts
describe('Flag Service Load Test', () => {
  it('should handle high evaluation throughput', async () => {
    const result = await autocannon({
      url: `${process.env.FLAG_SERVICE_URL}/api/evaluate`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flagKey: 'new-checkout-flow',
        context: {
          userId: 'load-test-user',
          accountTier: 'enterprise',
        },
      }),
      duration: 60,
      connections: 50,
      pipelining: 10,
    });

    console.log('Flag evaluation performance:');
    console.log(`  Requests/sec: ${result.requests.average}`);
    console.log(`  P99 latency: ${result.latency.p99}ms`);

    // Flag evaluations should be fast
    expect(result.latency.p99).toBeLessThan(10); // Under 10ms
    expect(result.errors).toBe(0);
  });

  it('should handle bulk evaluation requests', async () => {
    const result = await autocannon({
      url: `${process.env.FLAG_SERVICE_URL}/api/evaluate/bulk`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flags: [
          'new-checkout-flow',
          'enhanced-search',
          'beta-analytics',
          'new-pricing-engine',
          'experimental-ui',
        ],
        context: {
          userId: 'load-test-user',
          accountTier: 'enterprise',
        },
      }),
      duration: 60,
      connections: 20,
    });

    expect(result.latency.p99).toBeLessThan(25); // Under 25ms for bulk
    expect(result.errors).toBe(0);
  });
});
```

---

## CI/CD Integration

### Pipeline Configuration

Integrate flag integration tests into your CI/CD pipeline:

```yaml
# .github/workflows/flag-integration-tests.yml
name: Flag Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build test images
        run: |
          docker compose -f docker-compose.test.yml build

      - name: Start test environment
        run: |
          docker compose -f docker-compose.test.yml up -d
          ./scripts/wait-for-services.sh

      - name: Run flag integration tests
        run: |
          docker compose -f docker-compose.test.yml run \
            --rm test-runner npm run test:integration

      - name: Run contract tests
        run: |
          docker compose -f docker-compose.test.yml run \
            --rm test-runner npm run test:contracts

      - name: Run performance baseline
        run: |
          docker compose -f docker-compose.test.yml run \
            --rm test-runner npm run test:performance

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: ./test-results/

      - name: Cleanup
        if: always()
        run: |
          docker compose -f docker-compose.test.yml down -v

  # Matrix testing for flag combinations
  flag-matrix-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        flag-scenario:
          - production
          - allFeaturesEnabled
          - partialRollout
          - betaOnly

    steps:
      - uses: actions/checkout@v4

      - name: Start test environment
        run: |
          docker compose -f docker-compose.test.yml up -d
          ./scripts/wait-for-services.sh

      - name: Apply flag scenario
        run: |
          ./scripts/apply-flag-scenario.sh ${{ matrix.flag-scenario }}

      - name: Run scenario tests
        run: |
          docker compose -f docker-compose.test.yml run \
            --rm test-runner npm run test:scenario -- \
            --scenario=${{ matrix.flag-scenario }}

      - name: Cleanup
        if: always()
        run: |
          docker compose -f docker-compose.test.yml down -v
```

### Flag Change Verification

Automatically test flag changes before deployment:

```typescript
// scripts/verify-flag-change.ts
import { FlagClient } from '../tests/utils/flag-client';
import { runIntegrationTests } from '../tests/runner';

interface FlagChange {
  key: string;
  oldValue: any;
  newValue: any;
}

async function verifyFlagChange(change: FlagChange): Promise<boolean> {
  const flags = new FlagClient(process.env.FLAG_SERVICE_URL!);

  console.log(`Verifying flag change: ${change.key}`);
  console.log(`  Old: ${JSON.stringify(change.oldValue)}`);
  console.log(`  New: ${JSON.stringify(change.newValue)}`);

  // Test with old value (current production state)
  console.log('\nTesting with current (old) value...');
  await flags.setFlag(change.key, change.oldValue);
  const oldResults = await runIntegrationTests({
    filter: `flag:${change.key}`,
    bail: true,
  });

  if (!oldResults.success) {
    console.error('Tests failed with old value - environment issue');
    return false;
  }

  // Test with new value (proposed change)
  console.log('\nTesting with proposed (new) value...');
  await flags.setFlag(change.key, change.newValue);
  const newResults = await runIntegrationTests({
    filter: `flag:${change.key}`,
    bail: false, // Run all tests to see full impact
  });

  if (!newResults.success) {
    console.error('Tests failed with new value:');
    newResults.failures.forEach((f) => {
      console.error(`  - ${f.testName}: ${f.error}`);
    });
    return false;
  }

  console.log('\nFlag change verification passed!');
  return true;
}

// CLI usage
const change: FlagChange = JSON.parse(process.argv[2]);
verifyFlagChange(change)
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

### Test Reporting

Generate comprehensive test reports for flag states:

```typescript
// tests/reporters/flag-test-reporter.ts
interface FlagTestReport {
  timestamp: string;
  flagStates: Record<string, boolean>;
  testResults: {
    passed: number;
    failed: number;
    skipped: number;
  };
  performance: {
    legacyPath: PerformanceMetrics;
    newPath: PerformanceMetrics;
    comparison: string;
  };
  contractCompliance: {
    legacy: boolean;
    new: boolean;
  };
}

export class FlagTestReporter {
  async generateReport(
    flags: FlagClient,
    testResults: TestResult[],
    perfResults: BenchmarkResult[]
  ): Promise<FlagTestReport> {
    const flagStates = await flags.getAllFlagStates();

    const report: FlagTestReport = {
      timestamp: new Date().toISOString(),
      flagStates,
      testResults: {
        passed: testResults.filter((t) => t.status === 'passed').length,
        failed: testResults.filter((t) => t.status === 'failed').length,
        skipped: testResults.filter((t) => t.status === 'skipped').length,
      },
      performance: this.analyzePerformance(perfResults),
      contractCompliance: this.analyzeContracts(testResults),
    };

    return report;
  }

  private analyzePerformance(results: BenchmarkResult[]) {
    const legacy = results.find((r) => r.flagState === 'disabled');
    const newPath = results.find((r) => r.flagState === 'enabled');

    const ratio = newPath!.latency.p95 / legacy!.latency.p95;
    let comparison = 'equivalent';
    if (ratio > 1.2) comparison = 'degraded';
    if (ratio < 0.8) comparison = 'improved';

    return {
      legacyPath: legacy!,
      newPath: newPath!,
      comparison,
    };
  }

  private analyzeContracts(results: TestResult[]) {
    const legacyContract = results.find(
      (t) => t.name === 'legacy schema validation'
    );
    const newContract = results.find(
      (t) => t.name === 'new schema validation'
    );

    return {
      legacy: legacyContract?.status === 'passed',
      new: newContract?.status === 'passed',
    };
  }
}
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Isolate test environments** | Use Docker Compose with ephemeral storage for reproducible tests |
| **Track flag state** | Always store and restore original flag states after tests |
| **Wait for propagation** | Poll services to confirm flag changes are applied before testing |
| **Test both paths** | Every flag-controlled feature needs tests for enabled and disabled states |
| **Contract tests** | Verify API schemas remain compatible during flag-controlled transitions |
| **Performance baselines** | Benchmark both code paths to catch performance regressions |
| **Matrix testing** | Test multiple flag combination scenarios in CI |
| **Deterministic targeting** | Use consistent user IDs for percentage-based rollout tests |

---

## Common Pitfalls to Avoid

| Pitfall | Solution |
|---------|----------|
| Flaky tests from propagation delays | Implement proper wait/poll mechanisms for flag sync |
| Tests affecting production flags | Use isolated flag service instances or namespaced environments |
| Missing cleanup | Always reset flags in afterEach hooks |
| Testing only happy paths | Include error scenarios, edge cases, and flag state transitions |
| Ignoring performance | Benchmark both paths; new features should not degrade performance |
| Hard-coded flag states | Use fixtures and scenarios for maintainable test configurations |

---

## Summary

```mermaid
flowchart LR
    subgraph Test Types
        UT[Unit Tests]
        IT[Integration Tests]
        CT[Contract Tests]
        PT[Performance Tests]
    end

    subgraph Flag Testing Layers
        FE[Flag Evaluation]
        CS[Cross-Service]
        API[API Contracts]
        PERF[Performance]
    end

    UT --> FE
    IT --> CS
    CT --> API
    PT --> PERF

    subgraph CI/CD
        PR[Pull Request]
        MAIN[Main Branch]
        DEPLOY[Deploy]
    end

    FE --> PR
    CS --> PR
    API --> MAIN
    PERF --> DEPLOY
```

Integration testing for feature flags requires thinking about flags as first-class system behavior, not just configuration. By setting up isolated environments, managing flag state carefully, testing cross-service consistency, validating API contracts, and monitoring performance, you can confidently roll out features while maintaining system reliability.

The investment in flag integration testing pays dividends when you can enable or disable features in production knowing that both states have been thoroughly verified across your entire system.

---

*Looking to implement feature flags with built-in observability? [OneUptime](https://oneuptime.com) provides feature flag monitoring alongside your metrics, logs, and traces for complete visibility into flag-driven behaviors.*
