# Validation Summary: How to use HPA with Kafka consumer lag for event-driven scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes External Metrics API
- Prometheus
- Prometheus Adapter
- Prometheus Operator ServiceMonitor
- Kafka Exporter
- Apache Kafka consumer groups
- Helm

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter Helm chart documentation and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kafka Exporter metrics reference: https://github.com/danielqsj/kafka_exporter

## Issues Found
- The post described `kafka_consumergroup_lag` as total lag across all partitions. Kafka Exporter documents it as lag per consumer group, topic, and partition. Updated the PromQL and wording to sum partition series for total consumer group lag.
- The Prometheus Adapter rule used `<<.LabelMatchers>>` as if it were a label value and tried to map the Kafka `consumergroup` label directly to a Kubernetes Deployment object. Prometheus Adapter expects `<<.LabelMatchers>>` to be inserted into the selector expression. Replaced this with a Helm values example using an external metric rule and `sum(<<.Series>>{<<.LabelMatchers>>}) by (consumergroup)`.
- The HPA example used an Object metric for a queue-style Kafka lag metric. Kubernetes documents External metrics for metrics not associated with a Kubernetes object, such as queue length. Updated both HPA examples to use `type: External` with a `consumergroup` selector.
- The validation command queried the Custom Metrics API. Updated it to query the External Metrics API endpoint for `kafka_consumer_lag`.
- The advanced per-partition example showed another total-lag `sum` query while describing per-partition awareness. Updated it to use `max` over the matching partition series.

## Review Notes
The YAML snippets were parsed successfully after edits. The examples still assume the Prometheus service name, namespace, and Kafka broker DNS names match the reader's cluster.
