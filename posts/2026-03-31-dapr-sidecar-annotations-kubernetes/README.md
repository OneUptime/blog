# How to Configure Dapr Sidecar Annotations on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Sidecar, Annotation, Configuration

Description: Master the full list of Dapr sidecar annotations to control app port, log level, resource limits, tracing, metrics, and sidecar image version.

---

## How Dapr Annotations Work

Dapr uses Kubernetes pod annotations to configure the injected sidecar. The sidecar injector webhook reads these annotations at pod creation time and generates the daprd container spec. Annotations are placed in the pod template's `metadata.annotations` section.

## Essential Annotations

```yaml
metadata:
  annotations:
    # Required: enable Dapr injection
    dapr.io/enabled: "true"

    # Required: unique app identifier in Dapr service registry
    dapr.io/app-id: "order-service"

    # Required if app handles HTTP/gRPC calls
    dapr.io/app-port: "8080"
```

## Protocol and API Annotations

```yaml
    # Use grpc if your app uses gRPC (default: http)
    dapr.io/app-protocol: "http"

    # Set max request body size in MB (default: 4)
    dapr.io/http-max-request-size: "16"

    # Set read buffer size in KB
    dapr.io/http-read-buffer-size: "4"
```

## Logging and Debugging Annotations

```yaml
    # Log level: debug, info, warn, error (default: info)
    dapr.io/log-level: "debug"

    # Log output format: plain or json
    dapr.io/log-as-json: "true"

    # Enable API call logging in sidecar
    dapr.io/enable-api-logging: "true"
```

## Metrics Annotations

```yaml
    # Enable Prometheus metrics endpoint on port 9090
    dapr.io/enable-metrics: "true"
    dapr.io/metrics-port: "9090"
```

## Profiling Annotations

```yaml
    # Enable pprof profiling endpoint
    dapr.io/enable-profiling: "true"
    dapr.io/profile-port: "7777"
```

## Sidecar Image and Resource Annotations

```yaml
    # Pin sidecar to a specific Dapr version
    dapr.io/sidecar-image: "daprio/daprd:1.13.0"

    # CPU and memory requests/limits
    dapr.io/sidecar-cpu-request: "100m"
    dapr.io/sidecar-memory-request: "64Mi"
    dapr.io/sidecar-cpu-limit: "500m"
    dapr.io/sidecar-memory-limit: "256Mi"
```

## Full Example Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/app-protocol: "http"
        dapr.io/log-level: "info"
        dapr.io/log-as-json: "true"
        dapr.io/enable-metrics: "true"
        dapr.io/metrics-port: "9090"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "64Mi"
        dapr.io/sidecar-cpu-limit: "300m"
        dapr.io/sidecar-memory-limit: "128Mi"
        dapr.io/config: "tracing"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:v1.0.0
        ports:
        - containerPort: 8080
```

## Summary

Dapr sidecar annotations provide fine-grained control over every aspect of the injected daprd container, from app protocol and port to resource limits and log format. Setting resource annotations prevents the sidecar from consuming unbounded CPU and memory. Use `dapr.io/config` to apply tracing and middleware configurations defined as Dapr Configuration CRDs.
