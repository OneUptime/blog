# How to Implement Request Context Propagation in Go Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Microservices, Context, Distributed Tracing, HTTP, gRPC

Description: A practical guide to propagating request context across Go microservices for tracing, cancellation, and request-scoped values.

---

When a single user request touches five different services, you need a way to tie all those operations together. Go's `context.Context` is the standard mechanism for passing request-scoped data, deadlines, and cancellation signals across API boundaries. But propagating context between microservices requires deliberate implementation - the context doesn't magically jump from one service to another over HTTP or gRPC.

This post covers how to properly propagate request context in Go microservices, including trace IDs, cancellation signals, and request metadata.

## Understanding context.Context

The `context` package was added to Go's standard library in version 1.7. Every `context.Context` carries:

- **Deadline**: When this context should be cancelled
- **Cancellation signal**: A channel that closes when the context is cancelled
- **Values**: Request-scoped key-value pairs

Here's the basic interface:

```go
// The Context interface from the standard library
// Context carries deadlines, cancellation signals, and request-scoped values
type Context interface {
    Deadline() (deadline time.Time, ok bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

You create contexts using these functions:

```go
// context.Background() returns an empty context - use this as the root
// context.TODO() is a placeholder when you're unsure which context to use
// context.WithCancel() derives a cancellable context from a parent
// context.WithTimeout() derives a context that cancels after a duration
// context.WithValue() derives a context with an attached key-value pair

ctx := context.Background()
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```

## The Problem: Context Doesn't Cross Network Boundaries

When Service A calls Service B over HTTP, the context from Service A doesn't automatically appear in Service B. You need to:

1. Extract relevant data from the context in Service A
2. Serialize that data into the request (headers, metadata)
3. Deserialize that data in Service B
4. Create a new context with that data in Service B

This is true for trace IDs, request IDs, user information, deadlines, and any other request-scoped values.

## Propagating Trace IDs via HTTP

The most common use case is propagating trace and span IDs for distributed tracing. The W3C Trace Context specification defines standard headers: `traceparent` and `tracestate`.

First, define a type for your trace context:

```go
package tracing

// TraceContext holds the trace and span IDs for distributed tracing
// TraceID identifies the entire request chain across services
// SpanID identifies a single operation within the trace
type TraceContext struct {
    TraceID string
    SpanID  string
    Sampled bool
}

// contextKey is an unexported type to prevent collisions with other packages
type contextKey string

const traceContextKey contextKey = "trace-context"

// WithTraceContext adds a TraceContext to the given context
func WithTraceContext(ctx context.Context, tc TraceContext) context.Context {
    return context.WithValue(ctx, traceContextKey, tc)
}

// GetTraceContext retrieves the TraceContext from a context
// Returns an empty TraceContext if none exists
func GetTraceContext(ctx context.Context) (TraceContext, bool) {
    tc, ok := ctx.Value(traceContextKey).(TraceContext)
    return tc, ok
}
```

Now create HTTP middleware to extract trace context from incoming requests:

```go
package middleware

import (
    "context"
    "net/http"
    "strings"
    
    "yourapp/tracing"
)

// TracingMiddleware extracts trace context from incoming HTTP requests
// and injects it into the request context for downstream handlers
func TracingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Parse the W3C traceparent header
        // Format: version-traceid-spanid-flags (e.g., 00-abc123-def456-01)
        traceparent := r.Header.Get("traceparent")
        tc := parseTraceparent(traceparent)
        
        // If no trace context exists, generate a new one
        // This happens when this service is the entry point
        if tc.TraceID == "" {
            tc = tracing.TraceContext{
                TraceID: generateTraceID(),
                SpanID:  generateSpanID(),
                Sampled: true,
            }
        } else {
            // Generate a new span ID for this service's operation
            // Keep the same trace ID to link all operations together
            tc.SpanID = generateSpanID()
        }
        
        // Add trace context to the request context
        ctx := tracing.WithTraceContext(r.Context(), tc)
        
        // Call the next handler with the enriched context
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// parseTraceparent extracts trace context from the W3C traceparent header
func parseTraceparent(header string) tracing.TraceContext {
    if header == "" {
        return tracing.TraceContext{}
    }
    
    // Split the header: version-traceid-spanid-flags
    parts := strings.Split(header, "-")
    if len(parts) != 4 {
        return tracing.TraceContext{}
    }
    
    return tracing.TraceContext{
        TraceID: parts[1],
        SpanID:  parts[2],
        Sampled: parts[3] == "01",
    }
}
```

When making outbound HTTP requests, inject the trace context into headers:

```go
package httpclient

import (
    "context"
    "fmt"
    "net/http"
    
    "yourapp/tracing"
)

// Client wraps http.Client with automatic trace context propagation
type Client struct {
    httpClient *http.Client
}

