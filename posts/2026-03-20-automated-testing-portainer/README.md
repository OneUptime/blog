# How to Set Up Automated Testing with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Testing, CI/CD, Automated Testing, DevOps

Description: Run unit tests, integration tests, and end-to-end tests in isolated Docker containers managed through Portainer for consistent test environments.

## Introduction

Automated testing in Docker containers ensures every developer and CI/CD system runs tests in the exact same environment. This guide covers setting up unit tests, integration tests with real databases, and end-to-end tests using containerized browsers, all managed through Portainer.

## Step 1: Unit Tests in Containers

```yaml
# docker-compose.test.yml - Unit test configuration

services:
  unit_tests:
    build:
      context: .
      target: test      # Use test stage from multi-stage Dockerfile
    container_name: unit_tests
    volumes:
      - ./src:/app/src
      - ./tests:/app/tests
      - test_results:/app/test-results
    command: pytest tests/unit/ -v --junitxml=/app/test-results/unit.xml
    environment:
      - TESTING=true
      - LOG_LEVEL=debug

volumes:
  test_results:
```

```dockerfile
# Dockerfile - Multi-stage with test stage
FROM python:3.12-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

FROM base AS test
# Install test dependencies
RUN pip install pytest pytest-cov pytest-asyncio httpx
COPY requirements-test.txt .
RUN pip install -r requirements-test.txt
COPY . .

FROM base AS production
COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0"]
```

## Step 2: Integration Tests with Real Services

```yaml
# docker-compose.integration.yml - Integration tests with real services

networks:
  test_network:
    driver: bridge

services:
  # Test database (ephemeral)
  test_postgres:
    image: postgres:15-alpine
    container_name: test_postgres
    environment:
      - POSTGRES_DB=testdb
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpass
    networks:
      - test_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser -d testdb"]
      interval: 5s
      retries: 5

  # Test Redis (ephemeral)
  test_redis:
    image: redis:7-alpine
    container_name: test_redis
    networks:
      - test_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

  # Integration test runner
  integration_tests:
    build:
      context: .
      target: test
    container_name: integration_tests
    environment:
      - TESTING=true
      - DATABASE_URL=postgresql://testuser:testpass@test_postgres:5432/testdb
      - REDIS_URL=redis://test_redis:6379/0
    command: pytest tests/integration/ -v --junitxml=/app/test-results/integration.xml
    depends_on:
      test_postgres:
        condition: service_healthy
      test_redis:
        condition: service_healthy
    networks:
      - test_network
    volumes:
      - test_results:/app/test-results

volumes:
  test_results:
```

## Step 3: End-to-End Tests with Playwright

```yaml
# docker-compose.e2e.yml - E2E tests with Playwright

networks:
  e2e_network:
    driver: bridge

services:
  # Application under test
  app:
    build: .
    container_name: e2e_app
    environment:
      - DATABASE_URL=postgresql://testuser:testpass@e2e_postgres:5432/testdb
    depends_on:
      e2e_postgres:
        condition: service_healthy
    networks:
      - e2e_network
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 5s
      retries: 10

  # Test database
  e2e_postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=testdb
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpass
    networks:
      - e2e_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser"]
      interval: 5s
      retries: 5

  # Playwright E2E test runner
  playwright:
    image: mcr.microsoft.com/playwright:v1.59.1-jammy
    container_name: playwright_tests
    command: >
      sh -c "npm init -y >/dev/null 2>&1 &&
      npm install --no-save @playwright/test@1.59.1 &&
      npx playwright test"
    depends_on:
      app:
        condition: service_healthy
    environment:
      - BASE_URL=http://app:8000
      - PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
      - PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
    volumes:
      - ./e2e:/tests
      - playwright_results:/tests/test-results
      - playwright_traces:/tests/playwright-report
    networks:
      - e2e_network
    working_dir: /tests
    init: true
    ipc: host

volumes:
  test_results:
  playwright_results:
  playwright_traces:
```

