# How to Use Podman for E2E Testing in CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, E2E Testing, Playwright, Cypress

Description: Learn how to run end-to-end tests in CI using Podman containers with browsers, test frameworks, and full application stacks.

---

> End-to-end tests in Podman containers provide consistent, reproducible browser testing environments that eliminate flaky tests caused by CI environment differences.

End-to-end (E2E) testing validates your application from the user's perspective by driving a real browser through your application flows. Running E2E tests inside Podman containers in CI ensures consistent browser versions, dependencies, and configurations across every test run. This guide covers how to set up E2E testing with Podman using popular frameworks like Playwright and Cypress.

---

## Setting Up the E2E Test Environment

Create a Containerfile for your E2E test runner with browser dependencies. Match the Playwright image tag to the version of `@playwright/test` installed in your project.

```dockerfile
# Containerfile.e2e

# E2E test runner base image with Playwright browsers and system dependencies
FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

# Copy dependency files first for caching
COPY package.json package-lock.json ./

# Install all dependencies including dev (needed for tests)
RUN npm ci

# Copy test source files
COPY . .

# Default command runs the E2E test suite
CMD ["npx", "playwright", "test"]
```

```bash
#!/bin/bash
# Build the E2E test runner image
podman build \
  -f Containerfile.e2e \
  -t myapp-e2e:latest \
  .

echo "E2E test runner image built successfully"
podman images myapp-e2e:latest --format "Size: {{.Size}}"
```

## Running Playwright Tests in Podman

Run Playwright E2E tests inside a Podman container against your application.

```bash
#!/bin/bash
# Run Playwright E2E tests with Podman
# The application and tests run in separate containers on the same network

# Create a network for the test environment
podman network create e2e-net

# Build the application image
podman build -t myapp:e2e .

# Build the E2E test runner image
podman build -f Containerfile.e2e -t myapp-e2e:latest .

# Create a host directory for Playwright artifacts
mkdir -p ./test-results

# Start the database
podman run -d \
  --name e2e-db \
  --network e2e-net \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=e2etest \
  postgres:16-alpine

# Wait for database
sleep 5
podman exec e2e-db pg_isready -U postgres

# Start the application
podman run -d \
  --name e2e-app \
  --network e2e-net \
  -e DATABASE_URL="postgresql://postgres:testpass@e2e-db:5432/e2etest" \
  -e NODE_ENV=test \
  myapp:e2e

# Wait for the application to be ready
echo "Waiting for application..."
for i in $(seq 1 30); do
  if podman exec e2e-app wget -qO- http://localhost:8080/health 2>/dev/null | grep -q "ok"; then
    echo "Application is ready"
    break
  fi
  sleep 2
done

# Run E2E tests against the application
podman run --rm \
  --network e2e-net \
  -e BASE_URL=http://e2e-app:8080 \
  -v "$(pwd)/test-results:/app/test-results:Z" \
  myapp-e2e:latest

TEST_EXIT=$?

# Cleanup
podman rm -f e2e-app e2e-db
podman network rm e2e-net

exit $TEST_EXIT
```

## Running Cypress Tests in Podman

Set up Cypress E2E tests with Podman containers.

```dockerfile
# Containerfile.cypress
# Cypress E2E test runner
FROM cypress/included:13.7.0

WORKDIR /app

# Copy Cypress configuration and test files
COPY package.json package-lock.json ./
COPY cypress.config.js ./
COPY cypress/ ./cypress/

# Install project dependencies
RUN npm ci

# Default runs Cypress in headless mode
CMD ["npx", "cypress", "run", "--browser", "chrome"]
```

```bash
#!/bin/bash
# Run Cypress E2E tests with Podman

# Build the Cypress test runner
podman build -f Containerfile.cypress -t myapp-cypress:latest .

# Create the test network
podman network create cypress-net

# Start the application stack
podman run -d --name cy-app --network cypress-net \
  -e NODE_ENV=test myapp:e2e

# Wait for the app
sleep 5

# Run Cypress tests
podman run --rm \
  --network cypress-net \
  -e CYPRESS_BASE_URL=http://cy-app:8080 \
  -v "$(pwd)/cypress/videos:/app/cypress/videos:Z" \
  -v "$(pwd)/cypress/screenshots:/app/cypress/screenshots:Z" \
  myapp-cypress:latest

TEST_EXIT=$?

# Cleanup
podman rm -f cy-app
podman network rm cypress-net

exit $TEST_EXIT
```

## Using Podman Pods for E2E Testing

Group all test services in a pod for simplified networking.

