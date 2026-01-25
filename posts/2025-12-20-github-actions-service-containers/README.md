# How to Use Service Containers in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, CI/CD, Service Containers, Docker, Testing, Databases

Description: Learn how to use service containers in GitHub Actions to run databases, caches, and other dependencies alongside your tests for realistic integration testing.

---

Service containers let you run Docker containers alongside your jobs in GitHub Actions. They're perfect for integration tests that need databases, caches, message queues, or other services. This guide shows you how to configure and use service containers effectively.

## Understanding Service Containers

Service containers are Docker containers that run alongside your job. They're automatically networked with your job container and can be accessed via their service name.

```mermaid
flowchart LR
    subgraph GitHub Actions Runner
        A[Job Container] --> B[postgres:15]
        A --> C[redis:7]
        A --> D[elasticsearch:8]
    end
    B --> E[(PostgreSQL Data)]
    C --> F[(Redis Data)]
```

## Basic Service Container Setup

Here's a simple example with PostgreSQL:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
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

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
```

The `options` field configures Docker health checks, ensuring the service is ready before tests run.

## Multiple Service Containers

Run multiple services together for complex integration scenarios:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: appdb
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

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/appdb
          REDIS_URL: redis://localhost:6379
          ELASTICSEARCH_URL: http://localhost:9200
```

## Using Job Containers with Services

When your job runs in a container, service networking changes:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: node:20

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: appdb
        # No port mapping needed - use service name directly
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          # Use service name as hostname, default port
          DATABASE_URL: postgresql://app:secret@postgres:5432/appdb
```

When running in a container, services are accessible by their service name (e.g., `postgres`) on their default ports.

## Custom Service Images

Use custom Docker images for services:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      api-mock:
        image: ghcr.io/myorg/api-mock:latest
        credentials:
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
        ports:
          - 8080:8080
        env:
          MOCK_CONFIG: /config/mock.json
        volumes:
          - ${{ github.workspace }}/test/mocks:/config

    steps:
      - uses: actions/checkout@v4

      - name: Run integration tests
        run: npm test
        env:
          API_URL: http://localhost:8080
```

## Database Initialization

Initialize databases with schemas and seed data:

### Using SQL Files

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: appdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Wait for PostgreSQL
        run: |
          until pg_isready -h localhost -p 5432; do
            echo "Waiting for postgres..."
            sleep 2
          done

      - name: Initialize database schema
        run: |
          PGPASSWORD=secret psql -h localhost -U app -d appdb -f ./db/schema.sql
          PGPASSWORD=secret psql -h localhost -U app -d appdb -f ./db/seed.sql

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/appdb
```

### Using Custom Docker Images with Pre-loaded Data

Create a custom image with initialization:

```dockerfile
# test-db/Dockerfile
FROM postgres:15

COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY seed.sql /docker-entrypoint-initdb.d/02-seed.sql
```

Use it in workflows:

```yaml
    services:
      postgres:
        image: ghcr.io/myorg/test-db:latest
        credentials:
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
        ports:
          - 5432:5432
```

## Message Queue Services

Set up RabbitMQ or Kafka for message-based tests:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672
          - 15672:15672
        env:
          RABBITMQ_DEFAULT_USER: guest
          RABBITMQ_DEFAULT_PASS: guest
        options: >-
          --health-cmd "rabbitmq-diagnostics -q ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - name: Run message queue tests
        run: npm run test:mq
        env:
          RABBITMQ_URL: amqp://guest:guest@localhost:5672
```

## MongoDB Service

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: root
          MONGO_INITDB_ROOT_PASSWORD: secret
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ping:1})' --quiet"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: npm test
        env:
          MONGODB_URL: mongodb://root:secret@localhost:27017
```

## MySQL Service

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: rootpass
          MYSQL_DATABASE: testdb
          MYSQL_USER: app
          MYSQL_PASSWORD: secret
        ports:
          - 3306:3306
        options: >-
          --health-cmd "mysqladmin ping -h localhost"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: mysql://app:secret@localhost:3306/testdb
```

## Matrix with Different Database Versions

Test against multiple database versions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        postgres-version: [13, 14, 15, 16]

    services:
      postgres:
        image: postgres:${{ matrix.postgres-version }}
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: appdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Run tests against PostgreSQL ${{ matrix.postgres-version }}
        run: npm test
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/appdb
```

## Troubleshooting Service Containers

### Checking Service Logs

```yaml
    steps:
      - name: Check service logs on failure
        if: failure()
        run: |
          docker logs $(docker ps -aq --filter "name=postgres") || true
          docker logs $(docker ps -aq --filter "name=redis") || true
```

### Debugging Connection Issues

```yaml
    steps:
      - name: Debug network
        run: |
          # List running containers
          docker ps

          # Check network connectivity
          nc -zv localhost 5432
          nc -zv localhost 6379

          # Test database connection
          PGPASSWORD=secret psql -h localhost -U app -d appdb -c "SELECT 1"
```

## Summary

Service containers make integration testing straightforward in GitHub Actions:

- Use the `services` key to define containers that run alongside your job
- Configure health checks to ensure services are ready before tests run
- Access services via `localhost` when running directly on the runner
- Access services via service name when running in a job container
- Use matrix builds to test against multiple service versions
- Initialize databases with schemas and seed data using SQL files or custom images

Service containers bring production-like testing to your CI pipeline without complex infrastructure setup.
