# How to Instrument gRPC Unary and Streaming Calls with OpenTelemetry Interceptors (Go, Java, Python)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Interceptors, Distributed Tracing

Description: Instrument gRPC unary and streaming calls across Go, Java, and Python using OpenTelemetry interceptors for full trace visibility.

gRPC is the backbone of many microservice architectures, but tracing gRPC calls requires more thought than tracing HTTP requests. You have four different call types to handle: unary, server streaming, client streaming, and bidirectional streaming. Each one needs its own instrumentation approach.

OpenTelemetry provides gRPC interceptors for the major languages. This post covers practical setup for Go, Java, and Python, with a focus on what the auto-instrumentation gives you and where you need to add custom attributes.

## Go: Using otelgrpc Interceptors

Install the gRPC OpenTelemetry package:

```bash
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
```

Attach interceptors to both your server and client:

```go
// server.go
package main

import (
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

    lis, _ := net.Listen("tcp", ":50051")
    server.Serve(lis)
}
```

```go
// client.go
package main

import (
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "google.golang.org/grpc"
)

func main() {
    // Client-side interceptors propagate trace context
    conn, err := grpc.Dial(
        "localhost:50051",
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatal(err)
    }

    client := pb.NewOrderServiceClient(conn)
    resp, err := client.GetOrder(context.Background(), &pb.GetOrderRequest{
        OrderId: "12345",
    })
}
```

## Java: Using the OpenTelemetry gRPC Module

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-grpc-1.6</artifactId>
    <version>2.2.0-alpha</version>
</dependency>
```

```java
// GrpcServer.java
import io.opentelemetry.instrumentation.grpc.v1_6.GrpcTelemetry;

public class GrpcServer {
    public static void main(String[] args) throws Exception {
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

# Instrument the client globally
grpc_client_instrumentor = GrpcInstrumentorClient()
grpc_client_instrumentor.instrument()

channel = grpc.insecure_channel('localhost:50051')
stub = order_pb2_grpc.OrderServiceStub(channel)
response = stub.GetOrder(order_pb2.GetOrderRequest(order_id="12345"))
```

## Adding Custom Attributes to gRPC Spans

The auto-instrumentation captures the gRPC method name, status code, and basic metadata. For richer traces, add custom attributes inside your service implementations:

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

Across all three languages, the OpenTelemetry gRPC interceptors give you:

- `rpc.system`: always "grpc"
- `rpc.service`: the full service name (e.g., "orders.OrderService")
- `rpc.method`: the method name (e.g., "GetOrder")
- `rpc.grpc.status_code`: the gRPC status code (0 for OK, 5 for NOT_FOUND, etc.)
- Proper context propagation through gRPC metadata headers

For streaming calls, you also get message-level events with `rpc.message.type` (SENT or RECEIVED) and `rpc.message.id`.

The interceptor approach keeps your instrumentation clean. You do not need to modify every handler. The interceptors wrap every call automatically, and you only add custom attributes where you need deeper visibility.
