# How to Build a Custom Middleware Component for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Custom Component, HTTP, Pipeline

Description: Learn how to build a custom HTTP middleware component for Dapr that intercepts service invocation requests for authentication, rate limiting, or request transformation.

---

## Dapr Middleware Components

Dapr supports pluggable HTTP middleware components that intercept requests in the service invocation pipeline. Unlike pluggable state stores or bindings, middleware components are compiled into the Dapr sidecar as built-in components by contributing to the `dapr/components-contrib` repository. However, you can prototype and test middleware logic using the standard Go HTTP middleware interface.

## Middleware Component Structure

A Dapr middleware component implements the `middleware.Middleware` interface:

```go
package custommiddleware

import (
    "context"
    "net/http"

    "github.com/dapr/components-contrib/middleware"
    "github.com/dapr/kit/logger"
)

type CustomMiddleware struct {
    logger logger.Logger
}

func NewCustomMiddleware(logger logger.Logger) middleware.Middleware {
    return &CustomMiddleware{logger: logger}
}

func (c *CustomMiddleware) GetHandler(ctx context.Context, metadata middleware.Metadata) (func(http.Handler) http.Handler, error) {
    config, err := parseConfig(metadata.Properties)
    if err != nil {
        return nil, err
    }

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Pre-processing: validate request
            if err := c.validateRequest(r, config); err != nil {
                c.logger.Errorf("Request validation failed: %v", err)
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
            }

            // Add custom headers
            r.Header.Set("X-Custom-Request-ID", generateRequestID())

            // Call next handler
            next.ServeHTTP(w, r)
        })
    }, nil
}
```

## Parsing Middleware Configuration

```go
type Config struct {
    APIKeyHeader   string
    ValidAPIKeys   []string
    RateLimitRPS   int
}

func parseConfig(props map[string]string) (*Config, error) {
    config := &Config{
        APIKeyHeader: props["apiKeyHeader"],
        RateLimitRPS: 100,
    }

    if rps, ok := props["rateLimitRPS"]; ok {
        val, err := strconv.Atoi(rps)
        if err != nil {
            return nil, fmt.Errorf("invalid rateLimitRPS: %v", err)
        }
        config.RateLimitRPS = val
    }

    if keys, ok := props["validAPIKeys"]; ok {
        config.ValidAPIKeys = strings.Split(keys, ",")
    }

    return config, nil
}
```

## Registering the Middleware Component

Register in `cmd/daprd/main.go` when building a custom Dapr binary:

```go
import (
    custommiddleware "github.com/myorg/dapr-custom-middleware"
    httpMiddlewareLoader "github.com/dapr/dapr/pkg/components/middleware/http"
    "github.com/dapr/kit/logger"
)

func init() {
    httpMiddlewareLoader.DefaultRegistry.RegisterComponent(
        func(logger logger.Logger) httpMiddlewareLoader.Middleware {
            return custommiddleware.NewCustomMiddleware(logger)
        },
        "custom-auth",
    )
}
```

## Using the Middleware in a Pipeline

Reference the middleware component in a Dapr Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
spec:
  httpPipeline:
    handlers:
    - name: custom-auth-middleware
      type: middleware.http.custom-auth
```

Define the component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: custom-auth-middleware
spec:
  type: middleware.http.custom-auth
  version: v1
  metadata:
  - name: apiKeyHeader
    value: "X-API-Key"
  - name: validAPIKeys
    value: "key1,key2,key3"
  - name: rateLimitRPS
    value: "50"
```

## Summary

Custom Dapr middleware components intercept service invocation HTTP requests and enable cross-cutting concerns like authentication, rate limiting, and request transformation without modifying application code. The component implements the `middleware.Middleware` interface from `components-contrib`, parses configuration from metadata properties, and is registered in the Dapr middleware pipeline. Middleware runs on every inbound request to the service, making it ideal for enforcing security policies uniformly.
