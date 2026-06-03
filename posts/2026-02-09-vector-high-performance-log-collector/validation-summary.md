# Validation Summary: How to Configure Vector as a High-Performance Log Collector in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vector Kubernetes logs source
- Vector Remap Language (VRL)
- Vector filter, sample, route, and log_to_metric transforms
- Vector Loki, Elasticsearch/OpenSearch, HTTP, AWS S3, console, and Prometheus exporter sinks
- Vector internal metrics
- Kubernetes DaemonSet, ServiceAccount, RBAC, ConfigMap, Service, hostPath volumes, and Prometheus scraping
- PromQL

## Sources Consulted
- Vector Kubernetes logs source documentation: https://vector.dev/docs/reference/configuration/sources/kubernetes_logs/
- Vector internal metrics source documentation: https://vector.dev/docs/reference/configuration/sources/internal_metrics/
- Vector Prometheus exporter sink documentation: https://vector.dev/docs/reference/configuration/sinks/prometheus_exporter/
- Vector Elasticsearch sink documentation: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector Loki sink documentation: https://vector.dev/docs/reference/configuration/sinks/loki/
- Vector filter transform documentation: https://vector.dev/docs/reference/configuration/transforms/filter/
- Vector sample transform documentation: https://vector.dev/docs/reference/configuration/transforms/sample/
- Vector route transform documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector aggregate transform documentation: https://vector.dev/docs/reference/configuration/transforms/aggregate/
- Vector log_to_metric transform documentation: https://vector.dev/docs/reference/configuration/transforms/log_to_metric/
- Vector AWS S3 sink documentation: https://vector.dev/docs/reference/configuration/sinks/aws_s3/
- Vector HTTP sink documentation: https://vector.dev/docs/reference/configuration/sinks/http/
- Vector monitoring documentation: https://vector.dev/docs/administration/monitoring/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- Added an `internal_metrics` source and connected it to the `prometheus_exporter` sink. The Prometheus exporter accepts metric events as inputs; an empty input list would not expose Vector's own metrics.
- Updated Kubernetes namespace metadata references from `kubernetes.namespace_name` to `kubernetes.pod_namespace`, which matches the current `kubernetes_logs` source output fields.
- Kept `.message` after successful JSON parsing so later transforms that inspect or redact `.message` still have a value to process.
- Made the health-check filter use `string(.message) ?? ""` instead of `string!(.message)` so events without a string `message` do not abort the condition.
- Changed the `sample` transform from unsupported `condition` configuration to documented `exclude` configuration, preserving the intent to sample debug logs while passing other log levels through.
- Replaced the Elasticsearch sink's deprecated singular `endpoint` field with `endpoints` and removed the conflicting `bulk.index` setting from the data stream example.
- Replaced the invalid log `aggregate` example with a `filter` plus `log_to_metric` example. Vector's `aggregate` transform aggregates metric events, not grouped log records by arbitrary fields.
- Updated the PromQL examples to use current Vector internal metric names such as `vector_component_received_events_total`, `vector_component_discarded_events_total`, `vector_buffer_size_bytes`, and `vector_component_latency_seconds_bucket`.

## Review Notes
The YAML code fences parse successfully with PyYAML. The Vector CLI was not installed locally, so component-level validation was performed against official Vector documentation rather than `vector validate`.
