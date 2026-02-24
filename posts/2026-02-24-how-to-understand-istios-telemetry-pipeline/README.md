# How to Understand Istio's Telemetry Pipeline

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Observability, Envoy, Prometheus, Tracing

Description: A walkthrough of how Istio's telemetry pipeline works from data generation in Envoy to collection and export of metrics, traces, and logs.

---

Istio's telemetry pipeline is one of the biggest reasons teams adopt a service mesh. Without writing any instrumentation code, you get metrics, distributed traces, and access logs for every request flowing through your mesh. Understanding how this pipeline works helps you tune it for performance, troubleshoot gaps in your observability data, and customize what gets collected.

## The Three Pillars of Telemetry

Istio generates three types of telemetry data:

**Metrics** - Quantitative measurements about traffic. Request count, latency histograms, request and response sizes, error rates. These are exposed as Prometheus metrics.

**Traces** - Distributed tracing data that tracks a request as it flows through multiple services. Istio generates trace spans at each sidecar hop.

**Access Logs** - Detailed per-request logs that include source, destination, response code, latency, and other metadata.

All three are generated at the Envoy sidecar level. Every request that passes through an Envoy proxy can produce metrics, a trace span, and a log entry.

## How Metrics Are Generated

### The Envoy Stats Engine

Envoy has a built-in stats engine that tracks counters, gauges, and histograms for everything it does. Connection counts, request counts, error counts, latency distributions - Envoy tracks all of it internally.

You can see the raw stats:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | head -30
```

This outputs thousands of stats in Envoy's native format.

### Istio's Standard Metrics

On top of Envoy's native stats, Istio generates a set of standard metrics using the Wasm (WebAssembly) stats filter or the native metadata exchange and stats filters. These are the metrics that start with `istio_`:

- `istio_requests_total` - Request count with rich labels
- `istio_request_duration_milliseconds` - Latency histogram
- `istio_request_bytes` - Request size histogram
- `istio_response_bytes` - Response size histogram
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed
- `istio_tcp_sent_bytes_total` - TCP bytes sent
- `istio_tcp_received_bytes_total` - TCP bytes received

These metrics include labels like `source_workload`, `destination_workload`, `source_namespace`, `destination_namespace`, `request_protocol`, `response_code`, and `connection_security_policy`.

### How Metrics Reach Prometheus

Each sidecar exposes metrics on port 15020 at the path `/stats/prometheus`. Prometheus scrapes this endpoint at regular intervals (typically every 15 seconds).

The flow:
1. Request passes through Envoy
2. Envoy updates internal stats counters
3. Istio's stats filter enriches the stats with workload metadata
4. Prometheus scrapes port 15020
5. The merged metrics endpoint returns Envoy stats in Prometheus format

Verify the endpoint works:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep istio_requests_total | head -5
```

## How Distributed Tracing Works

### Trace Context Propagation

Istio generates trace spans at each sidecar, but to stitch them into a complete trace, the application must propagate trace context headers between incoming and outgoing requests. Istio does NOT do this automatically for you.

The headers your application needs to propagate:

```
x-request-id
x-b3-traceid
x-b3-spanid
x-b3-parentspanid
x-b3-sampled
x-b3-flags
b3
traceparent
tracestate
```

If you are using b3 propagation (Zipkin style), propagate the `x-b3-*` headers. If you are using W3C trace context, propagate `traceparent` and `tracestate`.

The reason Istio cannot propagate these automatically: the sidecar only sees individual connections. It does not know that an incoming request to your service triggered a specific outgoing request. Only your application knows which outgoing calls correspond to which incoming request.

### Trace Span Generation

Each Envoy sidecar generates trace spans for requests it handles. For a request from Service A to Service B:

1. Service A's outbound sidecar generates a client span
2. Service B's inbound sidecar generates a server span

These spans include:
- Operation name (HTTP method and path)
- Start time and duration
- Source and destination service info
- HTTP status code
- Request and response sizes

### Configuring Trace Sampling

By default, Istio samples 1% of traces. For debugging, you might want to increase this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 10.0
```

This sets the sampling rate to 10%. Be careful with high sampling rates in production because they generate a lot of data and can impact performance.

You can override the sampling rate per-pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 100.0
```

Setting it to 100% captures every trace, which is useful for debugging specific services.

### Configuring Trace Exporters

Istio can send traces to various backends. Configure the tracing provider in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        zipkin:
          address: zipkin.istio-system.svc:9411
```

Or for OpenTelemetry:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    defaultConfig:
      tracing:
        sampling: 5.0
```

## How Access Logs Work

Access logs record details about every request. They are generated by the Envoy HTTP connection manager.

### Enabling Access Logs

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

With `accessLogFile: /dev/stdout`, logs go to the sidecar's stdout, which you can read with kubectl:

```bash
kubectl logs deploy/my-app -c istio-proxy --tail=5
```

### Access Log Format

JSON-encoded access logs include fields like:

```json
{
  "authority": "service-b:8080",
  "bytes_received": 0,
  "bytes_sent": 234,
  "downstream_local_address": "10.244.1.5:8080",
  "downstream_remote_address": "10.244.2.3:45678",
  "duration": 12,
  "method": "GET",
  "path": "/api/data",
  "protocol": "HTTP/1.1",
  "request_id": "abc-123-def",
  "response_code": 200,
  "response_flags": "-",
  "route_name": "default",
  "start_time": "2024-01-15T10:30:00.000Z",
  "upstream_cluster": "outbound|8080||service-b.default.svc.cluster.local",
  "upstream_host": "10.244.3.7:8080",
  "upstream_service_time": "10",
  "user_agent": "my-client/1.0"
}
```

The `response_flags` field is particularly useful for debugging. An empty value (or `-`) means the request completed normally. Non-empty values indicate specific issues.

### Using the Telemetry API

Istio's Telemetry API provides a more structured way to configure telemetry:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-telemetry
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 5.0
  metrics:
  - providers:
    - name: prometheus
```

This configures all three telemetry types in a single resource.

## The Performance Impact of Telemetry

Telemetry generation is not free. Each request that goes through Envoy incurs overhead for:
- Updating stats counters and histograms
- Generating trace spans (if sampled)
- Formatting and writing access logs

For metrics, the overhead is relatively small because Envoy updates in-memory counters. The Prometheus scrape happens periodically and is a separate cost.

For tracing, the overhead depends on the sampling rate. At 1% sampling, the overhead is minimal. At 100%, you add measurable latency for span creation and reporting.

For access logging, writing a log entry for every request can be I/O intensive. In high-throughput services, this can be the most expensive telemetry operation.

Monitor the telemetry overhead:

```promql
# CPU used by sidecar (includes telemetry processing)
rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])

# Memory used by sidecar (includes stats storage)
container_memory_working_set_bytes{container="istio-proxy"}
```

The telemetry pipeline in Istio is powerful because it gives you comprehensive observability without code changes. Understanding how metrics flow from Envoy stats through Prometheus, how traces require application-level header propagation, and how access logs capture per-request details helps you configure the pipeline to give you the visibility you need without unnecessary overhead.
