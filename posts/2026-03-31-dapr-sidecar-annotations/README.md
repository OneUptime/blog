# How to Configure Dapr Sidecar Annotations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Annotation, Kubernetes, Sidecar, Configuration

Description: Learn how to use Dapr's Kubernetes pod annotations to configure sidecar injection, resource limits, protocols, and observability per service.

---

## Overview

Dapr uses Kubernetes pod annotations to configure the sidecar injected into each pod. These annotations let you control app identity, ports, protocols, resource allocation, and observability without modifying application code or global Dapr settings.

## Essential Annotations

Every Dapr-enabled pod needs at minimum:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-service"
  dapr.io/app-port: "8080"
```

## Protocol and API Annotations

Configure the communication protocol and body size limits:

```yaml
annotations:
  dapr.io/app-protocol: "http"        # http, grpc, https, grpcs, h2c
  dapr.io/http-max-request-size: "16" # MB (deprecated; use --max-body-size)
  dapr.io/http-read-buffer-size: "64" # KB (deprecated; use --read-buffer-size)
  dapr.io/app-max-concurrency: "20"   # max concurrent requests
```

## Resource Limit Annotations

Set CPU and memory limits for the sidecar container:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "100m"
  dapr.io/sidecar-cpu-limit: "500m"
  dapr.io/sidecar-memory-request: "64Mi"
  dapr.io/sidecar-memory-limit: "256Mi"
```

## Logging and Observability Annotations

```yaml
annotations:
  dapr.io/log-level: "info"           # debug, info, warn, error
  dapr.io/log-as-json: "true"
  dapr.io/enable-profiling: "false"
  dapr.io/sidecar-listen-addresses: "0.0.0.0"
```

## Configuration and Metrics

```yaml
annotations:
  dapr.io/config: "my-dapr-config"    # Reference a Configuration resource
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

## Complete Example

A complete Deployment with all commonly used annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 2
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
        dapr.io/config: "order-config"
        dapr.io/log-level: "info"
        dapr.io/log-as-json: "true"
        dapr.io/app-max-concurrency: "50"
        dapr.io/http-max-request-size: "8"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-cpu-limit: "300m"
        dapr.io/sidecar-memory-request: "64Mi"
        dapr.io/sidecar-memory-limit: "128Mi"
        dapr.io/enable-metrics: "true"
    spec:
      containers:
      - name: order-service
        image: myrepo/order-service:1.0
        ports:
        - containerPort: 8080
```

## Verifying Annotations Are Applied

Check the running pod's sidecar configuration:

```bash
kubectl describe pod -l app=order-service | grep dapr
kubectl get pod -l app=order-service -o jsonpath='{.items[0].metadata.annotations}' | python3 -m json.tool
```

## Summary

Dapr sidecar annotations give you fine-grained per-pod control over sidecar identity, protocols, resource limits, and observability. By setting annotations directly in your Deployment manifests, you keep configuration co-located with your application definition and avoid relying on global Dapr settings that affect all services.
