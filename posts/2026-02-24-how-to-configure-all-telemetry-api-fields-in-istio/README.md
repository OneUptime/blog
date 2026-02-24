# How to Configure All Telemetry API Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Observability, Metrics, Tracing, Kubernetes

Description: Complete reference for the Istio Telemetry API covering metrics customization, tracing configuration, access logging, and provider-specific settings.

---

The Telemetry API is Istio's way of letting you configure observability features like metrics, tracing, and access logging on a per-workload or per-namespace basis. Before this API existed, you had to modify global mesh config or use EnvoyFilter to customize telemetry. The Telemetry API is much cleaner and safer.

## Top-Level Structure

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: my-telemetry
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  targetRef:
    kind: Service
    group: ""
    name: my-service
  tracing:
    - providers:
        - name: zipkin
  metrics:
    - providers:
        - name: prometheus
  accessLogging:
    - providers:
        - name: envoy
```

The Telemetry resource supports three observability pillars: tracing, metrics, and access logging. Each can be configured independently.

## Selector and Target Ref

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
```

Works like other Istio resources. If omitted, the telemetry config applies to all workloads in the namespace. A Telemetry in `istio-system` without a selector is the mesh-wide default.

```yaml
spec:
  targetRef:
    kind: Gateway
    group: gateway.networking.k8s.io
    name: my-gateway
```

The `targetRef` is for Gateway API integration, mutually exclusive with `selector`.

## Tracing Configuration

```yaml
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 10.0
      disableSpanReporting: false
      useRequestIdForTracePropagation: true
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
      match:
        mode: CLIENT_AND_SERVER
```

### Providers

```yaml
providers:
  - name: zipkin
```

The `name` references a tracing provider configured in MeshConfig's `extensionProviders` or `defaultProviders`. Common providers include `zipkin`, `opentelemetry`, and custom ones you define.

### Sampling

```yaml
randomSamplingPercentage: 10.0
```

Controls what percentage of traces are sampled. A value of 100 means all requests are traced. A value of 1 means 1% of requests. In production, you typically want something between 1 and 10 to keep costs manageable.

### Disable Span Reporting

```yaml
disableSpanReporting: false
```

When set to true, traces are still propagated (headers are forwarded) but no spans are reported to the backend. Useful when you want trace context to flow through a service without generating data.

### Request ID for Trace Propagation

```yaml
useRequestIdForTracePropagation: true
```

When true, the x-request-id header is used to correlate traces. This helps maintain trace continuity even when some services in the chain do not propagate tracing headers properly.

### Custom Tags

```yaml
customTags:
  my_tag:
    literal:
      value: "fixed-value"
  request_header_tag:
    header:
      name: x-custom-header
      defaultValue: "not-set"
  env_tag:
    environment:
      name: MY_ENV_VAR
      defaultValue: "default"
```

Custom tags add additional key-value pairs to every span. Three sources:

- `literal` - a fixed string value
- `header` - extracted from a request header
- `environment` - read from an environment variable on the proxy

### Match

```yaml
match:
  mode: CLIENT_AND_SERVER
```

The `mode` controls which traffic direction the tracing applies to:

- `CLIENT_AND_SERVER` - both inbound and outbound (default)
- `CLIENT` - outbound requests only
- `SERVER` - inbound requests only

## Metrics Configuration

```yaml
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT_AND_SERVER
          tagOverrides:
            response_code:
              operation: UPSERT
              value: "response.code"
            custom_dimension:
              operation: UPSERT
              value: "'custom-value'"
            remove_this:
              operation: REMOVE
          disabled: false
        - match:
            metric: ALL_METRICS
            mode: SERVER
            customMetric: my_custom_metric
          disabled: false
```

### Providers

```yaml
providers:
  - name: prometheus
```

References a metrics provider from MeshConfig. The default Istio installation includes a `prometheus` provider.

### Overrides

Overrides let you customize how specific metrics are generated.

