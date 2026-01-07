# How to Write Integration Tests for Node.js APIs with Testcontainers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Tests, Database, Docker, DevOps

Description: Learn to write reliable integration tests for Node.js APIs using Testcontainers to spin up real databases, Redis, and other services in isolated Docker containers.

---

Unit tests with mocks can only take you so far. Real bugs often hide in the interaction between your code and actual databases, caches, and message queues. Testcontainers lets you spin up real services in Docker containers for integration tests, giving you confidence that your code works in production-like conditions.

## Why Testcontainers?

| Approach | Pros | Cons |
|----------|------|------|
| **Mocks** | Fast, isolated | Miss real behavior |
| **Shared test DB** | Real database | Test pollution, conflicts |
| **Local services** | Real database | Environment-specific |
| **Testcontainers** | Real, isolated, reproducible | Slightly slower |

## Basic Setup

Install the required dependencies for Testcontainers and Jest. The testcontainers package provides Docker container management, while Jest handles test execution.

```bash
# Install testcontainers for Docker container management in tests
npm install testcontainers --save-dev
# Install Jest as the test runner
npm install jest @types/jest --save-dev
```

### PostgreSQL Integration Test

This example demonstrates a complete integration test setup for a UserRepository class. The test spins up a real PostgreSQL container, runs migrations, and tests actual database operations to ensure your code works with a real database.

```javascript
// tests/integration/user.test.js
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { Pool } = require('pg');
const { UserRepository } = require('../../src/repositories/user');

describe('UserRepository Integration Tests', () => {
  // Container and connection references - initialized before tests
  let container;
  let pool;
  let userRepo;

  beforeAll(async () => {
    // Start a real PostgreSQL container with test credentials
    // This creates an isolated database instance for this test suite
    container = await new PostgreSqlContainer()
      .withDatabase('testdb')
      .withUsername('test')
      .withPassword('test')
      .start();

    // Create a connection pool using container's dynamic connection details
    // The container provides host, port, and credentials automatically
    pool = new Pool({
      host: container.getHost(),           // Docker container's host address
      port: container.getPort(),           // Dynamically mapped port
      database: container.getDatabase(),   // Database name we configured
      user: container.getUsername(),
      password: container.getPassword(),
    });

    // Run migrations to set up the schema before any tests execute
    await runMigrations(pool);

    // Initialize the repository with the real database connection
    userRepo = new UserRepository(pool);
  }, 60000); // 60 second timeout - Docker images may need to download

  afterAll(async () => {
    // Clean up resources in reverse order of creation
    await pool.end();       // Close all database connections
    await container.stop(); // Stop and remove the Docker container
  });

  beforeEach(async () => {
    // Clean tables between tests to ensure test isolation
    // CASCADE removes dependent records in related tables
    await pool.query('TRUNCATE users CASCADE');
  });

  describe('create', () => {
    it('should create a user with valid data', async () => {
      // Arrange: prepare test data
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword123',
      };

      // Act: execute the method under test
      const user = await userRepo.create(userData);

      // Assert: verify the returned user has expected properties
      expect(user.id).toBeDefined();              // Database should generate an ID
      expect(user.email).toBe(userData.email);    // Email should match input
      expect(user.name).toBe(userData.name);      // Name should match input
      expect(user.createdAt).toBeInstanceOf(Date); // Timestamp should be set
    });

    it('should enforce unique email constraint', async () => {
      // Arrange: create initial user
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword123',
      };

      // Create the first user successfully
      await userRepo.create(userData);

      // Act & Assert: attempting to create duplicate should throw
      // This tests that the database constraint is working correctly
      await expect(userRepo.create(userData)).rejects.toThrow(/unique/i);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      // Arrange: create a user to find
      const created = await userRepo.create({
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword123',
      });

      // Act: find the user by their generated ID
      const found = await userRepo.findById(created.id);

      // Assert: found user should match created user
      expect(found).toMatchObject({
        id: created.id,
        email: created.email,
        name: created.name,
      });
    });

    it('should return null for non-existent id', async () => {
      // Act: search for a UUID that doesn't exist
      const found = await userRepo.findById('00000000-0000-0000-0000-000000000000');

      // Assert: should return null, not throw an error
      expect(found).toBeNull();
    });
  });
});
```

