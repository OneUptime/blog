# How to Configure Integration Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, Integration Tests, Docker, Testcontainers, CI/CD

Description: Learn how to configure and run integration tests that verify your application works correctly with real databases, APIs, and external services.

---

Integration tests verify that different parts of your application work together correctly. Unlike unit tests that isolate individual components, integration tests exercise the real interactions between your code, databases, message queues, and external services. This guide covers how to set up a robust integration testing environment that runs reliably both locally and in CI.

## Integration Test Architecture

A well-designed integration test setup isolates test runs while using real dependencies:

```mermaid
flowchart TD
    subgraph "Test Environment"
        A[Test Runner] --> B[Application Code]
        B --> C[Test Database]
        B --> D[Test Redis]
        B --> E[Test Message Queue]
    end

    subgraph "Isolation Strategy"
        F[Docker Containers] --> C
        F --> D
        F --> E
        G[Transactions/Cleanup] --> C
    end

    A --> H[Test Data Factories]
    H --> C
```

## Setting Up Testcontainers

Testcontainers lets you spin up real Docker containers for each test run. This ensures tests run against actual services rather than mocks.

```bash
npm install testcontainers --save-dev
```

### Basic Database Container Setup

```javascript
// tests/integration/setup.js
const { GenericContainer, Wait } = require('testcontainers');
const { Pool } = require('pg');

let postgresContainer;
let pool;

// Start containers before all tests
async function setupIntegrationTests() {
  // Start PostgreSQL container
  postgresContainer = await new GenericContainer('postgres:15')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'testdb'
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready'))
    .start();

  // Get the mapped port (container port 5432 maps to random host port)
  const mappedPort = postgresContainer.getMappedPort(5432);
  const host = postgresContainer.getHost();

  // Create connection pool
  pool = new Pool({
    host,
    port: mappedPort,
    user: 'test',
    password: 'test',
    database: 'testdb'
  });

  // Run migrations
  await runMigrations(pool);

  return { pool, postgresContainer };
}

// Clean up after all tests
async function teardownIntegrationTests() {
  if (pool) {
    await pool.end();
  }
  if (postgresContainer) {
    await postgresContainer.stop();
  }
}

module.exports = { setupIntegrationTests, teardownIntegrationTests };
```

### Using Containers in Tests

```javascript
// tests/integration/user.integration.test.js
const { setupIntegrationTests, teardownIntegrationTests } = require('./setup');
const { UserRepository } = require('../../src/repositories/user');
const { UserService } = require('../../src/services/user');

describe('User Integration Tests', () => {
  let pool;
  let userRepository;
  let userService;

  // Setup containers before all tests in this file
  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    pool = setup.pool;
    userRepository = new UserRepository(pool);
    userService = new UserService(userRepository);
  }, 60000);  // 60 second timeout for container startup

  // Clean up after all tests
  afterAll(async () => {
    await teardownIntegrationTests();
  });

  // Clean database between tests
  beforeEach(async () => {
    await pool.query('DELETE FROM users');
  });

  it('should create and retrieve user from database', async () => {
    // Create user through service layer
    const created = await userService.createUser({
      email: 'test@example.com',
      name: 'Test User'
    });

    expect(created.id).toBeDefined();

    // Retrieve from database directly to verify persistence
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [created.id]
    );

    expect(result.rows[0].email).toBe('test@example.com');
    expect(result.rows[0].name).toBe('Test User');
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await userService.createUser({
      email: 'duplicate@example.com',
      name: 'First User'
    });

    // Attempt duplicate email
    await expect(userService.createUser({
      email: 'duplicate@example.com',
      name: 'Second User'
    })).rejects.toThrow('Email already exists');
  });
});
```

## Docker Compose for Complex Setups

For applications with multiple services, Docker Compose provides easier orchestration:

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - "5432"  # Random port mapping
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672"
      - "15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 10s
      retries: 5

  localstack:
    image: localstack/localstack
    ports:
      - "4566"
    environment:
      SERVICES: s3,sqs,sns
      DEFAULT_REGION: us-east-1
```

### Script to Manage Test Environment

```bash
#!/bin/bash
# scripts/integration-test.sh

set -e

# Start services
echo "Starting test services..."
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
docker-compose -f docker-compose.test.yml exec -T postgres pg_isready -U test
docker-compose -f docker-compose.test.yml exec -T redis redis-cli ping

# Get dynamic ports
export TEST_POSTGRES_PORT=$(docker-compose -f docker-compose.test.yml port postgres 5432 | cut -d: -f2)
export TEST_REDIS_PORT=$(docker-compose -f docker-compose.test.yml port redis 6379 | cut -d: -f2)

echo "PostgreSQL available on port $TEST_POSTGRES_PORT"
echo "Redis available on port $TEST_REDIS_PORT"

# Run tests
npm run test:integration

