# How to Test Dapr Go Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Testing, Unit Test, Integration Test, Microservice

Description: Write unit and integration tests for Dapr Go applications by mocking the Dapr client, using in-memory components, and running against a real sidecar in CI.

---

## Overview

Testing Dapr Go applications requires strategies at multiple levels: unit tests that mock the Dapr client, component tests with in-memory Dapr components, and end-to-end tests against a real Dapr environment. This guide covers all three approaches.

## Unit Testing with a Mocked Dapr Client

The Dapr Go SDK defines `client.Client` as an interface, so you can create your own mock with testify:

```go
package service_test

import (
    "context"
    "testing"

    "github.com/dapr/go-sdk/client"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// MockClient implements the subset of client.Client needed for tests.
type MockClient struct {
    mock.Mock
}

func (m *MockClient) SaveState(ctx context.Context, storeName, key string, data []byte, meta map[string]string, so ...client.StateOption) error {
    args := m.Called(ctx, storeName, key, data, meta, so)
    return args.Error(0)
}

func TestSaveOrder(t *testing.T) {
    mockClient := new(MockClient)

    // Set up expectation
    mockClient.On("SaveState",
        mock.Anything, "statestore", "order:1",
        mock.Anything, mock.Anything, mock.Anything).Return(nil)

    svc := &OrderService{dapr: mockClient}
    err := svc.SaveOrder(context.Background(), &Order{ID: "1", Product: "Widget"})

    assert.NoError(t, err)
    mockClient.AssertExpectations(t)
}
```

## Testing Pub/Sub Handlers Directly

Test your topic event handler function without a running sidecar:

```go
func TestHandleOrderCreated(t *testing.T) {
    handler := &InventoryHandler{}

    event := &common.TopicEvent{
        Topic:   "order-created",
        RawData: []byte(`{"id":"ord-1","productId":"prod-1","quantity":2}`),
    }

    retry, err := handler.HandleOrderCreated(context.Background(), event)

    assert.False(t, retry)
    assert.NoError(t, err)
}
```

## Integration Testing with In-Memory Components

Run integration tests with a real Dapr sidecar using in-memory components:

```yaml
# test/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
```

Start the sidecar before tests in a `TestMain`:

```go
func TestMain(m *testing.M) {
    cmd := exec.Command("dapr", "run",
        "--app-id", "test-service",
        "--app-port", "8099",
        "--resources-path", "./test/components",
        "--", "sleep", "60")
    cmd.Start()
    time.Sleep(2 * time.Second) // wait for sidecar

    code := m.Run()

    cmd.Process.Kill()
    os.Exit(code)
}
```

## Testing Service Invocation Handlers

Test invocation handlers as plain functions by constructing `InvocationEvent` structs:

```go
func TestGetProduct(t *testing.T) {
    h := &ProductHandler{}

    in := &common.InvocationEvent{
        Verb:        "GET",
        ContentType: "application/json",
        QueryString: "id=prod-1",
    }

    out, err := h.GetProduct(context.Background(), in)

    assert.NoError(t, err)
    assert.Equal(t, "application/json", out.ContentType)
    assert.Contains(t, string(out.Data), "prod-1")
}
```

## Running Tests in CI

```yaml
# .github/workflows/test.yml
- name: Init Dapr
  run: |
    dapr init --runtime-version 1.14.0
    dapr version

- name: Run tests
  run: go test ./... -v -timeout 120s
```

## Summary

Dapr Go applications are testable at three levels: unit tests use the mock client to assert state store and pub/sub calls, component tests run with in-memory Dapr components for realistic integration coverage, and CI pipelines use `dapr init` to run the full stack. Handler functions are plain Go functions and can always be tested directly without any Dapr infrastructure.
