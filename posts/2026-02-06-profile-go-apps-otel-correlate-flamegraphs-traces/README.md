# How to Profile Go Applications with OpenTelemetry and Correlate Flame Graphs with Distributed Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Profiling, Flame Graphs

Description: Profile Go applications using OpenTelemetry and correlate flame graph data with distributed traces for precise performance debugging.

Go's built-in `pprof` profiler is excellent, but it runs in isolation. You get a flame graph showing where CPU time is spent, but you have no way to connect it to specific requests or traces. By integrating Go profiling with OpenTelemetry, you bridge that gap. Every profile sample gets tagged with trace context, so you can go from a slow trace directly to the flame graph showing what your code was doing.

## Setting Up Continuous Profiling in Go

The approach uses Go's `runtime/pprof` package combined with OpenTelemetry's profiling SDK. Here is how to set up continuous profiling that exports data via OTLP:

```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func initTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("api-gateway"),
            semconv.ServiceVersion("1.3.0"),
            semconv.DeploymentEnvironment("production"),
        ),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

func main() {
    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
    defer cancel()

    tp, err := initTracer(ctx)
    if err != nil {
        log.Fatalf("Failed to initialize tracer: %v", err)
    }
    defer tp.Shutdown(ctx)

    // Start your application
    startServer(ctx)
}
```

## Adding pprof Labels for Trace Correlation

The key to connecting profiles with traces is Go's `pprof.Labels`. When you set pprof labels on a goroutine, every profile sample captured on that goroutine includes those labels:

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "runtime/pprof"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("api-gateway")

func handleListOrders(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Start a trace span
    ctx, span := tracer.Start(ctx, "listOrders",
        trace.WithAttributes(
            attribute.String("http.method", r.Method),
            attribute.String("http.path", r.URL.Path),
        ),
    )
    defer span.End()

    // Attach trace context as pprof labels
    // This is what connects profile samples to this specific trace
    traceID := span.SpanContext().TraceID().String()
    spanID := span.SpanContext().SpanID().String()

    pprof.Do(ctx, pprof.Labels(
        "trace_id", traceID,
        "span_id", spanID,
        "operation", "listOrders",
    ), func(ctx context.Context) {
        // All CPU samples captured inside this closure
        // will be tagged with the trace context
        orders := fetchOrdersFromDB(ctx)
        enrichOrders(ctx, orders)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(orders)
    })
}

func fetchOrdersFromDB(ctx context.Context) []Order {
    _, span := tracer.Start(ctx, "fetchOrdersFromDB")
    defer span.End()

    // Simulate database query
    // Profile samples here will show this function in the stack trace
    // AND be tagged with the parent trace_id
    var orders []Order
    rows, _ := db.QueryContext(ctx, "SELECT * FROM orders LIMIT 100")
    defer rows.Close()

    for rows.Next() {
        var o Order
        rows.Scan(&o.ID, &o.CustomerID, &o.Total, &o.CreatedAt)
        orders = append(orders, o)
    }
    return orders
}
```

## Middleware for Automatic Trace-Profile Correlation

Instead of manually adding pprof labels in every handler, create middleware:

```go
package middleware

import (
    "context"
    "net/http"
    "runtime/pprof"

    "go.opentelemetry.io/otel/trace"
)

// ProfilingMiddleware automatically attaches trace context as pprof labels
func ProfilingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        span := trace.SpanFromContext(ctx)

        if span.SpanContext().IsValid() {
            traceID := span.SpanContext().TraceID().String()
            spanID := span.SpanContext().SpanID().String()

            pprof.Do(ctx, pprof.Labels(
                "trace_id", traceID,
                "span_id", spanID,
            ), func(ctx context.Context) {
                // Replace the request context with the pprof-labeled context
                next.ServeHTTP(w, r.WithContext(ctx))
            })
        } else {
            next.ServeHTTP(w, r)
        }
    })
}
```

Use the middleware in your router:

```go
func startServer(ctx context.Context) {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/orders", handleListOrders)
    mux.HandleFunc("/api/orders/create", handleCreateOrder)

    // Wrap with profiling middleware
    handler := middleware.ProfilingMiddleware(mux)

    server := &http.Server{
        Addr:    ":8080",
        Handler: handler,
    }

    go func() {
        log.Printf("Server starting on :8080")
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    <-ctx.Done()
    server.Shutdown(context.Background())
}
```

## Exposing the pprof Endpoint for Profile Collection

Expose the standard pprof endpoint so an external agent can scrape profiles:

```go
import (
    "net/http"
    _ "net/http/pprof" // Register pprof handlers
)

func startDebugServer() {
    // Separate debug server on a different port
    debugMux := http.NewServeMux()
    debugMux.HandleFunc("/debug/pprof/", http.DefaultServeMux.ServeHTTP)

    go func() {
        log.Println("Debug server on :6060")
        http.ListenAndServe("localhost:6060", debugMux)
    }()
}
```

An external profiling agent (like the OpenTelemetry eBPF agent or a pprof scraper) can then collect profiles from this endpoint and forward them via OTLP.

## Reading Flame Graphs with Trace Context

Once profile data reaches your backend, you can generate flame graphs filtered by trace ID. Here is how to query it:

```bash
# Using a tool like pprof to analyze profiles for a specific trace
# (This depends on your backend supporting trace-filtered profile queries)
go tool pprof -http=:8081 \
  "https://profiling-backend.internal/api/v1/profiles?trace_id=abc123&type=cpu"
```

The flame graph will show only the CPU samples captured during the execution of that specific trace, giving you a focused view of what your code was doing for that request.

## Allocation Profiling with Trace Context

Memory allocation profiling works the same way. The pprof labels propagate to allocation samples:

```go
func handleCreateOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    ctx, span := tracer.Start(ctx, "createOrder")
    defer span.End()

    traceID := span.SpanContext().TraceID().String()
    spanID := span.SpanContext().SpanID().String()

    pprof.Do(ctx, pprof.Labels(
        "trace_id", traceID,
        "span_id", spanID,
    ), func(ctx context.Context) {
        // Allocation-heavy operations will be tagged
        // with trace context in the allocation profile
        var req OrderRequest
        json.NewDecoder(r.Body).Decode(&req)

        order := buildOrder(req)
        saveOrder(ctx, order)

        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(order)
    })
}
```

When you pull up the allocation flame graph for a specific trace, you can see exactly which functions allocated the most memory during that request. This is invaluable for debugging memory-intensive requests that trigger GC pauses.

## Production Tips

Keep the CPU profiling rate at the default (100Hz or 10ms interval). This provides good resolution with negligible overhead. Go's profiler is designed for production use.

For allocation profiling, set `runtime.MemProfileRate` to control the sampling rate. The default (512KB) is fine for most applications. Lower it only when you need more detail for debugging:

```go
import "runtime"

func init() {
    // Sample every 256KB of allocations (more detail, slightly more overhead)
    runtime.MemProfileRate = 256 * 1024
}
```

Always use the middleware approach for trace correlation. Manual pprof.Do calls are error-prone and easy to forget. The middleware ensures every request gets profiling context automatically.
