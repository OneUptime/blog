# Validation Summary: How to Use the Failover Connector to Automatically Switch Between Primary

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib failover connector
- OpenTelemetry Collector file exporter
- OpenTelemetry Collector OTLP JSON File receiver
- OTLP exporter
- Prometheus alerting rules
- Linux shell commands

## Sources Consulted
- OpenTelemetry Collector Contrib failover connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector/README.md
- OpenTelemetry Collector Contrib failover connector schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector/config.schema.yaml
- OpenTelemetry Collector Contrib failover connector source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector
- OpenTelemetry Collector Contrib file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector Contrib file exporter source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/config.go
- OpenTelemetry Collector Contrib OTLP JSON File receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otlpjsonfilereceiver/README.md
- OpenTelemetry Collector exporter helper configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The failover behavior was described as using an error-rate threshold and consecutive failures. The official connector behavior is pipeline-health based: when the active priority level returns an error, that level is considered unhealthy and the connector advances to the next priority level. Updated the explanation.
- The examples used `max_retries` and `retry_gap` as normal current configuration options. Both are deprecated in the current failover connector README/source, so they were removed from the primary examples.
- The alerting section referenced `otelcol_connector_failover_current_level`, but the current failover connector documentation and generated metadata do not define that metric. Replaced it with generic collector exporter failure/sent metrics that are documented in OpenTelemetry Collector internal telemetry.
- The replay script assumed each file-exporter JSON line could be posted directly as a stable OTLP HTTP export request. The file exporter documentation recommends the OTLP JSON File receiver for reading exported JSON back into the collector and warns JSON field names are not stable. Replaced the script with a replay collector configuration using `otlp_json_file`.
- The conclusion claimed failover ensures you never lose telemetry data. This was too strong because queues, exporter failures, and disk/write issues can still cause loss. Reworded it to say failover helps keep telemetry flowing.

## Review Notes
The failover connector is currently alpha for traces, metrics, and logs in the contrib and Kubernetes distributions. The article only demonstrates traces, which is valid. Prometheus may expose counter metrics with a `_total` suffix, while OTLP internal metric names are documented without that suffix.
