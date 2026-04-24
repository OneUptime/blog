# How to Set Up Automated Testing with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Automated Testing, CI/CD, Docker, Integration Test, Smoke Tests

Description: Learn how to integrate automated tests into your Portainer deployment workflow using ephemeral test containers and health check verification.

---

Automated testing with Portainer involves running test containers against your deployed stacks, verifying health check endpoints, and integrating test results into your CI/CD pipeline. This guide covers smoke tests, integration tests, and ephemeral test environments.

## Running Tests in an Ephemeral Container

In a Docker Standalone environment, use a `test` service in your stack that runs and exits - Docker leaves the container stopped unless you configure a restart policy:

```yaml
services:
  api:
    image: myregistry.example.com/my-app:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app_net

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpassword
    networks:
      - app_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser"]
      interval: 5s
      retries: 5

  test-runner:
    image: myregistry.example.com/my-app-tests:latest
    environment:
      API_URL: http://api:3000
      DATABASE_URL: postgresql://testuser:testpassword@db:5432/testdb
    depends_on:
      api:
        condition: service_healthy
      db:
        condition: service_healthy
    networks:
      - app_net
    command: npm test

networks:
  app_net:
```

The `test-runner` service exits with code 0 on success or non-zero on failure. CI reads the exit code to determine pass/fail.

## Smoke Test Script

A simple smoke test that verifies key endpoints after deployment:

```bash
#!/bin/bash
# smoke-test.sh <base-url>

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" = "$expected_status" ]; then
        echo "PASS: $name ($status)"
        ((PASS++))
    else
        echo "FAIL: $name (expected $expected_status, got $status)"
        ((FAIL++))
    fi
}

check "Health endpoint"       "$BASE_URL/health"
check "API version"           "$BASE_URL/api/version"
check "Login page"            "$BASE_URL/login"
check "Missing page 404"      "$BASE_URL/does-not-exist" 404

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```

## Integration Test Workflow

Run integration tests in CI after deploying to staging:

```bash
#!/bin/bash
set -euo pipefail

# Deploy to staging using a Portainer stack webhook (Business Edition, non-Edge environments)

curl -fsS -X POST "$PORTAINER_STAGING_WEBHOOK"

# Wait for containers to become healthy
echo "Waiting for deployment..."
sleep 30

# Run smoke tests
./scripts/smoke-test.sh https://staging.example.com

# Run integration tests in a Docker container
docker run --rm \
  -e BASE_URL=https://staging.example.com \
  myregistry.example.com/integration-tests:latest

echo "All tests passed"
```

## Database Migration Tests

Test that database migrations apply cleanly in an ephemeral environment:

```bash
# Run migration tests in isolation
docker compose run --rm \
  -e DATABASE_URL=postgresql://testuser:testpassword@db:5432/testdb \
  api \
  sh -c "npm run migrate && npm run migrate:verify"
```

## Portainer API-Based Health Verification

Use the Portainer API and its Docker API gateway to verify all containers in a Docker Standalone stack are ready before proceeding:

```bash
#!/bin/bash
set -euo pipefail

PORTAINER_URL="https://portainer.example.com"
STACK_NAME="my-app-staging"
PORTAINER_API_KEY="your_portainer_api_key"

STACK_JSON=$(curl -fsS -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/api/stacks" | \
  jq -er --arg name "$STACK_NAME" '.[] | select(.Name==$name)')

ENDPOINT_ID=$(jq -r '.EndpointId' <<<"$STACK_JSON")

# Wait up to 120 seconds for all containers to become ready
UNREADY=1
for i in $(seq 1 24); do
  CONTAINER_IDS=$(curl -fsS -H "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=1" | \
    jq -r --arg stack "$STACK_NAME" \
      '.[] | select(.Labels["com.docker.compose.project"]==$stack) | .Id')

  if [ -z "$CONTAINER_IDS" ]; then
    echo "Waiting for stack containers to appear ($i/24)..."
    sleep 5
    continue
  fi

  UNREADY=0

  for CONTAINER_ID in $CONTAINER_IDS; do
    READY=$(curl -fsS -H "X-API-Key: $PORTAINER_API_KEY" \
      "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$CONTAINER_ID/json" | \
      jq -r 'if .State.Health then .State.Health.Status == "healthy" else .State.Status == "running" end')

    if [ "$READY" != "true" ]; then
      UNREADY=$((UNREADY + 1))
    fi
  done

  if [ "$UNREADY" = "0" ]; then
    echo "All containers are ready"
    break
  fi

  echo "Waiting for containers to become ready ($i/24)..."
  sleep 5
done

[ "$UNREADY" = "0" ] || {
  echo "Timed out waiting for stack containers to become ready"
  exit 1
}
```

## Test Result Reporting

Publish test results as JUnit XML for CI systems to parse:

```bash
# Jest with JUnit reporter
docker run --rm \
  -e CI=true \
  -e JEST_JUNIT_OUTPUT_DIR=/app/test-results \
  -e JEST_JUNIT_OUTPUT_NAME=results.xml \
  -v "$(pwd)/test-results:/app/test-results" \
  myregistry.example.com/my-app-tests:latest \
  npx jest --reporters=default --reporters=jest-junit
```
