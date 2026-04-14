# How to Build a REST API Gateway with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, REST, API Gateway, Microservice, Middleware

Description: Learn how to build a REST API gateway using Dapr service invocation, middleware components for auth and rate limiting, and routing logic to backend microservices.

---

## REST API Gateway Pattern with Dapr

A REST API gateway provides a single entry point for clients, routing requests to appropriate backend microservices. In Dapr, the gateway service uses service invocation to forward requests, gaining mTLS, retries, and distributed tracing automatically. Dapr middleware components add cross-cutting concerns like authentication and rate limiting.

## Building the Gateway in Go

```go
// main.go - Dapr REST API Gateway
package main

import (
    "io"
    "log"
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    dapr "github.com/dapr/go-sdk/client"
)

type Gateway struct {
    daprClient dapr.Client
    routes     map[string]string // path prefix -> app-id
}

func NewGateway() (*Gateway, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return nil, err
    }

    return &Gateway{
        daprClient: client,
        routes: map[string]string{
            "/api/users":    "user-service",
            "/api/orders":   "order-service",
            "/api/payments": "payment-service",
            "/api/products": "product-service",
        },
    }, nil
}

func (g *Gateway) route(c *gin.Context) {
    path := c.Request.URL.Path
    appID := g.resolveAppID(path)
    if appID == "" {
        c.JSON(http.StatusNotFound, gin.H{"error": "no route found"})
        return
    }

    // Strip the /api prefix before forwarding
    upstreamPath := strings.TrimPrefix(path, "/api")
    if c.Request.URL.RawQuery != "" {
        upstreamPath += "?" + c.Request.URL.RawQuery
    }

    body, _ := io.ReadAll(c.Request.Body)
    resp, err := g.daprClient.InvokeMethodWithContent(
        c.Request.Context(),
        appID,
        upstreamPath,
        c.Request.Method,
        &dapr.DataContent{
            ContentType: c.ContentType(),
            Data:        body,
        },
    )
    if err != nil {
        c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
        return
    }

    c.Data(http.StatusOK, "application/json", resp)
}

func (g *Gateway) resolveAppID(path string) string {
    for prefix, appID := range g.routes {
        if strings.HasPrefix(path, prefix) {
            return appID
        }
    }
    return ""
}

func main() {
    gateway, err := NewGateway()
    if err != nil {
        log.Fatal(err)
    }
    defer gateway.daprClient.Close()

    r := gin.Default()
    r.Any("/api/*path", gateway.route)
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    log.Fatal(r.Run(":8080"))
}
```

## Middleware Configuration for the Gateway

Apply rate limiting and authentication middleware to the gateway:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: gateway-config
  namespace: production
spec:
  httpPipeline:
    handlers:
    - name: ratelimit-middleware
      type: middleware.http.ratelimit
    - name: jwt-auth-middleware
      type: middleware.http.bearer
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit-middleware
  namespace: production
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: "100"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwt-auth-middleware
  namespace: production
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://auth.example.com/.well-known/jwks.json"
  - name: issuer
    value: "https://auth.example.com"
  - name: audience
    value: "api.myapp.com"
```

## Gateway Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-gateway"
        dapr.io/app-port: "8080"
        dapr.io/config: "gateway-config"
        dapr.io/sidecar-cpu-limit: "500m"
        dapr.io/sidecar-memory-limit: "256Mi"
    spec:
      containers:
      - name: api-gateway
        image: myregistry/api-gateway:latest
        ports:
        - containerPort: 8080
```

## Health and Readiness Checks

Add Dapr-aware health checks to the gateway:

```go
// health check that verifies all downstream services are reachable
r.GET("/health/detailed", func(c *gin.Context) {
    results := make(map[string]string)
    for _, appID := range gateway.routes {
        _, err := gateway.daprClient.InvokeMethod(
            c.Request.Context(), appID, "health", "GET")
        if err != nil {
            results[appID] = "unhealthy"
        } else {
            results[appID] = "healthy"
        }
    }
    c.JSON(200, results)
})
```

## Summary

A Dapr REST API gateway routes client requests to backend microservices using service invocation, which provides mTLS, retries, and distributed tracing without gateway-level implementation. Define route mappings from path prefixes to Dapr app IDs, apply JWT authentication and rate limiting via Dapr middleware components in the gateway's HTTP pipeline, and expose a detailed health endpoint that probes all downstream services. This pattern centralizes cross-cutting concerns in the gateway while keeping backend services simple and unaware of API gateway concerns.
