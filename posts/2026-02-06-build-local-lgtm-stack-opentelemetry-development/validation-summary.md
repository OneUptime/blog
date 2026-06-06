# Validation Summary: How to Build a Local LGTM Stack for OpenTelemetry Development

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Docker Compose
- Grafana
- Grafana Tempo
- Grafana Mimir
- Grafana Loki
- telemetrygen

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector contrib Loki exporter deprecation notes: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/lokiexporter
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation for `/otlp/v1/logs`: https://grafana.com/docs/loki/latest/api/
- Grafana Loki configuration examples and parameters: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Tempo metrics-generator documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo upgrade notes for removed Tempo 3.0 configuration sections: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/upgrade/
- Grafana Mimir OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/mimir/latest/configure/configure-otel-collector/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana data source provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- telemetrygen package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen

## Issues Found
- The OpenTelemetry Collector snippet used the deprecated `loki` exporter. Current `otel/opentelemetry-collector-contrib:latest` no longer includes that exporter, and Grafana Loki recommends native OTLP HTTP ingestion. Changed the logs exporter to `otlphttp/loki` with `endpoint: http://loki:3100/otlp` and updated the logs pipeline to use it.
- The Tempo snippet included `ingester` and `compactor` top-level blocks. These are removed in current Tempo 3.x, and `grafana/tempo:latest -config.verify=true` rejected the snippet. Removed those obsolete blocks.
- The Tempo metrics-generator configuration described automatic RED/span metrics, but the processors were not enabled. Added `overrides.defaults.metrics_generator.processors: [span-metrics, service-graphs]`, matching Tempo documentation that metrics-generator processors are disabled by default.
- The Grafana datasource provisioning referenced `datasourceUid` values `tempo`, `mimir`, and `loki`, but the data sources did not set matching `uid` values. Added explicit `uid` fields so cross-signal links can resolve reliably.

## Review Notes
- Verified the edited OpenTelemetry Collector config with `otel/opentelemetry-collector-contrib:latest validate`.
- Verified the edited Tempo config with `grafana/tempo:latest -config.verify=true`.
- Verified the edited Loki config with `grafana/loki:latest -verify-config`.
- Verified the edited Mimir config parses with `grafana/mimir:latest -print.config`.
- The post still uses `latest` container tags for a local-development tutorial. That is workable, but future upstream breaking changes could require revisiting these snippets.
