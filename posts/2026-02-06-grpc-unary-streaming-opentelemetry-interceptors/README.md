# How to Instrument gRPC Unary and Streaming Calls with OpenTelemetry Interceptors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Interceptors, Distributed Tracing

Description: Instrument gRPC unary and streaming calls across Go, Java, and Python using OpenTelemetry interceptors for full trace visibility.

gRPC is the backbone of many microservice architectures, but tracing gRPC calls requires more thought than tracing HTTP requests. You have four different call types to handle: unary, server streaming, client streaming, and bidirectional streaming. Each one needs its own instrumentation approach when you add custom telemetry.

OpenTelemetry provides gRPC instrumentation hooks for the major languages. This post covers practical setup for Go, Java, and Python, with a focus on what the auto-instrumentation gives you and where you need to add custom attributes.

## Go: Using otelgrpc Interceptors

Install the gRPC OpenTelemetry package:

```bash
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
```

Attach telemetry handlers to both your server and client:

```go
// server.go
package main

import (
    "log"
    "net"

    pb "example.com/orders/gen/orderpb"
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "google.golang.org/grpc"
)

func main() {
    // Server-side interceptors capture incoming call traces
    server := grpc.NewServer(
        grpc.StatsHandler(otelgrpc.NewServerHandler()),
    )

    // Register your services
    pb.RegisterOrderServiceServer(server, &orderService{})

    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }
    if err := server.Serve(lis); err != nil {
        log.Fatal(err)
    }
}
```

```go
// client.go
package main

import (
    "context"
    "log"

    pb "example.com/orders/gen/orderpb"
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

func main() {
    // Client-side handlers propagate trace context
    conn, err := grpc.NewClient(
        "localhost:50051",
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewOrderServiceClient(conn)
    resp, err := client.GetOrder(context.Background(), &pb.GetOrderRequest{
        OrderId: "12345",
    })
    if err != nil {
        log.Fatal(err)
    }
    _ = resp
}
```

## Java: Using the OpenTelemetry gRPC Module

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-grpc-1.6</artifactId>
    <version>2.28.1-alpha</version>
</dependency>
```

```java
// GrpcServer.java
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.grpc.v1_6.GrpcTelemetry;

public class GrpcServer {
    public static void main(String[] args) throws Exception {
        OpenTelemetry openTelemetry = GlobalOpenTelemetry.get();

        // Build the telemetry interceptor from your OpenTelemetry instance
        GrpcTelemetry grpcTelemetry = GrpcTelemetry.create(openTelemetry);

        Server server = ServerBuilder.forPort(50051)
            // Add the server interceptor for incoming calls
            .intercept(grpcTelemetry.newServerInterceptor())
            .addService(new OrderServiceImpl())
            .build()
            .start();

        // Client setup
        ManagedChannel channel = ManagedChannelBuilder
            .forAddress("localhost", 50051)
            .intercept(grpcTelemetry.newClientInterceptor())
            .usePlaintext()
            .build();
    }
}
```

## Python: Using the grpc Instrumentation Package

```bash
pip install opentelemetry-instrumentation-grpc
```

```python
# server.py

import grpc
from concurrent import futures
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer

import order_pb2_grpc

# Instrument the server globally - this patches grpc.server()
grpc_server_instrumentor = GrpcInstrumentorServer()
grpc_server_instrumentor.instrument()

server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
order_pb2_grpc.add_OrderServiceServicer_to_server(OrderService(), server)
server.add_insecure_port('[::]:50051')
server.start()
```

```python
# client.py
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient

import grpc
import order_pb2
import order_pb2_grpc

# Instrument the client globally
grpc_client_instrumentor = GrpcInstrumentorClient()
grpc_client_instrumentor.instrument()

with grpc.insecure_channel('localhost:50051') as channel:
    stub = order_pb2_grpc.OrderServiceStub(channel)
    response = stub.GetOrder(order_pb2.GetOrderRequest(order_id="12345"))
```

## Adding Custom Attributes to gRPC Spans

The auto-instrumentation captures the gRPC method name and status code. Request and response metadata can be captured when you opt in to that instrumentation. For richer traces, add custom attributes inside your service implementations:

```go
// Inside a Go gRPC handler
func (s *orderService) GetOrder(ctx context.Context, req *pb.GetOrderRequest) (*pb.Order, error) {
    span := trace.SpanFromContext(ctx)

    // Add business-specific attributes
    span.SetAttributes(
        attribute.String("order.id", req.OrderId),
        attribute.String("order.region", determineRegion(req)),
    )

    order, err := s.repo.FindOrder(ctx, req.OrderId)
    if err != nil {
        span.SetAttributes(attribute.Bool("order.found", false))
        return nil, status.Error(codes.NotFound, "order not found")
    }

    span.SetAttributes(
        attribute.Bool("order.found", true),
        attribute.Int("order.items_count", len(order.Items)),
    )

    return order, nil
}
```

## Streaming Call Instrumentation

For streaming RPCs, the interceptors create a single span for the entire stream. You can add events for individual messages:

```go
func (s *orderService) WatchOrders(req *pb.WatchRequest, stream pb.OrderService_WatchOrdersServer) error {
    span := trace.SpanFromContext(stream.Context())
    messageCount := 0

    for {
        order, err := s.orderChannel.Receive()
        if err != nil {
            break
        }

        messageCount++
        // Record each streamed message as a span event
        span.AddEvent("stream.message.sent", trace.WithAttributes(
            attribute.Int("message.sequence", messageCount),
            attribute.String("order.id", order.Id),
        ))

        if err := stream.Send(order); err != nil {
            span.SetAttributes(attribute.String("stream.error", err.Error()))
            return err
        }
    }

    span.SetAttributes(attribute.Int("stream.total_messages", messageCount))
    return nil
}
```

## What the Interceptors Capture Automatically

Across these instrumentations, OpenTelemetry gRPC tracing gives you the standard RPC attributes:

- `rpc.system.name`: always "grpc"
- `rpc.method`: the fully qualified RPC method name (e.g., "orders.OrderService/GetOrder")
- `rpc.response.status_code`: the string gRPC status code (e.g., "OK" or "NOT_FOUND")
- `server.address` and `server.port` on client spans when available
- Proper context propagation through gRPC metadata headers

For streaming calls, message-level events are implementation-specific and may need to be enabled explicitly. In Go, for example, `otelgrpc.WithMessageEvents(otelgrpc.SentEvents, otelgrpc.ReceivedEvents)` records send and receive events; otherwise the handler records summary attributes at the end of the RPC.

The instrumentation approach keeps your telemetry clean. You do not need to modify every handler. The instrumentation wraps every call automatically, and you only add custom attributes where you need deeper visibility.