```typescript
// e2e/tests/login.spec.ts - Playwright test
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can log in successfully', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/login`);

    await page.fill('[name="email"]', 'user@test.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('[type="submit"]');

    await expect(page).toHaveURL(`${process.env.BASE_URL}/dashboard`);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/login`);

    await page.fill('[name="email"]', 'wrong@test.com');
    await page.fill('[name="password"]', 'wrongpass');
    await page.click('[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

## Step 4: Deploy Test Runner Stack in Portainer

Create a test runner stack in Portainer to run tests on demand:

```yaml
# portainer-test-stack.yml - On-demand test execution
networks:
  test_net:
    driver: bridge

services:
  test_runner:
    image: registry.yourdomain.com/myapp/api:${IMAGE_TAG:-latest}
    command: >
      sh -c "
        pytest tests/ -v --junitxml=/results/test-report.xml --cov=src --cov-report=html:/results/coverage;
        status=$$?;
        if [ $$status -eq 0 ]; then echo 'Tests PASSED'; else echo 'Tests FAILED'; fi;
        exit $$status
      "
    environment:
      - DATABASE_URL=postgresql://test:test@test_db:5432/testdb
      - TESTING=true
    depends_on:
      test_db:
        condition: service_healthy
    volumes:
      - /opt/test-results:/results
    networks:
      - test_net

  test_db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=testdb
      - POSTGRES_USER=test
      - POSTGRES_PASSWORD=test
    networks:
      - test_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      retries: 5
```

## Step 5: CI Integration - Run Tests via Portainer API

```bash
#!/bin/bash
# run-tests-portainer.sh - Trigger test run via Portainer API

set -euo pipefail

ENDPOINT_ID="${ENDPOINT_ID:-1}"
STACK_NAME="test-run-${BUILD_NUMBER:-$(date +%s)}"

cleanup() {
    if [ -n "${STACK_ID:-}" ] && [ "${STACK_ID}" != "null" ]; then
        curl -fsS -X DELETE \
            -H "X-API-KEY: $PORTAINER_API_KEY" \
            "$PORTAINER_URL/api/stacks/$STACK_ID?endpointId=$ENDPOINT_ID" >/dev/null
    fi
}

trap cleanup EXIT

# Deploy test stack
RESPONSE=$(curl -fsS -X POST \
    -H "X-API-KEY: $PORTAINER_API_KEY" \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID" \
    -d "{
      \"Name\": \"$STACK_NAME\",
      \"StackFileContent\": $(python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' < portainer-test-stack.yml),
      \"Env\": [{\"name\": \"IMAGE_TAG\", \"value\": \"${IMAGE_TAG:-latest}\"}]
    }")

STACK_ID=$(echo "$RESPONSE" | jq '.Id')
DOCKER_API_VERSION=$(curl -fsS \
    -H "X-API-KEY: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/version" | jq -r '.ApiVersion')

# Wait for the test runner container to be created
FILTERS=$(STACK_NAME="$STACK_NAME" python3 - <<'PY'
import json
import os
import urllib.parse

filters = {
    "label": [
        f"com.docker.compose.project={os.environ['STACK_NAME']}",
        "com.docker.compose.service=test_runner"
    ]
}

print(urllib.parse.quote(json.dumps(filters)))
PY
)

until [ -n "${CONTAINER_ID:-}" ] && [ "${CONTAINER_ID}" != "null" ]; do
    CONTAINER_ID=$(curl -fsS \
        -H "X-API-KEY: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/v$DOCKER_API_VERSION/containers/json?all=1&filters=$FILTERS" \
        | jq -r '.[0].Id // empty')
    sleep 5
done

# Wait for tests to complete and capture the container exit code
WAIT_RESPONSE=$(curl -fsS -X POST \
    -H "X-API-KEY: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/v$DOCKER_API_VERSION/containers/$CONTAINER_ID/wait?condition=not-running")
EXIT_CODE=$(echo "$WAIT_RESPONSE" | jq -r '.StatusCode')

# Collect test results
curl -fsS \
    -H "X-API-KEY: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/v$DOCKER_API_VERSION/containers/$CONTAINER_ID/archive?path=/results/test-report.xml" \
    -o test-report.tar
tar -xOf test-report.tar > test-report.xml
rm -f test-report.tar

exit $EXIT_CODE
```

## Conclusion

Automated testing in Docker containers managed by Portainer ensures reproducible, isolated test environments. Unit tests run in lightweight containers with only the application code, integration tests spin up real databases and services, and E2E tests use containerized browsers via Playwright. Portainer makes it easy to trigger test runs, view container logs during test execution, and inspect test result artifacts. This pattern eliminates "works on my machine" problems for tests.