```bash
#!/bin/bash
# E2E testing with a Podman pod
# All containers share localhost networking inside the pod

# Create the pod with exposed ports
podman pod create \
  --name e2e-pod \
  -p 8080:8080

# Start the database
podman run -d \
  --pod e2e-pod \
  --name pod-e2e-db \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=e2edb \
  postgres:16-alpine

# Start Redis for sessions
podman run -d \
  --pod e2e-pod \
  --name pod-e2e-redis \
  redis:7-alpine

# Wait for services
sleep 5

# Build and start the application
podman build -t myapp:e2e .
podman run -d \
  --pod e2e-pod \
  --name pod-e2e-app \
  -e DATABASE_URL="postgresql://postgres:testpass@localhost:5432/e2edb" \
  -e REDIS_URL="redis://localhost:6379" \
  myapp:e2e

sleep 3

# Build and run E2E tests
# The tests connect to localhost:8080 since they are in the same pod
podman build -f Containerfile.e2e -t myapp-e2e:latest .
podman run --rm \
  --pod e2e-pod \
  -e BASE_URL=http://localhost:8080 \
  myapp-e2e:latest

TEST_EXIT=$?

# Cleanup the entire pod
podman pod rm -f e2e-pod

exit $TEST_EXIT
```

## GitHub Actions E2E Pipeline

Complete GitHub Actions workflow for E2E testing with Podman.

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Build application and E2E test images
      - name: Build images
        run: |
          podman build -t myapp:e2e .
          podman build -f Containerfile.e2e -t myapp-e2e:latest .

      # Set up the test environment
      - name: Start test environment
        run: |
          podman network create e2e-test
          podman run -d --name db --network e2e-test \
            -e POSTGRES_PASSWORD=test -e POSTGRES_DB=e2e \
            postgres:16-alpine
          sleep 5
          podman run -d --name app --network e2e-test \
            -e DATABASE_URL="postgresql://postgres:test@db:5432/e2e" \
            myapp:e2e
          sleep 3

      # Run E2E tests
      - name: Run E2E tests
        run: |
          mkdir -p test-results
          podman run --rm \
            --network e2e-test \
            -e BASE_URL=http://app:8080 \
            -v ${{ github.workspace }}/test-results:/app/test-results:Z \
            myapp-e2e:latest

      # Upload Playwright artifacts (screenshots, videos, traces)
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-test-results
          path: test-results/

      # Always clean up
      - name: Cleanup
        if: always()
        run: |
          podman rm -f app db 2>/dev/null || true
          podman network rm e2e-test 2>/dev/null || true
```

## Parallel E2E Test Execution

Run E2E tests in parallel across multiple containers for faster results.

```bash
#!/bin/bash
# Run E2E tests in parallel using Podman
# Split tests across multiple containers for faster execution

SHARD_COUNT=4
PIDS=()
RESULTS=()

# Create shared network
podman network create e2e-parallel

# Start shared services
podman run -d --name par-db --network e2e-parallel \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=e2e postgres:16-alpine
sleep 5

podman run -d --name par-app --network e2e-parallel \
  -e DATABASE_URL="postgresql://postgres:test@par-db:5432/e2e" \
  myapp:e2e
sleep 3

# Run sharded tests in parallel
for SHARD in $(seq 1 $SHARD_COUNT); do
  podman run --rm \
    --network e2e-parallel \
    -e BASE_URL=http://par-app:8080 \
    -e TEST_SHARD="${SHARD}/${SHARD_COUNT}" \
    myapp-e2e:latest \
    npx playwright test --shard="${SHARD}/${SHARD_COUNT}" &
  PIDS+=($!)
  echo "Started shard ${SHARD}/${SHARD_COUNT} (PID: ${PIDS[-1]})"
done

# Wait for all shards to complete
FAILED=0
for i in "${!PIDS[@]}"; do
  wait "${PIDS[$i]}"
  EXIT_CODE=$?
  SHARD=$((i + 1))
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Shard ${SHARD}: FAILED (exit code ${EXIT_CODE})"
    FAILED=1
  else
    echo "Shard ${SHARD}: PASSED"
  fi
done

# Cleanup
podman rm -f par-app par-db
podman network rm e2e-parallel

exit $FAILED
```

## Summary

E2E testing with Podman in CI provides consistent browser environments that eliminate flakiness caused by environment differences. Build dedicated test runner images with Playwright browsers and project dependencies or with official Cypress images, set up the full application stack using Podman networks or pods, and run your tests against the containerized application. Extract test artifacts like screenshots, videos, and reports for debugging failed tests. Parallel test execution across multiple containers can significantly reduce E2E test suite run times. The containerized approach ensures that your E2E tests run identically in local development and CI environments.