## Redis Integration Tests

This test suite demonstrates how to test a cache service with a real Redis instance. Using GenericContainer allows you to run any Docker image, making it easy to test with various services.

```javascript
const { GenericContainer } = require('testcontainers');
const Redis = require('ioredis');
const { CacheService } = require('../../src/services/cache');

describe('CacheService Integration Tests', () => {
  let container;
  let redis;
  let cacheService;

  beforeAll(async () => {
    // Start a Redis container using the lightweight Alpine image
    // GenericContainer works with any Docker image
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)  // Expose Redis default port
      .start();

    // Connect to Redis using the container's mapped port
    // Docker maps the container port to a random available host port
    redis = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),  // Get the actual mapped port
    });

    // Initialize the service with the real Redis connection
    cacheService = new CacheService(redis);
  }, 30000);  // 30 second timeout - Redis starts quickly

  afterAll(async () => {
    // Clean up in reverse order: connection first, then container
    await redis.quit();
    await container.stop();
  });

  beforeEach(async () => {
    // Clear all Redis data between tests for isolation
    await redis.flushall();
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      // Act: store and retrieve a value
      await cacheService.set('key1', { data: 'value1' }, 60);
      const result = await cacheService.get('key1');

      // Assert: retrieved value should match what was stored
      expect(result).toEqual({ data: 'value1' });
    });

    it('should return null for missing keys', async () => {
      // Act: try to get a key that was never set
      const result = await cacheService.get('nonexistent');

      // Assert: should return null, not undefined or throw
      expect(result).toBeNull();
    });

    it('should expire keys after TTL', async () => {
      // Arrange: set a key with 1 second TTL
      await cacheService.set('expiring', 'value', 1);

      // Assert: key should exist immediately after setting
      const immediate = await cacheService.get('expiring');
      expect(immediate).toBe('value');

      // Wait for the key to expire (TTL + buffer for timing)
      await new Promise(r => setTimeout(r, 1500));

      // Assert: key should be gone after TTL expires
      const expired = await cacheService.get('expiring');
      expect(expired).toBeNull();
    });
  });
});
```

## Full API Integration Tests

Test your entire Express app with real database. This approach tests the complete request/response cycle, including routing, middleware, validation, and database operations all working together.

```javascript
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { GenericContainer } = require('testcontainers');
const request = require('supertest');
const { createApp } = require('../../src/app');

describe('API Integration Tests', () => {
  let pgContainer;
  let redisContainer;
  let app;
  let authToken;

  beforeAll(async () => {
    // Start PostgreSQL and Redis containers in parallel for faster setup
    // Promise.all reduces startup time by running containers concurrently
    [pgContainer, redisContainer] = await Promise.all([
      new PostgreSqlContainer()
        .withDatabase('testdb')
        .start(),
      new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .start(),
    ]);

    // Configure environment variables with container connection details
    // The app reads these to connect to our test containers
    process.env.DATABASE_URL = pgContainer.getConnectionUri();
    process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    // Create the Express app with real database connections
    app = await createApp();

    // Run database migrations to set up schema
    await app.locals.db.migrate.latest();
  }, 120000);  // 2 minute timeout for multiple containers

  afterAll(async () => {
    // Destroy database connection pool and Redis client
    await app.locals.db.destroy();
    await app.locals.redis.quit();

    // Stop both containers in parallel for faster cleanup
    await Promise.all([
      pgContainer.stop(),
      redisContainer.stop(),
    ]);
  });

  beforeEach(async () => {
    // Clean all data between tests while preserving schema
    await app.locals.db.raw('TRUNCATE users, orders CASCADE');
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      // Act: send POST request to create user
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'new@example.com',
          name: 'New User',
          password: 'password123',
        })
        .expect(201);  // Expect 201 Created status

      // Assert: response should contain user data without password
      expect(response.body).toMatchObject({
        email: 'new@example.com',
        name: 'New User',
      });
      expect(response.body.password).toBeUndefined();  // Password should not be returned
      expect(response.body.id).toBeDefined();  // ID should be generated
    });

    it('should return 400 for invalid email', async () => {
      // Act: send request with invalid email format
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'invalid-email',  // Missing @ symbol
          name: 'Test',
          password: 'password123',
        })
        .expect(400);  // Expect 400 Bad Request

      // Assert: error should specify which field is invalid
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should return 409 for duplicate email', async () => {
      // Arrange: create first user
      await request(app)
        .post('/api/users')
        .send({
          email: 'duplicate@example.com',
          name: 'First',
          password: 'password123',
        });

      // Act: attempt to create user with same email
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'duplicate@example.com',
          name: 'Second',
          password: 'password123',
        })
        .expect(409);  // Expect 409 Conflict

      // Assert: error message should indicate duplicate
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('Protected endpoints', () => {
    beforeEach(async () => {
      // Arrange: create a user and get auth token for protected route tests
      await request(app)
        .post('/api/users')
        .send({
          email: 'auth@example.com',
          name: 'Auth User',
          password: 'password123',
        });

      // Login to get access token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth@example.com',
          password: 'password123',
        });

      // Store token for use in protected route tests
      authToken = loginResponse.body.accessToken;
    });

    it('should return 401 without token', async () => {
      // Act: access protected route without authorization header
      await request(app)
        .get('/api/users/me')
        .expect(401);  // Should be rejected as unauthorized
    });

    it('should return user profile with valid token', async () => {
      // Act: access protected route with valid Bearer token
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)  // Include auth header
        .expect(200);

      // Assert: should return the authenticated user's data
      expect(response.body.email).toBe('auth@example.com');
    });
  });
});
```

