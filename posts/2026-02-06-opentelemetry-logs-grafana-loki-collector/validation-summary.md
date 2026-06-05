# Validation Summary: How to Send OpenTelemetry Logs to Grafana Loki via the Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry logs and OTLP
- Grafana Loki
- Grafana data source provisioning
- LogQL
- Python OpenTelemetry SDK
- Docker Compose

## Sources Consulted
- Grafana Loki documentation: Ingesting logs to Loki using OpenTelemetry Collector - https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki documentation: Native OTLP endpoint compared with Loki Exporter - https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- OpenTelemetry Collector Contrib Loki exporter README - https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/lokiexporter
- Grafana Loki HTTP API documentation - https://grafana.com/docs/loki/latest/api/
- Grafana Loki structured metadata documentation - https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki data source derived fields documentation - https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- OpenTelemetry Python instrumentation documentation - https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry OTLP exporter specification - https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post understated Loki 3.x OTLP label mapping by saying only `service.name`, `service.namespace`, and `service.instance.id` become labels. Updated the explanation to reflect Loki's broader default resource attribute promotion list and the normalized label names such as `service_name`, `service_namespace`, and `service_instance_id`.
- The post presented the Collector Loki exporter as an active alternative for new setups. Updated the wording to state that the exporter is deprecated and that OTLP is preferred for new Loki 3.x deployments.
- The Loki exporter example used `loki.attribute.labels` to promote an attribute created by the `resource` processor. Changed it to `loki.resource.labels`, which is the correct hint for resource attributes.
- The Python example manually added `trace_id` while also claiming the SDK automatically attaches trace and span IDs. Removed the manual trace ID code and set the logger provider globally with `set_logger_provider`, matching the OpenTelemetry Python logging setup.
- The Grafana derived field example used `matcherType: label` with a key-value regex intended for log text. Updated it to match the `trace_id` label or structured metadata key and clarified that the linked Tempo data source must use UID `tempo`.

## Review Notes
- The examples use `latest` Docker image tags, which are valid but can change behavior over time. Pinning image versions would make the tutorial more reproducible.
- The Loki exporter remains available in the Collector contrib distribution at the time of review, but it is deprecated and should be treated as legacy.
