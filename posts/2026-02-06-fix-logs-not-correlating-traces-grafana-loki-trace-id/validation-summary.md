# Validation Summary: How to Fix Logs Not Correlating with Traces in Grafana Loki Because trace_id Is

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Grafana Loki
- Grafana Tempo
- Grafana Loki data source derived fields
- Go `slog`
- OpenTelemetry Go `otelslog` bridge
- Python logging instrumentation

## Sources Consulted
- Grafana Loki documentation, "Ingesting logs to Loki using OpenTelemetry Collector": https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki documentation, "What is structured metadata": https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki documentation, "How is native OTLP endpoint different from Loki Exporter": https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana documentation, "Configure the Loki data source": https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana documentation, "Configure trace to logs correlation": https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Cloud documentation, "OTLP: OpenTelemetry Protocol format considerations": https://grafana.com/docs/grafana-cloud/send-data/otlp/otlp-format-considerations/
- OpenTelemetry Collector Contrib Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL Log Context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector Contrib OTTL Functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- Go package documentation for `go.opentelemetry.io/contrib/bridges/otelslog`: https://pkg.go.dev/go.opentelemetry.io/contrib/bridges/otelslog
- OpenTelemetry Python logs auto-instrumentation example: https://opentelemetry.io/docs/zero-code/python/logs-example/
- OpenTelemetry Python zero-code agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/

## Issues Found
- The post recommended configuring the old Collector `loki` exporter and mapping trace IDs as labels. Updated this to use Loki's native OTLP endpoint with the Collector `otlphttp` exporter, because current Loki documentation recommends OTLP ingestion for Loki 3.0+ and stores trace IDs as structured metadata.
- The post described OTLP-to-Loki failure as missing label configuration. Updated this to structured metadata being disabled, because OTLP log ingestion requires structured metadata support.
- The Collector exporter snippet used outdated `loki` exporter label settings. Replaced it with a current `otlphttp/logs` exporter and logs pipeline example.
- The transform processor example used invalid OTTL syntax: `TraceID().String` is not a valid way to read or convert a log record trace ID. Replaced it with valid `log.trace_id`, `log.span_id`, `TraceID(...)`, and `SpanID(...)` paths/functions.
- The transform processor section said to use the Resource/Attributes processor and claimed it moved values from the body. Updated the section to the Transform Processor and narrowed the claim to copying already-parsed log attributes into OTLP log record fields.
- The Grafana derived field examples omitted the required internal-link query value and used an inconsistent field name. Updated the examples to use `trace_id`, `trace[_]?id`, and `${__value.raw}`.
- The Python logging comment said `trace_id` and `span_id` are added to every log record. Updated it to the documented `otelTraceID` and `otelSpanID` names used by OpenTelemetry Python logging instrumentation.

## Review Notes
The Go and Python snippets remain intentionally minimal and assume the surrounding OpenTelemetry SDK/exporter setup exists. A future revision could add a short note that log bridges and logging instrumentation still need a configured log pipeline/exporter to send OTLP log records.
