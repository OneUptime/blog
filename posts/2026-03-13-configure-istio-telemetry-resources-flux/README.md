# How to Configure Istio Telemetry Resources with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, Telemetry, Observability, Metrics, Tracing

Description: Manage Istio Telemetry API resources for observability using Flux CD to configure metrics, tracing, and access logging declaratively.

---

## Introduction

Istio's Telemetry API provides fine-grained, per-namespace or per-workload control over observability settings: which metrics to generate, which tracing provider to use, sampling rates, and access log formats. This replaces the older EnvoyFilter approach with a cleaner, purpose-built API.

Managing Telemetry resources through Flux CD ensures your observability configuration is version-controlled. Enabling distributed tracing for a new service, adjusting sampling rates, or switching trace exporters are all pull request operations.

This guide covers configuring Istio Telemetry resources for metrics, distributed tracing, and access logging using Flux CD.

## Prerequisites

- Kubernetes cluster with Istio 1.16+ installed (Telemetry API GA)
- Flux CD v2 bootstrapped to your Git repository
- A metrics backend (Prometheus), tracing backend (Jaeger/Zipkin/Tempo), or log backend configured

## Step 1: Configure Mesh-Wide Telemetry Defaults

```yaml
# clusters/my-cluster/istio-telemetry/mesh-telemetry.yaml
# Apply to istio-system for mesh-wide defaults
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  # Distributed tracing configuration
  tracing:
    - providers:
        - name: tempo
      # Sample 1% of requests by default
      randomSamplingPercentage: 1.0
      # Disable tracing for health check paths
      disableSpanReporting: false
      customTags:
        cluster:
          literal:
            value: "production-cluster"
        environment:
          environment:
            name: DEPLOYMENT_ENV
            defaultValue: "production"

  # Access logging
  accessLogging:
    - providers:
        - name: envoy
      # Log format
      filter:
        expression: "response.code >= 400"  # Only log errors

  # Metrics configuration
  metrics:
    - providers:
        - name: prometheus
      overrides:
        # Enable request duration histogram with custom buckets
        - match:
            metric: REQUEST_DURATION_MILLISECONDS
            mode: CLIENT_AND_SERVER
          tagOverrides:
            request_protocol:
              operation: UPSERT
              value: "request.protocol"
```

## Step 2: Configure Per-Namespace Tracing

```yaml
# clusters/my-cluster/istio-telemetry/production-telemetry.yaml
# Override mesh defaults for the production namespace
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: production-tracing
  namespace: production
spec:
  tracing:
    - providers:
        - name: tempo
      # Higher sampling for production (10%)
      randomSamplingPercentage: 10.0
      customTags:
        team:
          literal:
            value: "platform-team"
```

## Step 3: Configure Per-Workload Telemetry

```yaml
# clusters/my-cluster/istio-telemetry/payment-telemetry.yaml
# Payment service: 100% sampling for compliance
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-tracing
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
    - providers:
        - name: tempo
      # 100% sampling for payment service
      randomSamplingPercentage: 100.0
      customTags:
        service_type:
          literal:
            value: "payment"
  # Full access logging for payment service
  accessLogging:
    - providers:
        - name: envoy
      # Log all requests (no filter)
```

## Step 4: Configure Metrics Customization

```yaml
# clusters/my-cluster/istio-telemetry/metrics-config.yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        # Add custom dimensions to all metrics
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          tagOverrides:
            # Add destination service version tag
            destination_version:
              operation: UPSERT
              value: "destination.labels['version'] | 'unknown'"
        # Disable grpc_response_status to reduce cardinality
        - match:
            metric: GRPC_RESPONSE_STATUS
            mode: CLIENT_AND_SERVER
          disabled: true
```

## Step 5: Configure the Tracing Provider in Istiod

```yaml
# clusters/my-cluster/istio-telemetry/extension-providers.yaml
# Patch the istiod ConfigMap to add Tempo as a tracing provider
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    extensionProviders:
      - name: tempo
        opentelemetry:
          service: tempo-otlp.monitoring.svc.cluster.local
          port: 4317
      - name: envoy
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              status: "%RESPONSE_CODE%"
              duration: "%DURATION%"
              trace_id: "%REQ(X-B3-TRACEID)%"
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/istio-telemetry/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - extension-providers.yaml
  - mesh-telemetry.yaml
  - production-telemetry.yaml
  - payment-telemetry.yaml
  - metrics-config.yaml
---
# clusters/my-cluster/flux-kustomization-istio-telemetry.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-telemetry
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: istio
  path: ./clusters/my-cluster/istio-telemetry
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Verify Telemetry Configuration

```bash
# Apply Flux reconciliation
flux reconcile kustomization istio-telemetry

# Check Telemetry resources
kubectl get telemetry --all-namespaces

# Verify traces are appearing in Tempo/Jaeger
kubectl port-forward svc/tempo 3100:3100 -n monitoring
curl http://localhost:3100/api/traces

# Check Prometheus metrics from Istio
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Query: istio_requests_total{destination_service_namespace="production"}
```

## Best Practices

- Set low default sampling rates (1-5%) at the mesh level and override with 100% sampling for critical services like payment or authentication where full tracing is required for compliance.
- Use tag overrides to add business context (team, environment, service type) to all Istio metrics, making them more useful for SLO monitoring.
- Filter access logs to errors only (`response.code >= 400`) at the mesh level to reduce log volume; override to full logging for services under active investigation.
- Define extension providers (Tempo, Jaeger, etc.) in the mesh ConfigMap and reference them by name in Telemetry resources — this decouples the provider endpoint from the telemetry policy.
- Use the Telemetry API's `selector.matchLabels` to apply workload-specific configurations without modifying the mesh-wide defaults.

## Conclusion

Istio Telemetry resources managed through Flux CD give you declarative, version-controlled observability configuration for your entire service mesh. Tracing sampling rates, access log formats, and metric customizations are all GitOps-managed code — making it easy to adjust observability depth for debugging, compliance, or cost management through the standard pull request workflow.
