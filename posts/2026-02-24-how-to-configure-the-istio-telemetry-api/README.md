# How to Configure the Istio Telemetry API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Observability, Metrics, Service Mesh

Description: A hands-on guide to configuring the Istio Telemetry API for controlling metrics, logging, and tracing across your mesh.

---

The Istio Telemetry API was introduced to give you a clean, declarative way to control how metrics, access logs, and distributed traces are collected across your mesh. Before this API existed, you had to fiddle with MeshConfig, EnvoyFilters, and Mixer (if you were around for that era). The Telemetry API consolidates all of that into a single resource type.

The Telemetry resource works at three levels: mesh-wide (in the root namespace), per-namespace, and per-workload. This hierarchical approach means you can set sensible defaults for the whole mesh and then override them where needed.

## The Telemetry Resource

The Telemetry resource lives in the `telemetry.istio.io/v1` API group. Here's the basic structure:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: my-telemetry
  namespace: istio-system
spec:
  # Optional: target specific workloads
  selector:
    matchLabels:
      app: my-service
  # Metrics configuration
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            response_code:
              operation: REMOVE
  # Access logging configuration
  accessLogging:
    - providers:
        - name: envoy
  # Tracing configuration
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 10.0
```

The three main sections are `metrics`, `accessLogging`, and `tracing`. Each section specifies which providers to use and how to configure them.

## Setting Up a Mesh-Wide Telemetry Policy

To apply telemetry configuration across the entire mesh, create a Telemetry resource in the Istio root namespace (usually `istio-system`) with the name `default`:

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
      disabled: false
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

This enables:
- Prometheus metrics collection for all services
- Envoy access logging for all services
- Distributed tracing at 1% sampling rate for all services

Apply it:

```bash
kubectl apply -f mesh-telemetry.yaml
```

## Understanding Providers

Providers are the backends that receive telemetry data. They're defined in your Istio MeshConfig, not in the Telemetry resource itself. The Telemetry resource just references them by name.

Check what providers are available in your mesh:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A 20 "extensionProviders"
```

Common providers include:

- **prometheus** - Built-in Prometheus metrics
- **envoy** - Envoy's native access logging
- **zipkin** - Zipkin-compatible tracing (also works with Jaeger)
- **opentelemetry** - OpenTelemetry Collector

If you need to add a new provider, edit the MeshConfig:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    extensionProviders:
      - name: otel-collector
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
      - name: custom-access-log
        envoyFileAccessLog:
          path: "/dev/stdout"
          logFormat:
            labels:
              start_time: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              response_code: "%RESPONSE_CODE%"
              duration: "%DURATION%"
```

## Configuring Metrics

The metrics section controls which metrics are collected and how they're configured:

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
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          disabled: false
```

### Disabling Specific Metrics

If you want to disable a specific metric to reduce cardinality:

```yaml
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
```

Available metric names:
- `REQUEST_COUNT`
- `REQUEST_DURATION`
- `REQUEST_SIZE`
- `RESPONSE_SIZE`
- `TCP_OPENED_CONNECTIONS`
- `TCP_CLOSED_CONNECTIONS`
- `TCP_SENT_BYTES`
- `TCP_RECEIVED_BYTES`
- `GRPC_REQUEST_MESSAGES`
- `GRPC_RESPONSE_MESSAGES`
- `ALL_METRICS`

### Client vs Server Metrics

Each metric is collected on both the client side (outbound) and server side (inbound). You can configure them independently:

```yaml
overrides:
  - match:
      metric: REQUEST_COUNT
      mode: CLIENT
    disabled: true
  - match:
      metric: REQUEST_COUNT
      mode: SERVER
    disabled: false
```

This collects request counts only on the server side, cutting the metric cardinality in half for that metric.

## Configuring Access Logging

Access logging is controlled through the `accessLogging` section:

```yaml
spec:
  accessLogging:
    - providers:
        - name: envoy
      disabled: false
```

This enables Envoy's default access log format. To customize the format or use a different provider, you need to define the provider in MeshConfig first (as shown in the providers section above).

### Filtering Access Logs

You can filter access logs to only log specific types of traffic:

```yaml
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This only logs requests that result in 4xx or 5xx responses, which significantly reduces log volume while keeping the most useful data.

## Configuring Tracing

The tracing section controls distributed trace collection:

```yaml
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 5.0
      customTags:
        environment:
          literal:
            value: "production"
        cluster:
          environment:
            name: "CLUSTER_NAME"
            defaultValue: "unknown"
```

### Sampling Rate

The `randomSamplingPercentage` controls what fraction of requests generate traces. In production, 1-5% is typical. Setting it to 100% captures everything but generates massive amounts of trace data.

### Custom Tags

You can add custom tags to all traces:

- **literal** - A fixed string value
- **environment** - Read from an environment variable in the proxy
- **header** - Read from a request header

```yaml
customTags:
  my_tag:
    header:
      name: "x-custom-header"
      defaultValue: "none"
```

## Verifying Your Configuration

After applying a Telemetry resource, verify it's being used:

```bash
# Check the resource was created
kubectl get telemetry -A

# Check for validation errors
istioctl analyze -n istio-system

# Verify metrics are flowing to Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n istio-system
# Then open http://localhost:9090 and query istio_requests_total
```

You can also check the Envoy configuration on a specific pod to see that telemetry settings were applied:

```bash
istioctl proxy-config log <pod-name> --level telemetry:debug
```

## Common Gotchas

**Provider not found**: If you reference a provider name that isn't defined in MeshConfig, the Telemetry resource will be accepted but have no effect. Always check MeshConfig first.

**Root namespace**: The mesh-wide Telemetry must be in the root namespace (usually `istio-system`). A Telemetry named "default" in any other namespace only applies to that namespace.

**Multiple Telemetry resources**: You can have multiple Telemetry resources in the same namespace, but they merge in a specific order. Named resources merge on top of the "default" resource. Avoid creating conflicting configurations.

**Sidecar restart required**: After changing MeshConfig providers, you need to restart your workload pods for the new configuration to take effect:

```bash
kubectl rollout restart deployment -n my-namespace
```

The Telemetry API is a significant improvement over the old way of configuring Istio observability. It gives you a consistent, declarative interface for all three pillars of observability, and the hierarchical override system makes it practical to manage telemetry at scale.