// Do executes an HTTP request and propagates trace context via headers
func (c *Client) Do(ctx context.Context, req *http.Request) (*http.Response, error) {
    // Extract trace context from the current context
    tc, ok := tracing.GetTraceContext(ctx)
    if ok {
        // Format as W3C traceparent header
        // Version 00 is the current version of the spec
        flags := "00"
        if tc.Sampled {
            flags = "01"
        }
        traceparent := fmt.Sprintf("00-%s-%s-%s", tc.TraceID, tc.SpanID, flags)
        req.Header.Set("traceparent", traceparent)
    }
    
    // Use the context for cancellation and timeouts
    req = req.WithContext(ctx)
    
    return c.httpClient.Do(req)
}
```

## Propagating Context in gRPC

gRPC uses metadata instead of HTTP headers. The pattern is similar but uses gRPC interceptors.

Server-side interceptor to extract trace context:

```go
package grpcserver

import (
    "context"
    
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
    
    "yourapp/tracing"
)

// UnaryServerInterceptor extracts trace context from gRPC metadata
// and adds it to the context for the handler
func UnaryServerInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Extract metadata from the incoming context
        md, ok := metadata.FromIncomingContext(ctx)
        if ok {
            // Look for trace context in metadata
            // gRPC metadata keys are lowercase
            if values := md.Get("traceparent"); len(values) > 0 {
                tc := parseTraceparent(values[0])
                tc.SpanID = generateSpanID() // New span for this service
                ctx = tracing.WithTraceContext(ctx, tc)
            }
        }
        
        return handler(ctx, req)
    }
}
```

Client-side interceptor to inject trace context:

```go
package grpcclient

import (
    "context"
    "fmt"
    
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
    
    "yourapp/tracing"
)

// UnaryClientInterceptor injects trace context into outgoing gRPC calls
func UnaryClientInterceptor() grpc.UnaryClientInterceptor {
    return func(
        ctx context.Context,
        method string,
        req, reply interface{},
        cc *grpc.ClientConn,
        invoker grpc.UnaryInvoker,
        opts ...grpc.CallOption,
    ) error {
        // Extract trace context from the current context
        tc, ok := tracing.GetTraceContext(ctx)
        if ok {
            // Create the traceparent value
            flags := "00"
            if tc.Sampled {
                flags = "01"
            }
            traceparent := fmt.Sprintf("00-%s-%s-%s", tc.TraceID, tc.SpanID, flags)
            
            // Append to outgoing metadata
            ctx = metadata.AppendToOutgoingContext(ctx, "traceparent", traceparent)
        }
        
        return invoker(ctx, method, req, reply, cc, opts...)
    }
}
```

## Handling Timeouts and Cancellation

Context cancellation should propagate across service boundaries. When a client cancels a request, downstream services should stop working on it.

For HTTP, use the request context with your HTTP client:

```go
// MakeRequest demonstrates timeout propagation across services
func MakeRequest(ctx context.Context, url string) (*Response, error) {
    // Create a request with the parent context
    // If the parent context is cancelled, this request will be cancelled too
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }
    
    // The HTTP client will respect the context's deadline
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        // Check if the error is due to context cancellation
        if ctx.Err() == context.Canceled {
            return nil, fmt.Errorf("request cancelled: %w", err)
        }
        if ctx.Err() == context.DeadlineExceeded {
            return nil, fmt.Errorf("request timed out: %w", err)
        }
        return nil, err
    }
    
    return parseResponse(resp)
}
```

You can also propagate deadline information explicitly:

```go
// PropagateDeadline adds the context deadline as a header
// This lets the downstream service know how much time it has
func PropagateDeadline(ctx context.Context, req *http.Request) {
    deadline, ok := ctx.Deadline()
    if ok {
        // Send the deadline as a Unix timestamp in milliseconds
        // The downstream service can use this to set its own timeout
        req.Header.Set("X-Request-Deadline", fmt.Sprintf("%d", deadline.UnixMilli()))
    }
}

// ExtractDeadline reads the deadline header and creates a context with that deadline
func ExtractDeadline(ctx context.Context, r *http.Request) (context.Context, context.CancelFunc) {
    deadlineStr := r.Header.Get("X-Request-Deadline")
    if deadlineStr == "" {
        // No deadline specified, return context as-is with a no-op cancel
        return ctx, func() {}
    }
    
    deadlineMs, err := strconv.ParseInt(deadlineStr, 10, 64)
    if err != nil {
        return ctx, func() {}
    }
    
    deadline := time.UnixMilli(deadlineMs)
    return context.WithDeadline(ctx, deadline)
}
```

## Middleware Pattern for Request-Scoped Values

Beyond tracing, you often need to propagate user IDs, tenant IDs, or feature flags. Here's a reusable pattern:

```go
package requestcontext

import (
    "context"
    "net/http"
)

// RequestInfo holds all request-scoped values that should propagate
type RequestInfo struct {
    TraceID   string
    RequestID string
    UserID    string
    TenantID  string
}

type requestInfoKey struct{}

// FromContext extracts RequestInfo from a context
func FromContext(ctx context.Context) *RequestInfo {
    info, ok := ctx.Value(requestInfoKey{}).(*RequestInfo)
    if !ok {
        return &RequestInfo{}
    }
    return info
}

