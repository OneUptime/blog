# How to Invoke Services Using Dapr gRPC API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, gRPC, Service Invocation, Protobuf, Microservice

Description: Learn how to invoke Dapr-enabled services over gRPC using the Dapr service invocation API, including proto definitions, channel setup, and metadata passing.

---

## Why Use gRPC with Dapr

gRPC offers lower latency and smaller message sizes compared to HTTP/JSON. Dapr supports gRPC for service invocation natively. The Dapr sidecar listens on port 50001 for gRPC traffic and proxies calls to the target service.

## Dapr gRPC Service Invocation Architecture

```text
[Client App] --> [Client Dapr Sidecar :50001] --> [Target Dapr Sidecar :50001] --> [Target App]
```

The client calls `InvokeService` on the Dapr gRPC API, and Dapr routes the call to the target app's gRPC server.

## Setting Up the gRPC Channel in Go

```go
import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()

    // Invoke gRPC service
    resp, err := client.InvokeMethod(context.Background(), "order-service", "placeOrder", "post")
    if err != nil {
        panic(err)
    }

    fmt.Println(string(resp))
}
```

## Using Raw Dapr gRPC Proxy

Dapr also supports proxying arbitrary gRPC calls using the `dapr-app-id` metadata header. This avoids the need to use `InvokeService` explicitly:

```go
conn, _ := grpc.Dial("localhost:50001", grpc.WithTransportCredentials(insecure.NewCredentials()))
ctx := metadata.AppendToOutgoingContext(context.Background(), "dapr-app-id", "order-service")

// Use your generated proto client with this connection
orderClient := pb.NewOrderServiceClient(conn)
res, _ := orderClient.PlaceOrder(ctx, &pb.OrderRequest{Item: "widget", Qty: 5})
```

## Using grpcurl for Testing

```bash
grpcurl \
  -plaintext \
  -proto orders.proto \
  -import-path . \
  -H "dapr-app-id: order-service" \
  -d '{"item": "widget", "qty": 5}' \
  localhost:50001 \
  orders.OrderService/PlaceOrder
```

## Enabling gRPC in Your Application

Annotate your Kubernetes deployment to tell Dapr your app uses gRPC:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-protocol: "grpc"
  dapr.io/app-port: "50051"
```

## Passing Metadata

```go
md := metadata.Pairs(
    "authorization", "Bearer mytoken",
    "x-request-id",  "abc-123",
)
ctx = metadata.NewOutgoingContext(ctx, md)
```

## Summary

Dapr supports gRPC service invocation by proxying calls through the sidecar on port 50001. Use the `dapr-app-id` metadata header for direct gRPC proxy mode, or use the Dapr SDK's `InvokeMethod` function. Annotate your app with `dapr.io/app-protocol: grpc` to enable gRPC mode on the receiving side.
