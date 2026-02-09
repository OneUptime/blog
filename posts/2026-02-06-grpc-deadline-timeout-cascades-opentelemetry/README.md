# How to Monitor gRPC Deadline Propagation and Timeout Cascades Using OpenTelemetry Trace Waterfalls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Timeouts, Trace Analysis

Description: Use OpenTelemetry trace waterfalls to detect gRPC deadline propagation issues and timeout cascade failures across services.

When a gRPC client sets a deadline, that deadline should propagate through every downstream service in the call chain. If service A gives service B a 5-second deadline, and service B calls service C, service B should pass along the remaining time to service C. When this propagation breaks, you get timeout cascades where upstream services have already given up but downstream services keep working on requests that nobody is waiting for.

OpenTelemetry trace waterfalls are the best tool for spotting these problems.

## How gRPC Deadlines Work

A deadline is an absolute point in time by which the request must complete. When you set a 5-second deadline on a client call, the gRPC framework converts it to a `grpc-timeout` header and sends it along with the request.

```go
// Client sets a 5-second deadline
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := client.ProcessOrder(ctx, &pb.OrderRequest{OrderId: "123"})
```

If the server then calls another service, it should use the same context so the remaining deadline propagates:

```go
// Server handler - passes the context (and deadline) to downstream calls
func (s *service) ProcessOrder(ctx context.Context, req *pb.OrderRequest) (*pb.OrderResponse, error) {
    // ctx already carries the deadline from the client
    inventory, err := s.inventoryClient.CheckStock(ctx, &pb.StockRequest{
        ItemId: req.ItemId,
    })
    // If only 2 seconds remain of the original 5, the downstream call
    // gets a 2-second deadline automatically
}
```

## Instrumenting Deadline Visibility

Add custom span attributes that record deadline information at each hop:

```go
// deadline-interceptor.go
package interceptors

import (
    "context"
    "time"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"
)

func DeadlineTrackingUnaryInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    span := trace.SpanFromContext(ctx)

    deadline, hasDeadline := ctx.Deadline()
    if hasDeadline {
        remaining := time.Until(deadline)
        span.SetAttributes(
            attribute.Bool("grpc.deadline.set", true),
            attribute.Float64("grpc.deadline.remaining_ms", float64(remaining.Milliseconds())),
            attribute.String("grpc.deadline.absolute", deadline.Format(time.RFC3339Nano)),
        )
    } else {
        span.SetAttributes(attribute.Bool("grpc.deadline.set", false))

        // Record a warning event when no deadline is set
        span.AddEvent("grpc.deadline.missing", trace.WithAttributes(
            attribute.String("warning", "No deadline set on incoming request"),
            attribute.String("rpc.method", info.FullMethod),
        ))
    }

    // Execute the handler
    resp, err := handler(ctx, req)

    // Check if we exceeded the deadline
    if ctx.Err() == context.DeadlineExceeded {
        span.AddEvent("grpc.deadline.exceeded", trace.WithAttributes(
            attribute.String("rpc.method", info.FullMethod),
        ))
    }

    return resp, err
}
```

Register the interceptor on your server:

```go
server := grpc.NewServer(
    grpc.ChainUnaryInterceptor(
        otelgrpc.UnaryServerInterceptor(),
        DeadlineTrackingUnaryInterceptor,
    ),
)
```

## Detecting Timeout Cascades in Waterfalls

A healthy trace waterfall with proper deadline propagation looks like this:

```
Service A (deadline: 5000ms remaining)
  Service B (deadline: 4200ms remaining)
    Service C (deadline: 3100ms remaining)
      Database query (completes in 200ms)
```

The remaining deadline decreases at each hop by the time spent so far. A broken cascade looks like this:

```
Service A (deadline: 5000ms remaining)  -> DEADLINE_EXCEEDED at 5000ms
  Service B (deadline: 5000ms remaining)  -> still running at 5500ms
    Service C (deadline: 5000ms remaining)  -> still running at 6000ms
      Database query (running...)
```

When you see downstream spans that outlast the root span, that is a timeout cascade. Service A already returned an error to the caller, but B and C are still burning resources.

## Metrics for Deadline Health

Track deadline-related metrics to build dashboards:

```go
import (
    "go.opentelemetry.io/otel/metric"
)

var (
    meter              = otel.Meter("grpc-deadlines")
    deadlineRemaining  metric.Float64Histogram
    deadlineMissing    metric.Int64Counter
    deadlineExceeded   metric.Int64Counter
)

func init() {
    deadlineRemaining, _ = meter.Float64Histogram("grpc.deadline.remaining_ms",
        metric.WithDescription("Remaining deadline when request arrives"),
        metric.WithUnit("ms"),
    )

    deadlineMissing, _ = meter.Int64Counter("grpc.deadline.missing",
        metric.WithDescription("Requests received without a deadline"),
    )

    deadlineExceeded, _ = meter.Int64Counter("grpc.deadline.exceeded",
        metric.WithDescription("Requests that exceeded their deadline"),
    )
}
```

## Spotting the Warning Signs

There are a few patterns to watch for in your traces:

**No deadline propagation**: Look for spans where `grpc.deadline.set` is false. Every internal gRPC call should have a deadline. If a service receives a request without one, that is a gap in your deadline chain.

**Tight deadlines**: If `grpc.deadline.remaining_ms` is under 100ms when a request arrives at a downstream service, the request is almost certainly going to fail. You should see this as a warning in your traces.

**Wasted work**: Compare the duration of child spans against the parent span's deadline. If a child span takes 3 seconds but the parent's deadline was 2 seconds, that child did 1 second of wasted work.

```go
// Add a check at the start of each handler
func (s *service) ProcessPayment(ctx context.Context, req *pb.PaymentRequest) (*pb.PaymentResponse, error) {
    span := trace.SpanFromContext(ctx)

    if deadline, ok := ctx.Deadline(); ok {
        remaining := time.Until(deadline)
        if remaining < 100*time.Millisecond {
            span.AddEvent("grpc.deadline.tight", trace.WithAttributes(
                attribute.Float64("remaining_ms", float64(remaining.Milliseconds())),
            ))
            // Consider returning early instead of starting work that will not finish
        }
    }

    // proceed with handler logic
}
```

Deadline propagation bugs are some of the hardest issues to debug without tracing. They manifest as intermittent timeouts that only happen under load, because that is when services are slow enough for deadlines to matter. OpenTelemetry trace waterfalls make the time budgets visible at every hop, turning a frustrating debugging session into a straightforward investigation.
