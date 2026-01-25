# How to Set Up Integration Testing in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, CI/CD, Integration Testing, Docker, Testing, DevOps

Description: Learn how to set up comprehensive integration testing in GitHub Actions using service containers, Docker Compose, and real database connections.

> Unit tests verify components in isolation. Integration tests verify they work together. Both are essential.

Integration tests catch issues that unit tests miss - database queries that fail with real data, API contracts that break between services, and race conditions that only appear under load. GitHub Actions provides service containers and Docker support that make integration testing straightforward. This guide covers setting up integration tests with real databases, external services, and multi-container environments.

## Integration Testing Architecture

```mermaid
flowchart TD
    A[Push/PR Event] --> B[Start Workflow]
    B --> C[Start Service Containers]

    subgraph Services
        D[PostgreSQL]
        E[Redis]
        F[Elasticsearch]
    end

    C --> D
    C --> E
    C --> F

    D & E & F --> G[Wait for Services]
    G --> H[Run Migrations]
    H --> I[Seed Test Data]
    I --> J[Run Integration Tests]
    J --> K{Tests Pass?}
    K -->|Yes| L[Upload Results]
    K -->|No| M[Report Failures]
    L --> N[Cleanup]
    M --> N
```

## Service Containers

GitHub Actions supports running service containers alongside your job:

```yaml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  integration-test:
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

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
```

## Docker Compose Integration Tests

For complex multi-service setups, use Docker Compose:

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://test:test@postgres:5432/testdb
      REDIS_URL: redis://redis:6379
    command: npm run test:integration

  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

```yaml
# .github/workflows/integration.yml
name: Docker Compose Integration

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and run tests
        run: |
          docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from app

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

## Database Integration Tests

Test database operations with real PostgreSQL:

```yaml
name: Database Integration Tests

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

      - name: Setup database
        run: |
          npm run db:migrate
          npm run db:seed
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run database tests
        run: npm run test:db
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Test database performance
        run: npm run test:db:performance
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
```

## API Integration Tests

Test API endpoints against running services:

```yaml
name: API Integration Tests

on: [push, pull_request]

jobs:
  api-tests:
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
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Setup database
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Start API server
        run: npm run start &
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          PORT: 3000

      - name: Wait for API
        run: |
          for i in {1..30}; do
            curl -s http://localhost:3000/health && exit 0
            sleep 1
          done
          exit 1

      - name: Run API tests
        run: npm run test:api
        env:
          API_URL: http://localhost:3000

      - name: Run Postman collection
        run: |
          npm install -g newman
          newman run tests/postman/collection.json \
            --environment tests/postman/ci-environment.json \
            --reporters cli,junit \
            --reporter-junit-export results.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: api-test-results
          path: results.xml
```

## End-to-End Integration Tests

Full stack testing with frontend and backend:

```yaml
name: E2E Integration Tests

on: [push, pull_request]

jobs:
  e2e:
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
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Setup database
        run: npm run db:migrate && npm run db:seed
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Start backend
        run: npm run start:backend &
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          PORT: 3001

      - name: Start frontend
        run: npm run start:frontend &
        env:
          VITE_API_URL: http://localhost:3001
          PORT: 3000

      - name: Wait for services
        run: |
          ./scripts/wait-for-it.sh localhost:3001 -t 60
          ./scripts/wait-for-it.sh localhost:3000 -t 60

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:3001

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Message Queue Integration

Test with RabbitMQ or similar message brokers:

```yaml
name: Message Queue Tests

on: [push, pull_request]

jobs:
  mq-tests:
    runs-on: ubuntu-latest

    services:
      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672
          - 15672:15672
        options: >-
          --health-cmd "rabbitmq-diagnostics -q ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Run message queue tests
        run: npm run test:mq
        env:
          RABBITMQ_URL: amqp://localhost:5672

      - name: Test pub/sub patterns
        run: npm run test:pubsub
        env:
          RABBITMQ_URL: amqp://localhost:5672
```

## Elasticsearch Integration

Test search functionality with real Elasticsearch:

```yaml
name: Search Integration Tests

on: [push, pull_request]

jobs:
  search-tests:
    runs-on: ubuntu-latest

    services:
      elasticsearch:
        image: elasticsearch:8.11.0
        ports:
          - 9200:9200
        env:
          discovery.type: single-node
          xpack.security.enabled: false
          ES_JAVA_OPTS: -Xms512m -Xmx512m
        options: >-
          --health-cmd "curl -s http://localhost:9200/_cluster/health"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Wait for Elasticsearch
        run: |
          until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
            sleep 5
          done

      - name: Create indices
        run: npm run search:setup
        env:
          ELASTICSEARCH_URL: http://localhost:9200

      - name: Run search tests
        run: npm run test:search
        env:
          ELASTICSEARCH_URL: http://localhost:9200
```

## Parallel Integration Tests

Speed up tests by running in parallel:

```yaml
name: Parallel Integration Tests

on: [push, pull_request]

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      test-chunks: ${{ steps.set-chunks.outputs.chunks }}
    steps:
      - uses: actions/checkout@v4
      - id: set-chunks
        run: |
          TESTS=$(find tests/integration -name "*.test.ts" | jq -R . | jq -s .)
          echo "chunks=$TESTS" >> $GITHUB_OUTPUT

  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix:
        chunk: ${{ fromJson(needs.setup.outputs.test-chunks) }}
      fail-fast: false

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run test chunk
        run: npx jest ${{ matrix.chunk }} --runInBand
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

  report:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Check test results
        run: |
          if [ "${{ needs.test.result }}" == "failure" ]; then
            echo "Some integration tests failed"
            exit 1
          fi
```

## Test Data Management

Handle test fixtures and data:

```yaml
name: Integration with Fixtures

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
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Setup database schema
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Load fixtures
        run: |
          npm run fixtures:load -- --file tests/fixtures/users.json
          npm run fixtures:load -- --file tests/fixtures/products.json
          npm run fixtures:load -- --file tests/fixtures/orders.json
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Cleanup test data
        if: always()
        run: npm run fixtures:cleanup
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
```

## Best Practices

1. **Isolate test databases** - Each test run gets a fresh database
2. **Use health checks** - Wait for services before running tests
3. **Parallelize wisely** - Balance speed with resource constraints
4. **Clean up after tests** - Remove containers and volumes
5. **Cache dependencies** - Speed up setup phases
6. **Use realistic data** - Test with production-like datasets
7. **Test failure scenarios** - Include tests for error handling

## Conclusion

Integration tests catch bugs that unit tests miss. GitHub Actions service containers make it easy to run tests against real databases, caches, and message queues. Start with simple database integration tests, then expand to full end-to-end testing as your application grows.

The investment in integration testing pays off through fewer production incidents and more confident deployments.
