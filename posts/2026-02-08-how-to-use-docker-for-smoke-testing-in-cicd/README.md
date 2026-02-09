# How to Use Docker for Smoke Testing in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Smoke Testing, CI/CD, Testing, Health Checks, Deployment, DevOps, Automation

Description: Implement smoke tests with Docker in your CI/CD pipeline to catch critical failures before full deployment.

---

Smoke tests answer one question: does the build work at all? They are not comprehensive. They do not cover edge cases or test every feature. They verify that the application starts, responds to basic requests, and connects to its dependencies. If a smoke test fails, there is no point running the rest of your test suite. Docker makes smoke testing fast and reliable by spinning up the full application stack, running a quick verification, and reporting the result.

This guide shows you how to build effective smoke tests, containerize them, and integrate them into your CI/CD pipeline.

## What Makes a Good Smoke Test

A good smoke test takes under a minute, tests only critical paths, and has zero tolerance for flakiness. It should verify that the application binary starts without crashing, the HTTP server accepts connections, critical API endpoints return expected status codes, database connectivity works, and authentication flows are functional.

Smoke tests should not test business logic, validate complex workflows, or exercise edge cases. That is what unit tests and integration tests are for.

## Building a Smoke Test Suite

Create a lightweight test script that checks the essential health indicators.

```bash
#!/bin/bash
# smoke-test.sh - Quick verification that the application works
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Running smoke tests against: $BASE_URL"

# Function to check an endpoint
check_endpoint() {
    local url="$1"
    local expected_status="$2"
    local description="$3"

    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url")

    if [ "$status" = "$expected_status" ]; then
        echo "PASS: $description (HTTP $status)"
        return 0
    else
        echo "FAIL: $description - expected HTTP $expected_status, got HTTP $status"
        return 1
    fi
}

# Wait for the application to be ready
echo "Waiting for application to start..."
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -o /dev/null --max-time 5 "$BASE_URL/health"; then
        echo "Application is ready after $((i * RETRY_INTERVAL))s"
        break
    fi
    if [ "$i" = "$MAX_RETRIES" ]; then
        echo "FAIL: Application did not start within $((MAX_RETRIES * RETRY_INTERVAL))s"
        exit 1
    fi
    sleep $RETRY_INTERVAL
done

FAILURES=0

# Test 1: Health endpoint returns 200
check_endpoint "$BASE_URL/health" "200" "Health check endpoint" || FAILURES=$((FAILURES + 1))

# Test 2: API root responds
check_endpoint "$BASE_URL/api" "200" "API root endpoint" || FAILURES=$((FAILURES + 1))

# Test 3: Static assets are served
check_endpoint "$BASE_URL/" "200" "Frontend loads" || FAILURES=$((FAILURES + 1))

# Test 4: Auth endpoint exists (should return 401 without credentials)
check_endpoint "$BASE_URL/api/me" "401" "Auth endpoint rejects unauthenticated" || FAILURES=$((FAILURES + 1))

# Test 5: Verify JSON response from health endpoint
health_response=$(curl -s --max-time 10 "$BASE_URL/health")
if echo "$health_response" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status')=='ok'" 2>/dev/null; then
    echo "PASS: Health endpoint returns valid JSON with status ok"
else
    echo "FAIL: Health endpoint response is not valid or status is not ok"
    FAILURES=$((FAILURES + 1))
fi

# Test 6: Database connectivity (via health check)
db_status=$(curl -s --max-time 10 "$BASE_URL/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('database','unknown'))" 2>/dev/null)
if [ "$db_status" = "connected" ]; then
    echo "PASS: Database is connected"
else
    echo "FAIL: Database status is '$db_status', expected 'connected'"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "====================================="
if [ "$FAILURES" -gt 0 ]; then
    echo "SMOKE TESTS FAILED: $FAILURES failures"
    exit 1
else
    echo "ALL SMOKE TESTS PASSED"
    exit 0
fi
```

## Containerizing the Smoke Test

Package the smoke test as a Docker container so it runs the same way everywhere.

```dockerfile
# Dockerfile.smoke - Smoke test runner container
FROM alpine:3.19

# Install curl, bash, and python3 for response parsing
RUN apk add --no-cache curl bash python3

WORKDIR /tests

# Copy smoke test scripts
COPY smoke-test.sh .
RUN chmod +x smoke-test.sh

ENTRYPOINT ["./smoke-test.sh"]
```

## Docker Compose for Smoke Testing

Run smoke tests against the full application stack with Docker Compose.

```yaml
# docker-compose.smoke.yml - Smoke test environment
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 2s
      timeout: 2s
      retries: 10
    tmpfs:
      - /var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 2s
      retries: 10

  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgres://app:secret@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - PORT=3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 3s
      timeout: 3s
      retries: 15

  smoke-tests:
    build:
      context: ./tests
      dockerfile: Dockerfile.smoke
    environment:
      - BASE_URL=http://api:3000
    depends_on:
      api:
        condition: service_healthy
```

