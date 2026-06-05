# Validation Summary: How to Configure the Grafana Cloud Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Grafana Cloud
- Grafana Cloud Metrics / Prometheus remote write
- Grafana Cloud Loki
- Grafana Cloud Tempo
- Kubernetes
- YAML configuration

## Sources Consulted
- Grafana Cloud documentation: Send data to the Grafana Cloud OTLP endpoint: https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/
- Grafana OpenTelemetry documentation: Set up OpenTelemetry Collector for Application Observability: https://grafana.com/docs/opentelemetry/collector/opentelemetry-collector/
- Grafana Cloud documentation: Collect logs with the OpenTelemetry Collector: https://grafana.com/docs/grafana-cloud/send-data/logs/collect-logs-with-otel/
- Grafana Loki documentation: Native OTLP endpoint vs Loki Exporter: https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- OpenTelemetry Collector Contrib span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib Prometheus remote write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib v0.153.0 release listing: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0

## Issues Found
- The post used the deprecated Loki exporter configuration with `format` and `labels`. Updated log export examples to use the `otlphttp/loki` exporter and Loki's native OTLP endpoint path, which is the current Grafana-recommended path for OpenTelemetry logs.
- The Prometheus remote write example used generic `sending_queue`, which the `prometheusremotewrite` exporter does not support. Changed it to `remote_write_queue`.
- The span metrics example used the old `spanmetrics` processor pattern and deprecated component name. Replaced it with the `span_metrics` connector and wired it as an exporter from the traces pipeline and receiver in the metrics pipeline.
- The span metrics example declared `service.name` as an explicit dimension, but `span_metrics` already includes it by default and Collector validation rejects the duplicate. Removed the duplicate dimension.
- The Collector environment variable references used the older `${GRAFANA_CLOUD_AUTH}` form. Updated examples to `${env:GRAFANA_CLOUD_AUTH}`.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with an explicit Prometheus pull reader.
- The metrics label example used a YAML boolean for `new_value`. Quoted it as `"true"` so it is a string label value.
- The Kubernetes manifest pinned `otel/opentelemetry-collector-contrib:0.95.0`, which is outdated. Updated it to `0.153.0`, the latest release found during review.

## Review Notes
- Validated the complete Collector configuration snippets and the embedded ConfigMap Collector config with `otelcol-contrib validate` using OpenTelemetry Collector Contrib v0.153.0.
- The Kubernetes manifest parsed successfully as ConfigMap, Secret, Deployment, and Service YAML documents. `kubectl` was not installed in the review environment, so server/client-side Kubernetes schema validation was not run.
