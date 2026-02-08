# How to Use Docker for End-to-End Testing Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, End-to-End Testing, E2E, Testing, Docker Compose, Playwright, Cypress, CI/CD

Description: Build complete end-to-end testing environments with Docker Compose to test full application stacks reliably.

---

End-to-end tests verify that your entire application works correctly from the user's perspective. They exercise the frontend, backend, database, cache, message queues, and every service in between. The challenge is creating a reliable, reproducible environment that includes all these components. Docker Compose solves this by defining your entire stack in a single file, giving every developer and CI runner the exact same testing environment.

This guide covers building E2E test environments, managing service dependencies, running tests with popular frameworks, and handling the common pitfalls that make E2E testing painful.

## The E2E Testing Challenge

E2E tests are notoriously flaky. Half the time, failures are caused by environment differences rather than actual bugs. One developer has PostgreSQL 15 while another has 16. The CI runner uses a different Redis version than production. The test database has stale data from a previous run. Docker eliminates all of these variables by defining exact versions and starting from a clean state every time.

## Designing the Test Environment

A well-structured E2E test environment has three layers: the application services, the infrastructure services, and the test runner itself.

```yaml
# docker-compose.test.yml - Complete E2E testing environment
version: "3.8"

services:
  # Infrastructure layer
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpass
      - POSTGRES_DB=testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser -d testdb"]
      interval: 3s
      timeout: 3s
      retries: 10
    tmpfs:
      - /var/lib/postgresql/data  # RAM disk for faster tests

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 10

  rabbitmq:
    image: rabbitmq:3-alpine
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 5s
      timeout: 5s
      retries: 10

  # Application layer
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    environment:
      - DATABASE_URL=postgres://testuser:testpass@postgres:5432/testdb
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - NODE_ENV=test
      - JWT_SECRET=test-secret-key
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      timeout: 3s
      retries: 10

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - API_URL=http://api:3000
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080"]
      interval: 5s
      timeout: 3s
      retries: 10
    ports:
      - "8080:8080"

  # Test runner layer
  e2e-tests:
    build:
      context: ./e2e
      dockerfile: Dockerfile
    environment:
      - BASE_URL=http://frontend:8080
      - API_URL=http://api:3000
    depends_on:
      frontend:
        condition: service_healthy
    volumes:
      - ./e2e/results:/app/results
      - ./e2e/screenshots:/app/screenshots
```

## Managing Service Startup Order

The `depends_on` directive with health check conditions is critical. Without it, your test runner might start before the database finishes initializing, causing false failures.

```yaml
# Proper dependency chain with health checks
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy  # Wait for Postgres to accept connections
      redis:
        condition: service_healthy  # Wait for Redis to respond to PING
```

For services that need database migrations or seed data, use an init container pattern.

```yaml
  # Run migrations before starting the API
  migrate:
    build: .
    command: npx prisma migrate deploy
    environment:
      - DATABASE_URL=postgres://testuser:testpass@postgres:5432/testdb
    depends_on:
      postgres:
        condition: service_healthy

  # Seed test data after migrations
  seed:
    build: .
    command: node scripts/seed-test-data.js
    environment:
      - DATABASE_URL=postgres://testuser:testpass@postgres:5432/testdb
    depends_on:
      migrate:
        condition: service_completed_successfully

  api:
    depends_on:
      seed:
        condition: service_completed_successfully
```

## Running E2E Tests with Playwright

Playwright is excellent for E2E testing because it supports multiple browsers and handles asynchronous UI well. Here is the test runner Dockerfile and a sample test.

```dockerfile
# e2e/Dockerfile - Playwright test runner
FROM mcr.microsoft.com/playwright:v1.42.0-jammy

WORKDIR /app

# Install test dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy test files
COPY . .

# Run tests
CMD ["npx", "playwright", "test"]
```

```typescript
// e2e/tests/user-flow.spec.ts - End-to-end user flow test
import { test, expect } from '@playwright/test';

test.describe('User Registration and Login Flow', () => {

  test('should allow a new user to register', async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/register');

    // Fill in the registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should allow registered user to login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});
```

```typescript
// e2e/playwright.config.ts - Playwright configuration for Docker
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['html', { outputFolder: 'results/html-report' }],
    ['junit', { outputFile: 'results/junit-results.xml' }],
  ],
});
```

## Running the Tests

Execute the entire E2E suite with a single command.

```bash
# Run all services and the test suite
docker compose -f docker-compose.test.yml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from e2e-tests

# Check the exit code
echo "Tests exited with code: $?"

# Clean up
docker compose -f docker-compose.test.yml down -v
```

## Using tmpfs for Speed

Database containers are the biggest bottleneck in E2E tests. Mounting the data directory on a RAM disk speeds things up significantly.

```yaml
  postgres:
    image: postgres:16-alpine
    tmpfs:
      - /var/lib/postgresql/data  # Store data in RAM
    environment:
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpass
      - POSTGRES_DB=testdb
    command:
      # Aggressive Postgres settings for testing (NOT for production)
      - "postgres"
      - "-c"
      - "fsync=off"
      - "-c"
      - "synchronous_commit=off"
      - "-c"
      - "full_page_writes=off"
```

These PostgreSQL settings disable durability guarantees, which is fine for tests but would cause data loss in production.

## Test Data Management

Each test run should start with a known data state. There are several strategies.

```bash
#!/bin/bash
# scripts/reset-test-data.sh - Reset database between test suites
set -e

# Drop and recreate the test database
docker compose -f docker-compose.test.yml exec -T postgres \
  psql -U testuser -d postgres -c "DROP DATABASE IF EXISTS testdb;"
docker compose -f docker-compose.test.yml exec -T postgres \
  psql -U testuser -d postgres -c "CREATE DATABASE testdb;"

# Run migrations
docker compose -f docker-compose.test.yml run --rm api npx prisma migrate deploy

# Seed with test data
docker compose -f docker-compose.test.yml run --rm api node scripts/seed.js
```

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml - E2E tests in GitHub Actions
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - name: Run E2E tests
        run: |
          docker compose -f docker-compose.test.yml up \
            --build \
            --abort-on-container-exit \
            --exit-code-from e2e-tests

      - name: Upload test artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results
          path: |
            e2e/results/
            e2e/screenshots/

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

## Debugging Failing Tests

When E2E tests fail, you need visibility into what went wrong. Playwright's trace viewer is invaluable.

```bash
# After a failure, download the trace and open it locally
npx playwright show-trace e2e/results/trace.zip
```

For live debugging, run the environment without the test runner and execute tests interactively.

```bash
# Start everything except the test runner
docker compose -f docker-compose.test.yml up -d postgres redis rabbitmq api frontend

# Run tests from your local machine against the Dockerized stack
cd e2e && BASE_URL=http://localhost:8080 npx playwright test --headed
```

## Wrapping Up

Docker Compose transforms E2E testing from a fragile, environment-dependent process into a reliable, one-command operation. Every run starts clean, uses exact service versions, and produces consistent results. The key ingredients are health check conditions for proper startup ordering, tmpfs for database speed, and proper test data management. Invest the time to set this up once, and your E2E tests will stop being the unreliable part of your pipeline.
