# How to Customize Which Metrics Istio Collects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Telemetry API, Observability, Prometheus

Description: Control exactly which metrics Istio collects and exports using the Telemetry API to add, remove, or disable specific metrics and labels.

---

Out of the box, Istio generates a default set of metrics with a standard set of labels. For many teams, this is too much - the resulting metric cardinality overwhelms their Prometheus instance. For others, it's not enough - they need custom labels or additional metrics for their specific use case. Istio's Telemetry API gives you fine-grained control over what gets collected, what labels are included, and which metrics are enabled or disabled.

## The Default Metrics

Istio generates these metrics by default:

- `istio_requests_total` - counter of all requests
- `istio_request_duration_milliseconds` - request latency histogram
- `istio_request_bytes` - request body size histogram
- `istio_response_bytes` - response body size histogram
- `istio_tcp_sent_bytes_total` - TCP bytes sent
- `istio_tcp_received_bytes_total` - TCP bytes received
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed

Each HTTP metric includes labels like `reporter`, `source_workload`, `destination_workload`, `response_code`, `request_protocol`, and more. The full set of labels creates a lot of time series.

## Using the Telemetry API

The Telemetry API (introduced in Istio 1.12, stable since 1.18) is the recommended way to customize metrics. It uses the `telemetry.istio.io/v1` API group.

### Mesh-Wide Configuration

Apply a Telemetry resource in the `istio-system` namespace to affect the entire mesh:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
```

This is the baseline. It tells Istio to export metrics to Prometheus with default settings.

### Disabling Specific Metrics

If you don't need request/response size metrics, disable them to save Prometheus storage:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: RESPONSE_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
```

The `mode` field controls whether the override applies to client-side reporting (source proxy), server-side reporting (destination proxy), or both.

Available metric names for the `match.metric` field:
- `ALL_METRICS`
- `REQUEST_COUNT`
- `REQUEST_DURATION`
- `REQUEST_BYTES`
- `RESPONSE_BYTES`
- `TCP_OPENED_CONNECTIONS`
- `TCP_CLOSED_CONNECTIONS`
- `TCP_SENT_BYTES`
- `TCP_RECEIVED_BYTES`
- `GRPC_REQUEST_MESSAGES`
- `GRPC_RESPONSE_MESSAGES`

### Removing Labels to Reduce Cardinality

This is probably the most common customization. You can remove labels that you don't need:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-cardinality
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          tagOverrides:
            source_principal:
              operation: REMOVE
            destination_principal:
              operation: REMOVE
            request_protocol:
              operation: REMOVE
            grpc_response_status:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
```

Each label you remove reduces the number of unique time series. Removing `source_principal` and `destination_principal` alone can cut cardinality significantly since those labels have many unique values (one per service account).

### Adding Custom Labels

You can also add new labels to existing metrics. These are populated from request attributes, response attributes, or static values:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-labels
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            api_version:
              operation: UPSERT
              value: "request.headers['x-api-version']"
            environment:
              operation: UPSERT
              value: "'production'"
```

The `value` field uses Istio's attribute expression language. You can reference:
- `request.headers['header-name']` - request header values
- `response.headers['header-name']` - response header values
- `request.url_path` - the URL path
- `request.method` - the HTTP method
- Static strings wrapped in single quotes like `'production'`

## Namespace-Level Customization

Different teams might need different metrics. Apply Telemetry resources per namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payments-metrics
  namespace: payments
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            # Add payment-specific labels
            payment_method:
              operation: UPSERT
              value: "request.headers['x-payment-method']"
        - match:
            metric: REQUEST_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
        - match:
            metric: RESPONSE_BYTES
            mode: CLIENT_AND_SERVER
          disabled: true
```

Namespace-level configuration merges with the mesh-wide configuration. Namespace settings take precedence for any overlapping overrides.

## Workload-Level Customization

For the most granular control, target specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-gateway-metrics
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          tagOverrides:
            upstream_cluster:
              operation: UPSERT
              value: "request.headers['x-upstream-cluster']"
```

## Disabling Metrics Entirely for Specific Workloads

Some workloads (like internal health check services) don't need metrics at all:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-metrics-healthcheck
  namespace: production
spec:
  selector:
    matchLabels:
      app: health-checker
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          disabled: true
```

## Controlling Envoy Native Metrics

The Telemetry API controls Istio's standard metrics, but Envoy also generates its own native metrics (the `envoy_*` metrics). To control those, use the `proxyStatsMatcher` in the mesh config or pod annotations:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster.outbound"
          - "listener"
          - "server.memory"
        inclusionRegexps:
          - ".*circuit_breakers.*"
```

Without `proxyStatsMatcher`, most Envoy-native metrics are not exposed to Prometheus. Only explicitly included metrics make it through.

Per-pod override:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster.outbound"
          - "upstream_rq"
          - "upstream_cx"
```

## Verifying Your Configuration

After applying Telemetry resources, verify the changes took effect:

```bash
# Check what metrics a specific proxy is generating
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep istio_

# Verify specific labels are present or absent
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep istio_requests_total | head -5
```

You can also check the effective Telemetry configuration:

```bash
istioctl experimental describe pod <pod-name> -n <namespace>
```

## Practical Cardinality Reduction Strategy

Here's a practical approach to reducing metric cardinality without losing important information:

1. Start by removing rarely-used labels mesh-wide:

```yaml
tagOverrides:
  source_principal:
    operation: REMOVE
  destination_principal:
    operation: REMOVE
  grpc_response_status:
    operation: REMOVE
```

2. Disable metrics you don't use:

```yaml
overrides:
  - match:
      metric: REQUEST_BYTES
    disabled: true
  - match:
      metric: RESPONSE_BYTES
    disabled: true
```

3. Disable client-side reporting if server-side is sufficient:

```yaml
overrides:
  - match:
      metric: ALL_METRICS
      mode: CLIENT
    disabled: true
```

This last one is aggressive but effective. It halves your Istio metric volume since each request is only reported from the destination side.

The Telemetry API gives you precise control over what metrics Istio collects. Start with the defaults, monitor your Prometheus cardinality, and trim what you don't need. It's easier to start collecting less and add more later than to deal with an overloaded monitoring system.
