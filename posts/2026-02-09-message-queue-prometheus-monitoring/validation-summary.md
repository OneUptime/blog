# Validation Summary: How to Configure Message Queue Monitoring with Prometheus Exporters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Kafka JMX metrics and Kafka exporter
- RabbitMQ Prometheus plugin
- NATS Prometheus exporter
- Redis exporter
- Grafana dashboard JSON
- Go Prometheus client instrumentation
- Kubernetes StatefulSets, Deployments, Services, and ConfigMaps

## Sources Consulted
- Prometheus JMX Exporter rules documentation: https://prometheus.github.io/jmx_exporter/1.1.0/http-mode/rules/
- Prometheus JMX Exporter standalone HTTP mode documentation: https://prometheus.github.io/jmx_exporter/1.2.0/standalone/http-mode/
- Prometheus exporters and integrations documentation: https://prometheus.io/docs/instrumenting/exporters/
- RabbitMQ Prometheus plugin documentation for RabbitMQ 3.13: https://www.rabbitmq.com/docs/3.13/prometheus
- RabbitMQ monitoring documentation: https://www.rabbitmq.com/docs/4.0/monitoring
- RabbitMQ memory threshold documentation: https://www.rabbitmq.com/docs/memory
- NATS monitoring documentation: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS configuration and clustering documentation: https://docs.nats.io/running-a-nats-service/configuration and https://docs.nats.io/running-a-nats-service/configuration/clustering/cluster_config
- NATS Prometheus exporter README: https://github.com/nats-io/prometheus-nats-exporter
- Redis exporter README and stream metrics source: https://github.com/oliver006/redis_exporter
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Go client promauto package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto

## Issues Found
- Kafka JMX exporter sidecar configuration did not specify the JMX target. Added `hostPort: localhost:9999` so the standalone exporter knows which JMX endpoint to scrape.
- Kafka examples used `kafka_consumergroup_lag`, which is not emitted by the JMX exporter. Added a Kafka exporter sidecar and scrape endpoint for consumer group lag metrics.
- Kafka JMX rules did not map BrokerTopicMetrics counters used by the dashboard and did not produce the alert metric name for offline partitions. Updated the rules and dashboard expression accordingly.
- ServiceMonitor examples selected Services, but the post did not define the matching Services or named service ports. Added Services for Kafka, RabbitMQ, NATS, and Redis exporter with matching labels and port names.
- RabbitMQ example included `RABBITMQ_PROMETHEUS_PLUGIN`, which is not how the official RabbitMQ image enables plugins. Removed it and kept the `enabled_plugins` configuration.
- NATS dashboard and alert expressions used `nats_varz_*` metric names, but the referenced exporter emits `gnatsd_varz_*`. Updated the dashboard and alert rules.
- Redis dashboard legend used a `stream` label, but Redis exporter stream metrics label the stream key as `key`. Updated the legend format.
- RabbitMQ memory alert expression divided limit by usage and alerted only when usage was far above the limit. Changed it to alert when resident memory exceeds 90% of the configured limit.
- The Go instrumentation snippet referenced an undefined `handleMessage` function. Added a minimal placeholder function so the snippet is syntactically complete.

## Review Notes
The YAML snippets parse successfully with PyYAML. The workspace does not have `go`, `promtool`, or `kubectl` installed, so Go compilation, Prometheus rule validation, and Kubernetes server-side schema validation could not be run locally. The pinned `bitnami/jmx-exporter:0.19.0` image uses the older `whitelistObjectNames` key; newer JMX exporter documentation treats `includeObjectNames` as the current replacement.
