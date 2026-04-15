# How to Certify Pluggable Components for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Certification, Testing, Compliance

Description: Run the Dapr component certification test suite against your pluggable component to verify protocol compliance before publishing to the community.

---

## Why Component Certification Matters

Dapr maintains a certification test suite that validates component behavior against the expected interface contract. Passing these tests ensures your pluggable component:
- Correctly implements all required gRPC methods
- Handles edge cases (empty keys, large payloads, concurrent requests)
- Behaves consistently with built-in Dapr components

## The Dapr Component Certification Framework

The certification framework is part of the `dapr/components-contrib` repository. It contains conformance tests for each component type.

```bash
# Clone the components-contrib repo
git clone https://github.com/dapr/components-contrib.git
cd components-contrib
```

## Setting Up Your Component for Testing

Register your pluggable component with the test framework by implementing the test interface:

```go
// tests/conformance/state_test.go
package conformance

import (
    "testing"

    conf "github.com/dapr/components-contrib/tests/conformance"
    conf_state "github.com/dapr/components-contrib/tests/conformance/state"
    "github.com/myorg/dapr-custom-statestore/pkg"
)

func TestCustomStateStoreConformance(t *testing.T) {
    tc, err := conf.NewTestConfig("custom-statestore", []string{
        "init", "set", "get", "delete", "bulkset", "bulkget",
        "bulkdelete", "transaction", "etag",
    }, nil)
    if err != nil {
        t.Fatalf("error creating test config: %v", err)
    }

    store := pkg.NewCustomStateStore()

    conf_state.ConformanceTests(t, tc.Properties, store, tc)
}
```

## Running Conformance Tests

```bash
# Run conformance tests against your component
go test -v -count=1 \
  ./tests/conformance/... \
  -run TestCustomStateStoreConformance \
  -timeout 5m

# Run with race detection
go test -race -v \
  ./tests/conformance/... \
  -run TestCustomStateStoreConformance
```

## Specific Test Categories

The certification tests cover several areas:

```bash
# Test basic CRUD operations
go test -run TestStateStoreBasicOperations

# Test ETag support
go test -run TestStateStoreETag

# Test transactions
go test -run TestStateStoreTransactional

# Test TTL support
go test -run TestStateStoreTTL

# Test bulk operations
go test -run TestStateStoreBulk
```

## Writing Additional Compliance Tests

Beyond the conformance suite, write stress tests for concurrency:

```go
func TestConcurrentOperations(t *testing.T) {
    store := &MyCustomStore{}
    store.Init(context.Background(), state.Metadata{})

    var wg sync.WaitGroup
    errors := make(chan error, 100)

    // 50 concurrent writers
    for i := 0; i < 50; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            key := fmt.Sprintf("key-%d", id)
            err := store.Set(context.Background(), &state.SetRequest{
                Key:   key,
                Value: []byte(fmt.Sprintf(`{"id": %d}`, id)),
            })
            if err != nil {
                errors <- err
            }
        }(i)
    }

    wg.Wait()
    close(errors)

    for err := range errors {
        t.Errorf("Concurrent write failed: %v", err)
    }
}
```

## Dapr Component Certification Checklist

Before publishing your component:

```bash
# 1. Pass all conformance tests
go test ./tests/conformance/... -v

# 2. No race conditions
go test -race ./...

# 3. Adequate test coverage
go test -cover ./... | grep -v "100.0%"

# 4. Lint clean
golangci-lint run ./...

# 5. Benchmark results
go test -bench=. -benchmem ./...
```

## Submitting to the Community

To have your component added to the Dapr component catalog:

```bash
# Fork components-contrib
# Implement your component following the contribution guide
# Run the full test suite

# Create PR with:
# 1. Component implementation
# 2. Conformance test configuration
# 3. Documentation in docs/
# 4. CHANGELOG entry
```

## Summary

Certifying your Dapr pluggable component with the conformance test suite validates protocol compliance, correct edge case handling, and thread safety before production use. Passing the certification suite is also a prerequisite for contributing your component to the official Dapr components-contrib repository, making it available to the broader Dapr community.
