# How to Instrument Go's context.Context with OpenTelemetry for Proper Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, context.Context, Propagation, Best Practices

Description: Master context propagation in Go applications using OpenTelemetry to maintain trace continuity across function calls, goroutines, and service boundaries.

Go's context.Context is fundamental to building robust applications, providing cancellation signals, deadlines, and request-scoped values. OpenTelemetry leverages context to propagate trace and span information throughout your application. Understanding how to properly use context with OpenTelemetry is essential for maintaining trace continuity and avoiding common pitfalls.

## Understanding Context in Go

The context package serves multiple purposes:

- Carries deadlines and cancellation signals
- Stores request-scoped values (including trace spans)
- Flows through your application's call graph
- Crosses goroutine boundaries explicitly

OpenTelemetry stores span information in context, making proper context handling critical for distributed tracing.

## Setting Up OpenTelemetry Context Propagation

Start with proper initialization that configures both local and distributed context propagation.

```go
package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// Initialize OpenTelemetry with proper propagators
func initTracing(serviceName string) (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    // Create exporter
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Create resource
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceNameKey.String(serviceName),
            semconv.ServiceVersionKey.String("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )

    otel.SetTracerProvider(tp)

    // Configure propagators for distributed tracing
    // This is critical for trace context propagation across service boundaries
    otel.SetTextMapPropagator(
        propagation.NewCompositeTextMapPropagator(
            propagation.TraceContext{},  // W3C Trace Context
            propagation.Baggage{},       // W3C Baggage
        ),
    )

    return tp, nil
}
```

## Creating and Using Spans with Context

Every span operation requires a context. Understanding when to use the returned context versus the original is crucial.

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

// ProcessOrder demonstrates proper context usage with spans
func ProcessOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    // Start a new span - returns a NEW context containing this span
    // CRITICAL: You must use the returned context for child operations
    ctx, span := tracer.Start(ctx, "process_order",
        trace.WithAttributes(
            attribute.String("order.id", orderID),
        ),
    )
    defer span.End()

    // Add attributes to the span using the span object
    span.SetAttributes(
        attribute.String("order.status", "processing"),
    )

    // Call child functions with the NEW context
    // This ensures proper parent-child span relationships
    if err := validateOrder(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "validation failed")
        return err
    }

    if err := chargePayment(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "payment failed")
        return err
    }

    if err := fulfillOrder(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "fulfillment failed")
        return err
    }

    span.SetStatus(codes.Ok, "order processed successfully")
    return nil
}

// validateOrder is a child operation that creates its own span
func validateOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    // This span will be a child of the span in ctx
    ctx, span := tracer.Start(ctx, "validate_order",
        trace.WithAttributes(
            attribute.String("order.id", orderID),
        ),
    )
    defer span.End()

    // Validation logic here

    return nil
}

// chargePayment demonstrates nested span creation
func chargePayment(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    ctx, span := tracer.Start(ctx, "charge_payment")
    defer span.End()

    // Even deeper nesting works automatically
    return contactPaymentGateway(ctx, orderID)
}

// contactPaymentGateway creates a child span
func contactPaymentGateway(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    ctx, span := tracer.Start(ctx, "payment_gateway.charge",
        trace.WithAttributes(
            attribute.String("gateway", "stripe"),
        ),
    )
    defer span.End()

    // Payment gateway logic

    return nil
}

// fulfillOrder completes the order processing
func fulfillOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    ctx, span := tracer.Start(ctx, "fulfill_order")
    defer span.End()

    // Fulfillment logic

    return nil
}
```

## Context Propagation Across Goroutines

When spawning goroutines, you must explicitly pass context. The parent context should be passed to maintain trace continuity.

```go
package main

