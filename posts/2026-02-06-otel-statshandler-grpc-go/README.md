# How to Use OpenTelemetry StatsHandler-Based Instrumentation Instead of Deprecated gRPC Interceptors in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, StatsHandler, Go Instrumentation

Description: Migrate from deprecated gRPC interceptors to the StatsHandler-based OpenTelemetry instrumentation in Go for better telemetry data.

The gRPC Go ecosystem has moved toward `stats.Handler` as the preferred way to collect telemetry. The older interceptor-based approach had limitations: interceptors could not capture certain low-level events like connection establishment, and chaining multiple interceptors was awkward. The `otelgrpc` package from OpenTelemetry now recommends using `NewServerHandler()` and `NewClientHandler()` over the deprecated interceptor functions.

## Why StatsHandler Over Interceptors?

The `stats.Handler` interface receives callbacks for the full lifecycle of an RPC:

- `TagRPC`: Called at the start of an RPC (set up context)
- `HandleRPC`: Called for each RPC event (begin, in-header, in-payload, out-header, out-payload, end)
- `TagConn`: Called when a new connection is created
- `HandleConn`: Called for connection events (begin, end)

Interceptors only see the start and end of the RPC. They miss payload-level events and connection lifecycle events entirely.

## The Old Way (Deprecated)

This is the interceptor-based approach that you should migrate away from:

```go
// DEPRECATED - do not use this pattern anymore
import "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"

// Server - deprecated
server := grpc.NewServer(
    grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
    grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor()),
)

// Client - deprecated
conn, err := grpc.Dial(target,
    grpc.WithUnaryInterceptor(otelgrpc.UnaryClientInterceptor()),
    grpc.WithStreamInterceptor(otelgrpc.StreamClientInterceptor()),
)
```

## The New Way (StatsHandler)

Here is the recommended approach using `stats.Handler`:

```go
package main

import (
    "context"
    "log"
    "net"

    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
    "google.golang.org/grpc"
    pb "example.com/myservice/proto"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(context.Background(),
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("my-grpc-service"),
        )),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}

func main() {
    tp, err := initTracer()
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(context.Background())

    // Create gRPC server with StatsHandler
    server := grpc.NewServer(
        grpc.StatsHandler(otelgrpc.NewServerHandler()),
    )

    pb.RegisterMyServiceServer(server, &myServer{})

    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }
    log.Println("Server starting on :50051")
    server.Serve(lis)
}
```

## Client Setup with StatsHandler

```go
func createClient() (*grpc.ClientConn, error) {
    // Use StatsHandler for client-side instrumentation
    conn, err := grpc.NewClient("localhost:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    )
    if err != nil {
        return nil, err
    }
    return conn, nil
}
```

## Customizing the StatsHandler

You can pass options to customize the behavior:

```go
// Server with custom options
server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler(
        // Filter out health check RPCs from tracing
        otelgrpc.WithFilter(func(info *otelgrpc.InterceptorInfo) bool {
            // Return false to skip tracing for health checks
            return info.UnaryServerInfo.FullMethod != "/grpc.health.v1.Health/Check"
        }),
        // Set a custom span name formatter
        otelgrpc.WithSpanNameFormatter(func(fullMethod string) string {
            // Extract just the method name without the service prefix
            parts := strings.Split(fullMethod, "/")
            if len(parts) >= 3 {
                return parts[1] + "." + parts[2]
            }
            return fullMethod
        }),
        // Only record specific message events
        otelgrpc.WithMessageEvents(
            otelgrpc.ReceivedEvents,
            otelgrpc.SentEvents,
        ),
    )),
)
```

## Building a Custom StatsHandler

If you need behavior beyond what `otelgrpc` provides, you can implement the `stats.Handler` interface directly:

```go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc/stats"
)

type customStatsHandler struct {
    tracer trace.Tracer
    meter  metric.Meter

    rpcDuration metric.Float64Histogram
    connCount   metric.Int64UpDownCounter
}

func NewCustomStatsHandler() stats.Handler {
    m := otel.Meter("grpc.custom.stats")
    dur, _ := m.Float64Histogram("grpc.server.rpc.duration", metric.WithUnit("ms"))
    conn, _ := m.Int64UpDownCounter("grpc.server.connections.active")

    return &customStatsHandler{
        tracer:      otel.Tracer("grpc.custom.stats"),
        meter:       m,
        rpcDuration: dur,
        connCount:   conn,
    }
}

// TagRPC is called at the beginning of an RPC
func (h *customStatsHandler) TagRPC(ctx context.Context, info *stats.RPCTagInfo) context.Context {
    ctx, _ = h.tracer.Start(ctx, info.FullMethodName,
        trace.WithSpanKind(trace.SpanKindServer),
    )
    // Store the start time in context
    return context.WithValue(ctx, rpcStartKey{}, time.Now())
}

type rpcStartKey struct{}

// HandleRPC processes RPC-level events
func (h *customStatsHandler) HandleRPC(ctx context.Context, s stats.RPCStats) {
    span := trace.SpanFromContext(ctx)

    switch event := s.(type) {
    case *stats.InPayload:
        span.AddEvent("message.received", trace.WithAttributes(
            attribute.Int("message.uncompressed_size", event.Length),
            attribute.Int("message.compressed_size", event.CompressedLength),
        ))

    case *stats.OutPayload:
        span.AddEvent("message.sent", trace.WithAttributes(
            attribute.Int("message.uncompressed_size", event.Length),
            attribute.Int("message.compressed_size", event.CompressedLength),
        ))

    case *stats.End:
        if start, ok := ctx.Value(rpcStartKey{}).(time.Time); ok {
            elapsed := float64(time.Since(start).Milliseconds())
            h.rpcDuration.Record(ctx, elapsed)
        }
        if event.Error != nil {
            span.RecordError(event.Error)
        }
        span.End()
    }
}

// TagConn is called at the beginning of a connection
func (h *customStatsHandler) TagConn(ctx context.Context, info *stats.ConnTagInfo) context.Context {
    return ctx
}

// HandleConn processes connection-level events
func (h *customStatsHandler) HandleConn(ctx context.Context, s stats.ConnStats) {
    switch s.(type) {
    case *stats.ConnBegin:
        h.connCount.Add(ctx, 1)
    case *stats.ConnEnd:
        h.connCount.Add(ctx, -1)
    }
}
```

## Migration Checklist

When migrating from interceptors to StatsHandler:

1. Replace `grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor())` with `grpc.StatsHandler(otelgrpc.NewServerHandler())`
2. Replace `grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor())` with the same StatsHandler (it handles both unary and streaming)
3. Do the same for client-side interceptors
4. Remove any interceptor chaining libraries you were using just for OpenTelemetry
5. Test that your spans still appear correctly in your tracing backend

The StatsHandler approach is simpler, more capable, and future-proof. It is the right way to instrument gRPC in Go going forward.
