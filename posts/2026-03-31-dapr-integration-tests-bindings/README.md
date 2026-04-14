# How to Set Up Integration Tests for Dapr Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Binding, Integration Test, Go

Description: Write integration tests for Dapr input and output bindings that verify trigger-based invocations and external system interactions using real binding backends.

---

Dapr bindings connect your application to external systems like cron schedulers, S3 buckets, SMTP servers, and HTTP endpoints. Integration tests verify that binding configuration is correct, triggers fire as expected, and output operations reach the target system.

## Types of Bindings to Test

- **Output bindings**: Your app writes to an external system (e.g., send email, write to S3)
- **Input bindings**: An external trigger invokes your app (e.g., cron job, queue message)

## Test Setup for Input Bindings

Use a cron input binding to trigger a scheduled operation and verify the result:

```yaml
# components/cron-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: test-cron
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "@every 2s"
```

```yaml
# docker-compose.bindings-test.yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "8080:8080"

  app-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "-app-id"
      - "bindings-test"
      - "-app-port"
      - "8080"
      - "-components-path"
      - "/components"
    volumes:
      - ./components:/components
    network_mode: "service:app"
```

## Application Endpoint for Input Binding

```go
// main.go
package main

import (
    "encoding/json"
    "net/http"
    "sync/atomic"
)

var triggerCount int64

func main() {
    http.HandleFunc("/test-cron", func(w http.ResponseWriter, r *http.Request) {
        atomic.AddInt64(&triggerCount, 1)
        w.WriteHeader(http.StatusOK)
    })
    http.HandleFunc("/trigger-count", func(w http.ResponseWriter, r *http.Request) {
        json.NewEncoder(w).Encode(map[string]int64{
            "count": atomic.LoadInt64(&triggerCount),
        })
    })
    http.ListenAndServe(":8080", nil)
}
```

## Writing the Integration Test

```go
// binding_integration_test.go
package integration_test

import (
    "encoding/json"
    "net/http"
    "testing"
    "time"
)

func TestCronBindingTriggers(t *testing.T) {
    // Wait 6 seconds for the cron to fire at least twice (every 2s)
    time.Sleep(6 * time.Second)

    resp, err := http.Get("http://localhost:8080/trigger-count")
    if err != nil {
        t.Fatalf("failed to get trigger count: %v", err)
    }
    defer resp.Body.Close()

    var result map[string]int64
    json.NewDecoder(resp.Body).Decode(&result)

    if result["count"] < 2 {
        t.Errorf("expected at least 2 triggers, got %d", result["count"])
    }
}
```

## Testing HTTP Output Bindings

For HTTP output bindings, use a local mock HTTP server to capture outbound calls:

```go
func TestHttpOutputBinding(t *testing.T) {
    received := make(chan []byte, 1)
    // Start a mock target server
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        body, _ := io.ReadAll(r.Body)
        received <- body
        w.WriteHeader(200)
    }))
    defer srv.Close()

    // Invoke the HTTP binding via Dapr
    http.Post(
        "http://localhost:3500/v1.0/bindings/http-output",
        "application/json",
        strings.NewReader(`{"operation": "post", "data": {"key": "value"}, "metadata": {"path": "/target"}}`),
    )

    select {
    case body := <-received:
        // Verify the payload
        if !strings.Contains(string(body), "value") {
            t.Errorf("unexpected body: %s", body)
        }
    case <-time.After(5 * time.Second):
        t.Fatal("timeout waiting for binding invocation")
    }
}
```

## Summary

Integration tests for Dapr bindings verify that input triggers fire correctly and output operations reach their targets. Using real binding components with local test servers or mock endpoints gives you confidence that binding configuration is correct before deploying to production.