import (
    "context"
    "sync"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// ProcessOrderAsync spawns goroutines with proper context propagation
func ProcessOrderAsync(ctx context.Context, orderIDs []string) error {
    tracer := otel.Tracer("order-service")

    ctx, span := tracer.Start(ctx, "process_orders_async")
    defer span.End()

    var wg sync.WaitGroup
    errChan := make(chan error, len(orderIDs))

    for _, orderID := range orderIDs {
        wg.Add(1)

        // CRITICAL: Pass ctx (containing the span) to the goroutine
        // Each goroutine will create child spans linked to the parent
        go func(ctx context.Context, id string) {
            defer wg.Done()

            // This creates a child span even though it's in a different goroutine
            if err := ProcessOrder(ctx, id); err != nil {
                errChan <- err
            }
        }(ctx, orderID)  // Pass context explicitly
    }

    wg.Wait()
    close(errChan)

    // Check for errors
    for err := range errChan {
        if err != nil {
            span.RecordError(err)
            return err
        }
    }

    return nil
}

// ProcessOrdersInPool uses a worker pool with context propagation
func ProcessOrdersInPool(ctx context.Context, orderIDs []string) error {
    tracer := otel.Tracer("order-service")

    ctx, span := tracer.Start(ctx, "process_orders_pool")
    defer span.End()

    numWorkers := 5
    workChan := make(chan string, len(orderIDs))
    errChan := make(chan error, len(orderIDs))

    var wg sync.WaitGroup

    // Start workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        workerID := i

        // Pass context to each worker
        go func(ctx context.Context, id int) {
            defer wg.Done()

            // Create worker span
            workerCtx, workerSpan := tracer.Start(ctx, "worker",
                trace.WithAttributes(
                    attribute.Int("worker.id", id),
                ),
            )
            defer workerSpan.End()

            // Process work items
            for orderID := range workChan {
                // Each work item gets a child span
                if err := ProcessOrder(workerCtx, orderID); err != nil {
                    errChan <- err
                }
            }
        }(ctx, workerID)  // Pass context to worker
    }

    // Send work
    for _, orderID := range orderIDs {
        workChan <- orderID
    }
    close(workChan)

    wg.Wait()
    close(errChan)

    // Handle errors
    for err := range errChan {
        if err != nil {
            return err
        }
    }

    return nil
}
```

## Handling Context Cancellation with Spans

Context cancellation should be respected while ensuring spans are properly ended.

```go
package main

import (
    "context"
    "fmt"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/codes"
)

// ProcessWithTimeout demonstrates timeout handling with tracing
func ProcessWithTimeout(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    // Create span first
    ctx, span := tracer.Start(ctx, "process_with_timeout")
    defer span.End()  // Always end span, even on cancellation

    // Create child context with timeout
    timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    // Channel for result
    resultChan := make(chan error, 1)

    // Start processing in goroutine
    go func() {
        resultChan <- processLongRunning(timeoutCtx, orderID)
    }()

    // Wait for result or timeout
    select {
    case err := <-resultChan:
        if err != nil {
            span.RecordError(err)
            span.SetStatus(codes.Error, "processing failed")
            return err
        }
        span.SetStatus(codes.Ok, "completed")
        return nil

    case <-timeoutCtx.Done():
        // Context cancelled or timed out
        err := timeoutCtx.Err()
        span.RecordError(err)
        span.SetStatus(codes.Error, "timeout")
        return fmt.Errorf("processing timed out: %w", err)
    }
}

// processLongRunning checks context periodically
func processLongRunning(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")

    ctx, span := tracer.Start(ctx, "long_running_process")
    defer span.End()

    // Simulate work with periodic context checks
    for i := 0; i < 10; i++ {
        // Check if context is cancelled
        select {
        case <-ctx.Done():
            err := ctx.Err()
            span.RecordError(err)
            span.SetStatus(codes.Error, "cancelled")
            return err
        default:
            // Continue processing
        }

        // Simulate work
        time.Sleep(1 * time.Second)
    }

    return nil
}
```

## Context Propagation in HTTP Handlers

HTTP handlers need special attention for context propagation, both incoming and outgoing.

```go
package main

