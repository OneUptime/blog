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

```bash
npm install testcontainers --save-dev
npm install jest @types/jest --save-dev
```

### PostgreSQL Integration Test

```javascript
// tests/integration/user.test.js
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { Pool } = require('pg');
const { UserRepository } = require('../../src/repositories/user');

describe('UserRepository Integration Tests', () => {
  let container;
  let pool;
  let userRepo;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer()
      .withDatabase('testdb')
      .withUsername('test')
      .withPassword('test')
      .start();

    // Create connection pool
    pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    // Run migrations
    await runMigrations(pool);

    userRepo = new UserRepository(pool);
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    // Clean tables between tests
    await pool.query('TRUNCATE users CASCADE');
  });

  describe('create', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword123',
      };

      const user = await userRepo.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword123',
      };

      await userRepo.create(userData);

      await expect(userRepo.create(userData)).rejects.toThrow(/unique/i);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const created = await userRepo.create({
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword123',
      });

      const found = await userRepo.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        email: created.email,
        name: created.name,
      });
    });

    it('should return null for non-existent id', async () => {
      const found = await userRepo.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });
});
```

## Redis Integration Tests

```javascript
const { GenericContainer } = require('testcontainers');
const Redis = require('ioredis');
const { CacheService } = require('../../src/services/cache');

describe('CacheService Integration Tests', () => {
  let container;
  let redis;
  let cacheService;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    redis = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
    });

    cacheService = new CacheService(redis);
  }, 30000);

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      await cacheService.set('key1', { data: 'value1' }, 60);
      const result = await cacheService.get('key1');
      expect(result).toEqual({ data: 'value1' });
    });

    it('should return null for missing keys', async () => {
      const result = await cacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should expire keys after TTL', async () => {
      await cacheService.set('expiring', 'value', 1); // 1 second TTL

      const immediate = await cacheService.get('expiring');
      expect(immediate).toBe('value');

      // Wait for expiration
      await new Promise(r => setTimeout(r, 1500));

      const expired = await cacheService.get('expiring');
      expect(expired).toBeNull();
    });
  });
});
```

## Full API Integration Tests

Test your entire Express app with real database:

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
    // Start containers in parallel
    [pgContainer, redisContainer] = await Promise.all([
      new PostgreSqlContainer()
        .withDatabase('testdb')
        .start(),
      new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .start(),
    ]);

    // Configure environment
    process.env.DATABASE_URL = pgContainer.getConnectionUri();
    process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    // Create app with real connections
    app = await createApp();

    // Run migrations
    await app.locals.db.migrate.latest();
  }, 120000);

  afterAll(async () => {
    await app.locals.db.destroy();
    await app.locals.redis.quit();
    await Promise.all([
      pgContainer.stop(),
      redisContainer.stop(),
    ]);
  });

  beforeEach(async () => {
    // Clean database
    await app.locals.db.raw('TRUNCATE users, orders CASCADE');
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'new@example.com',
          name: 'New User',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        email: 'new@example.com',
        name: 'New User',
      });
      expect(response.body.password).toBeUndefined();
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'invalid-email',
          name: 'Test',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should return 409 for duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/users')
        .send({
          email: 'duplicate@example.com',
          name: 'First',
          password: 'password123',
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'duplicate@example.com',
          name: 'Second',
          password: 'password123',
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('Protected endpoints', () => {
    beforeEach(async () => {
      // Create user and login
      await request(app)
        .post('/api/users')
        .send({
          email: 'auth@example.com',
          name: 'Auth User',
          password: 'password123',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth@example.com',
          password: 'password123',
        });

      authToken = loginResponse.body.accessToken;
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/users/me')
        .expect(401);
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe('auth@example.com');
    });
  });
});
```

## Custom Container with Initialization

```javascript
const { GenericContainer, Wait } = require('testcontainers');
const path = require('path');

// Container with custom initialization
async function startPostgresWithSchema() {
  const container = await new GenericContainer('postgres:15')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_DB: 'testdb',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withBindMounts([{
      source: path.resolve(__dirname, '../fixtures/init.sql'),
      target: '/docker-entrypoint-initdb.d/init.sql',
    }])
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .start();

  return container;
}

// Container with health check
async function startElasticsearch() {
  const container = await new GenericContainer('elasticsearch:8.11.0')
    .withExposedPorts(9200)
    .withEnvironment({
      'discovery.type': 'single-node',
      'xpack.security.enabled': 'false',
    })
    .withWaitStrategy(Wait.forHttp('/_cluster/health', 9200))
    .start();

  return container;
}
```

## Docker Compose for Complex Setups

For tests requiring multiple interconnected services:

```javascript
const { DockerComposeEnvironment, Wait } = require('testcontainers');
const path = require('path');

describe('Full Stack Integration', () => {
  let environment;
  let pgContainer;
  let redisContainer;
  let kafkaContainer;

  beforeAll(async () => {
    environment = await new DockerComposeEnvironment(
      path.resolve(__dirname, '../'),
      'docker-compose.test.yml'
    )
      .withWaitStrategy('postgres', Wait.forHealthCheck())
      .withWaitStrategy('redis', Wait.forHealthCheck())
      .withWaitStrategy('kafka', Wait.forLogMessage(/started/))
      .up();

    pgContainer = environment.getContainer('postgres');
    redisContainer = environment.getContainer('redis');
    kafkaContainer = environment.getContainer('kafka');
  }, 180000);

  afterAll(async () => {
    await environment.down();
  });

  // Tests using the containers...
});
```

**docker-compose.test.yml:**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d testdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_NODE_ID: 1
      CLUSTER_ID: test-cluster
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
```

## Test Fixtures and Factories

```javascript
// tests/factories/user.js
const { faker } = require('@faker-js/faker');

function buildUser(overrides = {}) {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: faker.internet.password({ length: 12 }),
    ...overrides,
  };
}

async function createUser(repo, overrides = {}) {
  const userData = buildUser(overrides);
  return repo.create(userData);
}

// Usage in tests
describe('Order tests', () => {
  it('should create order for user', async () => {
    const user = await createUser(userRepo);
    const order = await orderRepo.create({
      userId: user.id,
      items: [{ productId: 'prod-1', quantity: 2 }],
    });

    expect(order.userId).toBe(user.id);
  });
});
```

## CI/CD Configuration

### GitHub Actions

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
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          TESTCONTAINERS_RYUK_DISABLED: true
```

### Jest Configuration

```javascript
// jest.integration.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  testTimeout: 60000,
  maxWorkers: 1, // Run sequentially to avoid port conflicts
  setupFilesAfterEnv: ['./tests/setup.js'],
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js',
};
```

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
