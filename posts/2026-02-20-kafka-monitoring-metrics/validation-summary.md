# Validation Summary: How to Monitor Apache Kafka with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Java Management Extensions (JMX)
- Prometheus JMX Exporter
- Prometheus
- Kafka Exporter
- Grafana
- Docker Compose
- Prometheus alerting rules

## Sources Consulted
- Apache Kafka 3.7 Monitoring documentation: https://kafka.apache.org/37/operations/monitoring/
- Prometheus JMX Exporter Java Agent documentation: https://prometheus.github.io/jmx_exporter/1.5.0/java-agent/
- Prometheus JMX Exporter HTTP mode rules documentation: https://prometheus.github.io/jmx_exporter/1.5.0/http-mode/rules/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kafka Exporter README: https://github.com/danielqsj/kafka_exporter
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/

## Issues Found
- The JMX exporter throughput rule exported both `Count` and `OneMinuteRate` under the same metric name with an `aggregate` label, but the Grafana panel queried `kafka_server_broker_topic_metrics_messagesinpersec_count`, which would not be emitted by that rule. Split the rule into a counter for `Count` and a gauge for `OneMinuteRate`, then updated the Grafana PromQL to query `kafka_server_broker_topic_metrics_messagesinpersec_total`.
- The JMX `FetcherLagMetrics` metric was labeled as consumer group lag and named `kafka_consumer_lag`. Apache Kafka documents this MBean as follower replica lag, not consumer group lag. Renamed the comment and metric to `kafka_server_fetcher_lag`. The post already uses Kafka Exporter's `kafka_consumergroup_lag` for actual consumer group lag.

## Review Notes
The fixed examples are syntactically valid for the documented tools and align with the cited metric names. The Kafka Docker and Kafka Exporter examples remain illustrative excerpts; a complete Compose file would still need listener and broker identity configuration for a working multi-broker Kafka cluster.
