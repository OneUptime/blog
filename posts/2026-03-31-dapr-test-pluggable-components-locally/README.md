# How to Test Pluggable Components Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Testing, Local Development, gRPC

Description: Set up a local development workflow for testing Dapr pluggable components with the Dapr CLI, including debugging, mock testing, and validation.

---

## Local Testing Strategy for Pluggable Components

Pluggable components run as separate processes communicating with the Dapr sidecar via Unix domain sockets. Testing them locally requires setting up the socket directory, running the component process alongside the Dapr sidecar, and verifying the integration through the Dapr API.

## Environment Setup

```bash
# Create the socket directory Dapr and your component will share
mkdir -p /tmp/dapr-components-sockets

# Set environment variable for socket location
export DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets
```

## Running the Component for Local Testing

From your component directory:

```bash
# Build the component
go build -o ./bin/my-component .

# Run with socket folder set
DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets ./bin/my-component &
COMPONENT_PID=$!

# Verify the socket was created
ls -la /tmp/dapr-components-sockets/
# Should show: my-component.sock
```

## Running Dapr with the Pluggable Component

Create a test component manifest in a local components directory:

```yaml
# components/my-component.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-custom-store
spec:
  type: state.my-component
  version: v1
  metadata:
    - name: connectionString
      value: "test-connection"
```

Run Dapr with the environment variable set so the sidecar discovers the pluggable component socket:

```bash
DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets dapr run \
  --app-id test-app \
  --app-port 8080 \
  --components-path ./components \
  --log-level debug \
  -- python3 -m http.server 8080
```

## Unit Testing the Component Logic

Write unit tests that bypass the gRPC layer and test business logic directly:

```go
package main

import (
    "context"
    "testing"

    proto "github.com/dapr/dapr/pkg/proto/components/v1"
)

func TestCustomStateStore_GetSet(t *testing.T) {
    store := &MyCustomStore{}

    // Initialize
    _, err := store.Init(context.Background(), &proto.InitRequest{
        Metadata: &proto.MetadataRequest{
            Properties: map[string]string{
                "connectionString": "test",
            },
        },
    })
    if err != nil {
        t.Fatalf("Init failed: %v", err)
    }

    // Test Set
    _, err = store.Set(context.Background(), &proto.SetRequest{
        Key:   "test-key",
        Value: []byte(`{"name": "Alice"}`),
    })
    if err != nil {
        t.Fatalf("Set failed: %v", err)
    }

    // Test Get
    resp, err := store.Get(context.Background(), &proto.GetRequest{
        Key: "test-key",
    })
    if err != nil {
        t.Fatalf("Get failed: %v", err)
    }

    if string(resp.Data) != `{"name": "Alice"}` {
        t.Errorf("Expected Alice, got %s", resp.Data)
    }
}
```

## Integration Test Script

```bash
#!/bin/bash
# test-integration.sh

# Start component
DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets ./bin/my-component &
sleep 1

# Start test app with Dapr
DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets dapr run \
  --app-id test-app \
  --app-port 8080 \
  --components-path ./test/components \
  -- go run test/main.go &
sleep 3

# Test state store operations
echo "Testing Set..."
curl -s -X POST http://localhost:3500/v1.0/state/my-custom-store \
  -H "Content-Type: application/json" \
  -d '[{"key": "k1", "value": "hello"}]' | jq .

echo "Testing Get..."
curl -s http://localhost:3500/v1.0/state/my-custom-store/k1 | jq .

echo "Testing Delete..."
curl -s -X DELETE http://localhost:3500/v1.0/state/my-custom-store/k1

# Cleanup
kill $!
```

## Debugging with Verbose Logging

```bash
# Run component with debug logging
LOG_LEVEL=debug DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets ./bin/my-component

# Run Dapr with debug logging
dapr run --log-level debug ...

# Monitor gRPC traffic with grpcurl
grpcurl -unix /tmp/dapr-components-sockets/my-component.sock \
  list dapr.proto.components.v1.StateStore
```

## Summary

Testing Dapr pluggable components locally uses a two-process model - the component process creates a Unix socket, and the Dapr sidecar connects to it. Unit tests cover internal logic without the gRPC overhead, while integration tests use the Dapr CLI and HTTP API to verify end-to-end functionality. This workflow catches both implementation bugs and Dapr protocol compliance issues before deploying to Kubernetes.
