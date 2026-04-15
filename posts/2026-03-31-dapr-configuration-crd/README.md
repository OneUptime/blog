# How to Use Dapr Configuration CRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, CRD, Tracing, Middleware

Description: Use Dapr's Configuration CRD to control sidecar behavior including tracing, mTLS, middleware pipelines, access control, and feature flags for your applications.

---

## What the Configuration CRD Controls

Dapr's `Configuration` CRD (`configurations.dapr.io`) is the runtime settings manifest for Dapr sidecars. Unlike Component CRDs which define what backends to connect to, the Configuration CRD defines how the sidecar itself behaves - tracing rates, middleware, mTLS, access control, and feature flags.

## Applying a Configuration to an App

Reference the Configuration CRD in your pod annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "orders-api"
  dapr.io/config: "my-app-config"
```

## Tracing Configuration

Control distributed tracing behavior:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: my-app-config
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "otel-collector:4317"
      isSecure: false
      protocol: grpc
```

`samplingRate` accepts values from `"0"` (disabled) to `"1"` (100% sampling).

## mTLS Configuration

Customize mTLS certificate rotation:

```yaml
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

## HTTP Middleware Pipeline

Add middleware that runs on every incoming HTTP request to the app:

```yaml
spec:
  httpPipeline:
    handlers:
    - name: uppercase-middleware
      type: middleware.http.uppercase
    - name: ratelimit
      type: middleware.http.ratelimit
```

Deploy the corresponding Component CRDs for each middleware:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
  namespace: default
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: "50"
```

## App-Level Access Control

Restrict which other apps can call your service:

```yaml
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
    - appId: frontend-api
      defaultAction: allow
      namespace: default
    - appId: admin-dashboard
      defaultAction: allow
      namespace: default
      operations:
      - name: /admin/*
        httpVerb: ['GET']
        action: allow
```

## Feature Flags

Enable experimental or alpha features:

```yaml
spec:
  features:
  - name: HotReload
    enabled: true
  - name: ActorStateTTL
    enabled: true
  - name: SchedulerReminders
    enabled: true
```

## Metrics Configuration

Control which metrics are emitted:

```yaml
spec:
  metrics:
    enabled: true
    rules:
    - name: dapr_http_server_request_count
      labels:
      - name: method
        regex:
          "orders/.*": "orders/{id}"
```

## Viewing Active Configuration

```bash
# List configurations
kubectl get configuration -n default

# View runtime metadata including enabled features and active configuration name
curl http://localhost:3500/v1.0/metadata | python3 -m json.tool
```

## Summary

Dapr's Configuration CRD controls all aspects of sidecar runtime behavior from tracing and mTLS to middleware pipelines and access control. Reference it from pod annotations to apply consistent settings across all instances of an application. Use namespace-scoped configurations to provide differentiated behavior for different environments or tenant groups without modifying application code.
