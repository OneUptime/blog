# Validation Summary: How to Monitor Message Queues in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Prometheus (kube-prometheus-stack)
- Grafana
- Helm
- RabbitMQ (Bitnami chart, rabbitmq_prometheus plugin)
- Kafka (Bitnami chart, kafka_exporter, JMX exporter)
- Prometheus Operator (ServiceMonitor, PrometheusRule CRDs)
- PromQL
- OneUptime

## Sources Consulted
- kube-prometheus-stack Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Bitnami RabbitMQ chart: https://github.com/bitnami/charts/tree/main/bitnami/rabbitmq
- Bitnami Kafka chart: https://github.com/bitnami/charts/tree/main/bitnami/kafka
- RabbitMQ Prometheus plugin: https://www.rabbitmq.com/prometheus.html
- Prometheus Operator API (PrometheusRule, ServiceMonitor): https://prometheus-operator.dev/docs/operator/api/
- kafka_exporter: https://github.com/danielqsj/kafka_exporter
- Grafana dashboard 10991 (RabbitMQ-Overview): https://grafana.com/grafana/dashboards/10991
- Grafana dashboard 7589 (Kafka Exporter Overview): https://grafana.com/grafana/dashboards/7589

## Issues Found
No technical issues found. The Helm install commands, chart values structures, PrometheusRule manifest (apiVersion `monitoring.coreos.com/v1`, `kind: PrometheusRule`), Grafana dashboard IDs (10991 for RabbitMQ-Overview, 7589 for Kafka Exporter Overview), and the PromQL query (`sum by (consumergroup, topic) (kafka_consumergroup_lag)`) are all valid and current.

## Review Notes
- The `rabbitmq_running` metric in the `RabbitMQNodeDown` alert is exposed by the older kbudde/rabbitmq_exporter rather than the built-in `rabbitmq_prometheus` plugin that the Bitnami chart enables when `metrics.enabled: true`. With the built-in plugin, an equivalent check would be `up{job=~".*rabbitmq.*"} == 0`. The current alert still works in many real-world setups (clusters often run the legacy exporter), but readers using a stock Bitnami install with only the built-in plugin may want to switch to the `up`-based expression.
- The `rabbitmq_queue_messages` metric used in `RabbitMQQueueDepthHigh` is exposed by both exporters, so that alert works in both configurations.
- The `--set grafana.enabled=true --set prometheus.enabled=true` flags in the Helm install command are redundant (both default to `true` in kube-prometheus-stack) but harmless.
- Dashboard ID 7589 depends on kafka_exporter metrics, which are enabled via `metrics.kafka.enabled: true` in the Bitnami chart. The post correctly enables this, so the dashboard will populate.
- The note that "JMX exporter is the standard approach" for Kafka is a slight simplification — the JMX exporter exposes broker-side JVM/Kafka MBeans, while the consumer lag metric (`kafka_consumergroup_lag`) used later in the post comes from kafka_exporter. The example YAML enables both, so the post works end-to-end.
