# Validation Summary: How to Configure the Failover Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Failover Connector
- OTLP exporter
- File exporter
- Load Balancing exporter
- Prometheus receiver and exporter
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Failover Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/failoverconnector/README.md
- OpenTelemetry Collector connector configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/README.md
- OpenTelemetry Collector File Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector Load Balancing Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector exporter helper retry, queue, and timeout documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib Docker image validation using `otelcol-contrib validate`

## Issues Found
- The original examples configured the failover connector with a non-existent `pipelines:` map of exporter names. The current connector requires `priority_levels`, and those entries must reference downstream Collector pipeline IDs. I rewrote the configuration examples to use `priority_levels` and downstream pipelines with the failover connector as both exporter and receiver.
- The original examples used one connector directly across traces, metrics, and logs while listing exporter IDs. I changed the examples to use per-signal failover connectors and per-signal downstream pipelines, which matches the connector's traces-to-traces, metrics-to-metrics, and logs-to-logs model.
- The post described the connector as continuously monitoring exporter health. The official behavior is health-based routing from pipeline send results, with periodic attempts to recover higher-priority pipeline levels. I updated the explanation and diagram wording accordingly.
- The post used `retry_gap` and `max_retries` as recommended active settings. These fields are deprecated in the current failover connector documentation, so I removed them from examples and retained `retry_interval`.
- The load balancing example used the deprecated `loadbalancing` exporter type. I updated it to `load_balancing`, the current lower-snake-case component name.
- The monitoring example used the ignored `service.telemetry.metrics.address` setting and duplicated the top-level `service:` key. I updated it to the current `service.telemetry.metrics.readers` Prometheus pull configuration and consolidated the service block.
- The monitoring metrics included `otelcol_connector_refused_spans` as a failover-specific metric. I replaced it with documented collector exporter queue and send-failure metrics.
- The production configuration used legacy environment variable expansion syntax. I updated environment references to `${env:VAR}` syntax and validated the resulting configuration with environment variables supplied.

## Review Notes
All seven YAML snippets in the corrected post were extracted and validated successfully with `otel/opentelemetry-collector-contrib:latest validate --config /etc/otelcol-contrib/config.yaml`.
