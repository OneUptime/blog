# How to Propagate Trace Headers in Go Applications with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Go, Distributed Tracing, Golang, Observability

Description: How to propagate Istio distributed trace headers in Go applications using context.Context, middleware patterns, and HTTP client wrappers.

---

Go's context.Context is perfectly suited for propagating trace headers through your application. When running in an Istio mesh, your Go services need to extract trace headers from incoming requests and include them in all outgoing HTTP and gRPC calls. Go's standard library makes this clean and straightforward.

## Headers to Propagate

```go
var traceHeaders = []string{
    "x-request-id",
    "x-b3-traceid",
    "x-b3-spanid",
    "x-b3-parentspanid",
    "x-b3-sampled",
    "x-b3-flags",
    "b3",
    "traceparent",
    "tracestate",
}
```

## Method 1: HTTP Middleware with context.Context

The idiomatic Go approach uses middleware to extract headers and store them in the request context:

```go
package tracing

import (
    "context"
    "net/http"
)

type contextKey string

const headersKey contextKey = "trace-headers"

var traceHeaderNames = []string{
    "x-request-id",
    "x-b3-traceid",
    "x-b3-spanid",
    "x-b3-parentspanid",
    "x-b3-sampled",
    "x-b3-flags",
    "b3",
    "traceparent",
    "tracestate",
}

// Middleware extracts trace headers and stores them in context
func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        headers := make(http.Header)
        for _, name := range traceHeaderNames {
            if value := r.Header.Get(name); value != "" {
                headers.Set(name, value)
            }
        }
        ctx := context.WithValue(r.Context(), headersKey, headers)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// FromContext retrieves trace headers from context
func FromContext(ctx context.Context) http.Header {
    headers, ok := ctx.Value(headersKey).(http.Header)
    if !ok {
        return http.Header{}
    }
    return headers
}

// InjectHeaders adds trace headers to an outgoing request
func InjectHeaders(ctx context.Context, req *http.Request) {
    headers := FromContext(ctx)
    for _, name := range traceHeaderNames {
        if value := headers.Get(name); value != "" {
            req.Header.Set(name, value)
        }
    }
}
```

## Using the Middleware

Register it with your HTTP server:

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"

    "myapp/tracing"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/orders", ordersHandler)

    // Wrap with tracing middleware
    handler := tracing.Middleware(mux)

    server := &http.Server{
        Addr:    ":8080",
        Handler: handler,
    }

    log.Println("Starting server on :8080")
    log.Fatal(server.ListenAndServe())
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Make a downstream call with trace headers
    products, err := fetchProducts(ctx)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(map[string]interface{}{
        "orders":   []string{},
        "products": products,
    })
}
```

## Making Downstream Calls

### Using net/http

```go
package client

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    "myapp/tracing"
)

var httpClient = &http.Client{}

func fetchProducts(ctx context.Context) (interface{}, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet,
        "http://product-service:8080/api/products", nil)
    if err != nil {
        return nil, fmt.Errorf("creating request: %w", err)
    }

    // Inject trace headers
    tracing.InjectHeaders(ctx, req)

    resp, err := httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("making request: %w", err)
    }
    defer resp.Body.Close()

    var result interface{}
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("decoding response: %w", err)
    }

    return result, nil
}
```

### Using a Custom RoundTripper

For automatic header injection on every request, wrap the HTTP transport:

```go
package tracing

import "net/http"

// TracedTransport wraps an http.RoundTripper to inject trace headers
type TracedTransport struct {
    Base http.RoundTripper
}

func (t *TracedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    // Clone the request to avoid mutating the original
    clone := req.Clone(req.Context())
    InjectHeaders(req.Context(), clone)

    base := t.Base
    if base == nil {
        base = http.DefaultTransport
    }
    return base.RoundTrip(clone)
}

// NewTracedClient creates an HTTP client that auto-injects trace headers
func NewTracedClient() *http.Client {
    return &http.Client{
        Transport: &TracedTransport{
            Base: http.DefaultTransport,
        },
    }
}
```

Usage:

```go
// Create traced client once
var tracedClient = tracing.NewTracedClient()

func fetchProducts(ctx context.Context) (interface{}, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet,
        "http://product-service:8080/api/products", nil)
    if err != nil {
        return nil, err
    }

    // Headers are automatically injected by the transport
    resp, err := tracedClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}
```

## Method 2: gRPC Interceptors

For gRPC services, use unary and streaming interceptors:

### Server-Side Interceptor (Extract Headers)

```go
package tracing

import (
    "context"

    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

// UnaryServerInterceptor extracts trace headers from gRPC metadata
func UnaryServerInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        md, ok := metadata.FromIncomingContext(ctx)
        if ok {
            headers := make(http.Header)
            for _, name := range traceHeaderNames {
                if values := md.Get(name); len(values) > 0 {
                    headers.Set(name, values[0])
                }
            }
            ctx = context.WithValue(ctx, headersKey, headers)
        }
        return handler(ctx, req)
    }
}
```

### Client-Side Interceptor (Inject Headers)

```go
// UnaryClientInterceptor injects trace headers into outgoing gRPC calls
func UnaryClientInterceptor() grpc.UnaryClientInterceptor {
    return func(
        ctx context.Context,
        method string,
        req, reply interface{},
        cc *grpc.ClientConn,
        invoker grpc.UnaryInvoker,
        opts ...grpc.CallOption,
    ) error {
        headers := FromContext(ctx)
        pairs := make([]string, 0)
        for _, name := range traceHeaderNames {
            if value := headers.Get(name); value != "" {
                pairs = append(pairs, name, value)
            }
        }

        if len(pairs) > 0 {
            md := metadata.Pairs(pairs...)
            ctx = metadata.NewOutgoingContext(ctx, md)
        }

        return invoker(ctx, method, req, reply, cc, opts...)
    }
}
```

### Using the Interceptors

```go
// Server
server := grpc.NewServer(
    grpc.UnaryInterceptor(tracing.UnaryServerInterceptor()),
)

