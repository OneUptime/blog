# How to Migrate from gRPC Direct Calls to Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, gRPC, Service Invocation, Migration, Microservice

Description: Learn how to replace direct gRPC client-to-server calls with Dapr Service Invocation to gain transparent mTLS, retries, and service discovery.

---

## Why Move gRPC Calls Through Dapr?

Direct gRPC calls work well, but they require certificate management for mTLS, manual retry policies, and hardcoded service addresses. Dapr Service Invocation proxies gRPC traffic through the sidecar, adding mTLS automatically and allowing resiliency policies without code changes.

## Before: Direct gRPC Client

```go
// order-service/client.go
package main

import (
    "context"
    "log"

    pb "github.com/example/inventory/proto"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

func main() {
    conn, err := grpc.NewClient(
        "inventory-service:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatalf("did not connect: %v", err)
    }
    defer conn.Close()

    client := pb.NewInventoryClient(conn)

    resp, err := client.CheckStock(context.Background(), &pb.StockRequest{
        ProductId: "sku-001",
        Quantity:  10,
    })
    if err != nil {
        log.Fatalf("could not check stock: %v", err)
    }
    log.Printf("Available: %v", resp.Available)
}
```

## After: Dapr gRPC Service Invocation

Dapr proxies gRPC calls when you connect to the Dapr sidecar on port 50001 and add the `dapr-app-id` metadata header:

```go
// order-service/client.go - via Dapr
package main

import (
    "context"
    "log"

    pb "github.com/example/inventory/proto"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/metadata"
)

func main() {
    // Connect to local Dapr sidecar, not directly to inventory-service
    conn, err := grpc.NewClient(
        "localhost:50001",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatalf("did not connect: %v", err)
    }
    defer conn.Close()

    client := pb.NewInventoryClient(conn)

    // Tell Dapr which app to route to via metadata
    ctx := metadata.AppendToOutgoingContext(
        context.Background(),
        "dapr-app-id", "inventory-service",
    )

    resp, err := client.CheckStock(ctx, &pb.StockRequest{
        ProductId: "sku-001",
        Quantity:  10,
    })
    if err != nil {
        log.Fatalf("could not check stock: %v", err)
    }
    log.Printf("Available: %v", resp.Available)
}
```

## The Inventory Service (No Changes Needed)

The gRPC server implementation does not change:

```go
// inventory-service/server.go
type server struct {
    pb.UnimplementedInventoryServer
}

func (s *server) CheckStock(
    ctx context.Context, req *pb.StockRequest) (*pb.StockResponse, error) {
    available := checkDatabase(req.ProductId, req.Quantity)
    return &pb.StockResponse{Available: available}, nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterInventoryServer(s, &server{})
    s.Serve(lis)
}
```

## Adding Resiliency

```yaml
# components/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: grpc-resiliency
spec:
  policies:
    retries:
      GrpcRetry:
        policy: exponential
        maxInterval: 10s
        maxRetries: 5
  targets:
    apps:
      inventory-service:
        retry: GrpcRetry
```

## Running with Dapr CLI

```bash
dapr run \
  --app-id order-service \
  --app-protocol grpc \
  --app-port 50052 \
  --resources-path ./components \
  -- go run main.go
```

```bash
dapr run \
  --app-id inventory-service \
  --app-protocol grpc \
  --app-port 50051 \
  -- go run server.go
```

## Summary

Migrating gRPC direct calls to Dapr Service Invocation requires only two changes in the client: connect to `localhost:50001` (the Dapr sidecar gRPC port) and add the `dapr-app-id` metadata header. The server code is completely unchanged. Dapr handles routing, mTLS, and resiliency policies transparently.
