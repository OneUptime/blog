# OpenTelemetry Collector Returns “Unimplemented MetricsService”: Are You Sending the Wrong Signal to Jaeger?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, Jaeger, OTLP, Metrics, Troubleshooting

Description: Diagnose OTLP MetricsService UNIMPLEMENTED errors by identifying the responder and routing traces and metrics only to backends that support each signal.

---

An error like this is unusually specific:

```text
rpc error: code = Unimplemented desc = unknown service
opentelemetry.proto.collector.metrics.v1.MetricsService
```

The client reached a gRPC server and tried to call the OTLP metrics export service, but that server did not implement or enable it. If the destination is Jaeger, this is expected: Jaeger's OTLP write API accepts traces only because Jaeger does not store other telemetry types.

Do not fix this by increasing a timeout or retrying harder. The OTLP specification classifies `UNIMPLEMENTED` as non-retryable: it is a permanent signal or endpoint mismatch until configuration changes.

## What the Error Proves

OTLP/gRPC defines a separate export service for each signal:

```text
Traces  opentelemetry.proto.collector.trace.v1.TraceService/Export
Metrics opentelemetry.proto.collector.metrics.v1.MetricsService/Export
Logs    opentelemetry.proto.collector.logs.v1.LogsService/Export
```

gRPC status code `UNIMPLEMENTED` means the operation is not implemented or is not supported or enabled by the service. That gives more evidence than a generic connection failure:

- DNS and a network connection probably succeeded.
- The client spoke gRPC to a gRPC-capable endpoint.
- The responder did not expose the exact OTLP metrics service the client invoked.

It does **not** prove that Jaeger is the responder. A load balancer may have routed to the wrong service, the hostname may resolve unexpectedly, or a traces-only Collector may be listening at that address.

## First Find Which Component Returned It

The same message can appear in two places.

### The application SDK logs the error

The SDK's metrics exporter is calling an endpoint that lacks OTLP metrics support. That endpoint might be Jaeger directly or a Collector with no metrics pipeline.

Inspect the effective application environment:

```bash
env | grep '^OTEL_' | sort
```

Pay attention to:

```text
OTEL_METRICS_EXPORTER
OTEL_EXPORTER_OTLP_ENDPOINT
OTEL_EXPORTER_OTLP_PROTOCOL
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL
```

Signal-specific settings take precedence over general OTLP settings. Also inspect programmatic SDK configuration, operator injection, and the final container environment.

### The Collector logs the error

The Collector accepted metrics, then one of its exporters called an incompatible destination. Recent Collector log records commonly identify the exporter and data type. Look for fields equivalent to:

```text
kind=exporter data_type=metrics name=otlp/jaeger
```

Log field names can change between Collector versions, so also inspect the pipeline configuration and the `exporter` label on internal metrics. A rising value for the following metric narrows the failure to metrics export:

```promql
rate(otelcol_exporter_send_failed_metric_points[5m])
```

Prometheus may expose counters with a `_total` suffix. Query the Collector's actual metrics endpoint rather than assuming the rendered name.

## Confirm What Jaeger Accepts

Current Jaeger documentation lists these OTLP write endpoints:

| Port | Protocol | Accepted write target |
| ---: | --- | --- |
| `4317` | OTLP/gRPC | `ExportTraceServiceRequest` |
| `4318` | OTLP/HTTP | `/v1/traces` |

Jaeger explicitly documents that only tracing data is accepted. Therefore:

- OTLP/gRPC metrics to Jaeger can return `UNIMPLEMENTED` for `MetricsService`.
- OTLP/gRPC logs can similarly fail for `LogsService`.
- OTLP/HTTP metrics sent to `/v1/metrics` are also unsupported, although the error will be an HTTP response rather than a gRPC `MetricsService` status.

If server reflection is reachable, this command can list registered gRPC services:

```bash
grpcurl -plaintext jaeger:4317 list
```

Use `-plaintext` only for a known plaintext listener. Absence of reflection or a proxy that blocks reflection makes this test inconclusive; Jaeger's API documentation remains the source of truth.

Also verify that the endpoint is actually the Jaeger OTLP write port. Jaeger query port `16685` and legacy collector gRPC port `14250` expose different APIs. They are not substitutes for OTLP on `4317`.

## The Common Collector Misconfiguration

