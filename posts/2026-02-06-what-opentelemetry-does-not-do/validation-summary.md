# Validation Summary: How to Understand What OpenTelemetry Does NOT Do (It's Not a Backend)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDKs and APIs
- OpenTelemetry Collector
- OTLP exporter configuration
- Python OpenTelemetry tracing and metrics
- Go OpenTelemetry tracing
- Prometheus alerting and PromQL
- Collector persistent queue and file storage extension
- Observability backends including Jaeger, Prometheus, Grafana Loki, Tempo, and commercial platforms

## Sources Consulted
- OpenTelemetry "What is OpenTelemetry?" documentation: https://opentelemetry.io/docs/what-is-opentelemetry/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/pt/docs/collector/resiliency/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go getting started and instrumentation documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus/OpenMetrics counter suffix documentation: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Prometheus metric naming best practices: https://prometheus.io/docs/practices/naming/

## Issues Found
- The Go tracing snippet imported `go.opentelemetry.io/otel/trace` without using it and referenced `context.Context` without importing `context`. Removed the unused `trace` import and added `context` so the snippet matches Go import rules and OpenTelemetry Go examples.
- The Prometheus alert expression queried `http_server_requests` for a counter. Prometheus/OpenMetrics counter samples conventionally use the `_total` suffix, so the expression now queries `http_server_requests_total`.
- The sampling snippet used `TracerProvider` without importing it. Added `from opentelemetry.sdk.trace import TracerProvider`.
- The OTLP header example used `Authorization=Bearer token123` with a raw space. The OTLP exporter specification says `OTEL_EXPORTER_OTLP_HEADERS` uses W3C Baggage-style key-value formatting, so the space is now percent-encoded as `Bearer%20token123`.

## Review Notes
The post's main conceptual claims are accurate: OpenTelemetry is instrumentation, collection, processing, export, and context propagation infrastructure, while storage, querying, visualization, alerting, retention, user access control, and most cost management live in observability backends or surrounding operational systems. The Collector persistent queue example is correctly framed as reliability buffering, not permanent backend storage. Local Go compilation was not possible because `go` is not installed in this environment, so Go validation was static against official OpenTelemetry Go documentation.
