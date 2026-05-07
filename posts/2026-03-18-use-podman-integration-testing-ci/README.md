# How to Use Podman for Integration Testing in CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Integration Testing, Testing

Description: Learn how to use Podman pods and networks to set up multi-service integration testing environments in your CI/CD pipelines.

---

> Podman pods make integration testing in CI natural by grouping your application and its dependencies into a single, manageable unit with shared networking.

Integration testing requires running your application alongside its dependencies like databases, caches, and message queues. Podman pods and networks make this straightforward in CI environments. This guide shows you how to set up reliable, reproducible integration test environments using Podman in CI pipelines.

---

## Basic Integration Test Setup with Podman

The simplest approach uses a Podman network to connect your application with a database.

```bash
#!/bin/bash
# Basic integration test with Podman: app + database

# Uses a custom network for container name resolution

# Create an isolated network for the test
podman network create integration-net

# Start PostgreSQL on the test network
podman run -d \
  --name test-db \
  --network integration-net \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=testdb \
  postgres:16-alpine

# Wait for the database to be ready
echo "Waiting for database..."
DB_READY=0
for i in $(seq 1 30); do
  if podman exec test-db pg_isready -q -U testuser -d testdb; then
    echo "Database is ready"
    DB_READY=1
    break
  fi
  sleep 1
done

if [ "$DB_READY" -ne 1 ]; then
  echo "Database did not become ready in time" >&2
  podman rm -f test-db
  podman network rm integration-net
  exit 1
fi

# Build the application image
podman build -t myapp:test .

# Run integration tests against the database
podman run --rm \
  --network integration-net \
  -e DATABASE_URL="postgresql://testuser:testpass@test-db:5432/testdb" \
  -e NODE_ENV=test \
  myapp:test npm run test:integration

# Capture exit code before cleanup
TEST_EXIT=$?

# Clean up resources
podman rm -f test-db
podman network rm integration-net

exit $TEST_EXIT
```

## Using Podman Pods for Integration Tests

Pods group containers with shared networking, so all containers share localhost.

```bash
#!/bin/bash
# Integration testing with Podman pods
# All containers in a pod share the same network namespace (localhost)

# Create a pod that exposes the necessary ports
podman pod create \
  --name test-pod \
  -p 8080:8080 \
  -p 5432:5432 \
  -p 6379:6379

# Start PostgreSQL inside the pod
podman run -d \
  --pod test-pod \
  --name pod-db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=integration \
  postgres:16-alpine

# Start Redis inside the pod
podman run -d \
  --pod test-pod \
  --name pod-redis \
  redis:7-alpine

# Wait for both services to be ready
echo "Waiting for PostgreSQL and Redis..."
DB_READY=0
REDIS_READY=0
for i in $(seq 1 30); do
  if [ "$DB_READY" -ne 1 ] && podman exec pod-db pg_isready -q -U app -d integration; then
    DB_READY=1
  fi
  if [ "$REDIS_READY" -ne 1 ] && podman exec pod-redis redis-cli ping >/dev/null; then
    REDIS_READY=1
  fi
  if [ "$DB_READY" -eq 1 ] && [ "$REDIS_READY" -eq 1 ]; then
    echo "Services are ready"
    break
  fi
  sleep 1
done

if [ "$DB_READY" -ne 1 ] || [ "$REDIS_READY" -ne 1 ]; then
  echo "Pod services did not become ready in time" >&2
  podman pod rm -f test-pod
  exit 1
fi

# Build and start the application inside the pod
podman build -t myapp:test .
podman run -d \
  --pod test-pod \
  --name pod-app \
  -e DATABASE_URL="postgresql://app:secret@localhost:5432/integration" \
  -e REDIS_URL="redis://localhost:6379" \
  myapp:test

# Wait for the application to start
sleep 3

# Run the integration test suite
podman run --rm \
  --pod test-pod \
  -e API_BASE_URL="http://localhost:8080" \
  myapp:test npm run test:integration

TEST_EXIT=$?

# Tear down the entire pod and all its containers
podman pod rm -f test-pod

exit $TEST_EXIT
```

