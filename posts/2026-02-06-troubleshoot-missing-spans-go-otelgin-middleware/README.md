# How to Troubleshoot Missing Spans in Go When Using otelgin and the Request Is Handled by Middleware Before the Route

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Gin, Middleware

Description: Fix missing OpenTelemetry spans in Gin applications where middleware handles requests before the otelgin middleware runs.

You have set up `otelgin` middleware in your Gin application, but some requests do not produce spans. The health check endpoint, CORS preflight requests, or authentication failures show no trace data. The issue is middleware ordering.

## How Gin Middleware Works

Gin processes middleware in the order it is registered. If a middleware writes a response and calls `c.Abort()`, subsequent middleware (including `otelgin`) never runs.

```go
router := gin.New()

// This ordering causes problems
router.Use(healthCheckMiddleware) // responds to /health and aborts
router.Use(corsMiddleware)        // responds to OPTIONS and aborts
router.Use(otelgin.Middleware("my-service")) // never runs for aborted requests
router.Use(authMiddleware)
```

When a health check request comes in, `healthCheckMiddleware` writes `200 OK` and calls `c.Abort()`. The `otelgin.Middleware` never executes, so no span is created.

## Diagnosing the Issue

Add a simple debug middleware to see what is happening:

```go
func debugMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        spanCtx := trace.SpanContextFromContext(c.Request.Context())
        log.Printf("[before] %s %s - has span: %v, aborted: %v",
            c.Request.Method, c.Request.URL.Path,
            spanCtx.IsValid(), c.IsAborted())

        c.Next()

        log.Printf("[after] %s %s - aborted: %v",
            c.Request.Method, c.Request.URL.Path,
            c.IsAborted())
    }
}
```

Place this at different positions in the middleware chain to see where requests are being short-circuited.

## The Fix: Move otelgin to the First Position

The OpenTelemetry middleware should be the very first middleware registered:

```go
router := gin.New()

// Register otelgin FIRST so all requests get traced
router.Use(otelgin.Middleware("my-service"))
router.Use(healthCheckMiddleware)
router.Use(corsMiddleware)
router.Use(authMiddleware)
```

Now every request, including health checks and CORS preflight, will produce a span. The span will be created by `otelgin` before any other middleware can abort the request.

## Filtering Out Noise

You might not want spans for health checks or readiness probes. Use the `otelgin.WithFilter` option to exclude them:

```go
router.Use(otelgin.Middleware("my-service",
    otelgin.WithFilter(func(r *http.Request) bool {
        // Return false to skip tracing for these paths
        switch r.URL.Path {
        case "/health", "/ready", "/metrics":
            return false
        }
        return true
    }),
))
```

This way, `otelgin` runs first for every request but only creates spans for the requests you care about.

## Handling CORS Preflight Properly

CORS preflight (OPTIONS) requests are a common source of missing spans. If your CORS middleware responds before `otelgin`, you lose visibility into CORS issues:

```go
router := gin.New()

// otelgin first
router.Use(otelgin.Middleware("my-service",
    otelgin.WithFilter(func(r *http.Request) bool {
        // Optionally filter out OPTIONS if you don't want them
        // return r.Method != "OPTIONS"
        return true
    }),
))

// CORS after otelgin
router.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"https://app.example.com"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
    AllowHeaders:     []string{"Authorization", "Content-Type"},
    AllowCredentials: true,
}))
```

## Authentication Middleware and Error Spans

When `authMiddleware` rejects a request, you want that to show up as a span with an error status. If `otelgin` runs first, this works correctly:

```go
func authMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            // otelgin has already started a span for this request
            // The span will capture this 401 response
            span := trace.SpanFromContext(c.Request.Context())
            span.SetStatus(codes.Error, "missing authorization header")
            c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
            return
        }

        claims, err := validateToken(token)
        if err != nil {
            span := trace.SpanFromContext(c.Request.Context())
            span.RecordError(err)
            span.SetStatus(codes.Error, "invalid token")
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
            return
        }

        c.Set("claims", claims)
        c.Next()
    }
}
```

## Testing Middleware Ordering

Write a test to verify spans are created for all paths:

```go
func TestMiddlewareOrdering(t *testing.T) {
    exporter := tracetest.NewInMemoryExporter()
    tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
    otel.SetTracerProvider(tp)

    router := gin.New()
    router.Use(otelgin.Middleware("test"))
    router.Use(healthCheckMiddleware)
    router.GET("/health", func(c *gin.Context) {})
    router.GET("/api/data", func(c *gin.Context) { c.JSON(200, nil) })

    // Test health check produces a span
    w := httptest.NewRecorder()
    req := httptest.NewRequest("GET", "/health", nil)
    router.ServeHTTP(w, req)

    tp.ForceFlush(context.Background())
    spans := exporter.GetSpans()

    if len(spans) == 0 {
        t.Error("expected at least one span for /health")
    }
}
```

The rule is straightforward: `otelgin.Middleware` should always be the first middleware in your chain. Use the `WithFilter` option if you need to exclude certain paths from tracing.
