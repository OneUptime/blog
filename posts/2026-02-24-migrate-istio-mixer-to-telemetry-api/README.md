# How to Migrate from Istio Mixer to Telemetry API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Migration, Observability, Envoy

Description: Step-by-step guide to migrating from the deprecated Istio Mixer component to the modern Telemetry API for metrics, logs, and tracing.

---

If you have been running Istio for a while, you might still have Mixer-based telemetry configuration hanging around. Mixer was removed in Istio 1.12, and all its functionality has been replaced by the Telemetry API and Envoy-native extensions. If you are upgrading from an older Istio version, migrating your telemetry configuration is a required step.

This guide walks through how to move from Mixer-based telemetry to the modern Telemetry API.

## Why Mixer Was Removed

Mixer was a separate component that sat in the data path for every request. Every time a request went through an Envoy sidecar, the sidecar sent check and report calls to Mixer. This architecture had serious performance problems:

- Additional network hop for every request
- Single point of failure in the telemetry pipeline
- High CPU and memory usage in large deployments
- Added 5-10ms of latency per request

The replacement approach moves all telemetry collection directly into the Envoy proxy using WebAssembly (Wasm) extensions and native Envoy filters. This eliminates the extra network hop and significantly reduces latency.

## Identifying Mixer Configuration

First, check if you have any Mixer-related resources in your cluster:

```bash
# Look for old Mixer resources
kubectl get instances --all-namespaces 2>/dev/null
kubectl get handlers --all-namespaces 2>/dev/null
kubectl get rules --all-namespaces 2>/dev/null
kubectl get adapters --all-namespaces 2>/dev/null
kubectl get templates --all-namespaces 2>/dev/null
```

Also check for Mixer-related configuration in your IstioOperator or Helm values:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -i mixer
```

If you see references to `mixer`, `policy`, or `telemetry` components, those need to be migrated.

## Migration Path: Metrics

### Old Mixer-Based Metrics Configuration

With Mixer, you defined metrics using `instance`, `handler`, and `rule` resources:

```yaml
# Old way - Mixer instance
apiVersion: config.istio.io/v1alpha2
kind: instance
metadata:
  name: requestcount
  namespace: istio-system
spec:
  compiledTemplate: metric
  params:
    value: "1"
    dimensions:
      source: source.workload.name | "unknown"
      destination: destination.workload.name | "unknown"
      response_code: response.code | 200
    monitored_resource_type: '"UNSPECIFIED"'
---
# Old way - Mixer handler
apiVersion: config.istio.io/v1alpha2
kind: handler
metadata:
  name: prometheus
  namespace: istio-system
spec:
  compiledAdapter: prometheus
  params:
    metrics:
    - name: request_count
      instance_name: requestcount.instance.istio-system
      kind: COUNTER
      label_names:
      - source
      - destination
      - response_code
```

### New Telemetry API Configuration

The Telemetry API replaces all of this with a much simpler resource:

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

This enables the default set of metrics that Istio collects. The standard metrics are built into the Envoy proxy and include:

- `istio_requests_total` - total request count
- `istio_request_duration_milliseconds` - request duration histogram
- `istio_request_bytes` - request body size
- `istio_response_bytes` - response body size
- `istio_tcp_sent_bytes_total` - TCP bytes sent
- `istio_tcp_received_bytes_total` - TCP bytes received
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed

### Customizing Metrics

If you had custom dimensions in your Mixer configuration, use tag overrides in the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: CLIENT_AND_SERVER
      tagOverrides:
        request_protocol:
          operation: UPSERT
          value: "request.protocol"
        response_flags:
          operation: UPSERT
          value: "response.flags"
```

### Disabling Specific Metrics

If you want to reduce cardinality by disabling certain metrics:

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
      disabled: true
    - match:
        metric: RESPONSE_BYTES
      disabled: true
```

## Migration Path: Access Logging

### Old Mixer-Based Access Logging

Mixer used a stdio handler for access logging:

```yaml
# Old way
apiVersion: config.istio.io/v1alpha2
kind: handler
metadata:
  name: accesslog
  namespace: istio-system
spec:
  compiledAdapter: stdio
  params:
    outputAsJson: true
---
apiVersion: config.istio.io/v1alpha2
kind: rule
metadata:
  name: access-log
  namespace: istio-system
spec:
  match: "true"
  actions:
  - handler: accesslog
    instances:
    - accesslog.instance.istio-system
```

### New Telemetry API Access Logging

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

You can configure the access log format in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
      %DURATION% "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
      "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%" "%UPSTREAM_HOST%"
    accessLogEncoding: JSON
```

### Per-Namespace Access Logging

You can enable access logging for specific namespaces only:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: namespace-logging
  namespace: production
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

This only logs requests that return 4xx or 5xx status codes, which is useful for reducing log volume while still capturing errors.

## Migration Path: Tracing

### Old Mixer-Based Tracing

Mixer handled trace span reporting through adapters:

```yaml
# Old way
apiVersion: config.istio.io/v1alpha2
kind: handler
metadata:
  name: zipkin
  namespace: istio-system
spec:
  compiledAdapter: zipkin
  params:
    url: http://zipkin.istio-system:9411/api/v2/spans
```

### New Telemetry API Tracing

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

Configure the tracing provider in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: zipkin
      zipkin:
        service: zipkin.istio-system.svc.cluster.local
        port: 9411
    - name: otel
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
```

### Using OpenTelemetry Instead of Zipkin

If you are migrating, this is a good time to also switch to OpenTelemetry:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 5.0
```

## Step-by-Step Migration Process

1. **Audit existing Mixer config**: List all Mixer-related resources
2. **Create equivalent Telemetry API resources**: Build the new configuration
3. **Apply new configuration alongside old**: Both can coexist temporarily
4. **Verify metrics are flowing**: Check Prometheus targets and Grafana dashboards
5. **Verify traces are flowing**: Check your tracing backend
6. **Verify access logs**: Check pod logs for Envoy access log entries
7. **Remove old Mixer resources**: Delete the instances, handlers, and rules
8. **Remove Mixer from Istio installation**: Update your IstioOperator to not install Mixer

```bash
# Verify metrics are being collected
kubectl exec -it deploy/prometheus-server -n monitoring -- \
  wget -qO- 'http://localhost:9090/api/v1/query?query=istio_requests_total' | head -20

# Verify tracing
kubectl port-forward svc/zipkin -n istio-system 9411:9411
# Open http://localhost:9411 and check for traces

# Remove old Mixer resources
kubectl delete instances --all -n istio-system
kubectl delete handlers --all -n istio-system
kubectl delete rules --all -n istio-system
```

## Gotchas During Migration

**Metric name changes**: Some Mixer metric names are different from the Envoy-native names. For example, Mixer used `istio_requests_total` with slightly different label names. Update your Grafana dashboards and alert rules to match the new label names.

**Custom adapters**: If you used custom Mixer adapters (like for custom backends), you need to find an alternative. The Telemetry API supports extension providers, or you can use Envoy access log gRPC sinks to send data to custom backends.

**Sampling rate changes**: Mixer had its own sampling configuration. Make sure your new Telemetry API sampling rate matches what you had before, or you might see more or fewer traces than expected.

The migration from Mixer to the Telemetry API is well worth the effort. You get better performance, simpler configuration, and a more maintainable setup. Take the time to verify each telemetry signal (metrics, traces, logs) as you migrate, and you will have a smooth transition.
