# Validation Summary: How to Monitor Event Flow in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block, sidecar architecture)
- Prometheus (metrics collection, PromQL queries)
- Grafana (dashboards, alerting rules)
- Python (Flask, prometheus_client library)
- Kubernetes (pod annotations, service discovery)
- Apache Kafka (consumer groups, lag monitoring)
- Distributed tracing (Jaeger, Zipkin, OpenTelemetry)

## Sources Consulted
- Dapr Metrics Reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Component Monitoring Source Code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go
- Dapr Metrics Configuration Docs: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Configuration Schema Reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- danielqsj/kafka_exporter GitHub repository: https://github.com/danielqsj/kafka_exporter
- Prometheus relabel_configs documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- prometheus_client Python library documentation: https://prometheus.github.io/client_python/

## Issues Found

### 1. Incorrect Dapr Configuration field name (line 26)
- **What was wrong:** `spec.metric.enabled` used singular `metric`
- **What was changed:** Corrected to `spec.metrics.enabled` (plural `metrics`)
- **Why:** The Dapr Configuration schema uses `metrics` (plural). The singular form would be silently ignored, meaning metrics would not be explicitly enabled.

### 2. Wrong label name on ingress metric PromQL query (line 77)
- **What was wrong:** `dapr_component_pubsub_ingress_count{success="true",topic="OrderPlaced"}` used a `success` label
- **What was changed:** Corrected to `{status="success",topic="OrderPlaced"}`
- **Why:** Dapr pub/sub ingress metrics use `status` and `process_status` labels, not `success`. The `success` label only exists on egress metrics. The original query would return no results.

### 3. Incorrect Kafka consumer lag metric name (lines 176, 186)
- **What was wrong:** `kafka_consumer_group_lag` (with underscores between "consumer", "group")
- **What was changed:** Corrected to `kafka_consumergroup_lag`
- **Why:** The standard metric name from danielqsj/kafka_exporter (the most widely used Kafka Prometheus exporter) uses `kafka_consumergroup_lag` with no underscore between "consumer" and "group".

### 4. Incorrect Kafka consumer group label name (lines 176, 186, 191)
- **What was wrong:** Label `group` used to filter consumer groups
- **What was changed:** Corrected to `consumergroup`
- **Why:** danielqsj/kafka_exporter uses `consumergroup` as the label name, not `group`.

### 5. Misleading Kafka exporter attribution (line 175)
- **What was wrong:** Comment said "Prometheus JMX exporter metrics"
- **What was changed:** Corrected to "Kafka exporter metrics (e.g., danielqsj/kafka_exporter)"
- **Why:** The JMX exporter does not natively provide consumer group lag metrics. Consumer lag requires computing the difference between log-end offset and committed offset, which is what danielqsj/kafka_exporter does via the Kafka admin API.

## Review Notes
- The egress PromQL query correctly uses `{success="true"}` since Dapr egress metrics do carry a `success` label with boolean string values.
- The Python code's error handler returns HTTP 500 with `{"status": "RETRY"}`. While this works (Dapr retries on non-2xx status codes), the more idiomatic Dapr approach is to return HTTP 200 with `{"status": "RETRY"}` in the body. Left as-is since it is functionally correct.
- The Python code does not show the `/dapr/subscribe` programmatic subscription endpoint, but this is acceptable since Dapr also supports declarative subscriptions via component YAML.
- The `start_http_server(8001)` call from prometheus_client runs in a daemon thread, so it correctly coexists with the Flask `app.run()` call.
- The Prometheus Kubernetes SD relabel config correctly maps the `dapr.io/enabled` annotation to `__meta_kubernetes_pod_annotation_dapr_io_enabled`.
