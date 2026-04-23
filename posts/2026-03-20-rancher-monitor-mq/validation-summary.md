# Validation Summary: How to Monitor Message Queues in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ Prometheus metrics
- Strimzi
- Apache Kafka
- Prometheus Operator (`ServiceMonitor`, `PodMonitor`, `PrometheusRule`)
- Grafana
- `kubectl`

## Sources Consulted
- RabbitMQ Cluster Operator monitoring guide: https://www.rabbitmq.com/kubernetes/operator/operator-monitoring
- RabbitMQ Cluster Operator usage guide: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Prometheus and Grafana guide: https://www.rabbitmq.com/docs/next/prometheus
- Official RabbitMQ Cluster Operator `ServiceMonitor` example: https://raw.githubusercontent.com/rabbitmq/cluster-operator/main/observability/prometheus/monitors/rabbitmq-servicemonitor.yml
- Official RabbitMQ per-object alert examples: https://raw.githubusercontent.com/rabbitmq/cluster-operator/main/observability/prometheus/rules/rabbitmq-per-object/queue-has-no-consumers.yml
- Strimzi configuration reference: https://strimzi.io/docs/operators/latest/configuring.html
- Strimzi deployment guide: https://strimzi.io/docs/operators/latest/full/deploying
- Official Strimzi Kafka metrics example: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/kafka-metrics.yaml
- Official Strimzi `PodMonitor` example: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/prometheus-install/pod-monitors/kafka-resources-metrics.yaml
- Official Strimzi Kafka alert rules: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/prometheus-install/prometheus-rules/prometheus-kafka-rules.yaml
- Official Strimzi Kafka Exporter alert rules: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/prometheus-install/prometheus-rules/prometheus-kafka-exporter-topic-rules-group.yaml
- Rancher persistent Grafana dashboard guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Kubernetes `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The description and introduction said the post covered NATS, but the body did not include NATS monitoring setup. I corrected the scope to RabbitMQ and Apache Kafka only.
- The RabbitMQ example included `prometheus.path = /metrics`, which is not a documented RabbitMQ setting. I removed it and switched the `ServiceMonitor` to scrape `/metrics/detailed` for queue families while keeping `/metrics` for node-level metrics.
- The RabbitMQ section implied the Prometheus plugin had to be explicitly enabled. The RabbitMQ Cluster Operator enables `rabbitmq_prometheus` by default, so I updated the wording and simplified the manifest.
- The Kafka section used the older `kafka.strimzi.io/v1beta2` API and a ZooKeeper-based layout. Current Strimzi documentation uses `kafka.strimzi.io/v1` and KRaft/node pools, so I replaced the manifest with a current KRaft-based example.
- The Kafka JMX mappings and alert rules used metric names that did not match Strimzi's current official mappings, including the under-replicated partitions and controller metrics. I replaced them with the current official patterns and PromQL expressions.
- The Kafka `PodMonitor` omitted the relabeling from Strimzi's official example, which means labels such as `namespace`, `kubernetes_pod_name`, and `strimzi_io_name` would not be available to the alert rules. I added the relabeling block.
- The Grafana import step used Grafana.com dashboard IDs and created ConfigMaps in `cattle-monitoring-system` without the `grafana_dashboard=1` label. Rancher Monitoring watches labeled dashboard ConfigMaps in `cattle-dashboards` by default, so I switched the example to the official RabbitMQ and Strimzi dashboard JSON files and corrected the namespace and labeling workflow.
- The Kafka CLI examples used an outdated static pod name pattern from older Strimzi layouts. I updated the commands and the monitoring script to select current Strimzi pods via labels and use the bootstrap service name.

## Review Notes
- The examples assume Rancher Monitoring is installed with the default chart release label `release: rancher-monitoring` and the default Grafana dashboard namespace `cattle-dashboards`.
- The Strimzi example intentionally does not pin `spec.kafka.version`; current Strimzi documentation defaults to the operator-supported Kafka version, which makes the post less brittle over time.
- The queue-depth and lag thresholds (`10000` messages and `1000` lag) are technically valid example values, but they should be tuned for each workload.