# Cleanup
echo "Cleaning up..."
docker-compose -f docker-compose.test.yml down -v
```

## Test Data Management

Managing test data is crucial for reliable integration tests. Use transactions or explicit cleanup to maintain isolation.

### Transaction-Based Isolation

```javascript
// tests/integration/transaction-wrapper.js
class TestTransaction {
  constructor(pool) {
    this.pool = pool;
    this.client = null;
  }

  async begin() {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
    return this.client;
  }

  async rollback() {
    if (this.client) {
      await this.client.query('ROLLBACK');
      this.client.release();
    }
  }
}

// Usage in tests
describe('Order Processing', () => {
  let transaction;
  let client;

  beforeEach(async () => {
    transaction = new TestTransaction(pool);
    client = await transaction.begin();

    // Inject transaction client into repositories
    orderRepository.setClient(client);
    userRepository.setClient(client);
  });

  afterEach(async () => {
    // Rollback undoes all changes, leaving database clean
    await transaction.rollback();
  });

  it('should create order with items', async () => {
    const user = await userRepository.create({ name: 'Test' });
    const order = await orderRepository.create({
      userId: user.id,
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    // Verify data was written
    const found = await orderRepository.findById(order.id);
    expect(found.items).toHaveLength(1);

    // After test, rollback removes all data
  });
});
```

### Factory Functions for Test Data

```javascript
// tests/factories/index.js
const { faker } = require('@faker-js/faker');

class TestDataFactory {
  constructor(pool) {
    this.pool = pool;
  }

  async createUser(overrides = {}) {
    const user = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      ...overrides
    };

    await this.pool.query(
      'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
      [user.id, user.email, user.name]
    );

    return user;
  }

  async createOrder(userId, overrides = {}) {
    const order = {
      id: faker.string.uuid(),
      userId,
      status: 'pending',
      total: faker.number.int({ min: 100, max: 10000 }),
      ...overrides
    };

    await this.pool.query(
      'INSERT INTO orders (id, user_id, status, total) VALUES ($1, $2, $3, $4)',
      [order.id, order.userId, order.status, order.total]
    );

    return order;
  }

  // Create complex scenarios with related data
  async createUserWithOrders(orderCount = 3) {
    const user = await this.createUser();
    const orders = [];

    for (let i = 0; i < orderCount; i++) {
      orders.push(await this.createOrder(user.id));
    }

    return { user, orders };
  }
}
```

## API Integration Testing

Test your HTTP endpoints against real services:

```javascript
// tests/integration/api.integration.test.js
const request = require('supertest');
const { setupIntegrationTests, teardownIntegrationTests } = require('./setup');
const { createApp } = require('../../src/app');

describe('API Integration Tests', () => {
  let app;
  let pool;
  let factory;

  beforeAll(async () => {
    const setup = await setupIntegrationTests();
    pool = setup.pool;
    factory = new TestDataFactory(pool);

    // Create app with test database connection
    app = createApp({ pool });
  }, 60000);

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM users');
  });

  describe('POST /api/users', () => {
    it('should create user and return 201', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'test@example.com', name: 'Test User' })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe('test@example.com');

      // Verify database state
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(result.rows).toHaveLength(1);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'invalid', name: 'Test' })
        .expect(400);

      expect(response.body.error).toContain('email');
    });
  });

  describe('GET /api/users/:id/orders', () => {
    it('should return user orders with pagination', async () => {
      // Setup test data
      const { user, orders } = await factory.createUserWithOrders(5);

      // Request first page
      const response = await request(app)
        .get(`/api/users/${user.id}/orders`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(5);
      expect(response.body.hasMore).toBe(true);
    });
  });
});
```

## CI/CD Configuration

Configure your CI pipeline to run integration tests with proper service dependencies:

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main]
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

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: coverage/
```

## Jest Configuration for Integration Tests

Separate integration tests from unit tests with dedicated configuration:

```javascript
// jest.integration.config.js
module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.js'],
  setupFilesAfterEnv: ['./tests/integration/jest.setup.js'],
  testTimeout: 30000,  // Longer timeout for real operations
  maxWorkers: 1,       // Run serially to avoid resource conflicts
  globalSetup: './tests/integration/global-setup.js',
  globalTeardown: './tests/integration/global-teardown.js'
};
```

```javascript
// tests/integration/jest.setup.js
// Runs before each test file

beforeAll(() => {
  // Increase default timeout for integration tests
  jest.setTimeout(30000);
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
```

## Summary

| Component | Purpose |
|-----------|---------|
| Testcontainers | Spin up real services in Docker |
| Docker Compose | Orchestrate multiple services |
| Transaction isolation | Rollback changes after each test |
| Factory functions | Create consistent test data |
| Supertest | Test HTTP endpoints |
| CI services | Run dependencies in pipelines |

Integration tests give you confidence that your application works correctly in a real environment. The key is balancing test isolation with realistic conditions. Use real databases and services, but ensure each test starts from a clean state and does not affect other tests.