```bash
# Run smoke tests
docker compose -f docker-compose.smoke.yml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from smoke-tests

# Clean up
docker compose -f docker-compose.smoke.yml down -v
```

## Python-Based Smoke Tests

For more structured smoke tests, use Python with pytest.

```python
# tests/smoke/test_smoke.py - Structured smoke tests with pytest
import requests
import pytest
import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000")

class TestApplicationSmoke:
    """Smoke tests verify the application starts and responds correctly."""

    def test_health_endpoint_returns_200(self):
        """The health endpoint must return HTTP 200."""
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        assert response.status_code == 200

    def test_health_endpoint_returns_json(self):
        """The health endpoint must return valid JSON with a status field."""
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"

    def test_database_connected(self):
        """The health endpoint must report database connectivity."""
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        data = response.json()
        assert data.get("database") == "connected"

    def test_cache_connected(self):
        """The health endpoint must report cache connectivity."""
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        data = response.json()
        assert data.get("cache") == "connected"

class TestAPISmoke:
    """Smoke tests for API endpoints."""

    def test_api_root_responds(self):
        """The API root must return HTTP 200."""
        response = requests.get(f"{BASE_URL}/api", timeout=10)
        assert response.status_code == 200

    def test_unauthenticated_request_returns_401(self):
        """Protected endpoints must reject unauthenticated requests."""
        response = requests.get(f"{BASE_URL}/api/me", timeout=10)
        assert response.status_code == 401

    def test_login_endpoint_exists(self):
        """The login endpoint must accept POST requests."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@example.com", "password": "wrong"},
            timeout=10
        )
        # We expect 401 (bad credentials) not 404 (endpoint missing)
        assert response.status_code in [401, 400]

    def test_response_headers(self):
        """API responses must include security headers."""
        response = requests.get(f"{BASE_URL}/api", timeout=10)
        headers = response.headers
        assert "X-Content-Type-Options" in headers or "x-content-type-options" in headers

class TestPerformanceSmoke:
    """Basic performance smoke tests."""

    def test_health_endpoint_responds_quickly(self):
        """The health endpoint must respond within 500ms."""
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        assert response.elapsed.total_seconds() < 0.5

    def test_api_root_responds_quickly(self):
        """The API root must respond within 1 second."""
        response = requests.get(f"{BASE_URL}/api", timeout=10)
        assert response.elapsed.total_seconds() < 1.0
```

```dockerfile
# Dockerfile.smoke-python - Python-based smoke test runner
FROM python:3.12-slim

WORKDIR /tests

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "pytest", "test_smoke.py", "-v", "--tb=short", "--junitxml=results.xml"]
```

## Smoke Testing Docker Images Before Push

Run smoke tests against a newly built Docker image before pushing it to a registry.

```bash
#!/bin/bash
# ci-smoke.sh - Build, smoke test, and push a Docker image
set -e

IMAGE_NAME="myregistry/myapp"
IMAGE_TAG="${GIT_SHA:-latest}"

echo "Building image..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "Starting smoke test environment..."
docker compose -f docker-compose.smoke.yml up -d postgres redis
sleep 5

# Run the newly built image
docker run -d \
  --name smoke-test-app \
  --network $(docker compose -f docker-compose.smoke.yml ps -q | head -1 | xargs docker inspect --format '{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}') \
  -e DATABASE_URL=postgres://app:secret@postgres:5432/myapp \
  -e REDIS_URL=redis://redis:6379 \
  "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Running smoke tests..."
if docker compose -f docker-compose.smoke.yml run smoke-tests; then
    echo "Smoke tests passed! Pushing image..."
    docker push "${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo "Smoke tests failed! Image NOT pushed."
    exit 1
fi

# Clean up
docker stop smoke-test-app && docker rm smoke-test-app
docker compose -f docker-compose.smoke.yml down -v
```

## CI/CD Pipeline Integration

```yaml
# .github/workflows/smoke.yml - Smoke tests in CI/CD
name: Build and Smoke Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Build application image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run smoke tests
        run: |
          docker compose -f docker-compose.smoke.yml up \
            --build \
            --abort-on-container-exit \
            --exit-code-from smoke-tests

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-test-results
          path: tests/smoke/results.xml

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.smoke.yml down -v
```

## Wrapping Up

Smoke tests are the cheapest insurance you can add to your deployment pipeline. They catch the big failures fast, before expensive integration or E2E tests even start. Docker makes smoke tests reliable by providing a clean, consistent environment every time. Keep your smoke tests simple, fast, and focused on answering one question: does this build work? If the answer is no, fail fast and save everyone's time.
