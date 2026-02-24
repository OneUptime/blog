# How to Write Telemetry API Configuration (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, YAML, Cheat Sheet, Observability, Metrics

Description: Complete cheat sheet for writing Istio Telemetry API YAML to configure metrics, access logging, and distributed tracing.

---

The Istio Telemetry API gives you centralized control over metrics, access logging, and distributed tracing in your mesh. Instead of configuring each proxy individually or using EnvoyFilters, the Telemetry resource provides a clean, declarative way to manage observability settings at the mesh, namespace, or workload level.

Here is a complete YAML reference for the Telemetry API.

## Basic Structure

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: my-telemetry
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  metrics: []
  accessLogging: []
  tracing: []
```

## Scope and Precedence

Telemetry resources follow the same precedence as other Istio policies:

1. **Workload-level** (highest priority): Has a `selector`
2. **Namespace-level**: No selector, applies to all workloads in the namespace
3. **Mesh-wide** (lowest priority): In `istio-system`, no selector

## Access Logging

### Enable Access Logging Mesh-Wide

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

This enables the default Envoy access log provider for all workloads in the mesh.

### Enable for a Specific Namespace

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: ns-logging
  namespace: backend
spec:
  accessLogging:
    - providers:
        - name: envoy
```

### Enable for a Specific Workload

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: workload-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  accessLogging:
    - providers:
        - name: envoy
```

### Disable Access Logging

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: high-traffic-service
  accessLogging:
    - disabled: true
```

### Log Only Errors

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-only-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

### Log Only Specific Paths

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: filtered-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "request.url_path.startsWith('/api/')"
```

### Log Only Slow Requests

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: slow-request-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.duration > duration('1s')"
```

### Multiple Log Providers

Send logs to multiple destinations:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: multi-provider-logging
  namespace: default
spec:
  accessLogging:
    - providers:
        - name: envoy
        - name: otel
```

The `otel` provider must be configured in the mesh config extension providers.

## Metrics

### Override Default Metrics

Customize the standard Istio metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT_AND_SERVER
          tagOverrides:
            request_host:
              operation: REMOVE
```

### Add Custom Tags to Metrics

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-tags
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          tagOverrides:
            environment:
              operation: UPSERT
              value: "production"
            cluster_name:
              operation: UPSERT
              value: "cluster-east-1"
```

### Add Request Header as Metric Tag

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: header-tag
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            api_version:
              operation: UPSERT
              value: "request.headers['x-api-version']"
```

### Remove Expensive Tags

Reduce cardinality by removing high-cardinality tags:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-cardinality
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            request_path:
              operation: REMOVE
            destination_ip:
              operation: REMOVE
```

### Disable Specific Metrics

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_DURATION
          disabled: true
```

### Client vs Server Side Metrics

Control whether metrics are generated on the client side, server side, or both:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: server-only-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT
          disabled: true
```

This disables client-side REQUEST_COUNT metrics, keeping only server-side metrics.

### Available Metric Names

| Metric | Description |
|--------|-------------|
| `ALL_METRICS` | All metrics |
| `REQUEST_COUNT` | Total request count |
| `REQUEST_DURATION` | Request duration histogram |
| `REQUEST_SIZE` | Request body size |
| `RESPONSE_SIZE` | Response body size |
| `TCP_OPENED_CONNECTIONS` | TCP connections opened |
| `TCP_CLOSED_CONNECTIONS` | TCP connections closed |
| `TCP_SENT_BYTES` | TCP bytes sent |
| `TCP_RECEIVED_BYTES` | TCP bytes received |
| `GRPC_REQUEST_MESSAGES` | gRPC messages sent |
| `GRPC_RESPONSE_MESSAGES` | gRPC messages received |

## Tracing

### Enable Tracing Mesh-Wide

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

### Configure Sampling Rate

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tracing-config
  namespace: default
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 10.0
```

10% of requests will be sampled for tracing. Adjust based on traffic volume and tracing backend capacity.

### Disable Tracing for a Workload

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: no-tracing
  namespace: default
spec:
  selector:
    matchLabels:
      app: high-traffic-internal
  tracing:
    - disableSpanReporting: true
```

### Add Custom Tags to Traces

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: trace-tags
  namespace: default
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 5.0
      customTags:
        environment:
          literal:
            value: "production"
        user_id:
          header:
            name: x-user-id
            defaultValue: "unknown"
        pod_name:
          environment:
            name: POD_NAME
            defaultValue: "unknown"
```

### Custom Tag Types

```yaml
# Literal value
customTags:
  my_tag:
    literal:
      value: "fixed-value"

# From request header
customTags:
  my_tag:
    header:
      name: x-custom-header
      defaultValue: "fallback"

# From environment variable
customTags:
  my_tag:
    environment:
      name: MY_ENV_VAR
      defaultValue: "fallback"
```

### Use OpenTelemetry Provider

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 5.0
```

The `otel-tracing` provider must be defined in the mesh config:

```yaml
meshConfig:
  extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
```

## Combined Configuration

### Full Observability Setup

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: full-observability
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  # Access logging with error filtering
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > duration('2s')"
  # Metrics with custom tags
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            environment:
              operation: UPSERT
              value: "production"
            request_path:
              operation: REMOVE
  # Tracing with 5% sampling
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 5.0
      customTags:
        environment:
          literal:
            value: "production"
```

### Production Mesh-Wide Config

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  # Log only errors and slow requests mesh-wide
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500 || response.duration > duration('5s')"
  # Reduce metric cardinality mesh-wide
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            request_path:
              operation: REMOVE
            source_ip:
              operation: REMOVE
  # Low sampling rate for production
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

This mesh-wide configuration logs only errors and slow requests to keep log volume manageable, removes high-cardinality metric tags to prevent Prometheus from running out of memory, and sets a 1% tracing sampling rate suitable for high-traffic production environments. Override these settings at the namespace or workload level where you need more detailed observability.