// Client
conn, err := grpc.Dial(
    "payment-service:9090",
    grpc.WithInsecure(),
    grpc.WithUnaryInterceptor(tracing.UnaryClientInterceptor()),
)
```

## Method 3: Using Chi Router

If you use the chi router:

```go
package main

import (
    "net/http"
    "github.com/go-chi/chi/v5"
    "myapp/tracing"
)

func main() {
    r := chi.NewRouter()
    r.Use(tracing.Middleware)

    r.Get("/api/orders", ordersHandler)

    http.ListenAndServe(":8080", r)
}
```

## Method 4: Using Gin Framework

```go
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "myapp/tracing"
)

func ginTraceMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        headers := make(http.Header)
        for _, name := range tracing.TraceHeaderNames() {
            if value := c.GetHeader(name); value != "" {
                headers.Set(name, value)
            }
        }
        ctx := context.WithValue(c.Request.Context(), tracing.HeadersKey, headers)
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}

func main() {
    r := gin.Default()
    r.Use(ginTraceMiddleware())

    r.GET("/api/orders", func(c *gin.Context) {
        products, _ := fetchProducts(c.Request.Context())
        c.JSON(200, gin.H{"products": products})
    })

    r.Run(":8080")
}
```

## Method 5: OpenTelemetry Auto-Instrumentation

Use the OpenTelemetry Go SDK for automatic propagation:

```go
package main

import (
    "context"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

func init() {
    // Set up propagators for both B3 and W3C formats
    otel.SetTextMapPropagator(
        propagation.NewCompositeTextMapPropagator(
            propagation.TraceContext{},
            propagation.Baggage{},
        ),
    )
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/orders", ordersHandler)

    // Wrap server with OTel instrumentation
    handler := otelhttp.NewHandler(mux, "order-service")

    // Create a traced HTTP client
    client := &http.Client{
        Transport: otelhttp.NewTransport(http.DefaultTransport),
    }

    http.ListenAndServe(":8080", handler)
}
```

The OTel handler automatically extracts incoming trace context, and the OTel transport automatically injects it into outgoing requests.

## Testing Trace Propagation

```go
package tracing_test

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "myapp/tracing"
)

func TestTraceHeaderPropagation(t *testing.T) {
    // Create a downstream server that captures headers
    var capturedHeaders http.Header
    downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        capturedHeaders = r.Header
        w.WriteHeader(200)
        w.Write([]byte(`{"ok": true}`))
    }))
    defer downstream.Close()

    // Create the main handler
    handler := tracing.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        req, _ := http.NewRequestWithContext(r.Context(), "GET", downstream.URL, nil)
        tracing.InjectHeaders(r.Context(), req)
        http.DefaultClient.Do(req)
        w.WriteHeader(200)
    }))

    // Make request with trace headers
    req := httptest.NewRequest("GET", "/api/test", nil)
    req.Header.Set("x-b3-traceid", "abc123")
    req.Header.Set("x-b3-spanid", "def456")
    req.Header.Set("x-b3-sampled", "1")

    rr := httptest.NewRecorder()
    handler.ServeHTTP(rr, req)

    // Verify propagation
    if capturedHeaders.Get("x-b3-traceid") != "abc123" {
        t.Errorf("Expected traceid abc123, got %s", capturedHeaders.Get("x-b3-traceid"))
    }
    if capturedHeaders.Get("x-b3-spanid") != "def456" {
        t.Errorf("Expected spanid def456, got %s", capturedHeaders.Get("x-b3-spanid"))
    }
}
```

## Common Go Pitfalls

**Forgetting to pass context**: Go makes it easy to accidentally drop the context. Always use `http.NewRequestWithContext` instead of `http.NewRequest`, and always pass `ctx` through your function chains.

**Goroutines and context**: When you spawn a goroutine, pass the context explicitly. Goroutines do not inherit context automatically:

```go
// Good
go func(ctx context.Context) {
    // ctx has trace headers
    req, _ := http.NewRequestWithContext(ctx, "POST", url, body)
    tracing.InjectHeaders(ctx, req)
    client.Do(req)
}(ctx)

// Bad - ctx might be cancelled by the time goroutine runs
go func() {
    req, _ := http.NewRequestWithContext(ctx, "POST", url, body)
    // ...
}()
```

**Connection reuse**: Go's default HTTP client reuses connections, which is great. But if you are using the custom RoundTripper approach, make sure you are cloning the request (not mutating the original) to avoid race conditions with concurrent requests.

**Context cancellation**: If the original request's context is cancelled (client disconnects), your downstream calls will also be cancelled if you are passing the same context. This is usually desirable, but be aware of it for fire-and-forget patterns.

Go's explicit context passing makes trace propagation predictable and easy to reason about. Whether you use manual header injection, a custom RoundTripper, or OpenTelemetry instrumentation, the pattern is always the same: extract from incoming request, store in context, inject into outgoing requests.
