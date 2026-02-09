# How to Troubleshoot Orphaned Spans in Go When Goroutines Do Not Receive the Parent Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Goroutines, Distributed Tracing

Description: A practical guide to finding and fixing orphaned spans in Go applications where goroutines are missing parent context.

Orphaned spans are one of the most frustrating issues when working with OpenTelemetry in Go. You see spans in your tracing backend, but they show up as independent root spans instead of being part of a larger trace tree. The trace view looks broken, with disconnected fragments that should be linked together.

## What Orphaned Spans Look Like

When you look at your tracing backend, you might see something like this:

- Trace A: `HTTP GET /api/orders` -> `processOrder` (2 spans, looks incomplete)
- Trace B: `validateInventory` (1 span, no parent, standalone)
- Trace C: `chargePayment` (1 span, no parent, standalone)

The `validateInventory` and `chargePayment` spans should be children of `processOrder`, but they ended up in separate traces. Each one got a brand new trace ID.

## Root Cause

This happens when you spawn a goroutine without passing the parent context. In Go, the OpenTelemetry SDK relies on `context.Context` to propagate trace and span IDs. If you do not pass the context, the tracer has no way to know about the parent span.

Here is the problematic pattern:

```go
func processOrder(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "processOrder")
    defer span.End()

    // BUG: goroutine does not receive ctx
    var wg sync.WaitGroup

    wg.Add(1)
    go func() {
        defer wg.Done()
        // This creates a root span because context.Background() is implicit
        validateInventory(context.Background(), order)
    }()

    wg.Add(1)
    go func() {
        defer wg.Done()
        // Same problem here
        chargePayment(context.Background(), order)
    }()

    wg.Wait()
    return nil
}
```

Both `validateInventory` and `chargePayment` receive `context.Background()`, which contains no span context. When they call `tracer.Start`, the SDK sees no parent and creates a new root span with a new trace ID.

## The Fix

Pass the parent context into each goroutine:

```go
func processOrder(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "processOrder")
    defer span.End()

    var wg sync.WaitGroup

    wg.Add(1)
    go func() {
        defer wg.Done()
        // FIXED: pass ctx so the span has a parent
        validateInventory(ctx, order)
    }()

    wg.Add(1)
    go func() {
        defer wg.Done()
        // FIXED: same here
        chargePayment(ctx, order)
    }()

    wg.Wait()
    return nil
}
```

Now the spans created inside `validateInventory` and `chargePayment` will be children of the `processOrder` span, and all three will share the same trace ID.

## Finding Orphaned Spans Programmatically

You can detect orphaned spans before they become a problem by writing a simple test helper:

```go
// testSpanRecorder is a test helper that captures exported spans
// and checks for orphans.
func checkForOrphans(t *testing.T, spans []sdktrace.ReadOnlySpan) {
    traceMap := make(map[trace.TraceID][]sdktrace.ReadOnlySpan)

    for _, s := range spans {
        tid := s.SpanContext().TraceID()
        traceMap[tid] = append(traceMap[tid], s)
    }

    for tid, traceSpans := range traceMap {
        if len(traceSpans) == 1 {
            s := traceSpans[0]
            // A single span with no parent might be intentional,
            // but flag it for review
            if !s.Parent().IsValid() {
                t.Logf("WARNING: orphaned span %q in trace %s",
                    s.Name(), tid)
            }
        }
    }
}
```

Use this in your integration tests with the in-memory span exporter:

```go
func TestProcessOrder(t *testing.T) {
    // Set up an in-memory exporter for testing
    exporter := tracetest.NewInMemoryExporter()
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithSyncer(exporter),
    )
    defer tp.Shutdown(context.Background())

    otel.SetTracerProvider(tp)

    ctx := context.Background()
    processOrder(ctx, testOrder)

    // Force flush and check spans
    tp.ForceFlush(ctx)
    spans := exporter.GetSpans()

    // Check that no spans are orphaned
    checkForOrphans(t, convertSpans(spans))
}
```

## Common Places Where Context Gets Dropped

Beyond the obvious goroutine case, context often gets dropped in these scenarios:

**Channel consumers:**
```go
// BAD: the channel only carries data, not context
orderChan <- order

// GOOD: wrap the order with context
type orderMsg struct {
    ctx   context.Context
    order Order
}
orderChan <- orderMsg{ctx: ctx, order: order}
```

**Worker pools:**
```go
// BAD: worker pool function signature has no context
pool.Submit(func() {
    doWork(order)
})

// GOOD: capture the context in the closure
pool.Submit(func() {
    doWork(ctx, order)
})
```

**Event handlers and callbacks:**
```go
// BAD: callback signature does not include context
emitter.On("order.created", func(data interface{}) {
    processNewOrder(data.(Order))
})

// GOOD: pass context through the event system
emitter.On("order.created", func(ctx context.Context, data interface{}) {
    processNewOrder(ctx, data.(Order))
})
```

## Prevention Strategy

The best way to prevent orphaned spans is to make context the first parameter of every function, following the Go convention. Run `go vet` and consider using linters like `contextcheck` that can flag functions where context is not being propagated correctly.

If you spot orphaned spans in production, check your trace backend for single-span traces. In most applications, a legitimate trace has at least two spans (the root and at least one child). Single-span traces are a strong signal that context propagation is broken somewhere.
