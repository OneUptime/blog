# Validation Summary: How to Monitor Kafka with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka JMX metrics
- Prometheus JMX Exporter
- Prometheus configuration, PromQL, recording rules, and alerting rules
- Grafana dashboards
- Docker Compose
- Alertmanager
- Kafka Lag Exporter
- Helm

## Sources Consulted
- Apache Kafka monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka Docker examples: https://github.com/apache/kafka/tree/trunk/docker/examples
- Prometheus JMX Exporter documentation: https://prometheus.github.io/jmx_exporter/
- Prometheus JMX Exporter repository: https://github.com/prometheus/jmx_exporter
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` field documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- Kafka Lag Exporter documentation: https://github.com/seglo/kafka-lag-exporter

## Issues Found
- The JMX exporter download and Java agent examples used version `0.19.0`, which is old. Updated the examples to use `1.0.1` consistently.
- The JMX exporter configuration did not define explicit rules for several metric names later used in PromQL examples, including broker topic counters, ISR shrink counters, request p99 latency, consumer lag, and log manager metrics. Added explicit rules so the documented PromQL expressions match emitted metric names.
- The post showed `JMX_PORT=9999` under `server.properties`, but `JMX_PORT` is an environment variable used by Kafka startup scripts, not a broker property. Reworded the section to show it as an environment variable and clarified that it is separate from the JMX exporter Java agent.
- The Docker Compose example used the obsolete top-level `version` field. Removed it to align with the current Compose Specification.
- The single-node Kafka Docker example was missing settings commonly needed for a one-broker KRaft setup. Added `KAFKA_INTER_BROKER_LISTENER_NAME`, `KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR`, and `KAFKA_TRANSACTION_STATE_LOG_MIN_ISR`.
- The Kafka Connect scrape target used `kafka-connect:8083`, which is Kafka Connect's REST API port and not a Prometheus metrics endpoint by default. Updated the example to scrape a JMX/Prometheus exporter port and added a note that this job applies only when Connect is configured with an exporter.
- The throughput metric descriptions described cumulative counters as per-second metrics. Updated the descriptions to state that `rate(...[5m])` should be used for per-second rates.
- The latency metric table and alert used a `quantile` label / histogram bucket form that was not produced by the shown JMX exporter rules. Updated them to use the configured 99th percentile metric.
- The consumer lag alert and Grafana example referenced `client_id`, but the shown JMX exporter labels are lowercased to `clientid`. Updated the label references.
- The disk space alert used nonexistent `kafka_log_log_size` and `kafka_log_log_size_max` metrics. Replaced it with an offline log directory alert backed by Kafka's `OfflineLogDirectoryCount` JMX metric.
- The Grafana example used the old `graph` panel type and referenced a nonexistent `messagesout_total` metric. Updated panels to use `timeseries` and changed the query to `bytesout_total`.
- The Kafka Lag Exporter Kubernetes Deployment snippet was incomplete for `apps/v1` and used unsupported environment-variable style configuration. Replaced it with the documented Helm chart install flow and statically configured cluster values.

## Review Notes
- Kafka Lag Exporter is archived upstream as of March 17, 2024. The corrected Helm example matches its published documentation, but teams may want to evaluate maintained alternatives for new production deployments.
- The JMX exporter rules are intentionally scoped to make the article's PromQL examples consistent. Production deployments may want to start from a fuller Kafka JMX exporter ruleset to cover additional MBeans and avoid high-cardinality labels where they are not needed.