## Database Migration and Seeding

Run database migrations and seed data before integration tests.

```bash
#!/bin/bash
# Set up database with migrations and seed data before tests

# Start database container
podman network create test-net
podman run -d \
  --name migrate-db \
  --network test-net \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=testdb \
  postgres:16-alpine

# Wait for database
echo "Waiting for database..."
DB_READY=0
for i in $(seq 1 30); do
  if podman exec migrate-db pg_isready -q -U app -d testdb; then
    echo "Database is ready"
    DB_READY=1
    break
  fi
  sleep 1
done

if [ "$DB_READY" -ne 1 ]; then
  echo "Database did not become ready in time" >&2
  podman rm -f migrate-db
  podman network rm test-net
  exit 1
fi

# Build the application image
podman build -t myapp:test .

# Run database migrations
echo "Running migrations..."
podman run --rm \
  --network test-net \
  -e DATABASE_URL="postgresql://app:secret@migrate-db:5432/testdb" \
  myapp:test npm run db:migrate
MIGRATE_EXIT=$?

if [ "$MIGRATE_EXIT" -ne 0 ]; then
  podman rm -f migrate-db
  podman network rm test-net
  exit $MIGRATE_EXIT
fi

# Seed the database with test data
echo "Seeding test data..."
podman run --rm \
  --network test-net \
  -e DATABASE_URL="postgresql://app:secret@migrate-db:5432/testdb" \
  myapp:test npm run db:seed
SEED_EXIT=$?

if [ "$SEED_EXIT" -ne 0 ]; then
  podman rm -f migrate-db
  podman network rm test-net
  exit $SEED_EXIT
fi

# Run integration tests against the migrated and seeded database
echo "Running integration tests..."
podman run --rm \
  --network test-net \
  -e DATABASE_URL="postgresql://app:secret@migrate-db:5432/testdb" \
  -e NODE_ENV=test \
  myapp:test npm run test:integration

TEST_EXIT=$?

podman rm -f migrate-db
podman network rm test-net

exit $TEST_EXIT
```

## Testing with Multiple Services

Set up a complex test environment with multiple interdependent services.

```bash
#!/bin/bash
# Full-stack integration test: API + Worker + DB + Redis + Queue

podman network create fullstack-net

# Start PostgreSQL
podman run -d --name fs-db --network fullstack-net \
  -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=app \
  postgres:16-alpine

# Start Redis (used as cache and session store)
podman run -d --name fs-redis --network fullstack-net \
  redis:7-alpine

# Start RabbitMQ (message queue for async processing)
podman run -d --name fs-rabbit --network fullstack-net \
  -e RABBITMQ_DEFAULT_USER=guest \
  -e RABBITMQ_DEFAULT_PASS=guest \
  rabbitmq:3-alpine

# Wait for all services
echo "Waiting for all services..."
DB_READY=0
REDIS_READY=0
RABBIT_READY=0
for i in $(seq 1 60); do
  if [ "$DB_READY" -ne 1 ] && podman exec fs-db pg_isready -q -U postgres -d app; then
    DB_READY=1
  fi
  if [ "$REDIS_READY" -ne 1 ] && podman exec fs-redis redis-cli ping >/dev/null; then
    REDIS_READY=1
  fi
  if [ "$RABBIT_READY" -ne 1 ] && podman exec fs-rabbit rabbitmq-diagnostics -q ping >/dev/null; then
    RABBIT_READY=1
  fi
  if [ "$DB_READY" -eq 1 ] && [ "$REDIS_READY" -eq 1 ] && [ "$RABBIT_READY" -eq 1 ]; then
    echo "All services are ready"
    break
  fi
  sleep 1
done

if [ "$DB_READY" -ne 1 ] || [ "$REDIS_READY" -ne 1 ] || [ "$RABBIT_READY" -ne 1 ]; then
  echo "One or more services did not become ready in time" >&2
  podman rm -f fs-db fs-redis fs-rabbit
  podman network rm fullstack-net
  exit 1
fi

# Build the application
podman build -t myapp:test .

# Common environment variables for the app
ENV_VARS="-e DATABASE_URL=postgresql://postgres:secret@fs-db:5432/app \
  -e REDIS_URL=redis://fs-redis:6379 \
  -e AMQP_URL=amqp://guest:guest@fs-rabbit:5672"

# Run migrations
podman run --rm --network fullstack-net $ENV_VARS \
  myapp:test npm run db:migrate
MIGRATE_EXIT=$?

if [ "$MIGRATE_EXIT" -ne 0 ]; then
  podman rm -f fs-db fs-redis fs-rabbit
  podman network rm fullstack-net
  exit $MIGRATE_EXIT
fi

# Start the API server
podman run -d --name fs-api --network fullstack-net $ENV_VARS \
  myapp:test npm run start:api

# Start the worker process
podman run -d --name fs-worker --network fullstack-net $ENV_VARS \
  myapp:test npm run start:worker

# Wait for API to be ready
sleep 5

# Run the integration test suite
podman run --rm --network fullstack-net \
  -e API_URL=http://fs-api:8080 \
  $ENV_VARS \
  myapp:test npm run test:integration

TEST_EXIT=$?

# Clean up everything
podman rm -f fs-api fs-worker fs-db fs-redis fs-rabbit
podman network rm fullstack-net

exit $TEST_EXIT
```

