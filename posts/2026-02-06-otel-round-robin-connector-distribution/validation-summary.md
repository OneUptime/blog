# Validation Summary: How to Configure the Round Robin Connector for Even Distribution Across Multi

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Round-Robin Connector
- OpenTelemetry Collector Load Balancing Exporter
- OpenTelemetry Collector OTLP Exporter
- OpenTelemetry Collector ClickHouse Exporter
- OpenTelemetry Collector internal telemetry metrics
- Prometheus receiver configuration
- Collector exporter retry and sending queue configuration

## Sources Consulted
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/components/connector/
- Round-Robin Connector official README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/roundrobinconnector/README.md
- Round-Robin Connector source and metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/roundrobinconnector
- Load Balancing Exporter official README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- ClickHouse Exporter official README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- OpenTelemetry Collector exporter helper queue/retry documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post used the deprecated `roundrobin` connector type. The official connector now uses `round_robin`; `roundrobin` still works only as a deprecated alias and is marked for future removal. Updated all connector declarations and pipeline references to `round_robin`.
- The ClickHouse exporter examples used `ttl_days: 30`, which is not a valid ClickHouse exporter setting. The official exporter uses `ttl` with a duration string. Changed the examples to `ttl: 720h` to represent 30 days using a valid Go duration.
- The monitoring section said backpressure would cause the round-robin connector to skip a shard. The connector source selects the next downstream consumer and forwards to it; it does not implement health-aware skipping. Reworded this to advise checking queue and failure metrics for the affected exporter.

## Review Notes
- The post's comparison with the load balancing exporter is technically accurate: the load balancing exporter uses consistent routing by keys such as `traceID` or `service`, and it is appropriate when downstream stateful processing such as tail sampling needs trace affinity.
- The `otelcol_exporter_sent_log_records` metric name used in the monitoring example is current in the Collector internal telemetry documentation.
- ClickHouse exporter support for metrics is currently documented as alpha, while traces and logs are beta. The example is valid, but production users should account for that component stability.
