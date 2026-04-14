# Validation Summary: How to Monitor Pub/Sub Message Throughput in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar runtime, pub/sub building block)
- Prometheus (metrics scraping and querying)
- Grafana (dashboard visualization)
- Kubernetes (ServiceMonitor, Service, annotations)
- PromQL (query language)

## Sources Consulted
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Configuration resource schema: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr dashboard CLI reference: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr source code for metric definitions: `pkg/diagnostics/component_monitoring.go` (confirms metric names, labels, and units)

## Issues Found

1. **`spec.metric` should be `spec.metrics` (plural) in Configuration resource.** The Dapr Configuration schema uses `spec.metrics` (plural). The post had `spec.metric` (singular), which would be silently ignored by Dapr, leaving metrics at defaults. Fixed to `spec.metrics`.

2. **No `port` field exists under `spec.metrics` in the Configuration resource.** The metrics port is configured via the `dapr.io/metrics-port` Kubernetes annotation or the `--metrics-port` CLI flag, not through the Configuration YAML. Removed the `port: 9090` field from the Configuration snippet and added a `dapr.io/metrics-port` annotation to the deployment annotations example with an explanatory note.

3. **Latency metric division by 1000 was incorrect.** Dapr latency metrics (`dapr_component_pubsub_egress_latencies`) use milliseconds as the unit (confirmed via `stats.UnitMilliseconds` in source). The Grafana panel query divided the `histogram_quantile` result by 1000 and labeled it "(ms)", which would actually produce seconds, not milliseconds. Removed the `/ 1000` division. Also corrected the panel title from "Average Publish Latency" to "P95 Publish Latency" since `histogram_quantile(0.95, ...)` computes the 95th percentile, not the average.

## Review Notes
- The metric names (`dapr_component_pubsub_egress_count`, `dapr_component_pubsub_ingress_count`, `dapr_component_pubsub_egress_latencies`, `dapr_component_pubsub_ingress_latencies`) are all correct and verified against Dapr source code.
- The metric labels used in PromQL queries (`app_id`, `component`, `topic`) are all correct.
- The Dapr dashboard default port (8080) is correct.
- The `dapr.io/config` annotation name is correct.
- The ServiceMonitor and Service YAML for Prometheus Operator scraping are structurally correct.
- The alerting rule YAML is valid Prometheus alerting syntax.
