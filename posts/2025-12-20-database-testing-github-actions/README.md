# How to Set Up Database Testing in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Database Testing, CI/CD, PostgreSQL, MySQL, MongoDB, Testing

Description: Learn how to run database integration tests in GitHub Actions using service containers. This guide covers PostgreSQL, MySQL, MongoDB setup, migrations, and test isolation strategies.

---

Database integration tests verify your application works correctly with real databases. GitHub Actions service containers make it easy to spin up databases for testing. This guide shows you how to configure various databases and run reliable integration tests.

## Service Container Architecture

```mermaid
flowchart LR
    A[GitHub Runner] --> B[Job Container]
    A --> C[PostgreSQL Service]
    A --> D[Redis Service]
    B -->|localhost:5432| C
    B -->|localhost:6379| D
```

## PostgreSQL Testing

Basic PostgreSQL setup:

```yaml
name: Database Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
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

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm test
```

## MySQL Testing

Configure MySQL service:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: testdb
          MYSQL_USER: test
          MYSQL_PASSWORD: test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        env:
          DATABASE_URL: mysql://test:test@localhost:3306/testdb
        run: npm test
```

## MongoDB Testing

Set up MongoDB:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports:
          - 27017:27017
        options: >-
          --health-cmd="mongosh --eval 'db.runCommand({ping:1})'"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        env:
          MONGODB_URL: mongodb://localhost:27017/testdb
        run: npm test
```

## Redis Testing

Add Redis for caching tests:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        env:
          REDIS_URL: redis://localhost:6379
        run: npm test
```

## Multiple Services

Combine multiple databases:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
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
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      elasticsearch:
        image: elasticsearch:8.11.0
        env:
          discovery.type: single-node
          xpack.security.enabled: false
        ports:
          - 9200:9200
        options: >-
          --health-cmd "curl -f http://localhost:9200/_cluster/health"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          ELASTICSEARCH_URL: http://localhost:9200
        run: npm test
```

## Running Migrations

Run database migrations before tests:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
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

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm run db:migrate

      - name: Seed test data
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm run db:seed

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm test
```

## Test Isolation

Ensure tests do not interfere with each other:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
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

      - run: npm ci

      - name: Run tests with isolation
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: |
          # Use transactions for test isolation
          npm test -- --runInBand --forceExit
```

In your test setup:

```javascript
// jest.setup.js
beforeEach(async () => {
  await db.query('BEGIN');
});

afterEach(async () => {
  await db.query('ROLLBACK');
});
```

## Parallel Testing with Separate Databases

Run parallel tests with isolated databases:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb_${{ matrix.shard }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - run: npm ci

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb_${{ matrix.shard }}
        run: npm run db:migrate

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb_${{ matrix.shard }}
        run: npm test -- --shard=${{ matrix.shard }}/4
```

## Custom Database Image

Use a custom image with extensions:

```dockerfile
# Dockerfile.postgres-test
FROM postgres:16

RUN apt-get update && apt-get install -y \
    postgresql-16-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
```

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: ghcr.io/myorg/postgres-test:latest
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
```

## Database Schema Validation

Validate schema changes:

```yaml
jobs:
  validate-schema:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4

      - name: Run all migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm run db:migrate

      - name: Check for pending migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: |
          PENDING=$(npm run db:migrate:status 2>&1 | grep -c "pending" || true)
          if [ "$PENDING" -gt 0 ]; then
            echo "Error: Pending migrations found"
            exit 1
          fi

      - name: Validate schema matches models
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm run db:validate
```

## Complete Example

```yaml
name: Database Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
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
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm run db:migrate

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
        run: npm run test:integration -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: e2e_testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Setup database
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/e2e_testdb
        run: |
          npm run db:migrate
          npm run db:seed:e2e

      - name: Start server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/e2e_testdb
          PORT: 3000
        run: npm start &

      - name: Wait for server
        run: npx wait-on http://localhost:3000/health

      - name: Run E2E tests
        run: npm run test:e2e
```

---

Database testing in CI ensures your application handles real database operations correctly. Use service containers for each database type, run migrations before tests, and implement proper test isolation. Health checks ensure databases are ready before tests begin, preventing flaky failures.
