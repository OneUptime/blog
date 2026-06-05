# Validation Summary: How to Build a Log Analytics Dashboard from OpenTelemetry Log Signals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry logs
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- Grafana Loki
- LogQL
- Grafana dashboards and Loki datasource provisioning
- Grafana Tempo trace correlation

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK logs API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/_logs.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry semantic convention registry for deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki labels documentation: https://grafana.com/docs/loki/latest/get-started/labels/
- Grafana Loki structured metadata documentation: https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki LogQL documentation and reference: https://grafana.com/docs/loki/latest/logql/ and https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki datasource configuration documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Tempo trace-to-logs correlation documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/

## Issues Found
- The Collector configuration used the old Loki exporter and `/loki/api/v1/push` path. Current Loki documentation recommends sending OTLP logs with the Collector `otlphttp` exporter to Loki's native `/otlp` endpoint, so the exporter and architecture diagram were updated.
- The Collector snippet used obsolete Loki exporter label-mapping fields. Loki now maps OTLP resource attributes to index labels and structured metadata during ingestion, so the invalid mapping block was removed and replaced with a Loki `limits_config.otlp_config` note for severity labels.
- The resource attribute `deployment.environment` is deprecated in OpenTelemetry semantic conventions. It was changed to `deployment.environment.name`.
- The text incorrectly said Loki performs best with a small number of high-cardinality labels. It now says low-cardinality labels.
- The LogQL examples queried labels named `service` and `severity`, but Loki's OTLP mapping normalizes `service.name` to `service_name`, and severity must be queried as `severity_text` when configured as a label. The queries were updated.
- The top error message query grouped by `body`, which is not a Loki label. It now extracts a query-time `message` label with the LogQL `regexp` parser before aggregating.
- The trace correlation query used `| json`, but OTLP-ingested `trace_id` is stored as structured metadata. It now filters directly on `trace_id`.
- The Grafana derived field example used a regex against the log line, which does not work for `trace_id` stored as structured metadata. It now uses a label-based matcher.
- The retention guidance implied severity-based retention is always available. It now states that per-stream retention by severity requires severity to be an index label, or separate tenants/instances/pipelines should be used.

## Review Notes
The Python logging example uses current OpenTelemetry Python log APIs and OTLP gRPC exporter classes. The `_logs` module path remains the documented SDK path for logs, but future OpenTelemetry Python releases may eventually expose a non-underscored stable import path.
