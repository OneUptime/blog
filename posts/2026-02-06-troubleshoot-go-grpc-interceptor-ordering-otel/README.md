# How to Troubleshoot Go gRPC Interceptor Ordering Issues That Break OpenTelemetry Trace Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, gRPC, Interceptors

Description: Troubleshoot and fix gRPC interceptor ordering issues in Go that prevent OpenTelemetry trace propagation from working.

When you use OpenTelemetry with gRPC in Go, the order in which you register interceptors matters more than you might expect. If the OpenTelemetry interceptor is not in the right position, trace context will not propagate correctly, and you will end up with disconnected spans or missing traces entirely.

## The Symptom

You have a gRPC server instrumented with OpenTelemetry. You also have authentication and logging interceptors. Traces show up, but they are not connected to the upstream caller's trace. Every gRPC handler creates a new root span instead of continuing the trace from the client.

## Understanding Interceptor Execution Order

gRPC interceptors in Go execute in the order they are registered. For unary interceptors:

```go
grpc.ChainUnaryInterceptor(first, second, third)
```

The execution order is: `first` -> `second` -> `third` -> handler -> `third` return -> `second` return -> `first` return.

The OpenTelemetry interceptor needs to run early so that it can extract the trace context from incoming metadata before other interceptors try to use it.

## The Broken Configuration

```go
func newGRPCServer() *grpc.Server {
    return grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            authInterceptor,       // runs first
            loggingInterceptor,    // runs second
            otelgrpc.UnaryServerInterceptor(), // runs third - TOO LATE
        ),
    )
}
```

In this setup, `authInterceptor` and `loggingInterceptor` run before the OpenTelemetry interceptor. This means:

1. `authInterceptor` does not have access to the trace context
2. `loggingInterceptor` cannot attach trace IDs to log entries
3. If `authInterceptor` creates spans, they will be root spans

## The Fix

Move the OpenTelemetry interceptor to the first position:

```go
func newGRPCServer() *grpc.Server {
    return grpc.NewServer(
        grpc.ChainUnaryInterceptor(
            otelgrpc.UnaryServerInterceptor(), // runs first - extracts trace context
            authInterceptor,       // now has trace context available
            loggingInterceptor,    // can log trace IDs
        ),
        grpc.ChainStreamInterceptor(
            otelgrpc.StreamServerInterceptor(), // same for streaming RPCs
            authStreamInterceptor,
            loggingStreamInterceptor,
        ),
    )
}
```

Now the OpenTelemetry interceptor extracts the trace context from gRPC metadata first, puts it into `context.Context`, and all subsequent interceptors have access to the active span.

## Client-Side Ordering

The same principle applies to client interceptors. The OpenTelemetry interceptor should be first so that it injects trace context into outgoing metadata before other interceptors modify the call:

```go
func newGRPCClient(target string) (*grpc.ClientConn, error) {
    return grpc.NewClient(target,
        grpc.WithChainUnaryInterceptor(
            otelgrpc.UnaryClientInterceptor(), // injects trace context first
            retryInterceptor,
            rateLimitInterceptor,
        ),
        grpc.WithChainStreamInterceptor(
            otelgrpc.StreamClientInterceptor(),
            retryStreamInterceptor,
        ),
    )
}
```

## Using StatsHandler Instead of Interceptors

The newer recommended approach is to use `otelgrpc` as a stats handler instead of interceptors. Stats handlers avoid the ordering issue entirely because they operate at a different layer:

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

The stats handler runs at the transport level, so it processes trace context before any interceptor runs. This is the cleanest solution.

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

Insert this interceptor at different positions to see where the trace context becomes available:

```go
grpc.ChainUnaryInterceptor(
    debugInterceptor,              // check: is span context available here?
    otelgrpc.UnaryServerInterceptor(),
    debugInterceptor,              // check: is it available here?
    authInterceptor,
)
```

If the first `debugInterceptor` prints "NO VALID SPAN CONTEXT" and the second one prints a valid trace ID, you know the OpenTelemetry interceptor is doing its job. Move it before any interceptor that needs the trace context.

## Summary

For gRPC trace propagation to work correctly in Go, the OpenTelemetry interceptor must run before any other interceptor that depends on trace context. The safest approach is to use `otelgrpc.NewServerHandler()` as a stats handler, which avoids ordering issues entirely.
