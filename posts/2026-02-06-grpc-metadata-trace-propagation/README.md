# How to Propagate OpenTelemetry Trace Context Through gRPC Metadata for Distributed Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Trace Propagation, Metadata

Description: Propagate OpenTelemetry trace context through gRPC metadata headers to enable distributed tracing across gRPC service boundaries.

gRPC uses metadata (similar to HTTP headers) to carry additional information alongside RPC calls. This is the natural place to propagate OpenTelemetry trace context between services. When done correctly, a trace that starts in one service continues seamlessly through every gRPC call in the chain.

## How gRPC Metadata Works

gRPC metadata is a set of key-value pairs sent with each RPC. On the wire, they become HTTP/2 headers. The OpenTelemetry propagator injects `traceparent` and `tracestate` into these metadata entries on the client side and extracts them on the server side.

## Manual Propagation in Go

While the `otelgrpc` StatsHandler does this automatically, understanding the manual approach helps when you need custom behavior:

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

var tracer = otel.Tracer("grpc-propagation")
var prop = otel.GetTextMapPropagator()

// MetadataCarrier adapts gRPC metadata to the TextMapCarrier interface
type MetadataCarrier struct {
    MD *metadata.MD
}

func (mc MetadataCarrier) Get(key string) string {
    vals := mc.MD.Get(key)
    if len(vals) > 0 {
        return vals[0]
    }
    return ""
}

func (mc MetadataCarrier) Set(key, value string) {
    mc.MD.Set(key, value)
}

func (mc MetadataCarrier) Keys() []string {
    keys := make([]string, 0, mc.MD.Len())
    for k := range *mc.MD {
        keys = append(keys, k)
    }
    return keys
}
```

## Client-Side: Injecting Context into Metadata

```go
func clientInterceptor(
    ctx context.Context,
    method string,
    req, reply interface{},
    cc *grpc.ClientConn,
    invoker grpc.UnaryInvoker,
    opts ...grpc.CallOption,
) error {
    // Start a client span
    ctx, span := tracer.Start(ctx, method,
        trace.WithSpanKind(trace.SpanKindClient),
    )
    defer span.End()

    // Get existing metadata or create new
    md, ok := metadata.FromOutgoingContext(ctx)
    if !ok {
        md = metadata.New(nil)
    } else {
        md = md.Copy()
    }

    // Inject the trace context into the metadata
    carrier := MetadataCarrier{MD: &md}
    prop.Inject(ctx, carrier)

    // Attach the modified metadata to the outgoing context
    ctx = metadata.NewOutgoingContext(ctx, md)

    // Make the RPC call
    return invoker(ctx, method, req, reply, cc, opts...)
}
```

## Server-Side: Extracting Context from Metadata

```go
func serverInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    // Extract incoming metadata
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        md = metadata.New(nil)
    }

    // Extract the trace context from the metadata
    carrier := MetadataCarrier{MD: &md}
    ctx = prop.Extract(ctx, carrier)

    // Start a server span as a child of the extracted context
    ctx, span := tracer.Start(ctx, info.FullMethod,
        trace.WithSpanKind(trace.SpanKindServer),
    )
    defer span.End()

    // Call the actual handler
    resp, err := handler(ctx, req)
    if err != nil {
        span.RecordError(err)
    }
    return resp, err
}
```

## Python Implementation

```python
import grpc
from opentelemetry import trace, context
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer("grpc-propagation")

class GrpcMetadataCarrier:
    """Adapts gRPC metadata to work with OpenTelemetry propagators."""

    def __init__(self, metadata=None):
        self._metadata = dict(metadata) if metadata else {}

    def get(self, key):
        return self._metadata.get(key, None)

    def set(self, key, value):
        self._metadata[key] = value

    def keys(self):
        return list(self._metadata.keys())

    def to_grpc_metadata(self):
        """Convert to the tuple format gRPC expects."""
        return [(k, v) for k, v in self._metadata.items()]


class TracePropagationClientInterceptor(grpc.UnaryUnaryClientInterceptor):
    """Client interceptor that injects trace context into gRPC metadata."""

    def intercept_unary_unary(self, continuation, client_call_details, request):
        with tracer.start_as_current_span(
            client_call_details.method,
            kind=trace.SpanKind.CLIENT,
        ) as span:
            # Create a carrier and inject the current context
            carrier = GrpcMetadataCarrier()
            inject(carrier)

            # Merge with existing metadata
            existing_metadata = list(client_call_details.metadata or [])
            existing_metadata.extend(carrier.to_grpc_metadata())

            # Create new call details with updated metadata
            new_details = grpc.ClientCallDetails(
                method=client_call_details.method,
                timeout=client_call_details.timeout,
                metadata=existing_metadata,
                credentials=client_call_details.credentials,
            )

            response = continuation(new_details, request)
            return response


class TracePropagationServerInterceptor(grpc.ServerInterceptor):
    """Server interceptor that extracts trace context from gRPC metadata."""

    def intercept_service(self, continuation, handler_call_details):
        # Extract metadata from the incoming call
        metadata = dict(handler_call_details.invocation_metadata or [])
        carrier = GrpcMetadataCarrier(metadata)

        # Extract trace context
        ctx = extract(carrier)

        # The span will be created within the restored context
        # This ensures the server span is a child of the client span
        def traced_handler(request, servicer_context):
            with tracer.start_as_current_span(
                handler_call_details.method,
                context=ctx,
                kind=trace.SpanKind.SERVER,
            ) as span:
                handler = continuation(handler_call_details)
                return handler.unary_unary(request, servicer_context)

        return grpc.unary_unary_rpc_method_handler(traced_handler)
```

## Verifying Propagation

To verify that context propagation is working, you can log the metadata on both sides:

```go
// On the client side, after injection
func debugPropagation(md metadata.MD) {
    traceparent := md.Get("traceparent")
    if len(traceparent) > 0 {
        log.Printf("Injected traceparent: %s", traceparent[0])
    }
}

// On the server side, after extraction
func debugExtraction(ctx context.Context) {
    span := trace.SpanFromContext(ctx)
    sc := span.SpanContext()
    log.Printf("Extracted trace_id: %s, span_id: %s",
        sc.TraceID().String(), sc.SpanID().String())
}
```

## Streaming RPC Propagation

For streaming RPCs, the metadata is sent once at the start of the stream. The trace context from that initial metadata becomes the parent for all spans created during the stream:

```go
func streamServerInterceptor(
    srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler,
) error {
    ctx := ss.Context()

    // Extract metadata from the stream context
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        md = metadata.New(nil)
    }

    carrier := MetadataCarrier{MD: &md}
    ctx = prop.Extract(ctx, carrier)

    ctx, span := tracer.Start(ctx, info.FullMethod,
        trace.WithSpanKind(trace.SpanKindServer),
    )
    defer span.End()

    // Wrap the stream with the new context
    wrappedStream := &wrappedServerStream{
        ServerStream: ss,
        ctx:          ctx,
    }

    return handler(srv, wrappedStream)
}

type wrappedServerStream struct {
    grpc.ServerStream
    ctx context.Context
}

func (w *wrappedServerStream) Context() context.Context {
    return w.ctx
}
```

The key thing to remember is that gRPC metadata is just HTTP/2 headers under the hood. The W3C Trace Context propagator writes `traceparent` and `tracestate` into those headers, and as long as both sides use the same propagator, the trace context flows seamlessly across service boundaries.
