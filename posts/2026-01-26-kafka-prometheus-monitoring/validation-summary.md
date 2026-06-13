# Validation Summary: How to Monitor Kafka Metrics with Prometheus

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Kafka
- Java Management Extensions (JMX)
- Prometheus
- Prometheus JMX Exporter
- PromQL
- Grafana
- Alertmanager / Prometheus alerting rules
- Kafka Lag Exporter
- Micrometer Kafka client metrics

## Sources Consulted
- Apache Kafka Monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Confluent Platform Kafka JMX monitoring documentation: https://docs.confluent.io/platform/current/kafka/monitoring.html
- Prometheus JMX Exporter Kafka example configuration: https://github.com/prometheus/jmx_exporter/blob/main/examples/kafka-2_0_0.yml
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kafka Lag Exporter documentation: https://github.com/seglo/kafka-lag-exporter
- Micrometer Kafka metrics documentation: https://docs.micrometer.io/micrometer/reference/reference/kafka.html
- Spring Kafka Micrometer native metrics documentation: https://docs.spring.io/spring-kafka/reference/kafka/micrometer.html
- Grafana time series panel documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The JMX Exporter rules did not export several metrics used later in the PromQL examples. I replaced the narrow rules with generic Kafka JMX Exporter rules based on the official Kafka example, including per-second counter, gauge, Count, and percentile handling.
- Several throughput queries used `_persec_count` metric names that do not match the configured JMX Exporter output. I changed them to the `_total` counter names produced by the per-second counter rules, such as `kafka_server_brokertopicmetrics_messagesin_total`.
- Fetch request examples used `request="Fetch"`, but Kafka broker request metrics distinguish consumer fetches as `FetchConsumer`. I updated the fetch throughput, latency, and dashboard queries.
- The Kafka Lag Exporter example used unsupported environment variables and metric names. I changed the configuration to the documented HOCON `application.conf` format and updated metrics to documented names such as `kafka_consumergroup_group_lag` and `kafka_consumergroup_group_lag_seconds`.
- Consumer lag increase examples used `rate()` on lag gauges. Prometheus documents `rate()` for counters, so I changed these examples to use `delta()` on `kafka_consumergroup_group_sum_lag`.
- The Grafana dashboard used the legacy `graph` panel type. I updated those panels to `timeseries`.
- The disk alert referenced non-existent `kafka_log_size` and `kafka_log_max_size` metrics. I replaced it with a Kafka JMX metric-backed alert for `kafka_log_logmanager_offlinelogdirectorycount`.
- The Micrometer Java example referenced undefined `producer` and `consumer` fields inside a Spring bean customizer. I simplified it to the documented `KafkaClientMetrics(...).bindTo(registry)` pattern for existing Kafka clients.
- The Docker example showed an incomplete `docker run` command for `confluentinc/cp-kafka:7.5.0` that would not start a broker without the required Kafka broker configuration. I changed it to show the JMX-related environment variables to add to an otherwise complete Kafka container configuration.

## Review Notes
The article is now technically consistent with the provided JMX Exporter rules and documented Kafka Lag Exporter metric names. In a future revision, the Grafana dashboard JSON could be expanded into a fully importable dashboard with datasource UIDs, `gridPos`, schema metadata, and current field configuration blocks.
