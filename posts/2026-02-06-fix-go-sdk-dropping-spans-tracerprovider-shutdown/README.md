# How to Troubleshoot the OpenTelemetry Go SDK Silently Dropping Spans When TracerProvider.Shutdown Is Not Called

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, TracerProvider, Span Export

Description: Diagnose and fix silently dropped spans in Go caused by not calling TracerProvider.Shutdown before application exit.

You have instrumented your Go application with OpenTelemetry. Spans are being created. But when you check your tracing backend, some spans are missing. There are no errors in your logs, no panics, nothing. The spans just disappear.

The most common cause of this silent data loss is that your application exits before `TracerProvider.Shutdown()` is called. The batch span processor holds spans in memory and flushes them periodically. If the process terminates before a flush happens, those spans are gone.

## How the Batch Processor Works

The default span processor in OpenTelemetry Go is the `BatchSpanProcessor`. It collects spans in an internal queue and sends them in batches to the exporter. The default configuration is:

- `MaxQueueSize`: 2048 spans
- `BatchTimeout`: 5 seconds
- `MaxExportBatchSize`: 512 spans

This means spans can sit in the queue for up to 5 seconds before being exported. If your application shuts down within that window, the unexported spans are lost.

## The Broken Pattern

Here is the pattern that causes the problem:

```go
func main() {
    // Set up the exporter
    exporter, err := otlptracegrpc.New(context.Background())
    if err != nil {
        log.Fatal(err)
    }

    // Create the tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    // Run the application
    runServer()
    // Application exits here. No Shutdown() call.
    // Spans in the batch processor queue are LOST.
}
```

## The Fix

Always call `TracerProvider.Shutdown()` before your application exits. This flushes all pending spans to the exporter:

```go
func main() {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        log.Fatal(err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    // Ensure shutdown is called on exit
    defer func() {
        shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
        defer cancel()
        if err := tp.Shutdown(shutdownCtx); err != nil {
            log.Printf("failed to shutdown tracer provider: %v", err)
        }
    }()

    runServer()
}
```

## Handling Graceful Shutdown with Signals

In production, your application probably receives OS signals (SIGTERM, SIGINT) to shut down. You need to handle these signals and call `Shutdown()`:

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(),
        os.Interrupt, syscall.SIGTERM)
    defer stop()

    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        log.Fatal(err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    // Start the server in a goroutine
    srv := &http.Server{Addr: ":8080"}
    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    // Wait for shutdown signal
    <-ctx.Done()
    log.Println("shutting down...")

    // Give the server 15 seconds to finish in-flight requests
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
    defer cancel()

    // Shut down the HTTP server first so no new spans are created
    srv.Shutdown(shutdownCtx)

    // Then flush and shut down the tracer provider
    if err := tp.Shutdown(shutdownCtx); err != nil {
        log.Printf("tracer provider shutdown error: %v", err)
    }

    log.Println("shutdown complete")
}
```

The order matters: shut down the HTTP server first so no new requests come in, then shut down the tracer provider to flush remaining spans.

## CLI Applications and Short-Lived Processes

For CLI tools or batch jobs that run and exit quickly, the batch processor might not have time to flush at all. You have two options:

**Option 1: Use a SimpleSpanProcessor (for development or low-volume tools)**

```go
tp := sdktrace.NewTracerProvider(
    // SimpleSpanProcessor exports each span immediately
    sdktrace.WithSpanProcessor(
        sdktrace.NewSimpleSpanProcessor(exporter),
    ),
)
```

**Option 2: Keep the batch processor but always call Shutdown**

```go
func runCLI() error {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        return err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    // Always shut down at the end
    defer tp.Shutdown(ctx)

    // Do the CLI work
    return processFiles(ctx)
}
```

## Verifying Spans Are Not Being Dropped

Add a check to confirm that shutdown flushes everything:

```go
// After shutdown, the provider should reject new spans
tp.Shutdown(ctx)

// Try creating a span after shutdown - it should be a no-op
_, span := otel.Tracer("test").Start(ctx, "after-shutdown")
span.End()

// The span above will be a NoopSpan, which is expected
// This confirms the provider has been shut down
```

You can also monitor the batch processor by checking the `otel.sdk.trace.spans_exported` metric if you have metrics instrumentation enabled.

## Key Takeaway

Always call `TracerProvider.Shutdown()` before your application exits. Without it, the batch processor has no chance to flush its queue. This is the single most common reason for silently lost spans in Go applications using OpenTelemetry.
