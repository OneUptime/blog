# How to Troubleshoot Missing OpenTelemetry Spans Between the Collector and OpenSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenSearch, Distributed Tracing, Trace, Troubleshooting

Description: Locate missing spans hop by hop across instrumentation, the OpenTelemetry Collector, Data Prepper, and OpenSearch without masking drops or sampling.

---

“The trace is missing” can mean several different things: the application never ended the span, a sampler intentionally dropped it, the Collector did not enable its receiver in a pipeline, an exporter could not enqueue it because its sending queue was full or dropped it after exhausting its retry window, Data Prepper rejected it, OpenSearch rejected a bulk item, or Dashboards queried the wrong time/index.

Use one known trace ID and prove each boundary in order.

## 1. Start with a deterministic test trace

Generate a request whose route, service name, timestamp, and trace ID you can record. Do not begin with low-volume production traffic subject to probabilistic sampling. Temporarily use an always-on sampler only in a controlled environment or for a tightly scoped test service; changing production sampling can multiply ingestion load.

Confirm the span is ended and the SDK flushes before a short-lived process exits. Batch span processors export asynchronously, so CLI jobs and serverless shutdown paths often need the language SDK's supported shutdown/force-flush lifecycle.

## 2. Prove the Collector receives the span

A receiver, processor, or exporter is active only when referenced from a service pipeline:

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
  debug:
    verbosity: detailed
    use_internal_logger: false
    output_paths: [stderr]
  otlp_grpc/data_prepper:
    endpoint: data-prepper:21893
    tls:
      ca_file: /etc/otel/certs/data-prepper-ca.pem

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug, otlp_grpc/data_prepper]
```

Enable the detailed debug exporter briefly and protect its output: span attributes can contain sensitive data. If the known ID never appears, check application endpoint/protocol, DNS, NetworkPolicy/firewall, TLS trust and hostname, authentication, and whether the receiver is in the traces pipeline.

OTLP/gRPC normally uses 4317 and OTLP/HTTP 4318. Sending HTTP to a gRPC endpoint or using the wrong OTLP path is not interchangeable.

## 3. Compare Collector internal telemetry

Scrape the Collector's own metrics and compare receiver accepted/refused spans, processor incoming/outgoing items, exporter sent/send-failed/enqueue-failed spans, queue size/capacity, and in-flight requests; inspect logs for retry activity. Metric names can evolve with Collector releases, so use the internal telemetry documentation for your installed version instead of hard-coding an old dashboard.

Common patterns:

- accepted is zero: instrumented client or receiver/network problem;
- accepted grows but exporter sent does not: processor, sampling, or pipeline wiring;
- send failures/queue grow: Data Prepper unavailable, slow, or rejecting;
- Collector restarts: memory pressure or bad health/liveness configuration.

Use a `memory_limiter` and batching, then size the Collector and exporter queue from observed throughput. Increasing queues without enough memory only delays failure.

When configured under `extensions` and enabled in `service.extensions`, the `zpages` extension can provide live receiver/exporter diagnostics; Collector logs can also help. Expose diagnostic endpoints only on a protected interface.

## 4. Check sampling and processing explicitly

Head sampling in the SDK or Collector makes an early decision. Tail sampling waits for spans and decides at the trace level, which requires enough memory and trace-ID-aware routing so all spans for a trace reach the same tail-sampling Collector instance.

Review every processor and routing stage in the traces path:

- filter expressions that drop health checks or services;
- probabilistic/tail sampling policies;
- attribute transforms that affect routing;
- memory limiter refusal under pressure;
- load balancing that sends spans from one trace to different tail-sampling Collector instances.

An unsampled trace ID may still appear in correlated logs even though no spans are stored. That is expected, not proof of an OpenSearch loss.

## 5. Prove Data Prepper receives and emits spans

The Data Prepper OTLP/trace source must listen on the endpoint used by the Collector. Verify its TLS/auth configuration and source request metrics. Data Prepper processors expose common `recordsIn`, `recordsOut`, and processing-time metrics; trace processors also expose trace-group/cache metrics.

Inspect pipeline logs for buffer backpressure, processor errors, OpenSearch sink retries, and DLQ output. A representative trace pipeline uses the OpenTelemetry trace processor and an OpenSearch sink with a trace-analytics index type; a generic index does not automatically produce the service-map and trace-group structures expected by Trace Analytics.

Data Prepper's trace processor can flush descendant spans that arrive without a root span after its configured interval (the documented default is 180 seconds). An incomplete trace may therefore be delayed rather than permanently missing.

## 6. Read OpenSearch bulk and index state

```http
GET _cat/indices/otel-v1-apm-span*,otel-v1-apm-service-map*,otel-v2-apm-service-map*?v

GET otel-v1-apm-span*/_search
{
  "query": {
    "term": {
      "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
    }
  }
}
```

Adjust the index and field to the actual Data Prepper version/mapping. If Data Prepper shows output but the document is absent, first verify the sink's `hosts` setting and resolved target index. Then inspect the bulk response's top-level `errors` flag and individual item errors—not just the HTTP status—for:

- mapping conflicts;
- `403` index permissions;
- flood-stage read-only blocks;
- rejected writes/backpressure.

Configure a DLQ and finite retry behavior appropriate to your source/acknowledgement design so permanent mapping failures do not retry forever unnoticed.

## 7. Separate storage from UI problems

If the REST query returns the span but Dashboards does not, check the trace dataset/index pattern, data source, tenant/workspace, time field, time zone, and selected range. Current Discover Traces auto-detection looks for `otel-v1-apm-span*`; a custom name requires manual dataset configuration.

## Official References

- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/)
- [OpenTelemetry Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/)
- [OpenSearch Trace Analytics with Data Prepper](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/)
- [OpenSearch Data Prepper OTel trace processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/)
- [OpenSearch Data Prepper OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/)