This pipeline sends both signals to the same Jaeger exporter:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger] # Wrong: Jaeger does not accept OTLP metrics.
```

The Collector's `otlp` exporter supports multiple signals, but that says nothing about the remote server. Component compatibility is required at both ends.

The example uses plaintext only to make the mistake easy to see. Do not expose an insecure, unauthenticated receiver or exporter path across untrusted networks.

## Route Each Signal to a Compatible Destination

Keep the Collector as the multi-signal entry point, then give traces and metrics different exporters:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true # Plaintext only inside this controlled example network.

  otlp/metrics_backend:
    endpoint: metrics-backend.example.com:4317
    tls:
      ca_file: /etc/otel/certs/metrics-backend-ca.pem

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/metrics_backend]
```

The metrics destination must actually implement the OTLP `MetricsService`. If it expects Prometheus scraping, remote write, or a vendor-specific API instead, use the matching Collector exporter and follow that backend's official integration guide.

The pipeline type is a contract. A traces pipeline cannot carry metrics, and merely declaring a receiver or exporter does not enable it. Every component has to be referenced by a compatible service pipeline.

## If the Collector Itself Is Traces-Only

An SDK can receive `UNIMPLEMENTED MetricsService` from an OpenTelemetry Collector when the OTLP receiver is active for traces but is not connected to a metrics pipeline. For example:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/jaeger]
```

If the Collector should handle metrics, define a metrics exporter and add a metrics pipeline. If it is intentionally traces-only, stop sending metrics to that endpoint or send them to the organization's metrics Collector.

Running `otelcol components` proves that a distribution contains a receiver or exporter and shows its supported signals. It does not prove that the running configuration enabled a metrics pipeline or that a remote backend supports metrics.

## If You Intentionally Do Not Collect Metrics

Disable automatic metric export at the SDK rather than letting it fail forever:

```bash
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4317
export OTEL_METRICS_EXPORTER=none
export OTEL_LOGS_EXPORTER=none
```

Use this only when dropping metrics and logs is an explicit decision. If those signals are required, point them at compatible destinations instead.

A general endpoint can create the mistake unintentionally:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

When traces, metrics, and logs exporters are all enabled, they inherit that endpoint unless signal-specific configuration overrides it. Jaeger accepts the trace calls and rejects the other service calls, so a healthy trace view can coexist with noisy metric export failures.

## Jaeger SPM Does Not Change the OTLP Write API

Jaeger's Service Performance Monitoring feature displays RED metrics, but that does not mean Jaeger's OTLP receiver accepts arbitrary application metrics.

With a PromQL-compatible design, Jaeger documents a span metrics connector that derives metrics from received spans and exports them to a separate Prometheus-compatible metrics store. Jaeger Query then reads that store. Newer Jaeger deployments can alternatively calculate SPM data from Elasticsearch or OpenSearch trace storage.

Two similarly named APIs should not be confused:

- `opentelemetry.proto.collector.metrics.v1.MetricsService` is the OTLP write service involved in this error.
- `jaeger.api_v2.metrics.MetricsQueryService` is a Jaeger query API used to retrieve SPM data.

Likewise, Jaeger's management `/metrics` endpoint exposes Jaeger's own internal telemetry for Prometheus scraping. It is not an OTLP application-metrics ingest endpoint.

## A Focused Verification Plan

1. Capture the complete error, including the service name and exporter component.
2. Determine whether the SDK or Collector emitted it.
3. Resolve the configured hostname from the emitting process or pod.
4. Inspect the exact endpoint, protocol, and signal-specific overrides.
5. Confirm that the destination documents OTLP metrics ingest support.
6. Ensure `otlp/jaeger` appears only in traces pipelines.
7. Route metrics to a metrics-capable backend, or deliberately disable metric export.
8. Verify that `otelcol_exporter_send_failed_metric_points` stops rising while trace export remains healthy.

Do not mask the problem with an infinite retry window. A backend that does not implement `MetricsService` will not become compatible after backoff.

## Official Documentation

- [Jaeger APIs and supported OTLP write signals](https://www.jaegertracing.io/docs/latest/architecture/apis/)
- [Jaeger Service Performance Monitoring architecture](https://www.jaegertracing.io/docs/latest/architecture/spm/)
- [OpenTelemetry Protocol specification](https://opentelemetry.io/docs/specs/otlp/)
- [OpenTelemetry Collector architecture and pipelines](https://opentelemetry.io/docs/collector/architecture/)
- [OpenTelemetry Collector OTLP receiver](https://github.com/open-telemetry/opentelemetry-collector/tree/main/receiver/otlpreceiver)
- [OpenTelemetry SDK environment variable specification](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)

## Conclusion

`UNIMPLEMENTED MetricsService` is a compatibility error, not a capacity error. Identify the server that returned it, then align each signal with a pipeline and destination that supports that signal. Send traces to Jaeger's OTLP trace endpoint, send metrics to a metrics-capable backend, and remember that Jaeger SPM and management metrics do not add general OTLP metrics ingestion.
