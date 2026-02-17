# How to Fix 'Context Canceled' Errors in OpenTelemetry Go When Request Context Is Used for Background Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Context, Tracing

Description: Learn how to fix context canceled errors in OpenTelemetry Go when request contexts are incorrectly used for background goroutines.

If you have been running OpenTelemetry in a Go service for any length of time, you have probably seen this error in your logs:

```
error: context canceled
```

This happens when you pass an HTTP request's `context.Context` to a background goroutine. The request finishes, the context gets canceled, and your OpenTelemetry spans fail to export. The span data is lost, and you end up with gaps in your traces.

## Why This Happens

In Go, the `context.Context` tied to an HTTP request has a lifecycle bound to that request. When the response is written and the handler returns, the server cancels the context. If you spawned a goroutine that is still using that context to create spans or export telemetry, the cancellation propagates and kills your in-flight operations.

Here is a typical example that causes the problem:

```go
func handleOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Start a span for the handler
    ctx, span := tracer.Start(ctx, "handleOrder")
    defer span.End()

    // Process the order synchronously
    order, err := processOrder(ctx)
    if err != nil {
        http.Error(w, "failed", 500)
        return
    }

    // BAD: passing request context to background work
    go sendConfirmationEmail(ctx, order)

    w.WriteHeader(http.StatusOK)
}
```

The `sendConfirmationEmail` function receives `ctx`, which is the request context. Once `handleOrder` returns and the HTTP response is sent, the context is canceled. Any span started inside `sendConfirmationEmail` will fail with "context canceled."

## The Fix: Detach the Context

The solution is to create a new context that carries the span information but is not tied to the request lifecycle. You need to extract the span context and attach it to a fresh `context.Background()`.

```go
import (
    "context"
    "go.opentelemetry.io/otel/trace"
)

// detachContext creates a new context that carries the span context
// but is not subject to the parent context's cancellation.
func detachContext(ctx context.Context) context.Context {
    // Extract the span context from the original context
    spanCtx := trace.SpanContextFromContext(ctx)
    // Create a fresh context with the span context attached
    return trace.ContextWithSpanContext(context.Background(), spanCtx)
}
```

Now update your handler:

```go
func handleOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    ctx, span := tracer.Start(ctx, "handleOrder")
    defer span.End()

    order, err := processOrder(ctx)
    if err != nil {
        http.Error(w, "failed", 500)
        return
    }

    // GOOD: detach the context before passing to background work
    bgCtx := detachContext(ctx)
    go sendConfirmationEmail(bgCtx, order)

    w.WriteHeader(http.StatusOK)
}
```

The `bgCtx` is a brand new context rooted in `context.Background()`. It will not be canceled when the request finishes. But it still carries the trace ID and span ID from the parent, so the spans created in `sendConfirmationEmail` will be linked to the same trace.

## Important Details

There is a subtle point here. When you use `trace.ContextWithSpanContext`, you are attaching a remote span context. This means new spans created in the background goroutine will treat the parent as a remote parent. This is actually fine for most use cases because the trace continuity is preserved.

If you want the background span to appear as a direct child of the handler span (not a remote child), you can use `trace.ContextWithRemoteSpanContext` explicitly, or you can link the spans:

```go
func sendConfirmationEmail(ctx context.Context, order Order) {
    // Start a new span that links back to the original trace
    ctx, span := tracer.Start(ctx, "sendConfirmationEmail",
        trace.WithLinks(trace.LinkFromContext(ctx)),
    )
    defer span.End()

    // Do the actual work
    err := emailService.Send(order.Email, order.Confirmation)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to send email")
    }
}
```

## Adding Timeouts to Background Work

Since the background context is no longer tied to the request, you should add your own timeout to prevent goroutines from running forever:

```go
func handleOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    ctx, span := tracer.Start(ctx, "handleOrder")
    defer span.End()

    order, err := processOrder(ctx)
    if err != nil {
        http.Error(w, "failed", 500)
        return
    }

    // Create a detached context with a 30-second timeout
    bgCtx := detachContext(ctx)
    bgCtx, cancel := context.WithTimeout(bgCtx, 30*time.Second)

    go func() {
        defer cancel()
        sendConfirmationEmail(bgCtx, order)
    }()

    w.WriteHeader(http.StatusOK)
}
```

## Verifying the Fix

After deploying this change, check your traces in your backend (Jaeger, Tempo, or OneUptime). You should see:

1. The `handleOrder` span completes normally
2. The `sendConfirmationEmail` span appears as part of the same trace
3. No more "context canceled" errors in your application logs

The key takeaway is simple: never pass a request-scoped context to background work. Always detach the span context into a fresh context first. This pattern is not specific to OpenTelemetry, but it becomes especially visible when you are tracing because lost contexts mean lost spans.
