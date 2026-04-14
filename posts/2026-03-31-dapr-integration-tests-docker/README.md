# How to Run Dapr Integration Tests in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Integration Test, Testing, CI/CD

Description: Learn how to run Dapr integration tests in Docker containers with real sidecars and dependencies, suitable for local development and CI pipelines.

---

## Integration Testing Strategy for Dapr

Integration tests for Dapr services verify that your application works correctly with real Dapr building blocks - actual Redis state stores, real pub/sub message passing, and genuine service invocation between containers. Docker Compose is the best tool for spinning up the full stack for each test run.

## Project Structure

Organize tests to keep integration tests separate from unit tests:

```text
order-service/
  cmd/
  internal/
  integration/
    docker-compose.test.yml
    components/
      statestore.yaml
      pubsub.yaml
    tests/
      order_integration_test.go
```

## Docker Compose for the Test Stack

Define all services needed for integration tests:

```yaml
version: "3.9"
networks:
  test-network:
    driver: bridge

services:
  redis:
    image: redis:7-alpine
    networks:
      - test-network
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

  order-service:
    build:
      context: ..
      dockerfile: Dockerfile
    networks:
      - test-network
    environment:
      - APP_ENV=test
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/healthz"]
      interval: 5s
      start_period: 10s
      retries: 5

  order-service-dapr:
    image: daprio/daprd:1.13.0
    command: [
      "./daprd",
      "--app-id", "order-service",
      "--app-port", "8080",
      "--app-channel-address", "order-service",
      "--dapr-http-port", "3500",
      "--resources-path", "/components"
    ]
    volumes:
      - ./components:/components
    networks:
      - test-network
    ports:
      - "3500:3500"
    depends_on:
      order-service:
        condition: service_healthy
      redis:
        condition: service_healthy
```

## Writing the Integration Tests

Tests call the Dapr HTTP API or the application directly through the sidecar:

```go
//go:build integration

package integration_test

import (
    "net/http"
    "strings"
    "testing"
    "github.com/stretchr/testify/assert"
)

const daprURL = "http://localhost:3500"

func TestCreateAndRetrieveOrder(t *testing.T) {
    body := `{"order_id":"test-123","product":"widget","quantity":2}`
    resp, err := http.Post(
        daprURL+"/v1.0/invoke/order-service/method/orders",
        "application/json",
        strings.NewReader(body),
    )
    assert.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)
}

func TestStateStoreIntegration(t *testing.T) {
    payload := `[{"key":"test-key","value":"test-value"}]`
    resp, err := http.Post(
        daprURL+"/v1.0/state/statestore",
        "application/json",
        strings.NewReader(payload),
    )
    assert.NoError(t, err)
    assert.Equal(t, 204, resp.StatusCode)
}
```

## Running Tests in CI

Add a Makefile target to start the stack, run tests, and clean up:

```makefile
.PHONY: integration-test
integration-test:
	docker compose -f integration/docker-compose.test.yml up -d --wait
	go test ./integration/tests/... -tags=integration -v -timeout 120s || true
	docker compose -f integration/docker-compose.test.yml down -v
```

In GitHub Actions:

```yaml
- name: Run Dapr integration tests
  run: make integration-test
```

## Summary

Running Dapr integration tests in Docker means standing up a complete stack with real Redis, real sidecars, and the built application image using Docker Compose. The `--wait` flag ensures all services pass their health checks before tests begin, making results reliable. Cleaning up with `down -v` after each run prevents state from leaking between CI jobs.