import (
    "context"
    "io"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

// SetupHTTPServer configures an HTTP server with OpenTelemetry
func SetupHTTPServer() *http.Server {
    mux := http.NewServeMux()

    // Wrap handlers with OpenTelemetry middleware
    // This extracts trace context from incoming requests
    handler := otelhttp.NewHandler(mux, "http-server")

    mux.HandleFunc("/orders", handleOrders)
    mux.HandleFunc("/orders/{id}", handleOrderByID)

    return &http.Server{
        Addr:    ":8080",
        Handler: handler,
    }
}

// handleOrders demonstrates context usage in HTTP handlers
func handleOrders(w http.ResponseWriter, r *http.Request) {
    // The request context already contains trace information
    // thanks to the otelhttp middleware
    ctx := r.Context()

    tracer := otel.Tracer("http-handler")

    // Create a span for this handler
    ctx, span := tracer.Start(ctx, "handle_orders",
        trace.WithAttributes(
            attribute.String("http.method", r.Method),
            attribute.String("http.url", r.URL.String()),
        ),
    )
    defer span.End()

    // Process request with traced context
    orders, err := fetchOrders(ctx)
    if err != nil {
        span.RecordError(err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }

    // Write response
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(orders))
}

// handleOrderByID shows parameter extraction with tracing
func handleOrderByID(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tracer := otel.Tracer("http-handler")

    orderID := r.PathValue("id")

    ctx, span := tracer.Start(ctx, "handle_order_by_id",
        trace.WithAttributes(
            attribute.String("order.id", orderID),
        ),
    )
    defer span.End()

    // Process with context
    order, err := fetchOrderByID(ctx, orderID)
    if err != nil {
        span.RecordError(err)
        http.Error(w, "Order not found", http.StatusNotFound)
        return
    }

    w.Write([]byte(order))
}

// makeHTTPRequest demonstrates outgoing HTTP calls with context propagation
func makeHTTPRequest(ctx context.Context, url string) (string, error) {
    tracer := otel.Tracer("http-client")

    ctx, span := tracer.Start(ctx, "http_request",
        trace.WithAttributes(
            attribute.String("http.url", url),
        ),
    )
    defer span.End()

    // Create HTTP client with OpenTelemetry transport
    // This injects trace context into outgoing requests
    client := &http.Client{
        Transport: otelhttp.NewTransport(http.DefaultTransport),
    }

    // Create request with context
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        span.RecordError(err)
        return "", err
    }

    // Make request - trace context is automatically propagated
    resp, err := client.Do(req)
    if err != nil {
        span.RecordError(err)
        return "", err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        span.RecordError(err)
        return "", err
    }

    return string(body), nil
}

// Placeholder functions
func fetchOrders(ctx context.Context) (string, error) {
    return `[{"id":"1","status":"pending"}]`, nil
}

func fetchOrderByID(ctx context.Context, id string) (string, error) {
    return fmt.Sprintf(`{"id":"%s","status":"pending"}`, id), nil
}
```

## Extracting Span from Context

Sometimes you need to access the current span without creating a new one.

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// AddContextualInfo adds information to the current span
func AddContextualInfo(ctx context.Context, key, value string) {
    // Extract the current span from context
    span := trace.SpanFromContext(ctx)

    // Check if span is valid (non-nil and recording)
    if span.IsRecording() {
        span.SetAttributes(attribute.String(key, value))
    }
}

// GetTraceID retrieves the current trace ID
func GetTraceID(ctx context.Context) string {
    span := trace.SpanFromContext(ctx)
    return span.SpanContext().TraceID().String()
}

// AddEventToCurrentSpan adds an event to the active span
func AddEventToCurrentSpan(ctx context.Context, eventName string, attributes ...attribute.KeyValue) {
    span := trace.SpanFromContext(ctx)

    if span.IsRecording() {
        span.AddEvent(eventName, trace.WithAttributes(attributes...))
    }
}

// EnrichWithUserContext adds user information to the trace
func EnrichWithUserContext(ctx context.Context, userID, email string) {
    span := trace.SpanFromContext(ctx)

    if span.IsRecording() {
        span.SetAttributes(
            attribute.String("user.id", userID),
            attribute.String("user.email", email),
        )
    }
}
```