// WithRequestInfo adds RequestInfo to a context
func WithRequestInfo(ctx context.Context, info *RequestInfo) context.Context {
    return context.WithValue(ctx, requestInfoKey{}, info)
}

// Middleware extracts request info from headers and adds to context
func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        info := &RequestInfo{
            TraceID:   r.Header.Get("X-Trace-ID"),
            RequestID: r.Header.Get("X-Request-ID"),
            UserID:    r.Header.Get("X-User-ID"),
            TenantID:  r.Header.Get("X-Tenant-ID"),
        }
        
        // Generate request ID if not provided
        if info.RequestID == "" {
            info.RequestID = generateID()
        }
        
        ctx := WithRequestInfo(r.Context(), info)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// InjectHeaders adds request info to outgoing HTTP request headers
func InjectHeaders(ctx context.Context, req *http.Request) {
    info := FromContext(ctx)
    
    if info.TraceID != "" {
        req.Header.Set("X-Trace-ID", info.TraceID)
    }
    if info.RequestID != "" {
        req.Header.Set("X-Request-ID", info.RequestID)
    }
    if info.UserID != "" {
        req.Header.Set("X-User-ID", info.UserID)
    }
    if info.TenantID != "" {
        req.Header.Set("X-Tenant-ID", info.TenantID)
    }
}
```

## Using OpenTelemetry for Automatic Propagation

Instead of building this from scratch, you can use OpenTelemetry which handles propagation automatically:

```go
package main

import (
    "context"
    "net/http"
    
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

func main() {
    // Set up the global propagator
    // TextMapPropagator handles trace context injection and extraction
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{}, // W3C Trace Context
        propagation.Baggage{},      // W3C Baggage for custom key-values
    ))
    
    // Wrap your HTTP handler - this extracts trace context automatically
    handler := otelhttp.NewHandler(yourHandler, "my-service")
    
    // Wrap your HTTP client - this injects trace context automatically
    client := &http.Client{
        Transport: otelhttp.NewTransport(http.DefaultTransport),
    }
    
    // Use the client as normal - context propagation happens automatically
    req, _ := http.NewRequestWithContext(ctx, "GET", "http://other-service/api", nil)
    resp, _ := client.Do(req)
}
```

## Common Mistakes to Avoid

**1. Using context.Background() in handlers**

Always use the request's context, not a fresh background context:

```go
// Wrong - loses all context information
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := context.Background()
    result, err := someService.DoWork(ctx)
}

// Correct - preserves tracing, cancellation, and values
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    result, err := someService.DoWork(ctx)
}
```

**2. Storing contexts in structs**

Context should be passed as the first parameter to functions, not stored:

```go
// Wrong - context stored in struct
type Service struct {
    ctx context.Context
}

// Correct - context passed per-operation
func (s *Service) DoWork(ctx context.Context) error {
    // Use ctx for this specific operation
}
```

**3. Not cancelling derived contexts**

Always call the cancel function for contexts you create:

```go
// Wrong - context leak
func DoWork(ctx context.Context) error {
    ctx, _ = context.WithTimeout(ctx, 5*time.Second)
    // Cancel is never called, resources leak
}

// Correct - cancel called via defer
func DoWork(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    // Resources properly cleaned up
}
```

## Putting It All Together

Here's a complete example showing context propagation between two services:

```go
// Service A - the entry point
func main() {
    mux := http.NewServeMux()
    
    // Apply tracing middleware
    handler := middleware.TracingMiddleware(mux)
    
    mux.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Create HTTP client that propagates context
        client := &httpclient.Client{}
        
        // Call Service B - trace context is automatically propagated
        req, _ := http.NewRequest("GET", "http://service-b/inventory", nil)
        resp, err := client.Do(ctx, req)
        if err != nil {
            http.Error(w, err.Error(), 500)
            return
        }
        
        // Process response...
    })
    
    http.ListenAndServe(":8080", handler)
}

// Service B - receives propagated context
func main() {
    mux := http.NewServeMux()
    
    // Apply same tracing middleware
    handler := middleware.TracingMiddleware(mux)
    
    mux.HandleFunc("/inventory", func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Trace context is available here
        tc, _ := tracing.GetTraceContext(ctx)
        log.Printf("Handling request with trace ID: %s", tc.TraceID)
        
        // Continue processing...
    })
    
    http.ListenAndServe(":8081", handler)
}
```

## Summary

Context propagation in Go microservices requires explicit handling at service boundaries:

- Extract context data from incoming requests (headers or gRPC metadata)
- Store relevant values in the request context using `context.WithValue`
- Inject context data into outgoing requests
- Use middleware and interceptors to avoid repetitive code
- Consider OpenTelemetry for production systems - it handles propagation automatically

The key is consistency. Every service in your system needs to follow the same propagation patterns for the context chain to remain unbroken.

---

*Need distributed tracing for your Go microservices? [OneUptime](https://oneuptime.com) provides end-to-end observability with OpenTelemetry integration.*
