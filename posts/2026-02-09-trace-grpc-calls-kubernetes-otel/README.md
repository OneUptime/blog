# How to Trace gRPC Calls Across Kubernetes Services with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, gRPC, OpenTelemetry, Distributed Tracing, Microservices

Description: Learn how to implement distributed tracing for gRPC calls across Kubernetes microservices using OpenTelemetry instrumentation to track request flows and debug performance issues.

---

gRPC provides efficient service-to-service communication in Kubernetes microservice architectures, but debugging distributed gRPC calls requires proper tracing instrumentation. OpenTelemetry offers comprehensive gRPC support through interceptors that automatically capture request metadata, timing information, and error details across service boundaries.

Tracing gRPC calls provides visibility into synchronous and streaming RPC patterns. You can track unary requests, server streaming, client streaming, and bidirectional streaming operations. Proper instrumentation captures method names, status codes, message sizes, and propagates trace context through gRPC metadata.

## Understanding gRPC Trace Propagation

gRPC trace propagation works through metadata headers. OpenTelemetry interceptors inject trace context into outgoing gRPC requests and extract context from incoming requests. The W3C Trace Context standard defines the propagation format using traceparent and tracestate headers.

Each gRPC call creates a span representing the RPC operation. Client spans capture the caller's perspective with timing and request details. Server spans record the service handler's execution. Together, these spans form a complete picture of distributed gRPC communication.

## Instrumenting Go gRPC Services

Start with OpenTelemetry instrumentation in a Go gRPC server:

```go
// server/main.go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"

    pb "example.com/payment/proto"
)

func initTracer() *trace.TracerProvider {
    exporter, err := otlptracegrpc.New(context.Background(),
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        log.Fatal(err)
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)
    return tp
}

type paymentServer struct {
    pb.UnimplementedPaymentServiceServer
}

func (s *paymentServer) ProcessPayment(ctx context.Context, req *pb.PaymentRequest) (*pb.PaymentResponse, error) {
    // Trace context automatically extracted by interceptor
    tracer := otel.Tracer("payment-service")
    
    // Create child span for business logic
    ctx, span := tracer.Start(ctx, "validate_payment")
    defer span.End()

    // Business logic here
    span.SetAttributes(
        attribute.Float64("payment.amount", req.Amount),
        attribute.String("payment.currency", req.Currency),
    )

    return &pb.PaymentResponse{
        TransactionId: "txn-123",
        Status: "approved",
    }, nil
}

func main() {
    tp := initTracer()
    defer tp.Shutdown(context.Background())

    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    // Create gRPC server with OpenTelemetry interceptors
    server := grpc.NewServer(
        grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
        grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor()),
    )

    pb.RegisterPaymentServiceServer(server, &paymentServer{})

    log.Println("Payment service listening on :50051")
    if err := server.Serve(lis); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

Instrument the gRPC client:

```go
// client/main.go
package main

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"

    pb "example.com/payment/proto"
)

func main() {
    tp := initTracer()
    defer tp.Shutdown(context.Background())

    // Create gRPC connection with OpenTelemetry interceptors
    conn, err := grpc.Dial(
        "payment-service:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithUnaryInterceptor(otelgrpc.UnaryClientInterceptor()),
        grpc.WithStreamInterceptor(otelgrpc.StreamClientInterceptor()),
    )
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer conn.Close()

    client := pb.NewPaymentServiceClient(conn)

    // Make traced gRPC call
    ctx, cancel := context.WithTimeout(context.Background(), time.Second)
    defer cancel()

    resp, err := client.ProcessPayment(ctx, &pb.PaymentRequest{
        Amount: 99.99,
        Currency: "USD",
        CustomerId: "cust-123",
    })

    if err != nil {
        log.Fatalf("Payment failed: %v", err)
    }

    log.Printf("Payment processed: %s", resp.TransactionId)
}
```

## Tracing gRPC Streaming Operations

Implement tracing for server streaming:

```go
// streaming_server.go
func (s *orderServer) StreamOrderUpdates(req *pb.OrderRequest, stream pb.OrderService_StreamOrderUpdatesServer) error {
    ctx := stream.Context()
    tracer := otel.Tracer("order-service")

    ctx, span := tracer.Start(ctx, "stream_order_updates")
    defer span.End()

    span.SetAttributes(
        attribute.String("order.id", req.OrderId),
    )

    for i := 0; i < 10; i++ {
        // Create span for each message
        _, msgSpan := tracer.Start(ctx, "send_update")
        
        update := &pb.OrderUpdate{
            OrderId: req.OrderId,
            Status: fmt.Sprintf("Processing step %d", i),
        }

        if err := stream.Send(update); err != nil {
            msgSpan.RecordError(err)
            msgSpan.End()
            return err
        }

        msgSpan.End()
        time.Sleep(100 * time.Millisecond)
    }

    return nil
}
```

## Kubernetes Deployment with gRPC Tracing

Deploy gRPC services with proper configuration:

```yaml
# payment-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: payment-service:v1.0.0
        ports:
        - containerPort: 50051
          name: grpc
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
        - name: OTEL_SERVICE_NAME
          value: "payment-service"
        - name: OTEL_TRACES_SAMPLER
          value: "parentbased_traceidratio"
        - name: OTEL_TRACES_SAMPLER_ARG
          value: "0.1"
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: production
spec:
  selector:
    app: payment-service
  ports:
  - port: 50051
    targetPort: 50051
    name: grpc
  type: ClusterIP
```

## Monitoring gRPC Traces

Query traces to analyze gRPC performance:

```bash
# Find slow gRPC calls
curl 'http://tempo:3100/api/search' -d '{
  "tags": {
    "rpc.system": "grpc",
    "span.kind": "server"
  },
  "minDuration": "1s"
}'

# Find failed gRPC calls
curl 'http://tempo:3100/api/search' -d '{
  "tags": {
    "rpc.system": "grpc",
    "status.code": "error",
    "rpc.grpc.status_code": "14"
  }
}'
```

OpenTelemetry gRPC instrumentation provides complete visibility into RPC communications across Kubernetes services. By automatically capturing trace context and performance metrics, you gain the insights needed to optimize and debug distributed gRPC systems.
