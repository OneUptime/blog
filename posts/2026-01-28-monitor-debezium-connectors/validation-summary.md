# Validation Summary: How to Monitor Debezium Connectors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Debezium
- Apache Kafka Connect
- JMX
- Prometheus JMX Exporter
- Prometheus
- Grafana
- Python
- Docker Compose
- OneUptime

## Sources Consulted
- Debezium monitoring documentation: https://debezium.io/documentation/reference/stable/operations/monitoring.html
- Debezium MySQL connector monitoring metrics: https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-monitoring
- Apache Kafka Connect administration and REST status API: https://kafka.apache.org/42/kafka-connect/administration/
- Confluent Kafka Connect monitoring reference for Connect JMX metrics: https://docs.confluent.io/platform/current/connect/monitoring.html
- Prometheus JMX Exporter configuration documentation: https://prometheus.github.io/jmx_exporter/1.4.0/configuration/
- Prometheus JMX Exporter Java agent documentation: https://prometheus.github.io/jmx_exporter/1.4.0/deployment/java-agent/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Docker Compose JMX setup used `debezium/connect:2.5` and mixed in `KAFKA_JMX_PORT` / `KAFKA_JMX_HOSTNAME`, which are not the documented JMX variables for Debezium's container image. Updated the image to `quay.io/debezium/connect:3.5` and used `JMXPORT` / `JMXHOST` as documented by Debezium.
- The connector status section described Kafka Connect JMX status as numeric states. Kafka Connect exposes connector and task status as strings. Updated the descriptions to match documented statuses.
- The JMX exporter rules treated Kafka Connect string-valued status and metadata attributes as plain numeric gauges. Updated those rules to expose string values as labeled metrics with `value: 1`, and kept numeric task metrics separate.
- The Prometheus configuration attempted to scrape Kafka Connect's `/connectors` REST endpoint directly as a metrics endpoint. That endpoint returns JSON, not Prometheus exposition format. Updated the scrape job to target the custom exporter shown later in the post.
- Alert and Grafana examples referenced `debezium_streaming_millisecondsbehindSource`, but the JMX exporter configuration lowercases metric names. Updated references to `debezium_streaming_millisecondsbehindsource`.
- The high-lag alert used `humanizeDuration` on a millisecond value, which would display the wrong duration. Updated the annotation to show milliseconds directly.
- The snapshot-stuck alert referenced `debezium_snapshot_snapshotstarted`, which is not a documented Debezium snapshot metric. Updated the expression to use `debezium_snapshot_snapshotdurationinseconds`.
- The Python custom exporter imported `Counter` and defined an unused replication lag gauge. Removed the unused items to keep the example accurate.
- The OneUptime Python example used `datetime.utcnow()`, which is deprecated in current Python. Updated it to `datetime.now(timezone.utc).isoformat()`.

## Review Notes
The examples are suitable as illustrative monitoring snippets, but production deployments should add authentication and TLS for exposed JMX and REST endpoints. The OneUptime section is intentionally high-level; OneUptime's official telemetry documentation recommends OpenTelemetry ingestion for metrics.
