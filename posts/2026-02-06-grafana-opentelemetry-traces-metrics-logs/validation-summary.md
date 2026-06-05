# Validation Summary: How to Set Up Grafana with OpenTelemetry for Traces, Metrics, and Logs

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry JavaScript SDK for Node.js
- Grafana
- Grafana Tempo
- Grafana Mimir
- Grafana Loki
- Docker Compose
- Prometheus remote write
- OTLP gRPC and OTLP HTTP

## Sources Consulted
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- Grafana Tempo OpenTelemetry Collector setup documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/otel-collector-getting-started/
- Grafana Loki native OTLP vs Loki exporter documentation: https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Loki default OpenTelemetry label documentation: https://grafana.com/docs/loki/latest/get-started/labels/modify-default-labels/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace-to-logs correlation documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- Grafana Loki data source derived fields documentation: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana Mimir HTTP API documentation: https://grafana.com/docs/mimir/latest/operators-guide/reference-http-api/
- Grafana Mimir visualization documentation: https://grafana.com/docs/mimir/latest/visualize/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript NodeSDK API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry JavaScript SDK Node README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md

## Issues Found
- The Collector config used the deprecated/removed `loki` exporter and the `/loki/api/v1/push` endpoint for OpenTelemetry logs. Updated it to use `otlphttp/loki` with Loki's native OTLP endpoint at `http://loki:3100/otlp`.
- The Grafana datasource provisioning referenced `datasourceUid` values for correlations but did not assign matching `uid` values to the Tempo, Mimir, and Loki datasources. Added explicit `uid` fields.
- The Tempo datasource example used the older `tracesToLogs` field. Updated it to the current `tracesToLogsV2` provisioning block and mapped `service.name` to Loki's normalized `service_name` label.
- The Tempo trace-to-metrics example only set a datasource UID. Added a sample query so the provisioned trace-to-metrics configuration has an actual metric target.
- The Loki derived field example extracted `traceID` from log-line text. Updated it to use a label/structured metadata matcher for `trace_id`/`traceid`, which matches Loki's native OpenTelemetry ingestion behavior.
- The Node.js SDK example used deprecated single-value configuration keys `metricReader`, `logRecordProcessor`, and `resourceAttributes`. Updated it to `metricReaders`, `logRecordProcessors`, and `resource: resourceFromAttributes(...)` with current semantic convention constants.
- The Docker Compose section implied the compose file alone was a complete runnable stack, while it mounts separate Tempo, Mimir, Loki, Collector, and Grafana configuration files. Clarified that the referenced backend configuration files must be present.

## Review Notes
- The post remains a local-development guide. The compose file still uses `latest` container tags, which is convenient for a blog example but less reproducible than pinned versions.
- The post references backend configuration files but does not include their contents. A future improvement would be adding minimal `tempo-config.yaml`, `mimir-config.yaml`, and `loki-config.yaml` examples.