## Context Propagation Best Practices

Understanding common mistakes helps avoid trace discontinuity.

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel"
)

// BAD: This creates a disconnected span
func badExample(ctx context.Context) error {
    tracer := otel.Tracer("service")

    // Wrong: using original ctx instead of returned ctx
    _, span := tracer.Start(ctx, "operation")
    defer span.End()

    // This child span won't be connected properly
    return childOperation(ctx)  // BUG: Should use the new context from Start()
}

// GOOD: Proper context propagation
func goodExample(ctx context.Context) error {
    tracer := otel.Tracer("service")

    // Correct: use the returned context
    ctx, span := tracer.Start(ctx, "operation")
    defer span.End()

    // Child spans will be properly connected
    return childOperation(ctx)
}

// BAD: Context lost in goroutine
func badGoroutineExample(ctx context.Context) error {
    tracer := otel.Tracer("service")
    ctx, span := tracer.Start(ctx, "async_operation")
    defer span.End()

    // Wrong: goroutine doesn't receive context
    go func() {
        // This creates a disconnected trace
        newCtx := context.Background()
        childOperation(newCtx)
    }()

    return nil
}

// GOOD: Context passed to goroutine
func goodGoroutineExample(ctx context.Context) error {
    tracer := otel.Tracer("service")
    ctx, span := tracer.Start(ctx, "async_operation")
    defer span.End()

    // Correct: explicitly pass context
    go func(ctx context.Context) {
        // Trace continuity maintained
        childOperation(ctx)
    }(ctx)

    return nil
}

// BAD: Creating new root context
func badContextCreation() error {
    // Wrong: creates disconnected trace
    ctx := context.Background()
    tracer := otel.Tracer("service")

    ctx, span := tracer.Start(ctx, "operation")
    defer span.End()

    return childOperation(ctx)
}

// GOOD: Use provided context
func goodContextUsage(ctx context.Context) error {
    // Correct: use provided context
    tracer := otel.Tracer("service")

    ctx, span := tracer.Start(ctx, "operation")
    defer span.End()

    return childOperation(ctx)
}

func childOperation(ctx context.Context) error {
    tracer := otel.Tracer("service")
    _, span := tracer.Start(ctx, "child_operation")
    defer span.End()

    return nil
}
```

## Context Baggage for Cross-Cutting Concerns

Baggage allows you to propagate key-value pairs across service boundaries.

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel/baggage"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// AddUserToBaggage stores user information in baggage
func AddUserToBaggage(ctx context.Context, userID, tenantID string) (context.Context, error) {
    // Create baggage members
    userMember, err := baggage.NewMember("user.id", userID)
    if err != nil {
        return ctx, err
    }

    tenantMember, err := baggage.NewMember("tenant.id", tenantID)
    if err != nil {
        return ctx, err
    }

    // Create or update baggage
    bag, err := baggage.New(userMember, tenantMember)
    if err != nil {
        return ctx, err
    }

    // Store baggage in context
    return baggage.ContextWithBaggage(ctx, bag), nil
}

// GetUserFromBaggage retrieves user information from baggage
func GetUserFromBaggage(ctx context.Context) (userID, tenantID string) {
    bag := baggage.FromContext(ctx)

    userID = bag.Member("user.id").Value()
    tenantID = bag.Member("tenant.id").Value()

    return userID, tenantID
}

// EnrichSpanWithBaggage adds baggage values to span attributes
func EnrichSpanWithBaggage(ctx context.Context) {
    span := trace.SpanFromContext(ctx)
    bag := baggage.FromContext(ctx)

    for _, member := range bag.Members() {
        span.SetAttributes(
            attribute.String("baggage."+member.Key(), member.Value()),
        )
    }
}
```

Proper context propagation is the foundation of effective distributed tracing. By consistently passing context through your application and understanding when to use returned contexts versus original ones, you ensure complete trace continuity. OpenTelemetry's integration with Go's context package makes this powerful when used correctly, but requires discipline to avoid creating disconnected traces.
