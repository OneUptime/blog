# How to Correlate Logs, Metrics, and Traces When Metrics Have No Trace ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Observability, OpenTelemetry, Prometheus, Grafana, Correlation

Description: Correlate aggregated metrics with logs and traces using shared resource identity, bounded time windows, exemplars, and trace-derived metrics.

---

Most metric points should not have a trace ID. A metric time series aggregates many observations under a bounded set of attributes; a trace ID identifies one execution. Adding every trace ID as a metric label creates an unbounded series per request, defeats aggregation, and can overwhelm a metrics backend.

Correlation therefore uses two layers. Stable resource attributes and time align broad populations across signals. Exemplars preserve selected trace and span IDs for individual measurements, providing a direct jump from an aggregate to representative work.

## Start with a Shared Resource Identity

Emit the same logical identity on metrics, logs, and spans:

~~~text
service.namespace = commerce
service.name = checkout
service.version = 2026.09.03-4f6a2c1
deployment.environment.name = production
k8s.cluster.name = eu-west-primary
k8s.namespace.name = storefront
~~~

Use OpenTelemetry Resources where possible so identity describes the entity producing telemetry rather than being recreated on each instrument. Ensure exporters preserve those attributes or map them predictably into each backend.

In a Prometheus-compatible system, resource mapping may produce labels or a `target_info`-style info metric depending on the exporter and backend. Verify the actual stored schema before writing dashboard joins. Do not assume OTLP resource fields automatically become labels on every metric.

Stable identity enables a broad investigation:

1. An alert identifies `service.name=checkout`, environment, cluster, and a time range.
2. A logs query applies the same dimensions and window.
3. A trace query searches the same service and time for errors or latency.
4. Version and deployment attributes divide changed instances from unaffected ones.

This is population correlation. It narrows the search but does not claim one metric point came from one request.

## Use Exemplars for Direct Metric-to-Trace Jumps

The OpenTelemetry Metrics Data Model defines an exemplar as a recorded measurement associated with context. It may contain `trace_id`, `span_id`, timestamp, value, and filtered attributes. The measurement is already part of the aggregate; the exemplar is not an extra request count.

For a request-duration histogram, an instrumented request with an active sampled span can produce an exemplar:

~~~text
http.server.request.duration_bucket{service_name="checkout",le="1"} 981
# exemplar near 0.842 seconds -> trace_id=4bf92f... span_id=00f067...
~~~

OpenTelemetry's Prometheus/OpenMetrics compatibility rules map trace and span IDs to exemplar labels named `trace_id` and `span_id`. Grafana can display exemplars as markers beside a metric graph and query a configured trace data source when an operator selects one.

Exemplars are samples, not an exhaustive index. A spike can contain thousands of requests and expose only a few representative traces. Sampling and reservoir policy determine which measurements appear, and an exemplar's trace must also be retained in the trace backend for the link to resolve.

## Generate Metrics from Spans When Appropriate

Span-derived metrics create a consistent bridge for request rate, errors, and duration. Grafana Tempo's metrics-generator, for example, can derive span metrics and service-graph metrics from ingested traces and remote-write them to a Prometheus-compatible backend.

This improves schema alignment because service, operation, status, and selected dimensions originate from spans. It does not remove sampling bias: metrics derived from a sampled trace population do not necessarily equal independently instrumented request counters. Know whether your source sees all spans, sampled spans, or adjusted estimates before using it for an SLO.

Keep dimensions bounded. Adding customer ID, URL, trace ID, message ID, or raw SQL creates unacceptable cardinality. Route templates such as `/orders/{id}` are safer than literal paths.

## Build a Correlation-Aware Dashboard

A practical dashboard carries variables for service, environment, cluster, namespace, version, and time range. Its panels might use:

~~~promql
sum by (service_name) (
  rate(http_server_request_duration_seconds_count{
    service_name="$service",
    deployment_environment_name="$environment"
  }[5m])
)
~~~

Exporter naming differs, so this query is illustrative. Confirm whether dots became underscores and which resource attributes were promoted.

The related logs query should reuse the same variables without making trace ID a stream label:

~~~logql
{service_name="$service", environment="$environment"}
  | json
  | level="error"
~~~

From an exemplar, pass its trace ID directly to Tempo. From a trace, configure trace-to-logs mapping using resource/span attributes and a small time window around the span. From a structured log, extract `trace_id` and link back to the trace data source. Grafana documents these as separately configured directions.

## Correlate When No Exemplar Is Available

Use a disciplined narrowing sequence:

- identify the first anomalous metric interval, not just the alert delivery time;
- filter logs and traces by shared service, environment, cluster, and version;
- compare affected and control instances;
- search trace latency/error attributes in the exact interval;
- inspect deployments and configuration changes near the onset;
- account for clock skew and telemetry ingestion delay.

This produces evidence of temporal and dimensional association, not proof of causality. Confirm with a trace path, a reproducible request, or a controlled rollback.

Logs can carry native TraceId and SpanId fields in OTLP, or recommended lowercase fields in non-OTLP formats. Metrics should retain stable dimensions. Traces carry request-specific attributes and links. Each signal contributes a different resolution; forcing one schema onto all three weakens them.

## Verify the Correlation Contract

Create a synthetic transaction with a distinctive but bounded test route. Capture:

1. its active trace ID;
2. one structured log inside the request span;
3. its contribution to a duration histogram;
4. an exemplar when the SDK's filter and sampler select it;
5. shared resource attributes in all three backends.

Then verify metric-to-trace, trace-to-log, and log-to-trace navigation. Also test the expected “no exemplar” path, unsampled traces, delayed logs, and a service version rollout. Monitor dropped exemplars and Collector/export failures where implementations expose those metrics.

## Conclusion

Metrics correlate well precisely because they aggregate rather than carrying an ID per request. Join signals broadly with consistent resource identity and time, then use exemplars for selected direct trace links and structured trace IDs for log navigation. This preserves metric cardinality while still giving responders a reliable path from a spike to concrete executions and their logs.

## Official References

- [OpenTelemetry Metrics Data Model: Exemplars](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars)
- [OpenTelemetry Metrics SDK: Exemplar](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#exemplar)
- [OpenTelemetry Prometheus and OpenMetrics Compatibility](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/)
- [OpenTelemetry Service Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [Grafana: Introduction to Exemplars](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/)
- [Grafana Tempo Metrics-Generator](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/)
