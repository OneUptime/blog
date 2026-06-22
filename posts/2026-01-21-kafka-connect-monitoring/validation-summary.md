# Validation Summary: How to Monitor and Manage Kafka Connect Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Kafka Connect REST API
- JMX
- Prometheus JMX Exporter
- Prometheus alerting rules
- Grafana dashboards
- Python requests
- Bash, curl, and jq
- Docker Compose
- Confluent JDBC Source Connector

## Sources Consulted
- Apache Kafka monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Confluent Kafka Connect REST Interface documentation: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Kafka Connect monitoring documentation: https://docs.confluent.io/platform/current/connect/monitoring.html
- Confluent JDBC Source Connector configuration reference: https://docs.confluent.io/kafka-connectors/jdbc/current/source-connector/source_config_options.html
- Strimzi Kafka Connect JMX Exporter example configuration: https://github.com/strimzi/strimzi-kafka-operator/blob/main/examples/metrics/kafka-connect-metrics.yaml
- Confluent Kafka Connect monitoring sandbox Docker Compose example: https://github.com/confluentinc/kafka-connect-monitoring-sandbox/blob/main/docker-compose.yml

## Issues Found
- The Prometheus JMX Exporter rules treated Kafka Connect `status` attributes as numeric gauges. Kafka Connect exposes connector and task status as string-valued JMX attributes, so the exporter needs `value: 1` with a `status` label. Updated the connector and task status rules accordingly.
- The JMX Exporter rules marked every metric as a gauge. Updated `*-total` metrics to use `COUNTER` and kept non-counter task and worker metrics as `GAUGE`.
- The alert and Grafana examples assumed connector status values of `1` for running and `0` for failed. Updated the expressions to filter on the exported `status` label.
- The sink lag alert and best-practices table referenced `sink-record-lag`, which is not listed as a Kafka Connect sink task JMX metric. Replaced it with `sink-record-active-count-max`, which is listed in the Kafka Connect monitoring documentation.
- The Docker Compose JMX Exporter example placed the javaagent option in `KAFKA_JMX_OPTS`. Updated it to use `KAFKA_OPTS`, while keeping `KAFKA_JMX_OPTS` for remote JMX system properties in the earlier JMX example.
- The health check script labeled every non-`RUNNING` task as failed. Updated the variable and message to report non-running tasks accurately, and quoted JSON shell expansions before passing them to `jq`.

## Review Notes
The REST API endpoints, restart query parameters, connector topics endpoints, JDBC source connector properties, and distributed worker storage topic configuration were consistent with the referenced documentation. Production deployments should secure remote JMX; the post's JMX command disables authentication and SSL for simplicity.
