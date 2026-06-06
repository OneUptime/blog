# How to Build Custom gRPC OpenTelemetry Interceptors for Business-Specific Span

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Custom Interceptors, Span Attributes

Description: Build custom gRPC interceptors that add business-specific span attributes and filter out noisy RPCs from your OpenTelemetry traces.

The default gRPC OpenTelemetry instrumentation captures standard RPC attributes like method name, status code, and duration. But your business needs more. You want to know which customer made the request, what tenant it belongs to, or which feature flag was active. Custom interceptors let you enrich spans with business-specific data and filter out noise.

## Why Custom Interceptors?

The out-of-the-box `otelgrpc` instrumentation gives you technical metrics. Custom interceptors add business context:
- Customer ID, tenant ID, or organization ID from request metadata
- Business operation classification (read vs write, internal vs external)
- Request payload attributes (order value, item count)
- Filtering out health checks, readiness probes, and internal keep-alive RPCs

## A Custom Server Interceptor in Go

```go
package interceptors

import (
    "context"
    "strings"

    pb "example.com/yourapp/gen/pb"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

// BusinessAttributeInterceptor adds business-specific attributes to spans
func BusinessAttributeInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        span := trace.SpanFromContext(ctx)

        // Extract business context from gRPC metadata
        if md, ok := metadata.FromIncomingContext(ctx); ok {
            // Tenant ID
            if tenants := md.Get("x-tenant-id"); len(tenants) > 0 {
                span.SetAttributes(attribute.String("tenant.id", tenants[0]))
            }

            // Customer ID
            if customers := md.Get("x-customer-id"); len(customers) > 0 {
                span.SetAttributes(attribute.String("customer.id", customers[0]))
            }

            // Request source (web, mobile, api)
            if sources := md.Get("x-request-source"); len(sources) > 0 {
                span.SetAttributes(attribute.String("request.source", sources[0]))
            }

            // Feature flags
            if flags := md.Get("x-feature-flags"); len(flags) > 0 {
                span.SetAttributes(attribute.String("feature.flags", flags[0]))
            }
        }

        // Classify the operation type
        operationType := classifyOperation(info.FullMethod)
        span.SetAttributes(attribute.String("business.operation_type", operationType))

        // Extract attributes from the request payload for sampled detailed traces
        if detailedTracingEnabled(ctx) {
            addRequestAttributes(span, req, info.FullMethod)
        }

        // Call the handler
        resp, err := handler(ctx, req)

        // Add response attributes
        if resp != nil && detailedTracingEnabled(ctx) {
            addResponseAttributes(span, resp, info.FullMethod)
        }

        return resp, err
    }
}

type detailedTracingKey struct{}

func detailedTracingEnabled(ctx context.Context) bool {
    detailed, ok := ctx.Value(detailedTracingKey{}).(bool)
    return !ok || detailed
}

func classifyOperation(method string) string {
    method = strings.ToLower(method)

    // Classify based on method name patterns
    switch {
    case strings.Contains(method, "get") || strings.Contains(method, "list") || strings.Contains(method, "search"):
        return "read"
    case strings.Contains(method, "create") || strings.Contains(method, "update") || strings.Contains(method, "delete"):
        return "write"
    case strings.Contains(method, "health") || strings.Contains(method, "ping"):
        return "healthcheck"
    default:
        return "unknown"
    }
}

func addRequestAttributes(span trace.Span, req interface{}, method string) {
    // Use type assertions to extract business data from known request types
    if orderReq, ok := req.(*pb.CreateOrderRequest); ok {
        span.SetAttributes(
            attribute.Float64("order.total_value", orderReq.TotalValue),
            attribute.Int("order.item_count", len(orderReq.Items)),
            attribute.String("order.currency", orderReq.Currency),
        )
    }
}

func addResponseAttributes(span trace.Span, resp interface{}, method string) {
    if orderResp, ok := resp.(*pb.CreateOrderResponse); ok {
        span.SetAttributes(
            attribute.String("order.id", orderResp.OrderId),
            attribute.String("order.status", orderResp.Status),
        )
    }
}
```

## Filtering Interceptor

Filter out noisy RPCs that clutter your traces:

```go
import (
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "google.golang.org/grpc/stats"
)

// FilteringOption skips OpenTelemetry instrumentation for specified methods.
// It must be configured on otelgrpc.NewServerHandler before spans are created.
func FilteringOption(skipMethods map[string]bool) otelgrpc.Option {
    return otelgrpc.WithFilter(func(info *stats.RPCTagInfo) bool {
        return !skipMethods[info.FullMethodName]
    })
}

// Usage
skipMethods := map[string]bool{
    "/grpc.health.v1.Health/Check": true,
    "/grpc.health.v1.Health/Watch": true,
    "/grpc.reflection.v1alpha.ServerReflection/ServerReflectionInfo": true,
}
```

## Sampling Interceptor

For high-volume RPCs, you might want to sample expensive business-detail attributes rather than filter traces entirely. OpenTelemetry trace sampling is decided when the span starts, so an interceptor cannot sample out an already-created span:

```go
import "math/rand"

func DetailSamplingInterceptor(sampleRates map[string]float64) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        rate, exists := sampleRates[info.FullMethod]
        if exists && rand.Float64() > rate {
            // Skip expensive business-specific attribute extraction for this request.
            span := trace.SpanFromContext(ctx)
            span.SetAttributes(attribute.Bool("business.detail_sampled", false))
            ctx = context.WithValue(ctx, detailedTracingKey{}, false)
        }

        return handler(ctx, req)
    }
}

// Add detailed business attributes for only 10% of ListProducts calls
sampleRates := map[string]float64{
    "/mypackage.ProductService/ListProducts": 0.1,
    "/mypackage.SearchService/Search":        0.05,
}
```

## Client-Side Business Interceptor

```go
import "time"

func BusinessClientInterceptor() grpc.UnaryClientInterceptor {
    return func(
        ctx context.Context,
        method string,
        req, reply interface{},
        cc *grpc.ClientConn,
        invoker grpc.UnaryInvoker,
        opts ...grpc.CallOption,
    ) error {
        span := trace.SpanFromContext(ctx)

        // Add the calling service context
        span.SetAttributes(
            attribute.String("client.service", "checkout-service"),
            attribute.String("client.version", "v2.1.0"),
            attribute.String("rpc.target", cc.Target()),
        )

        start := time.Now()
        err := invoker(ctx, method, req, reply, cc, opts...)
        elapsed := time.Since(start)

        // Flag slow calls
        if elapsed > 500*time.Millisecond {
            span.SetAttributes(attribute.Bool("rpc.slow_call", true))
            span.AddEvent("slow_rpc_detected", trace.WithAttributes(
                attribute.Float64("rpc.duration_ms", float64(elapsed.Milliseconds())),
            ))
        }

        return err
    }
}
```

## Chaining Interceptors

Apply multiple interceptors in the right order:

```go
server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler(
        FilteringOption(skipMethods),          // Filter noise before spans are created
    )),
    grpc.ChainUnaryInterceptor(
        DetailSamplingInterceptor(sampleRates),    // First: decide whether to add expensive details
        BusinessAttributeInterceptor(),            // Then: add business data
    ),
)
```

Custom interceptors bridge the gap between technical telemetry and business observability. The default instrumentation tells you that an RPC took 200ms. Your custom interceptors tell you that it was a high-value order from a premium customer on the mobile app, which is far more useful when you are investigating a production issue.
