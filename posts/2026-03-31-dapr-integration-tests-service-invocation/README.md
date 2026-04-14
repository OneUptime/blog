# How to Set Up Integration Tests for Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Service Invocation, Integration Test, Go

Description: Write integration tests for Dapr service invocation that spin up real Dapr sidecars and verify end-to-end service-to-service communication with actual network calls.

---

Unit tests with mocked Dapr clients are useful but do not verify that your service invocation configuration is correct end-to-end. Integration tests that run real Dapr sidecars catch configuration errors, timeout mismatches, and middleware issues that mocks miss.

## What to Test

Integration tests for Dapr service invocation should verify:
- The calling service can resolve and invoke the target service
- The target service receives the correct headers and body
- Resiliency policies (retries, circuit breakers) behave as expected
- mTLS is enforced between services

## Test Setup with Docker Compose

Use Docker Compose to spin up both services with Dapr sidecars for integration tests:

```yaml
# docker-compose.test.yaml
version: "3.8"
services:
  caller:
    build: ./caller
    environment:
      - DAPR_HTTP_PORT=3500
    ports:
      - "3500:3500"
    depends_on:
      - callee
      - placement

  caller-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "--app-id"
      - "caller"
      - "--app-port"
      - "8080"
      - "--dapr-http-port"
      - "3500"
      - "--log-level"
      - "error"
    network_mode: "service:caller"
    depends_on:
      - caller

  callee:
    build: ./callee
    ports:
      - "8081:8081"

  callee-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "--app-id"
      - "callee"
      - "--app-port"
      - "8081"
    network_mode: "service:callee"
    depends_on:
      - callee

  placement:
    image: daprio/placement:1.14.0
    ports:
      - "50006:50006"
```

## Writing the Test

```go
// service_invocation_test.go
package integration_test

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "testing"
    "time"
)

func TestServiceInvocation(t *testing.T) {
    // Call the callee service via Dapr service invocation
    resp, err := http.Post(
        "http://localhost:3500/v1.0/invoke/callee/method/process",
        "application/json",
        strings.NewReader(`{"orderId": "test-123"}`),
    )
    if err != nil {
        t.Fatalf("invocation failed: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("expected 200, got %d", resp.StatusCode)
    }

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    if result["processed"] != true {
        t.Errorf("expected processed=true, got %v", result["processed"])
    }
}
```

## Waiting for Dapr to Be Ready

Before running tests, wait for both sidecars to report healthy:

```go
func waitForDapr(t *testing.T, port int) {
    t.Helper()
    for i := 0; i < 30; i++ {
        resp, err := http.Get(fmt.Sprintf("http://localhost:%d/v1.0/healthz", port))
        if err == nil {
            resp.Body.Close()
            if resp.StatusCode == http.StatusNoContent {
                return
            }
        }
        time.Sleep(1 * time.Second)
    }
    t.Fatal("Dapr did not become ready in time")
}
```

## Running the Tests

```bash
docker-compose -f docker-compose.test.yaml up -d
go test ./integration_test/... -v -timeout 120s
docker-compose -f docker-compose.test.yaml down
```

## Testing Resiliency

Inject failures by temporarily stopping the callee service and verify that retries and circuit breakers behave correctly:

```bash
docker-compose -f docker-compose.test.yaml stop callee
# Run tests that expect retries to eventually fail with circuit breaker open
```

## Summary

Integration tests for Dapr service invocation use real sidecars to verify end-to-end communication, configuration correctness, and resiliency behavior. Docker Compose makes it easy to spin up the required infrastructure locally and in CI pipelines.
