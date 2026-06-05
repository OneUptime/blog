# How to Troubleshoot Go gRPC Interceptor Ordering Issues That Break

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, gRPC, Interceptors

Description: Troubleshoot and fix gRPC interceptor ordering issues in Go that prevent OpenTelemetry trace propagation from working.

When you use OpenTelemetry with gRPC in Go, the order in which you register interceptors matters more than you might expect in older interceptor-based setups. If the OpenTelemetry interceptor is not in the right position, trace context will not propagate correctly, and you will end up with disconnected spans or missing traces entirely. In current versions of `otelgrpc`, use the stats handler approach shown below instead of the deprecated interceptor APIs.

## The Symptom

You have a gRPC server instrumented with an older OpenTelemetry interceptor. You also have authentication and logging interceptors. Traces show up, but they are not connected to the upstream caller's trace. Every gRPC handler creates a new root span instead of continuing the trace from the client.

## Understanding Interceptor Execution Order

gRPC interceptors in Go execute in the order they are registered. For unary interceptors:

```go
grpc.ChainUnaryInterceptor(first, second, third)
```

The execution order is: `first` -> `second` -> `third` -> handler -> `third` return -> `second` return -> `first` return.

In older `otelgrpc` releases that still had interceptor APIs, the OpenTelemetry interceptor needed to run early so that it could extract the trace context from incoming metadata before other interceptors tried to use it.

## The Broken Configuration

```go
func newGRPCServer() *grpc.Server {
    return grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            authInterceptor,       // runs first
            loggingInterceptor,    // runs second
            otelgrpc.UnaryServerInterceptor(), // legacy API: runs third - TOO LATE
        ),
    )
}
```

In this setup, `authInterceptor` and `loggingInterceptor` run before the OpenTelemetry interceptor. This means:

1. `authInterceptor` does not have access to the trace context
2. `loggingInterceptor` cannot attach trace IDs to log entries
3. If `authInterceptor` creates spans, they will be root spans

## The Fix

For older `otelgrpc` versions that still expose interceptor APIs, move the OpenTelemetry interceptor to the first position:

```go
func newGRPCServer() *grpc.Server {
    return grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            otelgrpc.UnaryServerInterceptor(), // legacy API: runs first - extracts trace context
            authInterceptor,       // now has trace context available
            loggingInterceptor,    // can log trace IDs
        ),
        grpc.ChainStreamInterceptor(
            otelgrpc.StreamServerInterceptor(), // legacy API: same for streaming RPCs
            authStreamInterceptor,
            loggingStreamInterceptor,
        ),
    )
}
```

Now the OpenTelemetry interceptor extracts the trace context from gRPC metadata first, puts it into `context.Context`, and all subsequent interceptors have access to the active span.

## Client-Side Ordering

The same principle applies to client interceptors in older `otelgrpc` versions. The OpenTelemetry interceptor should be first so that it injects trace context into outgoing metadata before other interceptors modify the call:

```go
func newGRPCClient(target string) (*grpc.ClientConn, error) {
    return grpc.NewClient(target,
        grpc.WithChainUnaryInterceptor(
            otelgrpc.UnaryClientInterceptor(), // legacy API: injects trace context first
            retryInterceptor,
            rateLimitInterceptor,
        ),
        grpc.WithChainStreamInterceptor(
            otelgrpc.StreamClientInterceptor(), // legacy API
            retryStreamInterceptor,
        ),
    )
}
```

## Using StatsHandler Instead of Interceptors

The current recommended approach is to use `otelgrpc` as a stats handler instead of interceptors. Stats handlers avoid the ordering issue entirely because they operate at a different layer:

```go
func newGRPCServer() *grpc.Server {
    return grpc.NewServer(
        // Stats handler approach - no ordering issues with interceptors
        grpc.StatsHandler(otelgrpc.NewServerHandler()),
        grpc.ChainUnaryInterceptor(
            authInterceptor,
            loggingInterceptor,
        ),
    )
}

func newGRPCClient(target string) (*grpc.ClientConn, error) {
    return grpc.NewClient(target,
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
        grpc.WithChainUnaryInterceptor(
            retryInterceptor,
        ),
    )
}
```

The stats handler attaches information to the RPC context before application interceptors handle the call, so it avoids the OpenTelemetry-interceptor ordering problem. This is the cleanest solution for current `otelgrpc` releases.

## Debugging Interceptor Ordering

If you suspect ordering is wrong, add a debug interceptor that logs the context state:

```go
func debugInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    spanCtx := trace.SpanContextFromContext(ctx)
    if spanCtx.IsValid() {
        log.Printf("[debug] %s: trace_id=%s span_id=%s",
            info.FullMethod,
            spanCtx.TraceID(),
            spanCtx.SpanID())
    } else {
        log.Printf("[debug] %s: NO VALID SPAN CONTEXT", info.FullMethod)
    }
    return handler(ctx, req)
}
```

In a legacy interceptor setup, insert this interceptor at different positions to see where the trace context becomes available:

```go
grpc.ChainUnaryInterceptor(
    debugInterceptor,              // check: is span context available here?
    otelgrpc.UnaryServerInterceptor(),
    debugInterceptor,              // check: is it available here?
    authInterceptor,
)
```

If the first `debugInterceptor` prints "NO VALID SPAN CONTEXT" and the second one prints a valid trace ID, you know the legacy OpenTelemetry interceptor is doing its job. Move it before any interceptor that needs the trace context. In current `otelgrpc` releases, use `grpc.StatsHandler(otelgrpc.NewServerHandler())` and place this debug interceptor at the start of your application interceptor chain to verify that the stats handler has already made the span context available.

## Summary

For gRPC trace propagation to work correctly in older interceptor-based Go services, the OpenTelemetry interceptor must run before any other interceptor that depends on trace context. The safest approach in current `otelgrpc` releases is to use `otelgrpc.NewServerHandler()` as a stats handler, which avoids ordering issues entirely.
