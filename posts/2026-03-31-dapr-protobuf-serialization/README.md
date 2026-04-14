# How to Configure Protobuf Serialization in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Protobuf, Serialization, gRPC, Performance

Description: Configure Protocol Buffers serialization in Dapr for efficient binary encoding in service invocation and state management, reducing payload size and parse overhead.

---

## Protobuf and Dapr gRPC

Dapr supports gRPC for service invocation, which natively uses Protocol Buffers (protobuf) for binary serialization. Using protobuf instead of JSON reduces payload sizes by 3-10x and parsing overhead significantly - critical for high-throughput inter-service communication.

```bash
# Install protoc and Go protobuf plugins
brew install protobuf
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# For .NET
dotnet add package Google.Protobuf
dotnet add package Grpc.Tools
```

## Define Your Protobuf Schema

```protobuf
// proto/order.proto
syntax = "proto3";
package order;
option go_package = "myapp/proto;proto";
option csharp_namespace = "MyApp.Proto";

import "google/protobuf/timestamp.proto";

message Order {
  string order_id = 1;
  string customer_id = 2;
  double amount = 3;
  OrderStatus status = 4;
  google.protobuf.Timestamp created_at = 5;
  repeated OrderItem items = 6;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  double unit_price = 3;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_PROCESSING = 2;
  ORDER_STATUS_FULFILLED = 3;
}

message CreateOrderRequest {
  Order order = 1;
}

message CreateOrderResponse {
  string order_id = 1;
  OrderStatus status = 2;
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (Order);
}

message GetOrderRequest {
  string order_id = 1;
}
```

## Generate Code

```bash
# Generate Go code
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       proto/order.proto

# Generate .NET code (via Grpc.Tools NuGet package - add to .csproj)
# <Protobuf Include="Protos\order.proto" GrpcServices="Server" />
```

## Dapr gRPC Service in Go with Protobuf

```go
// server/main.go
package main

import (
    "context"
    "fmt"
    "log"
    "net"

    pb "myapp/proto"
    "google.golang.org/grpc"
)

type orderServer struct {
    pb.UnimplementedOrderServiceServer
}

func (s *orderServer) CreateOrder(ctx context.Context,
    req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {

    order := req.GetOrder()
    log.Printf("Creating order ID=%s CustomerID=%s Amount=%.2f",
        order.GetOrderId(), order.GetCustomerId(), order.GetAmount())

    // Serialize to protobuf binary for Dapr state storage
    // (use proto.Marshal for binary state or JSON for interop)
    return &pb.CreateOrderResponse{
        OrderId: order.GetOrderId(),
        Status:  pb.OrderStatus_ORDER_STATUS_PENDING,
    }, nil
}

func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }
    s := grpc.NewServer()
    pb.RegisterOrderServiceServer(s, &orderServer{})
    fmt.Println("gRPC server listening on :50051")
    if err := s.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}
```

## Storing Protobuf in Dapr State

```go
// Serialize protobuf for Dapr state storage
import (
    "google.golang.org/protobuf/proto"
    dapr "github.com/dapr/go-sdk/client"
)

func saveOrderProto(ctx context.Context, client dapr.Client, order *pb.Order) error {
    // Marshal to binary protobuf
    data, err := proto.Marshal(order)
    if err != nil {
        return fmt.Errorf("failed to marshal order: %w", err)
    }

    return client.SaveState(ctx, "statestore", "order-"+order.OrderId, data,
        map[string]string{"contentType": "application/octet-stream"})
}

func getOrderProto(ctx context.Context, client dapr.Client, orderID string) (*pb.Order, error) {
    item, err := client.GetState(ctx, "statestore", "order-"+orderID, nil)
    if err != nil {
        return nil, err
    }

    order := &pb.Order{}
    if err := proto.Unmarshal(item.Value, order); err != nil {
        return nil, fmt.Errorf("failed to unmarshal order: %w", err)
    }
    return order, nil
}
```

## Summary

Dapr's gRPC interface enables Protocol Buffers for binary serialization in service-to-service calls, delivering significant payload size and parsing performance improvements over JSON. Define schemas in `.proto` files, generate language-specific code, and use `proto.Marshal`/`proto.Unmarshal` when storing binary state in Dapr's state stores. For cross-language interoperability, ensure all services reference the same `.proto` schema definitions.
