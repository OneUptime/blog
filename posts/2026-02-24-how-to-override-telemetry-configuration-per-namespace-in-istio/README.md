# How to Override Telemetry Configuration per Namespace in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Namespace Configuration, Observability, Service Mesh

Description: How to use namespace-level Telemetry resources in Istio to override mesh-wide telemetry settings for specific namespaces.

---

A single telemetry configuration rarely works for an entire mesh. Your production namespace needs low sampling rates to control costs. Your staging namespace wants full sampling for debugging. Your compliance namespace needs detailed access logs. And your load-testing namespace should probably have most telemetry turned off to avoid overwhelming your backends.

The Istio Telemetry API supports this through a hierarchical configuration model. You set mesh-wide defaults in the root namespace, then override them at the namespace level where needed. This post walks through how namespace overrides work and shows practical patterns for common scenarios.

## How the Override Hierarchy Works

The Telemetry API uses a simple override model with three levels:

1. **Mesh-wide** - A Telemetry resource named `default` in the root namespace (usually `istio-system`)
2. **Namespace-level** - A Telemetry resource named `default` in a specific namespace
3. **Workload-level** - A Telemetry resource with a `selector` in the workload's namespace

Each level overrides the one above it. Namespace-level overrides mesh-wide settings. Workload-level overrides namespace-level settings.

The merge behavior is per-section. If you only specify `tracing` in a namespace-level override, the `metrics` and `accessLogging` configuration from the mesh-wide default still applies.

## Setting Up Mesh-Wide Defaults

Start with a mesh-wide Telemetry that defines your baseline:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

This baseline configuration:
- Enables Prometheus metrics for all services
- Logs only error responses
- Traces 1% of requests

## Namespace Override: Higher Trace Sampling

Your staging namespace needs more traces for debugging:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: staging
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 50.0
```

This overrides only the tracing configuration for the `staging` namespace. Metrics and access logging remain unchanged from the mesh-wide defaults.

After applying:

```bash
kubectl apply -f staging-telemetry.yaml
```

Services in the `staging` namespace will sample 50% of requests, while everything else stays at 1%.

## Namespace Override: Full Access Logging

Your payments namespace needs complete access logs for compliance:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: payments
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: ""
```

An empty filter expression (or omitting the filter entirely) logs all requests. The mesh-wide filter that only logs errors is overridden for this namespace.

If you need a more detailed log format for the payments namespace, use a different provider:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: payments
spec:
  accessLogging:
    - providers:
        - name: json-access-log
```

This requires a `json-access-log` provider to be defined in MeshConfig.

## Namespace Override: Disable Telemetry

For load testing, you might want to disable most telemetry to avoid skewing metrics and filling up storage:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: load-test
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          disabled: true
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 0.0
```

This disables client-side metrics, access logs, and tracing for the `load-test` namespace. Server-side metrics are kept so you can still monitor the services being tested.

## Namespace Override: Custom Metric Labels

A specific namespace might need additional labels on their metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: multi-tenant-app
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            tenant:
              operation: UPSERT
              value: "request.headers['x-tenant-id'] || 'default'"
```

Services in `multi-tenant-app` will have a `tenant` label on their request count metrics, while services in other namespaces won't.

## Namespace Override: Different Trace Backend

Maybe one team uses Jaeger while another uses an OpenTelemetry Collector:

```yaml
# Team A's namespace uses Jaeger
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: team-a
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 5.0

---
# Team B's namespace uses OTel Collector
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: team-b
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 5.0
```

Both providers need to be defined in MeshConfig, but each namespace can choose which one to use.

## Verifying Namespace Overrides

Check what Telemetry resources exist across all namespaces:

```bash
kubectl get telemetry -A
```

Expected output:

```
NAMESPACE      NAME      AGE
istio-system   default   7d
staging        default   3d
payments       default   5d
load-test      default   1d
```

To verify a specific namespace's effective configuration, check the Envoy config on a pod in that namespace:

```bash
# Check tracing config
istioctl proxy-config log <pod-name> -n staging --level trace:debug

# Or dump the full bootstrap config
istioctl proxy-config bootstrap <pod-name> -n staging -o json | grep -A 10 "tracing"
```

You can also generate traffic and check the results:

```bash
# Check if traces are being generated (staging should have higher rate)
kubectl port-forward svc/tracing 16686:16686 -n istio-system
# Open Jaeger UI, filter by service in staging namespace
```

## Common Patterns

### Development vs Production

```yaml
# Production (mesh-wide default)
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"

---
# Development namespace override
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
  accessLogging:
    - providers:
        - name: envoy
```

### Noisy Namespace Silencing

If a namespace generates too much telemetry data (maybe it has high-traffic services that aren't critical):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: high-traffic-internal
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_SIZE
          disabled: true
        - match:
            metric: RESPONSE_SIZE
          disabled: true
        - match:
            metric: REQUEST_DURATION
            mode: CLIENT
          disabled: true
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 0.1
```

### Compliance Namespace

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: pci-scope
spec:
  accessLogging:
    - providers:
        - name: json-access-log
    - providers:
        - name: otel-access-log
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
      customTags:
        compliance_scope:
          literal:
            value: "pci"
```

## Gotchas

**Name must be "default"**: A namespace-level Telemetry override must be named `default` to override the mesh-wide configuration. A Telemetry with any other name in a namespace is treated as an additional configuration (not an override) and merges differently.

**Sections don't partially merge**: If you override the `tracing` section, you need to specify the complete tracing configuration for that namespace. The mesh-wide tracing config is replaced entirely, not merged field by field.

**Provider must exist in MeshConfig**: Any provider you reference in a namespace-level override must be defined in the mesh-wide MeshConfig. You can't define new providers at the namespace level.

**Changes need proxy sync**: After applying a namespace-level override, it might take up to a minute for the xDS configuration to propagate to all sidecars in that namespace.

Namespace-level overrides are the sweet spot for most Istio deployments. They give you enough granularity to handle different requirements across teams and environments without the complexity of per-workload overrides. Start with conservative mesh-wide defaults and then loosen them where needed.
