# Validation Summary: How to use OpenTelemetry with Loki for unified logs and traces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Python SDK and logging instrumentation
- Grafana Loki
- Grafana Tempo
- Grafana data source provisioning
- LogQL
- Docker

## Sources Consulted
- Grafana Loki documentation: Getting started with the OpenTelemetry Collector and Loki tutorial: https://grafana.com/docs/loki/latest/send-data/otel/otel-collector-getting-started/
- Grafana Loki documentation: Native OTLP endpoint vs. Loki exporter: https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana Loki documentation: Loki HTTP API, OTLP ingestion endpoint: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki documentation: OpenTelemetry default labels and label cardinality guidance: https://grafana.com/docs/loki/latest/get-started/labels/
- Grafana Loki documentation: Storage schema and TSDB guidance: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana documentation: Loki data source provisioning and derived fields: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana documentation: Tempo data source provisioning and tracesToLogsV2: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- OpenTelemetry Python documentation: Python instrumentation and logs SDK example: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Contrib documentation: logging instrumentation trace context injection: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/logging.html

## Issues Found
- The Loki configuration used `boltdb-shipper` with schema `v11`. Updated it to `tsdb` with schema `v13`, which is the current recommended Loki storage schema and required for Loki 3 structured metadata workflows.
- The Collector configuration used the older `loki` exporter and `/loki/api/v1/push`. Updated it to `otlphttp/logs` with `endpoint: http://loki:3100/otlp`, matching Loki's native OTLP ingestion guidance.
- The Collector snippet attempted to map `trace_id` and `span_id` as Loki labels. Removed that mapping because trace and span IDs are high-cardinality values and should remain structured metadata.
- The Python sample created spans without configuring a real tracer provider or trace exporter. Added a `TracerProvider`, `BatchSpanProcessor`, and `OTLPSpanExporter` so trace context is valid and exportable.
- The Python sample did not set `service.name`, while the LogQL examples queried `service_name="my-app"`. Added an OpenTelemetry `Resource` with `service.name: my-app` to both the log and trace providers.
- The Grafana Tempo data source used the older `tracesToLogs` block. Updated it to `tracesToLogsV2` and added explicit Loki and Tempo data source UIDs.
- The LogQL examples queried old Loki exporter-style labels and JSON fields such as `{service="my-app"}`, `{job="my-app"}`, and `level`. Updated them to native OTLP/Loki fields such as `service_name`, `severity_text`, and structured metadata filtering on `trace_id`.
- The best-practice guidance incorrectly recommended always using `trace_id` and `span_id` as Loki labels. Updated it to recommend keeping them as structured metadata to avoid high-cardinality labels.

## Review Notes
- The Docker command is syntactically valid for running a Loki container with a mounted configuration file.
- The Grafana Loki `derivedFields` regex applies to trace IDs present in log text. The Tempo `tracesToLogsV2` configuration is the current primary path for navigating from traces to Loki logs filtered by trace ID.
