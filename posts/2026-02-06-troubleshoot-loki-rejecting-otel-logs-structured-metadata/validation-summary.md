# Validation Summary: How to Troubleshoot Loki Rejecting OpenTelemetry Logs Because

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Grafana Loki
- OpenTelemetry Collector
- OTLP HTTP log ingestion
- Loki structured metadata
- Loki schema configuration
- Loki Helm chart values
- Docker Compose
- LogQL

## Sources Consulted
- Grafana Loki documentation: Ingesting logs to Loki using OpenTelemetry Collector, https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki documentation: What is structured metadata, https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki documentation: Loki HTTP API, https://grafana.com/docs/loki/latest/api/
- Grafana Loki documentation: Upgrade Loki 3.0 structured metadata, OpenTelemetry, schemas, and indexes, https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki documentation: Configuration parameters, https://grafana.com/docs/loki/latest/configure/
- Grafana Loki documentation: Native OTLP endpoint vs Loki Exporter, https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana Loki documentation: Modify default OpenTelemetry labels, https://grafana.com/docs/loki/latest/get-started/labels/modify-default-labels/
- Grafana Loki Helm documentation: AWS deployment values example, https://grafana.com/docs/loki/latest/setup/install/helm/deployment-guides/aws/
- OpenTelemetry Collector contrib repository exporter listing, https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter

## Issues Found
- The post said structured metadata is disabled by default. Grafana Loki docs now show `allow_structured_metadata` defaults to `true` in current Loki and note that structured metadata is enabled by default in Loki 3.0 and later. Updated the text to explain that rejection can still happen with older or custom configurations, and that TSDB plus schema v13 is still required.
- The schema requirement mentioned only schema v13. Grafana's Loki 3.0 upgrade documentation requires both the TSDB index type and the v13 storage schema. Updated the requirement bullets and schema section to include `store: tsdb`.
- The post described `/otlp` as the native receiver endpoint. Loki's HTTP API exposes `POST /otlp/v1/logs`, while the Collector should be configured with `endpoint: http://<loki-addr>/otlp` because `otlphttp` appends `/v1/logs`. Updated the explanation to distinguish the Collector base endpoint from Loki's HTTP route.
- The post presented the older Loki exporter as an active option. Grafana now recommends the native OTLP endpoint and is migrating users away from the Loki exporter; the current OpenTelemetry Collector contrib exporter listing no longer includes `lokiexporter`. Replaced the config example with a compatibility note that recommends the native OTLP endpoint for Loki 3.0 and later.
- The OTLP mapping example said only explicitly indexed attributes become labels, but Loki has default resource attributes promoted as labels unless `ignore_defaults: true` is set. Added `ignore_defaults: true` to make the example match the explanation.
- The structured metadata query example used `| json`, which parses the log line rather than being required for structured metadata. Updated the example to filter directly on the structured metadata field.
- The verification `curl` command put the raw LogQL selector directly in the URL. Loki's HTTP API examples use `-G` and `--data-urlencode`, which avoids curl URL globbing and escaping problems with braces and quotes. Updated the command accordingly.

## Review Notes
The Docker Compose, Helm values, Loki limits, and revised `curl` examples are syntactically plausible. The post could later mention Loki's default OTLP resource label list and cardinality guidance in more detail, but the current corrections keep the scope focused on the rejection error.
