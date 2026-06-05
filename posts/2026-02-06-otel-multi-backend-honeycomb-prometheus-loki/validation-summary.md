# Validation Summary: How to Configure Multi-Backend Export from a Single Collector to Honeycomb,

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- Honeycomb OTLP ingestion
- Prometheus remote write
- Grafana Loki OTLP log ingestion
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Honeycomb OpenTelemetry Collector documentation: https://docs.honeycomb.io/send-data/opentelemetry/collector
- Prometheus HTTP API remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/otel-collector-getting-started/
- Grafana Loki native OTLP endpoint vs Loki exporter documentation: https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana Loki OTLP ingestion and attribute mapping documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Grafana Loki label guidance: https://grafana.com/docs/loki/latest/get-started/labels/

## Issues Found
- The post used the deprecated `prometheusremotewrite` Collector component name. Updated snippets to use the current `prometheus_remote_write` component name.
- The post sent logs through the old `loki` exporter and configured removed Loki exporter label fields. Updated the Collector configuration to use `otlphttp/loki` with Loki's native OTLP endpoint at `/otlp`.
- The Loki label mapping example showed Collector-side `labels` configuration that is no longer valid for the native Loki OTLP path. Replaced it with Loki-side `limits_config.otlp_config` index-label mapping.
- The Prometheus remote write section omitted the requirement to enable the receiver endpoint on Prometheus. Added the `--web.enable-remote-write-receiver` prerequisite.
- The Collector internal metrics example used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Updated it to configure a Prometheus pull reader with `host` and `port`.
- The Loki label-count guidance said "under 10"; adjusted it to the current Grafana guidance of roughly 10-15 labels at most.
- The explanation of `resource_to_telemetry_conversion` implied service identification is simply lost when disabled. Clarified that resource attributes remain available through the generated `target_info` metric unless copied to every series.
- The introduction implied all signal types fan out from one shared pipeline. Clarified that this setup uses one Collector configuration with signal-specific pipelines.

## Review Notes
The revised Collector snippets assume a current OpenTelemetry Collector distribution that includes `prometheus_remote_write` and `otlphttp`. Loki 3.0 and later enables structured metadata by default; older Loki deployments must enable `limits_config.allow_structured_metadata` for native OTLP ingestion.
