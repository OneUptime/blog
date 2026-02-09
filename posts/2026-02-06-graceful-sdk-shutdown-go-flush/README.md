# How to Implement Graceful SDK Shutdown in Go to Flush All Pending Spans and Metrics Before Process Exit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Graceful Shutdown, SDK

Description: Implement graceful OpenTelemetry SDK shutdown in Go to flush all pending spans and metrics before the process exits cleanly.

When a Go service shuts down, the OpenTelemetry SDK's BatchSpanProcessor and PeriodicMetricReader have unflushed data sitting in their internal queues. If you just let the process exit, that data is lost. Graceful shutdown calls `Shutdown()` on the TracerProvider and MeterProvider, which triggers a final flush of all pending telemetry data to your exporters.

## The Problem

Without graceful shutdown:

```go
func main() {
    tp := initTracing()
    // ... run your service ...
    // Process exits here - any spans still in the batch queue are LOST
}
```

With graceful shutdown:

```go
func main() {
    tp := initTracing()
    defer func() {
        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()
        tp.Shutdown(ctx) // Flushes all pending spans before exit
    }()
    // ... run your service ...
}
```

## Full Implementation with Signal Handling

Here is a complete example that handles SIGTERM and SIGINT properly:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// shutdownFuncs collects cleanup functions to run on shutdown
var shutdownFuncs []func(context.Context) error

func initTracing(ctx context.Context) (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("creating trace exporter: %w", err)
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("order-service"),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("creating resource: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter,
            sdktrace.WithBatchTimeout(5*time.Second),
            sdktrace.WithMaxQueueSize(8192),
        ),
        sdktrace.WithResource(res),
    )

    otel.SetTracerProvider(tp)

    // Register shutdown function
    shutdownFuncs = append(shutdownFuncs, tp.Shutdown)

    return tp, nil
}

func initMetrics(ctx context.Context) (*metric.MeterProvider, error) {
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("collector:4317"),
        otlpmetricgrpc.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("creating metric exporter: %w", err)
    }

    mp := metric.NewMeterProvider(
        metric.WithReader(
            metric.NewPeriodicReader(exporter,
                metric.WithInterval(15*time.Second),
            ),
        ),
    )

    otel.SetMeterProvider(mp)

    // Register shutdown function
    shutdownFuncs = append(shutdownFuncs, mp.Shutdown)

    return mp, nil
}

func gracefulShutdown(ctx context.Context) error {
    var firstErr error
    for _, fn := range shutdownFuncs {
        if err := fn(ctx); err != nil {
            log.Printf("Shutdown error: %v", err)
            if firstErr == nil {
                firstErr = err
            }
        }
    }
    return firstErr
}

func main() {
    ctx := context.Background()

    // Initialize OpenTelemetry
    _, err := initTracing(ctx)
    if err != nil {
        log.Fatalf("Failed to init tracing: %v", err)
    }
    _, err = initMetrics(ctx)
    if err != nil {
        log.Fatalf("Failed to init metrics: %v", err)
    }

    // Set up signal handling
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

    // Start your HTTP server
    server := &http.Server{Addr: ":8080"}
    go func() {
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("HTTP server error: %v", err)
        }
    }()

    log.Println("Service started on :8080")

    // Wait for shutdown signal
    sig := <-sigChan
    log.Printf("Received signal %v, shutting down...", sig)

    // Create a deadline for the entire shutdown process
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Step 1: Stop accepting new HTTP requests
    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Printf("HTTP server shutdown error: %v", err)
    }

    // Step 2: Flush and shut down OpenTelemetry
    // This must happen AFTER the HTTP server stops so that
    // spans from in-flight requests are completed first
    if err := gracefulShutdown(shutdownCtx); err != nil {
        log.Printf("OpenTelemetry shutdown error: %v", err)
    }

    log.Println("Shutdown complete")
}
```

## Shutdown Order Matters

The shutdown sequence should be:

1. **Stop accepting new requests** (HTTP server shutdown)
2. **Wait for in-flight requests to complete** (server.Shutdown handles this)
3. **Flush and shutdown OpenTelemetry SDK** (tp.Shutdown flushes pending data)

If you shut down the SDK before the HTTP server, spans from in-flight requests will not be exported.

## ForceFlush vs Shutdown

The SDK provides both `ForceFlush` and `Shutdown`:

```go
// ForceFlush: Export all pending data but keep the SDK running
// Use this for periodic flushing or before a health check
err := tp.ForceFlush(ctx)

// Shutdown: Export all pending data AND stop the SDK
// After this call, new spans will not be recorded
// Use this only when the process is actually exiting
err := tp.Shutdown(ctx)
```

`ForceFlush` is useful in scenarios like Kubernetes preStop hooks where you want to flush data but the process might continue running briefly:

```go
// Kubernetes preStop hook handler
http.HandleFunc("/prestop", func(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    // Flush pending data but do not shut down
    if err := tp.ForceFlush(ctx); err != nil {
        log.Printf("ForceFlush error: %v", err)
    }
    w.WriteHeader(http.StatusOK)
})
```

## Handling Shutdown Timeouts

Always use a context with a timeout for shutdown calls. If the exporter is unreachable, you do not want the shutdown to hang forever:

```go
// Give shutdown 10 seconds to complete
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

err := tp.Shutdown(ctx)
if err != nil {
    // Log but do not panic - the process is exiting anyway
    log.Printf("TracerProvider shutdown timed out: %v", err)
}
```

## Testing Graceful Shutdown

```go
func TestGracefulShutdown(t *testing.T) {
    exporter := tracetest.NewInMemoryExporter()
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    // Create some spans
    tracer := otel.Tracer("test")
    _, span := tracer.Start(context.Background(), "test-span")
    span.End()

    // Before shutdown, spans may still be in the batch queue
    // After shutdown, all spans should be exported
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    err := tp.Shutdown(ctx)
    assert.NoError(t, err)

    // Now all spans should be in the exporter
    spans := exporter.GetSpans()
    assert.Len(t, spans, 1)
    assert.Equal(t, "test-span", spans[0].Name)
}
```

Graceful shutdown is a small amount of code that prevents a significant amount of data loss. Every Go service that uses OpenTelemetry should handle SIGTERM properly and call Shutdown on the TracerProvider and MeterProvider before exiting.