## Reusable Test Helper Script

Create a reusable script for integration test environments.

```bash
#!/bin/bash
# scripts/integration-test.sh
# Reusable integration test helper with automatic cleanup

set -e

NETWORK_NAME="itest-$$"
CLEANUP_CONTAINERS=()

# Cleanup function that runs on exit (success or failure)
cleanup() {
  echo "Cleaning up test environment..."
  for container in "${CLEANUP_CONTAINERS[@]}"; do
    podman rm -f "$container" 2>/dev/null || true
  done
  podman network rm "$NETWORK_NAME" 2>/dev/null || true
}
trap cleanup EXIT

# Helper to start a service and register for cleanup
start_service() {
  local name=$1; shift
  podman run -d --name "$name" --network "$NETWORK_NAME" "$@"
  CLEANUP_CONTAINERS+=("$name")
}

# Set up the network
podman network create "$NETWORK_NAME"

# Start services
start_service db -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test postgres:16-alpine
start_service cache redis:7-alpine

# Wait for readiness
echo "Waiting for services..."
DB_READY=0
REDIS_READY=0
for i in $(seq 1 30); do
  if [ "$DB_READY" -ne 1 ] && podman exec db pg_isready -q -U postgres -d test; then
    DB_READY=1
  fi
  if [ "$REDIS_READY" -ne 1 ] && podman exec cache redis-cli ping >/dev/null; then
    REDIS_READY=1
  fi
  if [ "$DB_READY" -eq 1 ] && [ "$REDIS_READY" -eq 1 ]; then
    echo "Services are ready"
    break
  fi
  sleep 1
done

if [ "$DB_READY" -ne 1 ] || [ "$REDIS_READY" -ne 1 ]; then
  echo "Services did not become ready in time" >&2
  exit 1
fi

# Build and run tests
podman build -t myapp:test .
podman run --rm --network "$NETWORK_NAME" \
  -e DATABASE_URL="postgresql://postgres:test@db:5432/test" \
  -e REDIS_URL="redis://cache:6379" \
  myapp:test npm run test:integration
```

## Summary

Podman provides excellent tools for integration testing in CI through pods and networks. Pods simplify multi-container setups by sharing the network namespace across containers, while custom networks provide service discovery through container names. Structuring your tests with proper migration and seeding steps ensures a clean, known state. A reusable helper script with automatic cleanup prevents resource leaks in CI. The daemonless and rootless nature of Podman means these test environments are secure and lightweight, ideal for ephemeral CI runners.
