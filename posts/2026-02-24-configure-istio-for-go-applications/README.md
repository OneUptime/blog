# How to Configure Istio for Go Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Go, Golang, Kubernetes, Service Mesh

Description: How to configure Istio for Go applications with practical examples covering health checks, trace propagation, graceful shutdown, and gRPC support.

---

Go applications and Istio are a natural fit. Envoy itself is written in C++, but the Istio control plane (istiod) is written in Go, and many of the tools around Istio are Go-based. Go apps are typically lightweight, fast to start, and handle concurrency well, which makes them easy to integrate into a service mesh. That said, there are still specific configurations you should know about.

## Basic Deployment

A Go application deployment configured for Istio:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
      version: v1
  template:
    metadata:
      labels:
        app: payment-service
        version: v1
    spec:
      containers:
      - name: payment-service
        image: myregistry/payment-service:1.0.0
        ports:
        - name: http-api
          containerPort: 8080
        - name: grpc-internal
          containerPort: 9090
        resources:
          requests:
            cpu: 100m
            memory: 64Mi
          limits:
            cpu: 1000m
            memory: 256Mi
```

Go apps are efficient with resources. A typical Go HTTP service uses very little memory compared to Java or Python equivalents. The resource requests above are conservative and work well for most services.

Notice the port names: `http-api` for the HTTP port and `grpc-internal` for the gRPC port. Istio uses these prefixes to detect the protocol.

## Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: production
spec:
  selector:
    app: payment-service
  ports:
  - name: http-api
    port: 8080
    targetPort: http-api
  - name: grpc-internal
    port: 9090
    targetPort: grpc-internal
```

## Health Check Implementation

Go makes it easy to implement proper health check endpoints:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "sync/atomic"
)

var ready atomic.Bool

func healthzHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "alive"})
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    if ready.Load() {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "not ready"})
    }
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/healthz", healthzHandler)
    mux.HandleFunc("/ready", readyHandler)
    mux.HandleFunc("/api/v1/payments", paymentHandler)

    // Initialize dependencies
    if err := connectToDatabase(); err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    ready.Store(true)

    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }

    log.Println("Starting server on :8080")
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
}
```

Configure the probes:

```yaml
containers:
- name: payment-service
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 3
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 3
    periodSeconds: 5
  startupProbe:
    httpGet:
      path: /healthz
      port: 8080
    periodSeconds: 2
    failureThreshold: 15
```

Go apps start very fast - typically under a second. The initialDelaySeconds can be very low.

## Graceful Shutdown

Go has excellent support for graceful server shutdown. Here is the full pattern with Istio compatibility:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    mux := http.NewServeMux()
    // ... register handlers

    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start server in a goroutine
    go func() {
        log.Println("Starting server on :8080")
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")

    // Give the sidecar time to stop routing traffic to us
    time.Sleep(5 * time.Second)

    // Shutdown with a deadline
    ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited gracefully")
}
```

The `time.Sleep(5 * time.Second)` before shutdown is important. It gives the Istio sidecar and Kubernetes endpoints controller time to update, so new requests stop being routed to this pod.

In your deployment:

```yaml
spec:
  terminationGracePeriodSeconds: 30
```

You can use a preStop hook instead of the sleep in your code, but handling it in Go code gives you more control.

## Trace Header Propagation

Here is a middleware approach for propagating trace headers:

```go
package middleware

import (
    "context"
    "net/http"
)

type contextKey string

const traceHeadersKey contextKey = "traceHeaders"

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

func TraceHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        headers := make(http.Header)
        for _, name := range traceHeaderNames {
            if value := r.Header.Get(name); value != "" {
                headers.Set(name, value)
            }
        }
        ctx := context.WithValue(r.Context(), traceHeadersKey, headers)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func GetTraceHeaders(ctx context.Context) http.Header {
    headers, ok := ctx.Value(traceHeadersKey).(http.Header)
    if !ok {
        return http.Header{}
    }
    return headers
}
```

Use it in your HTTP client calls:

```go
func callDownstreamService(ctx context.Context, url string) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }

    // Copy trace headers
    traceHeaders := middleware.GetTraceHeaders(ctx)
    for key, values := range traceHeaders {
        for _, value := range values {
            req.Header.Add(key, value)
        }
    }

    return http.DefaultClient.Do(req)
}
```

Register the middleware:

```go
mux := http.NewServeMux()
mux.HandleFunc("/api/v1/payments", paymentHandler)

handler := middleware.TraceHeaders(mux)
server := &http.Server{
    Addr:    ":8080",
    Handler: handler,
}
```

## gRPC Services

Go is one of the most popular languages for gRPC services. Istio handles gRPC natively:

```go
package main

import (
    "log"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"

    pb "myregistry/payment-service/proto"
)

func main() {
    lis, err := net.Listen("tcp", ":9090")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    s := grpc.NewServer()

    // Register your service
    pb.RegisterPaymentServiceServer(s, &paymentServer{})

    // Register gRPC health check
    healthServer := health.NewServer()
    healthpb.RegisterHealthServer(s, healthServer)
    healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

    log.Println("gRPC server starting on :9090")
    if err := s.Serve(lis); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

For gRPC health checks, use gRPC probes in your deployment:

```yaml
containers:
- name: payment-service
  livenessProbe:
    grpc:
      port: 9090
    initialDelaySeconds: 3
    periodSeconds: 10
  readinessProbe:
    grpc:
      port: 9090
    initialDelaySeconds: 3
    periodSeconds: 5
```

## Traffic Management

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        port:
          number: 8080
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: 5xx,reset,connect-failure
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        h2UpgradePolicy: DEFAULT
        http2MaxRequests: 1000
        maxRequestsPerConnection: 0
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

Go apps can handle many concurrent connections efficiently, so the connection limits can be higher than for Python or Ruby.

## Resource Considerations

Go apps compile to a single binary with no runtime dependencies. They are very efficient:

```yaml
resources:
  requests:
    cpu: 50m
    memory: 32Mi
  limits:
    cpu: 500m
    memory: 128Mi
```

The sidecar proxy will actually use more resources than many Go applications. A typical Go microservice uses 10-30MB of memory, while the Envoy sidecar uses 50-100MB. Factor this into your resource planning.

## Common Go + Istio Issues

**HTTP/2 and gRPC**: Go's default HTTP client uses HTTP/1.1. If your service communicates with other services over gRPC through the mesh, make sure the port name has the `grpc-` prefix so Istio knows to handle it as HTTP/2.

**Connection reuse**: Go's `http.Client` reuses connections by default, which works well with Envoy's connection pooling. Do not create a new client for every request.

**DNS caching**: Go caches DNS results differently than other languages. In Kubernetes, this usually is not an issue because DNS resolution is fast, but be aware that if a service's IP changes, Go might hold onto the old address for a while. Istio's sidecar handles this transparently since it does its own service discovery.

Go and Istio are a great combination. The lightweight nature of Go binaries means the sidecar overhead is proportionally larger, but the total resource usage is still very reasonable. Focus on proper port naming, trace header propagation, and graceful shutdown, and your Go services will integrate seamlessly into the mesh.