## Custom Container with Initialization

For containers requiring custom configuration or initialization scripts, you can use bind mounts and wait strategies. This is useful when you need pre-populated data or specific configurations.

```javascript
const { GenericContainer, Wait } = require('testcontainers');
const path = require('path');

// Container with custom initialization script
// The init.sql file runs automatically when PostgreSQL starts
async function startPostgresWithSchema() {
  const container = await new GenericContainer('postgres:15')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_DB: 'testdb',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    // Mount local SQL file to Docker's init directory
    // Files in this directory run automatically on container start
    .withBindMounts([{
      source: path.resolve(__dirname, '../fixtures/init.sql'),
      target: '/docker-entrypoint-initdb.d/init.sql',
    }])
    // Wait until PostgreSQL logs indicate it's ready for connections
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .start();

  return container;
}

// Container with HTTP health check wait strategy
// Useful for services that expose health endpoints
async function startElasticsearch() {
  const container = await new GenericContainer('elasticsearch:8.11.0')
    .withExposedPorts(9200)
    .withEnvironment({
      'discovery.type': 'single-node',      // Run as single node for testing
      'xpack.security.enabled': 'false',    // Disable security for simpler testing
    })
    // Wait until the health endpoint responds successfully
    .withWaitStrategy(Wait.forHttp('/_cluster/health', 9200))
    .start();

  return container;
}
```

## Docker Compose for Complex Setups

For tests requiring multiple interconnected services, use Docker Compose. This approach is ideal when services need to communicate with each other or when you need complex networking setups.

```javascript
const { DockerComposeEnvironment, Wait } = require('testcontainers');
const path = require('path');

describe('Full Stack Integration', () => {
  let environment;
  let pgContainer;
  let redisContainer;
  let kafkaContainer;

  beforeAll(async () => {
    // Start all services defined in docker-compose.test.yml
    // DockerComposeEnvironment manages the entire stack as a unit
    environment = await new DockerComposeEnvironment(
      path.resolve(__dirname, '../'),       // Directory containing compose file
      'docker-compose.test.yml'             // Compose file name
    )
      // Configure wait strategies for each service
      .withWaitStrategy('postgres', Wait.forHealthCheck())  // Use Docker healthcheck
      .withWaitStrategy('redis', Wait.forHealthCheck())
      .withWaitStrategy('kafka', Wait.forLogMessage(/started/))  // Wait for log message
      .up();  // Start all services

    // Get references to individual containers for connection details
    pgContainer = environment.getContainer('postgres');
    redisContainer = environment.getContainer('redis');
    kafkaContainer = environment.getContainer('kafka');
  }, 180000);  // 3 minute timeout for full stack startup

  afterAll(async () => {
    // Stop and remove all containers and networks created by compose
    await environment.down();
  });

  // Tests using the containers...
});
```

