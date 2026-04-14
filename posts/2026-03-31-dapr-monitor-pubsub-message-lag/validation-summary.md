# Validation Summary: How to Monitor Dapr Pub/Sub Message Lag

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub building block, Subscription CRD, bulk subscribe)
- Apache Kafka (consumer groups, consumer lag)
- Prometheus (PromQL, PrometheusRule CRD via prometheus-operator)
- Grafana (dashboard queries)
- Kubernetes (kubectl, Deployments)
- danielqsj/kafka-exporter

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics source reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Subscription CRD spec (v2alpha1): https://docs.dapr.io/reference/api/subscriptions_api/
- Dapr bulk subscribe documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-bulk-subscribe/
- danielqsj/kafka_exporter GitHub repository: https://github.com/danielqsj/kafka_exporter
- Apache Kafka CLI tools documentation (kafka-consumer-groups.sh)
- Prometheus Operator PrometheusRule CRD: monitoring.coreos.com/v1

## Issues Found

### 1. Incorrect Dapr pub/sub metric names (3 occurrences)
**What was wrong:** The post listed three Dapr metrics with a `dapr_pubsub_` prefix that does not exist. The correct prefix for all Dapr pub/sub component metrics is `dapr_component_pubsub_`. The specific incorrect names were:
- `dapr_pubsub_subscribe_count` (does not exist)
- `dapr_pubsub_publish_count` (does not exist)
- `dapr_pubsub_incoming_messages_total` (does not exist; also redundant with the subscribe count concept)

**What was changed:**
- `dapr_pubsub_subscribe_count` → `dapr_component_pubsub_ingress_count`
- `dapr_pubsub_publish_count` → `dapr_component_pubsub_egress_count`
- `dapr_pubsub_incoming_messages_total` → `dapr_component_pubsub_ingress_latencies` (replaced with a real, distinct metric — event processing latency for incoming messages)

**Why:** Dapr uses `ingress`/`egress` directional terminology in its metric namespace, not `subscribe`/`publish`. Using the incorrect names would return no data from the Dapr sidecar's metrics endpoint.

### 2. Incorrect metric name in PrometheusRule alert expression
**What was wrong:** The `DaprPubSubSubscriberNotProcessing` alert used `rate(dapr_pubsub_subscribe_count[5m])` which references the non-existent metric.
**What was changed:** Updated to `rate(dapr_component_pubsub_ingress_count[5m])`.

### 3. Incorrect metric name in curl/Prometheus query example
**What was wrong:** The processing rate query used `rate(dapr_pubsub_subscribe_count{success="true"}[5m])`.
**What was changed:** Updated to `rate(dapr_component_pubsub_ingress_count{success="true"}[5m])`.

## Review Notes
- The Kafka consumer group name `dapr-my-service` used in the kubectl example is acceptable as an illustrative example, but readers should be aware that Dapr does not automatically use a `dapr-{appId}` naming convention. The consumer group name is configured via the `consumerGroup` or `consumerID` metadata field in the Dapr Kafka component YAML.
- The `kafka_consumergroup_lag` metric from kafka-exporter is correct. There is also a `kafka_consumergroup_lag_sum` variant that aggregates across all partitions for a topic, which could be useful for simpler alerting.
- The Dapr Subscription CRD (v2alpha1) with `bulkSubscribe` configuration is correct and current.
- The `kafka-consumer-groups.sh` command with `--bootstrap-server`, `--describe`, and `--group` flags is correct.
- The PrometheusRule apiVersion `monitoring.coreos.com/v1` is correct.