#### Match

```yaml
match:
  metric: REQUEST_COUNT
  mode: CLIENT
  customMetric: ""
```

The `metric` field can be:

- `ALL_METRICS` - applies to all standard metrics
- `REQUEST_COUNT` - the istio_requests_total metric
- `REQUEST_DURATION` - the istio_request_duration_milliseconds metric
- `REQUEST_SIZE` - the istio_request_bytes metric
- `RESPONSE_SIZE` - the istio_response_bytes metric
- `TCP_OPENED_CONNECTIONS` - the istio_tcp_connections_opened_total metric
- `TCP_CLOSED_CONNECTIONS` - the istio_tcp_connections_closed_total metric
- `TCP_SENT_BYTES` - the istio_tcp_sent_bytes_total metric
- `TCP_RECEIVED_BYTES` - the istio_tcp_received_bytes_total metric
- `GRPC_REQUEST_MESSAGES` - the istio_request_messages_total metric
- `GRPC_RESPONSE_MESSAGES` - the istio_response_messages_total metric

The `customMetric` field matches custom metrics by name.

The `mode` is the same as tracing: `CLIENT_AND_SERVER`, `CLIENT`, or `SERVER`.

#### Tag Overrides

```yaml
tagOverrides:
  response_code:
    operation: UPSERT
    value: "response.code"
  destination_service:
    operation: UPSERT
    value: "destination.service.host"
  unwanted_tag:
    operation: REMOVE
```

Operations:

- `UPSERT` - add or update a tag. The `value` is a CEL expression or Envoy attribute.
- `REMOVE` - remove a tag from the metric. No `value` needed.

This is useful for reducing metric cardinality by removing high-cardinality tags, or adding custom dimensions.

#### Disabled

```yaml
overrides:
  - match:
      metric: REQUEST_DURATION
    disabled: true
```

Setting `disabled: true` turns off that specific metric entirely. This is useful for reducing metrics volume when you do not need certain metrics.

## Access Logging Configuration

```yaml
spec:
  accessLogging:
    - providers:
        - name: envoy
      disabled: false
      match:
        mode: CLIENT_AND_SERVER
      filter:
        expression: "response.code >= 400"
```

### Providers

```yaml
providers:
  - name: envoy
```

The `envoy` provider is the built-in Envoy access logger. You can configure custom providers in MeshConfig (like OpenTelemetry log exporters or Stackdriver).

### Disabled

```yaml
disabled: false
```

Set to true to disable access logging for matching workloads.

### Match

```yaml
match:
  mode: SERVER
```

Same mode options as tracing and metrics: `CLIENT_AND_SERVER`, `CLIENT`, or `SERVER`.

### Filter

```yaml
filter:
  expression: "response.code >= 400"
```

The `expression` field uses CEL (Common Expression Language) to filter which requests get logged. Only requests where the expression evaluates to true are logged. Some useful expressions:

```yaml
# Log only errors
filter:
  expression: "response.code >= 400"

# Log slow requests
filter:
  expression: "response.duration > duration('1s')"

# Log specific paths
filter:
  expression: "request.url_path.startsWith('/api/')"

# Combine conditions
filter:
  expression: "response.code >= 500 || response.duration > duration('5s')"
```

## Complete Example

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: production-telemetry
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      app: productpage
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
            name: CLUSTER_NAME
            defaultValue: "unknown"
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            response_code:
              operation: UPSERT
              value: "response.code"
        - match:
            metric: REQUEST_DURATION
            mode: CLIENT
          disabled: true
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 500"
      match:
        mode: SERVER
```

This configuration samples 5% of traces with custom tags, keeps all metrics but removes client-side request duration, and only logs server-side requests that result in 5xx errors. It is a good balance between observability and resource usage for production workloads.

The Telemetry API is the right way to customize observability in modern Istio. It is more targeted than global mesh config and much safer than EnvoyFilter.
