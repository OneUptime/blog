# Validation Summary: How to Add Kafka Exporter as Data Source in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Apache Kafka
- Kafka Exporter
- Prometheus
- PromQL
- Kubernetes
- Docker
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kafka Exporter README and source: https://github.com/danielqsj/kafka_exporter
- Kafka Exporter Docker image documentation: https://hub.docker.com/r/danielqsj/kafka-exporter
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The SASL mechanism examples used `SCRAM-SHA-512`, which does not match Kafka Exporter's accepted `scram-sha512` mechanism value. Updated both examples to use `scram-sha512`.
- The authenticated Kubernetes Deployment snippet omitted required Deployment selector/template labels, namespace alignment with the Secret, and the container image. Added the missing fields so the example is a valid usable Deployment snippet.
- The PromQL queries labeled "messages/sec" multiplied `rate(...)` by 60, which changes the result to per-minute. Removed the `* 60` multiplier from the messages/sec and consumer-rate examples.
- The topic metric comment described `kafka_topic_partition_current_offset` as total messages. Updated the comment to "current latest offset" to match Kafka Exporter's metric description.
- The broker leader query grouped by a non-existent `broker_id` label on `kafka_topic_partition_leader`. Replaced it with `count_values("broker_id", kafka_topic_partition_leader)`, which derives counts from the sample value.
- Grafana navigation and data source setup wording used older UI labels and an outdated `Access: Server` field. Updated the steps to match current Grafana documentation.

## Review Notes
The post is technically relevant and implementation-focused. The title is slightly imprecise because Grafana uses Prometheus as the data source rather than Kafka Exporter directly, but the body correctly explains the Kafka Exporter -> Prometheus -> Grafana flow.
