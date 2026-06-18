# Validation Summary: How to Run Dual Telemetry Pipelines During a Gradual Migration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector OTLP receiver and exporter
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector Prometheus Remote Write exporter
- OpenTelemetry Collector resource, batch, and tail sampling processors
- OpenTelemetry Collector internal telemetry
- OpenTelemetry Python metrics API and OTLP metrics exporter
- Prometheus remote write receiver and PromQL
- Jaeger OTLP trace ingestion

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry blog on migrating away from the Jaeger exporter: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry sampling documentation: https://opentelemetry.io/docs/concepts/sampling/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus command-line flags documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Jaeger API documentation: https://www.jaegertracing.io/docs/1.55/apis/

## Issues Found
- The post claimed dual pipelines ensure zero data loss. This is too absolute for a migration pattern, so the description and introduction now say dual pipelines reduce data-loss risk and help avoid losing visibility.
- The Prometheus remote write exporter examples pointed at a Prometheus server endpoint without noting that Prometheus must explicitly enable its remote write receiver. The post now explains that `--web.enable-remote-write-receiver` is required when the destination is Prometheus, or that the exporter should point to another remote write-compatible backend.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which current Collector documentation says is ignored as of v0.123.0. The snippet now uses the current pull reader Prometheus exporter form with `host` and `port`.
- The traces example used the removed native `jaeger` exporter. Current OpenTelemetry guidance is to send OTLP to Jaeger because Jaeger accepts OTLP natively. The example now uses a named `otlp/jaeger` exporter targeting Jaeger's OTLP/gRPC port.
- The cost section implied tail sampling could reduce volume for only one backend in a shared fan-out pipeline. The wording now clarifies that separate trace pipelines are needed if sampling should apply only to one path.
- The cost section implied batch behavior could be changed for one exporter path inside a shared pipeline. The wording now says to use a separate pipeline with its own batch processor when the legacy path needs different batching.

## Review Notes
The Python metrics example is syntactically consistent with the current OpenTelemetry Python metrics API and OTLP metrics exporter constructor. The Collector snippets are illustrative and still need validation against the exact Collector distribution and backend endpoints used in a production environment.
