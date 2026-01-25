# How to Use Service Containers in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, CI/CD, Service Containers, Docker, Testing, Databases, DevOps

Description: Learn how to use service containers in GitHub Actions to run databases, caches, and other dependencies alongside your tests, enabling realistic integration testing in CI pipelines.

---

Service containers bring production-like testing to your CI pipeline. Instead of mocking database connections or using SQLite as a substitute for PostgreSQL, service containers let you test against real instances of your dependencies.

## Understanding Service Containers

Service containers are Docker containers that run alongside your workflow job. GitHub Actions manages their lifecycle - starting them before your job runs and cleaning them up after.

```mermaid
flowchart LR
    A[Job Starts] --> B[Start Service Containers]
    B --> C[Wait for Health Checks]
    C --> D[Run Job Steps]
    D --> E[Job Completes]
    E --> F[Stop Service Containers]

    subgraph Services
        G[PostgreSQL]
        H[Redis]
        I[Custom Service]
    end

    D --> G
    D --> H
    D --> I
```

## Basic Service Container Configuration

Define services at the job level. Each service specifies a Docker image and optional configuration.

```yaml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
```

The `options` field configures Docker health checks. GitHub Actions waits for services to be healthy before running job steps.

## Common Service Configurations

### PostgreSQL

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

Connect using: `postgresql://app:secret@localhost:5432/app_test`

### MySQL

```yaml
services:
  mysql:
    image: mysql:8.0
    env:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: testdb
      MYSQL_USER: app
      MYSQL_PASSWORD: secret
    ports:
      - 3306:3306
    options: >-
      --health-cmd "mysqladmin ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 10
```

Connect using: `mysql://app:secret@localhost:3306/testdb`

### Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

Connect using: `redis://localhost:6379`

### MongoDB

```yaml
services:
  mongo:
    image: mongo:7
    env:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret
    ports:
      - 27017:27017
    options: >-
      --health-cmd "mongosh --eval 'db.runCommand(\"ping\").ok'"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

Connect using: `mongodb://admin:secret@localhost:27017`

### Elasticsearch

```yaml
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    env:
      discovery.type: single-node
      xpack.security.enabled: false
      ES_JAVA_OPTS: -Xms512m -Xmx512m
    ports:
      - 9200:9200
    options: >-
      --health-cmd "curl -f http://localhost:9200/_cluster/health"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 10
```

## Multiple Services

Run multiple services for complex integration tests.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: app_test
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

      minio:
        image: minio/minio:latest
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        ports:
          - 9000:9000
        options: >-
          --health-cmd "curl -f http://localhost:9000/minio/health/live"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/app_test
          REDIS_URL: redis://localhost:6379
          S3_ENDPOINT: http://localhost:9000
          S3_ACCESS_KEY: minioadmin
          S3_SECRET_KEY: minioadmin
```

## Service Containers with Container Jobs

When your job runs in a container, service networking changes. Services connect via their service name instead of localhost.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: node:20

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        # No ports mapping needed - use service name

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          # Use service name 'postgres' instead of localhost
          DATABASE_URL: postgresql://app:secret@postgres:5432/testdb
```

When the job runs in a container, GitHub creates a Docker network connecting all containers. Services are accessible by their name.

## Custom Service Images

Use custom Docker images for services that need specific configurations.

### Building a Custom Image

```dockerfile
# .github/services/postgres-with-extensions/Dockerfile
FROM postgres:16

RUN apt-get update && apt-get install -y postgresql-16-pgvector
COPY init.sql /docker-entrypoint-initdb.d/
```

```sql
-- .github/services/postgres-with-extensions/init.sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Using in Workflow

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build custom Postgres image
        run: |
          docker build -t custom-postgres .github/services/postgres-with-extensions/

      - name: Start custom Postgres
        run: |
          docker run -d \
            --name postgres \
            -e POSTGRES_USER=app \
            -e POSTGRES_PASSWORD=secret \
            -e POSTGRES_DB=testdb \
            -p 5432:5432 \
            custom-postgres

          # Wait for healthy
          until docker exec postgres pg_isready; do
            sleep 1
          done

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/testdb
```

## Service Container Volumes

Mount volumes for persistent data or custom configurations.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
        ports:
          - 5432:5432
        volumes:
          - ${{ github.workspace }}/db/init:/docker-entrypoint-initdb.d
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run tests
        run: npm test
```

The `db/init` directory in your repository can contain SQL files that run when PostgreSQL starts.

## Waiting for Services

Sometimes health checks are not enough. Add explicit waits for service readiness.

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Wait for Postgres
    run: |
      until pg_isready -h localhost -p 5432; do
        echo "Waiting for Postgres..."
        sleep 2
      done

  - name: Wait for Elasticsearch
    run: |
      until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
        echo "Waiting for Elasticsearch..."
        sleep 5
      done

  - name: Run tests
    run: npm test
```

## Service Containers in Matrix Builds

Test against multiple versions of a service.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        postgres: ['14', '15', '16']

    services:
      postgres:
        image: postgres:${{ matrix.postgres }}
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: secret
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run tests against Postgres ${{ matrix.postgres }}
        run: npm test
        env:
          DATABASE_URL: postgresql://app:secret@localhost:5432/testdb
```

## Debugging Service Issues

When services fail to start or connect, use these debugging techniques.

```yaml
steps:
  - name: Debug service status
    run: |
      echo "Docker containers:"
      docker ps -a

      echo "Service logs:"
      docker logs $(docker ps -aq --filter "ancestor=postgres:16") || true

      echo "Network info:"
      docker network ls
      docker network inspect bridge || true

  - name: Test connectivity
    run: |
      echo "Testing Postgres connection..."
      pg_isready -h localhost -p 5432 -U app || echo "Postgres not ready"

      echo "Testing Redis connection..."
      redis-cli -h localhost ping || echo "Redis not ready"
```

## Performance Optimization

Service containers add startup time to your workflow. Optimize where possible.

### Use Alpine Images

Alpine-based images are smaller and start faster.

```yaml
services:
  postgres:
    image: postgres:16-alpine  # Instead of postgres:16
  redis:
    image: redis:7-alpine      # Instead of redis:7
```

### Parallelize Service-Dependent Jobs

Split integration tests by service to run in parallel.

```yaml
jobs:
  test-postgres:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        # ...
    steps:
      - run: npm run test:postgres

  test-redis:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        # ...
    steps:
      - run: npm run test:redis
```

Service containers enable realistic integration testing without external dependencies. Start with the services you need most - usually a database and cache - and add more as your testing requirements grow.
