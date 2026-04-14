# How to Develop Dapr HTTP Middleware Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP Middleware, Pluggable Component, Security, Extension

Description: Build custom Dapr HTTP middleware components to add authentication, request transformation, or rate limiting to the Dapr sidecar pipeline.

---

## Dapr HTTP Middleware Pipeline

Dapr supports middleware components that intercept HTTP requests flowing through the sidecar. Built-in middleware includes OAuth2, rate limiting, and request routing. Custom HTTP middleware lets you add organization-specific logic - custom auth schemes, header transformation, request logging - to the Dapr pipeline without changing application code.

## Middleware Architecture

Dapr's HTTP middleware pipeline processes requests in order:

```text
App -> Dapr HTTP Port (3500) -> [Middleware 1] -> [Middleware 2] -> App Handler
                                                                         |
                                                              Service Invocation / APIs
```

## Implementing a Custom Middleware Component

Dapr HTTP middleware implements the `Middleware` interface from `components-contrib` using Go's standard `net/http` handler pattern. Create a middleware that adds custom authentication headers:

```go
package custommiddleware

import (
    "net/http"

    "github.com/dapr/components-contrib/middleware"
)

// CustomAuthMiddleware validates a custom token header
type CustomAuthMiddleware struct{}

func (m *CustomAuthMiddleware) GetHandler(metadata middleware.Metadata) (func(next http.Handler) http.Handler, error) {
    secret := metadata.Properties["secret"]

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            token := r.Header.Get("X-Custom-Token")

            if token != secret {
                w.WriteHeader(http.StatusUnauthorized)
                w.Write([]byte(`{"error": "unauthorized"}`))
                return
            }

            // Add a downstream header with verified identity
            r.Header.Set("X-Verified-User", "service-account")
            next.ServeHTTP(w, r)
        })
    }, nil
}
```

## Registering the Middleware Component

```go
package main

import (
    contribMiddleware "github.com/dapr/components-contrib/middleware"
    httpMiddlewareLoader "github.com/dapr/dapr/pkg/components/middleware/http"
    "github.com/dapr/kit/logger"

    custommiddleware "myapp/middleware"
)

func init() {
    httpMiddlewareLoader.DefaultRegistry.RegisterComponent(
        func(log logger.Logger) contribMiddleware.Middleware {
            return &custommiddleware.CustomAuthMiddleware{}
        },
        "custom-auth",
    )
}
```

## Building a Request Logger Middleware

```go
type statusResponseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (w *statusResponseWriter) WriteHeader(code int) {
    w.statusCode = code
    w.ResponseWriter.WriteHeader(code)
}

type RequestLoggerMiddleware struct{}

func (m *RequestLoggerMiddleware) GetHandler(metadata middleware.Metadata) (func(next http.Handler) http.Handler, error) {
    logLevel := metadata.Properties["logLevel"]

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()

            // Wrap ResponseWriter to capture status code
            wrapped := &statusResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

            // Process request
            next.ServeHTTP(wrapped, r)

            duration := time.Since(start)
            if logLevel == "info" {
                log.Printf("[MIDDLEWARE] %s %s -> %d (%s)",
                    r.Method,
                    r.URL.Path,
                    wrapped.statusCode,
                    duration,
                )
            }
        })
    }, nil
}
```

## Component and Configuration YAML

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: custom-auth
spec:
  type: middleware.http.custom-auth
  version: v1
  metadata:
    - name: secret
      secretKeyRef:
        name: middleware-secret
        key: token
```

Apply middleware in the Dapr Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
      - name: custom-auth
        type: middleware.http.custom-auth
      - name: uppercase
        type: middleware.http.uppercase
```

## Rate Limiting Middleware

```go
type RateLimitMiddleware struct{}

func (m *RateLimitMiddleware) GetHandler(metadata middleware.Metadata) (func(next http.Handler) http.Handler, error) {
    maxRPS, _ := strconv.Atoi(metadata.Properties["maxRequestsPerSecond"])
    limiter := rate.NewLimiter(rate.Limit(maxRPS), maxRPS)

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                w.WriteHeader(http.StatusTooManyRequests)
                w.Write([]byte(`{"error": "rate limit exceeded"}`))
                return
            }
            next.ServeHTTP(w, r)
        })
    }, nil
}
```

## Testing Middleware Locally

```bash
dapr run \
  --app-id my-app \
  --app-port 8080 \
  --config ./config/appconfig.yaml \
  --resources-path ./components \
  -- go run main.go

# Test middleware is applied
curl -H "X-Custom-Token: wrong-token" http://localhost:3500/v1.0/invoke/target/method/test
# Expected: 401 Unauthorized

curl -H "X-Custom-Token: correct-token" http://localhost:3500/v1.0/invoke/target/method/test
# Expected: 200 OK
```

## Summary

Dapr HTTP middleware components provide a powerful extension point for cross-cutting concerns like authentication, rate limiting, and request transformation. By implementing the `Middleware` interface and registering it as a Dapr component, you can add organizational security policies or observability logic to the Dapr pipeline declaratively through Configuration manifests.
