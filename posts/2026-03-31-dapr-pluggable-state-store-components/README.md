# How to Develop Dapr Pluggable State Store Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, State Store, gRPC, Extension

Description: Build a custom Dapr pluggable state store component using the gRPC-based component SDK to connect Dapr to any backing store not supported out of the box.

---

## What Are Pluggable Components?

Dapr's built-in components cover dozens of backing services, but organizations often have internal databases or custom storage systems. Pluggable components let you implement a Dapr component interface and run it as a separate process or container - Dapr communicates with it over a Unix domain socket using gRPC.

## Setting Up the Component SDK

```bash
# Initialize a Go project for the pluggable component
mkdir dapr-custom-statestore && cd dapr-custom-statestore
go mod init github.com/myorg/dapr-custom-statestore

# Install the Dapr pluggable component SDK
go get github.com/dapr-sandbox/components-go-sdk@latest
```

## Implementing the State Store Interface

The state store interface requires implementing Init, Features, Get, Set, Delete, Close, and the bulk operations (BulkGet, BulkSet, BulkDelete). The SDK translates between gRPC proto types and the `components-contrib` state store interface automatically, so you work with familiar `components-contrib` types:

```go
package main

import (
    "context"

    "github.com/dapr/components-contrib/state"
)

type MyCustomStore struct {
    storage map[string][]byte
}

func (s *MyCustomStore) Init(ctx context.Context, metadata state.Metadata) error {
    // Initialize connection to your backing store
    s.storage = make(map[string][]byte)
    return nil
}

func (s *MyCustomStore) Features() []state.Feature {
    return []state.Feature{state.FeatureETag, state.FeatureTransactional}
}

func (s *MyCustomStore) Get(ctx context.Context, req *state.GetRequest) (*state.GetResponse, error) {
    val, ok := s.storage[req.Key]
    if !ok {
        return &state.GetResponse{}, nil
    }
    return &state.GetResponse{Data: val}, nil
}

func (s *MyCustomStore) Set(ctx context.Context, req *state.SetRequest) error {
    s.storage[req.Key] = req.Value.([]byte)
    return nil
}

func (s *MyCustomStore) Delete(ctx context.Context, req *state.DeleteRequest) error {
    delete(s.storage, req.Key)
    return nil
}

func (s *MyCustomStore) Close() error {
    // Clean up any resources
    return nil
}

// BulkGet, BulkSet, and BulkDelete are also required by the interface.
// You can implement them by iterating over individual operations:

func (s *MyCustomStore) BulkGet(ctx context.Context, req []state.GetRequest, opts state.BulkGetOpts) ([]state.BulkGetResponse, error) {
    var responses []state.BulkGetResponse
    for _, r := range req {
        resp, err := s.Get(ctx, &r)
        if err != nil {
            responses = append(responses, state.BulkGetResponse{Key: r.Key, Error: err.Error()})
            continue
        }
        responses = append(responses, state.BulkGetResponse{Key: r.Key, Data: resp.Data})
    }
    return responses, nil
}

func (s *MyCustomStore) BulkSet(ctx context.Context, req []state.SetRequest, opts state.BulkStoreOpts) error {
    for _, r := range req {
        if err := s.Set(ctx, &r); err != nil {
            return err
        }
    }
    return nil
}

func (s *MyCustomStore) BulkDelete(ctx context.Context, req []state.DeleteRequest, opts state.BulkStoreOpts) error {
    for _, r := range req {
        if err := s.Delete(ctx, &r); err != nil {
            return err
        }
    }
    return nil
}

func (s *MyCustomStore) GetComponentMetadata() (map[string]string, error) {
    return map[string]string{}, nil
}
```

## Registering and Running the Component

```go
package main

import (
    dapr "github.com/dapr-sandbox/components-go-sdk"
    state "github.com/dapr-sandbox/components-go-sdk/state/v1"
)

func main() {
    dapr.Register("my-custom-statestore", dapr.WithStateStore(func() state.Store {
        return &MyCustomStore{}
    }))

    dapr.MustRun()
}
```

## Creating the Component Manifest

Reference the pluggable component in a Dapr component YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: customstore
spec:
  type: state.my-custom-statestore
  version: v1
  metadata:
    - name: connectionString
      value: "custom-db://localhost:5432/mydb"
```

## Running the Pluggable Component Locally

```bash
# Build the component
go build -o custom-statestore .

# Run it - it creates a Unix socket for Dapr to connect to.
# Both the component and Dapr sidecar must share the same socket folder.
DAPR_COMPONENT_SOCKETS_FOLDER=/tmp/dapr-components-sockets \
  ./custom-statestore &

# Run Dapr with the same socket folder set via environment variable
DAPR_COMPONENTS_SOCKETS_FOLDER=/tmp/dapr-components-sockets \
  dapr run \
  --app-id my-app \
  --app-port 8080 \
  --components-path ./components \
  -- ./my-app
```

## Transactional Support

For transactional state stores, implement the `Multi` method from the `state.TransactionalStore` interface:

```go
func (s *MyCustomStore) Multi(ctx context.Context, request *state.TransactionalStateRequest) error {
    for _, op := range request.Operations {
        switch req := op.(type) {
        case state.SetRequest:
            s.storage[req.Key] = req.Value.([]byte)
        case state.DeleteRequest:
            delete(s.storage, req.Key)
        }
    }
    return nil
}
```

## Summary

Dapr pluggable state store components let you connect Dapr to any backing store by implementing a gRPC-based interface. The components-go-sdk reduces boilerplate, and the Unix domain socket transport ensures low-latency communication between Dapr and your component process. This extensibility makes it possible to adopt Dapr without being limited to its built-in component catalog.