The Docker Compose file defines the test infrastructure with health checks to ensure services are ready before tests run:

**docker-compose.test.yml:**

```yaml
version: '3.8'
services:
  # PostgreSQL database service with health check
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    healthcheck:
      # Check if PostgreSQL is ready to accept connections
      test: ["CMD-SHELL", "pg_isready -U test -d testdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis cache service with health check
  redis:
    image: redis:7-alpine
    healthcheck:
      # Use redis-cli ping to verify Redis is responding
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Kafka message broker in KRaft mode (no Zookeeper needed)
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_PROCESS_ROLES: broker,controller  # Combined mode
      KAFKA_NODE_ID: 1
      CLUSTER_ID: test-cluster
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
```

## Test Fixtures and Factories

Factory functions help generate realistic test data, reducing boilerplate and making tests more readable. Using faker ensures variety in test data, which can catch edge cases.

```javascript
// tests/factories/user.js
const { faker } = require('@faker-js/faker');

// Build user data object without persisting to database
// Useful for testing validation or preparing test data
function buildUser(overrides = {}) {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: faker.internet.password({ length: 12 }),
    ...overrides,  // Allow specific values to be overridden
  };
}

// Create a user in the database and return the result
// Useful when you need a real user record for testing
async function createUser(repo, overrides = {}) {
  const userData = buildUser(overrides);
  return repo.create(userData);
}

// Usage in tests - clean and readable test setup
describe('Order tests', () => {
  it('should create order for user', async () => {
    // Arrange: create a user using the factory
    const user = await createUser(userRepo);

    // Act: create an order for that user
    const order = await orderRepo.create({
      userId: user.id,
      items: [{ productId: 'prod-1', quantity: 2 }],
    });

    // Assert: order should be linked to the user
    expect(order.userId).toBe(user.id);
  });
});
```

## CI/CD Configuration

### GitHub Actions

This GitHub Actions workflow runs integration tests in CI. Since GitHub Actions runners have Docker pre-installed, Testcontainers works without additional setup.

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # Cache npm dependencies for faster builds

      - name: Install dependencies
        run: npm ci  # Use ci for reproducible installs

      - name: Run integration tests
        run: npm run test:integration
        env:
          # Disable Ryuk (container cleanup service) for CI environments
          # GitHub Actions handles cleanup when the runner terminates
          TESTCONTAINERS_RYUK_DISABLED: true
```

### Jest Configuration

Separate Jest configurations for unit and integration tests allow different settings for each test type. Integration tests need longer timeouts and often run sequentially to avoid resource contention.

```javascript
// jest.integration.config.js
module.exports = {
  testEnvironment: 'node',  // Use Node.js environment, not jsdom
  testMatch: ['**/tests/integration/**/*.test.js'],  // Only run integration tests
  testTimeout: 60000,  // 60 second timeout for container operations
  maxWorkers: 1,  // Run tests sequentially to avoid port conflicts and resource issues
  setupFilesAfterEnv: ['./tests/setup.js'],  // Setup file for each test file
  globalSetup: './tests/global-setup.js',    // Runs once before all tests
  globalTeardown: './tests/global-teardown.js',  // Runs once after all tests
};
```

Configure npm scripts to run different test suites with their respective configurations:

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --config jest.unit.config.js",
    "test:integration": "jest --config jest.integration.config.js"
  }
}
```

## Summary

| Aspect | Recommendation |
|--------|----------------|
| **Container reuse** | Reuse across test suites for speed |
| **Data cleanup** | TRUNCATE between tests |
| **Parallel tests** | Use separate containers |
| **Timeouts** | Set generous timeouts (60s+) |
| **CI/CD** | Works out of the box with Docker |
| **Local dev** | Same tests work locally |

Testcontainers brings the reliability of real infrastructure to your integration tests without the complexity of managing test environments. Your tests become true integration tests that catch real bugs before they reach production.
