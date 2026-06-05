# How to Fix 'Context Canceled' Errors in OpenTelemetry Go When Request Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Context, Tracing

Description: Learn how to fix context canceled errors in OpenTelemetry Go when request contexts are incorrectly used for background goroutines.

If you have been running OpenTelemetry in a Go service for any length of time, you have probably seen this error in your logs:

```text
error: context canceled
```

This happens when you pass an HTTP request's `context.Context` to a background goroutine. The request finishes, the context gets canceled, and context-aware work in the goroutine can fail immediately. That can leave you with incomplete background work and gaps or errors in your traces.

## Why This Happens

In Go, the `context.Context` tied to an HTTP request has a lifecycle bound to that request. When the response is written and the handler returns, the server cancels the context. If you spawned a goroutine that is still using that context for context-aware work, the cancellation propagates and can stop your in-flight operations.

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

The `sendConfirmationEmail` function receives `ctx`, which is the request context. Once `handleOrder` returns and the HTTP response is sent, the context is canceled. Any operation inside `sendConfirmationEmail` that checks that context, such as an HTTP call, database call, or explicit telemetry flush, can fail with "context canceled."

## The Fix: Detach the Context

The solution is to create a new context that carries the span information but is not tied to the request lifecycle. In Go 1.21 and later, `context.WithoutCancel` does exactly that: it keeps the context values, including the current OpenTelemetry span, but removes the parent context's cancellation and deadline.

```go
import "context"

// detachContext creates a new context that carries values such as
// the active span but is not canceled with the request context.
func detachContext(ctx context.Context) context.Context {
    return context.WithoutCancel(ctx)
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

The `bgCtx` will not be canceled when the request finishes. But it still carries the active span from the parent context, so the spans created in `sendConfirmationEmail` will be children in the same trace.

## Important Details

There is a subtle point here. `context.WithoutCancel` keeps the active span in the context, so new spans created in the background goroutine will still use the handler span as their parent. The parent is not marked as remote just because the context was detached.

If you are on an older Go version and manually rebuild the context, use `trace.ContextWithSpanContext` for a local parent. Use `trace.ContextWithRemoteSpanContext` only when you explicitly want the parent span context to be marked as remote. For long-running asynchronous work where a parent-child relationship is not the right model, you can link the spans instead:

```go
func sendConfirmationEmail(ctx context.Context, order Order) {
    link := trace.LinkFromContext(ctx)

    // Start a new span that links back to the original span
    _, span := tracer.Start(context.Background(), "sendConfirmationEmail", trace.WithLinks(link))
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

The key takeaway is simple: never pass a request-scoped context to background work that can outlive the request. Detach the context first. This pattern is not specific to OpenTelemetry, but it becomes especially visible when you are tracing because canceled contexts can produce incomplete spans and noisy errors.
