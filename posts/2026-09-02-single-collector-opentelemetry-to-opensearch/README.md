# Send All OpenTelemetry Signals to OpenSearch Through One Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Observability, Logging, Metric, Trace

Description: Route all three OpenTelemetry signals through one Collector and one Data Prepper OTLP endpoint into signal-specific OpenSearch indexes.

---

A single OpenTelemetry Collector can receive logs, metrics, and traces, but the Collector still needs one service pipeline per signal. The clean convergence point is OpenSearch Data Prepper's unified `otlp` source: all three Collector pipelines use one OTLP exporter and one endpoint, and Data Prepper routes each event to the correct processing path.

This distinction matters. "One Collector" does not mean mixing the signals into one index. Logs, metrics, and spans have different schemas and should remain independently mapped and retained.

## Architecture

```text
applications -> OTel Collector -> Data Prepper :21893 -> OpenSearch
                    |                    |
             3 signal pipelines    route by event type
```

The unified Data Prepper source is available in Data Prepper 2.12 and later. Earlier versions used separate `otel_logs_source`, `otel_metrics_source`, and `otel_trace_source` endpoints, so check the documentation for the version you run before copying this configuration.

## Configure the Collector

The following Collector configuration accepts OTLP over gRPC and HTTP, adds memory limiting and batching, and sends every signal through the same exporter:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
  batch: {}

exporters:
  otlp_grpc/data_prepper:
    endpoint: data-prepper:21893
    tls:
      insecure: true # Development only; use a trusted CA in production.

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp_grpc/data_prepper]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp_grpc/data_prepper]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp_grpc/data_prepper]
```

Defining a receiver or exporter is not enough: it must be referenced by a pipeline under `service`. A missing reference is a common reason that one signal silently appears absent.

## Route signals in Data Prepper

Data Prepper's `getEventType()` function distinguishes `LOG`, `METRIC`, and `TRACE` events. This abbreviated production-shaped example shows the routing boundary. It is a deployment template: Data Prepper does not expand ordinary `${VAR}` references in `pipelines.yaml`, so render the credential placeholders with your deployment or secret-management tooling before startup.

```yaml
version: "2"
otel-entry:
  source:
    otlp:
      port: 21893
      ssl: false # Replace with ssl_certificate_file and ssl_key_file in production.
      health_check_service: true
  route:
    - logs: 'getEventType() == "LOG"'
    - metrics: 'getEventType() == "METRIC"'
    - traces: 'getEventType() == "TRACE"'
  sink:
    - opensearch:
        routes: [logs]
        hosts: ["https://opensearch:9200"]
        username: "${OPENSEARCH_USER}"
        password: "${OPENSEARCH_PASSWORD}"
        index: logs-otel-%{yyyy.MM.dd}
    - pipeline:
        name: metrics-pipeline
        routes: [metrics]
    - pipeline:
        name: traces-pipeline
        routes: [traces]

metrics-pipeline:
  source:
    pipeline:
      name: otel-entry
  processor:
    - otel_metrics:
        calculate_histogram_buckets: true
        calculate_exponential_histogram_buckets: true
  sink:
    - opensearch:
        hosts: ["https://opensearch:9200"]
        username: "${OPENSEARCH_USER}"
        password: "${OPENSEARCH_PASSWORD}"
        index: metrics-otel-%{yyyy.MM.dd}

traces-pipeline:
  source:
    pipeline:
      name: otel-entry
  processor:
    - otel_traces: {}
  sink:
    - opensearch:
        hosts: ["https://opensearch:9200"]
        username: "${OPENSEARCH_USER}"
        password: "${OPENSEARCH_PASSWORD}"
        index_type: trace-analytics-plain-raw
```

For full Trace Analytics, add the service-map branch documented by OpenSearch rather than treating raw spans as the entire trace pipeline.

## Verify each boundary

First validate the effective Collector configuration and watch its own telemetry. Then query OpenSearch independently for each signal:

```http
GET _cat/indices/logs-otel-*,metrics-otel-*,otel-v1-apm-span*?v&expand_wildcards=all

GET logs-otel-*/_count
GET metrics-otel-*/_count
GET otel-v1-apm-span*/_count
```

If a signal is missing, check in this order:

1. The application exports that signal to port `4317` or `4318`.
2. The receiver is enabled in that signal's service pipeline.
3. The shared exporter can resolve and reach `data-prepper:21893`.
4. Data Prepper's source counters show received and successful requests.
5. The route matches the event type and the OpenSearch sink reports no bulk or mapping errors.

Use TLS verification and authentication between every network hop in production. `insecure: true` and `ssl: false` are useful for an isolated local test, not a security design.

## Official References

- [OpenSearch Data Prepper unified OTLP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/)
- [OpenSearch Data Prepper OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/)
