# How to Build a Custom Pluggable Component for Dapr in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Pluggable Component, State Store, Custom Component

Description: Learn how to build a custom pluggable state store component for Dapr in Go using the dapr-go-sdk and gRPC Unix domain socket communication.

---

## Pluggable Components in Go

Dapr pluggable components communicate with the sidecar via gRPC over Unix domain sockets. The Go SDK provides interfaces for state stores, pub/sub, and bindings. You implement the interface, register it with the SDK server, and Dapr discovers the component via a socket file at startup.

## Project Setup

Initialize a Go module and install the proto-generated gRPC stubs:

```bash
mkdir dapr-custom-state && cd dapr-custom-state
go mod init github.com/myorg/dapr-custom-state
go get github.com/dapr/dapr/pkg/proto/components/v1
go get google.golang.org/grpc
```

## Implementing the State Store Interface

```go
package main

import (
    "context"
    "sync"

    proto "github.com/dapr/dapr/pkg/proto/components/v1"
)

type InMemoryStore struct {
    proto.UnimplementedStateStoreServer
    mu    sync.RWMutex
    store map[string][]byte
}

func NewInMemoryStore() *InMemoryStore {
    return &InMemoryStore{store: make(map[string][]byte)}
}

func (s *InMemoryStore) Init(ctx context.Context, req *proto.InitRequest) (*proto.InitResponse, error) {
    return &proto.InitResponse{}, nil
}

func (s *InMemoryStore) Get(ctx context.Context, req *proto.GetRequest) (*proto.GetResponse, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    data, ok := s.store[req.Key]
    if !ok {
        return &proto.GetResponse{}, nil
    }
    return &proto.GetResponse{Data: data, Etag: &proto.Etag{Value: "1"}}, nil
}

func (s *InMemoryStore) Set(ctx context.Context, req *proto.SetRequest) (*proto.SetResponse, error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.store[req.Key] = req.Value
    return &proto.SetResponse{}, nil
}

func (s *InMemoryStore) Delete(ctx context.Context, req *proto.DeleteRequest) (*proto.DeleteResponse, error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    delete(s.store, req.Key)
    return &proto.DeleteResponse{}, nil
}
```

## Starting the gRPC Server on a Unix Socket

```go
package main

import (
    "fmt"
    "net"
    "os"

    proto "github.com/dapr/dapr/pkg/proto/components/v1"
    "google.golang.org/grpc"
)

func main() {
    socketPath := "/tmp/dapr-components-sockets/custom-state-store.sock"
    os.Remove(socketPath)

    lis, err := net.Listen("unix", socketPath)
    if err != nil {
        panic(fmt.Sprintf("failed to listen: %v", err))
    }

    srv := grpc.NewServer()
    store := NewInMemoryStore()

    proto.RegisterStateStoreServer(srv, store)

    fmt.Println("Starting custom state store component...")
    if err := srv.Serve(lis); err != nil {
        panic(err)
    }
}
```

## Component YAML Definition

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: custom-go-state
spec:
  type: state.custom-go-state
  version: v1
  metadata:
  - name: socketFolder
    value: "/tmp/dapr-components-sockets"
```

## Running with Dapr

```bash
# Build and start the component
go build -o custom-state-store .
./custom-state-store &

# Start your app
dapr run --app-id myapp \
  --components-path ./components \
  -- go run ./app
```

## Summary

Building a Dapr pluggable component in Go involves implementing the gRPC state store proto interface, starting a gRPC server on a Unix domain socket, and providing a component YAML that references the socket folder. The Go approach gives maximum control over the gRPC lifecycle and is well-suited for high-performance custom backends like in-memory caches, proprietary databases, or encrypted storage layers.
