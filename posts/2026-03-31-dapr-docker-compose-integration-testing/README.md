# How to Use Docker Compose for Dapr Integration Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Docker Compose, Integration Test, DevOps

Description: Set up a complete Dapr integration testing environment with Docker Compose that spins up sidecars, dependencies, and test runners in a reproducible local environment.

---

Docker Compose is the most accessible way to run Dapr integration tests locally and in CI pipelines. It eliminates the need for a Kubernetes cluster and lets every developer run the same test environment with a single command.

## Project Layout

```text
project/
  src/
  tests/
    integration/
      docker-compose.test.yaml
      components/
        statestore.yaml
        pubsub.yaml
      run-tests.sh
```

## Complete Docker Compose File

```yaml
# docker-compose.test.yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 5

  placement:
    image: daprio/placement:1.14.0
    command: ["./placement", "--port", "50006", "--log-level", "error"]
    ports:
      - "50006:50006"

  app:
    build:
      context: ../..
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=test
      - DAPR_HTTP_PORT=3500
    depends_on:
      redis:
        condition: service_healthy

  app-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "--app-id"
      - "test-app"
      - "--app-port"
      - "3000"
      - "--placement-host-address"
      - "placement:50006"
      - "--resources-path"
      - "/components"
      - "--log-level"
      - "error"
      - "--log-as-json"
    volumes:
      - ./components:/components
    network_mode: "service:app"
    depends_on:
      - app
      - placement
      - redis

  test-runner:
    build:
      context: ../..
      dockerfile: tests/integration/Dockerfile.test
    command: ["npm", "run", "test:integration"]
    network_mode: "service:app"
    depends_on:
      - app-dapr
    volumes:
      - ../../test-results:/app/test-results
```

## Component Files for Testing

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: keyPrefix
      value: "test"
```

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Test Runner Script

```bash
#!/bin/bash
# run-tests.sh

set -e

cleanup() {
  echo "Cleaning up..."
  docker-compose -f docker-compose.test.yaml down -v
}
trap cleanup EXIT

echo "Starting test environment..."
docker-compose -f docker-compose.test.yaml up -d --build

echo "Waiting for Dapr sidecar..."
for i in $(seq 1 30); do
  if docker-compose -f docker-compose.test.yaml exec -T app \
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3500/v1.0/healthz | grep -q "204"; then
    echo "Dapr is ready"
    break
  fi
  sleep 2
done

echo "Running tests..."
docker-compose -f docker-compose.test.yaml run test-runner
```

## CI Pipeline Integration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: ./tests/integration/run-tests.sh
      - name: Upload test results
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

## Summary

Docker Compose provides a simple, reproducible environment for Dapr integration tests that works identically on developer machines and CI pipelines. By combining health checks, network mode sharing, and volume-mounted components, you get a realistic multi-service test environment without needing Kubernetes.
