# How to Implement Service Mesh Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Mesh, mTLS, Observability, Microservice

Description: Learn how Dapr implements service mesh capabilities like mTLS, tracing, and traffic control without requiring infrastructure-level mesh like Istio or Linkerd.

---

## Overview

A service mesh provides service-to-service communication features like mutual TLS, tracing, load balancing, and retries. Dapr implements these capabilities at the application level through its sidecar, offering a service mesh alternative without requiring infrastructure-level sidecar proxies like Envoy.

## Dapr vs Traditional Service Mesh

| Feature | Istio/Linkerd | Dapr |
|---|---|---|
| mTLS | Yes | Yes (built-in) |
| Tracing | Yes | Yes (OpenTelemetry) |
| Retries/Timeouts | Yes | Yes (resiliency policies) |
| Service Discovery | Yes | Yes (name resolution) |
| Protocol | HTTP/gRPC | HTTP/gRPC + more |
| Config | Infrastructure | App-level YAML |

## Enabling mTLS Between Services

Dapr enables mTLS automatically in Kubernetes. Verify it is active:

```bash
dapr mtls -k
```

Configure the trust anchor and certificate TTL:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
  namespace: default
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

Apply to your app:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "daprconfig"
```

## Service-to-Service Invocation with mTLS

All service invocation calls are automatically encrypted:

```go
package main

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
)

func callInventoryService(productID string, quantity int) ([]byte, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return nil, err
    }
    defer client.Close()

    // mTLS and service discovery handled by Dapr sidecar
    return client.InvokeMethod(
        context.Background(),
        "inventory-service",  // target app-id
        "/check-stock",
        "GET",
    )
}
```

## Distributed Tracing Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.monitoring:9411/api/v2/spans"
```

For OpenTelemetry Collector:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: otel-tracing-config
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

## Resiliency Policies (Retry, Timeout, Circuit Breaker)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: service-resiliency
spec:
  policies:
    timeouts:
      general: 5s
    retries:
      retryForever:
        policy: exponential
        maxInterval: 15s
        maxRetries: 3
    circuitBreakers:
      shared:
        maxRequests: 1
        interval: 8s
        timeout: 45s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      inventory-service:
        timeout: general
        retry: retryForever
        circuitBreaker: shared
```

## Access Control Policies

Restrict which services can call which endpoints:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: orderservice-config
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
      - appId: "api-gateway"
        defaultAction: allow
        trustDomain: "public"
        namespace: "default"
      - appId: "payment-service"
        defaultAction: deny
        operations:
          - name: "/process-payment"
            httpVerb: ["POST"]
            action: allow
```

## Summary

Dapr provides service mesh capabilities at the application layer without requiring infrastructure-level proxies. Built-in mTLS, distributed tracing with OpenTelemetry, resiliency policies, and access control give you the core service mesh feature set through simple YAML configuration. This approach works in any environment where a full service mesh may be too complex to operate.
