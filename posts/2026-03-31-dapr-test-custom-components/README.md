# How to Test Custom Dapr Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Custom Component, Unit Test, Integration Test

Description: Learn how to write unit tests, integration tests, and conformance tests for custom Dapr components to verify correctness before deployment.

---

## Testing Strategy for Dapr Components

Custom Dapr components need three levels of testing: unit tests that verify business logic without gRPC overhead, integration tests that run the full gRPC component against a Dapr sidecar, and conformance tests from the Dapr project that ensure spec compliance.

## Unit Testing the State Store Logic

Test the core state store implementation in isolation:

```go
package custommiddleware_test

import (
    "context"
    "testing"

    proto "github.com/dapr/dapr/pkg/proto/components/v1"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    "github.com/myorg/dapr-custom-state/store"
)

func TestInMemoryStore_SetAndGet(t *testing.T) {
    s := store.NewInMemoryStore()

    setReq := &proto.SetRequest{Key: "user:123", Value: []byte(`{"name":"Alice"}`)}
    _, err := s.Set(context.Background(), setReq)
    require.NoError(t, err)

    getReq := &proto.GetRequest{Key: "user:123"}
    resp, err := s.Get(context.Background(), getReq)
    require.NoError(t, err)
    assert.Equal(t, []byte(`{"name":"Alice"}`), resp.Data)
}

func TestInMemoryStore_DeleteNonExistentKey(t *testing.T) {
    s := store.NewInMemoryStore()

    _, err := s.Delete(context.Background(), &proto.DeleteRequest{Key: "missing"})
    assert.NoError(t, err, "deleting a missing key should not error")
}

func TestInMemoryStore_ETagConsistency(t *testing.T) {
    s := store.NewInMemoryStore()
    s.Set(context.Background(), &proto.SetRequest{Key: "k", Value: []byte("v1")})
    r1, _ := s.Get(context.Background(), &proto.GetRequest{Key: "k"})
    s.Set(context.Background(), &proto.SetRequest{Key: "k", Value: []byte("v2")})
    r2, _ := s.Get(context.Background(), &proto.GetRequest{Key: "k"})
    assert.NotEqual(t, r1.Etag.Value, r2.Etag.Value, "ETag should change on update")
}
```

## Integration Testing with a Real Dapr Sidecar

Spin up a Dapr sidecar alongside the component process and test through the Dapr client:

```go
func TestIntegration_StateRoundTrip(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    // Start the component process
    go startCustomStateStore("/tmp/test-sockets/custom-state.sock")
    time.Sleep(500 * time.Millisecond)

    // Use the Dapr client to talk through the sidecar
    client, err := dapr.NewClientWithPort("50001")
    require.NoError(t, err)
    defer client.Close()

    ctx := context.Background()
    err = client.SaveState(ctx, "custom-state", "test-key", []byte("test-value"), nil)
    require.NoError(t, err)

    item, err := client.GetState(ctx, "custom-state", "test-key", nil)
    require.NoError(t, err)
    assert.Equal(t, "test-value", string(item.Value))
}
```

## Running Dapr Conformance Tests

The Dapr project provides a conformance test suite for state stores, pub/sub, and bindings:

```bash
# Clone the Dapr components-contrib repo
git clone https://github.com/dapr/components-contrib.git
cd components-contrib

# Run conformance tests against your component
# The -tags=conftests build tag is required (test files use //go:build conftests)
CGO_ENABLED=0 go test -v -tags=conftests -count=1 -timeout=15m \
  ./tests/conformance \
  --run="TestStateConformance/custom-state"
```

Conformance tests use convention-based configuration. Add your component to the test manifest at `tests/config/state/tests.yml`:

```yaml
componentType: state
components:
  - component: custom-state
    operations: ["transaction", "etag", "first-write"]
```

Then create a Dapr component YAML at `tests/config/state/custom-state/statestore.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.custom-state
  metadata:
  - name: socketFolder
    value: /tmp/test-sockets
```

## Testing Error Cases

```go
func TestInMemoryStore_SetWithETagMismatch(t *testing.T) {
    s := store.NewInMemoryStore()
    s.Set(context.Background(), &proto.SetRequest{Key: "k", Value: []byte("v1")})

    _, err := s.Set(context.Background(), &proto.SetRequest{
        Key:   "k",
        Value: []byte("v2"),
        Etag:  &proto.Etag{Value: "wrong-etag"},
        Options: &proto.StateOptions{
            Concurrency: proto.StateOptions_CONCURRENCY_FIRST_WRITE,
        },
    })
    assert.Error(t, err, "should fail with ETag mismatch")
}
```

## Summary

Testing custom Dapr components at three layers - unit, integration, and conformance - ensures correctness and spec compliance before production deployment. Unit tests verify core logic without gRPC overhead, integration tests validate the full Dapr protocol flow, and the Dapr conformance suite catches spec violations that could cause subtle bugs with real Dapr applications.
