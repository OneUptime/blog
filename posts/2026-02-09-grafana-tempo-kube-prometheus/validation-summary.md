# Validation Summary: How to Deploy Grafana Tempo with kube-prometheus-stack for Trace Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Tempo
- kube-prometheus-stack
- Grafana datasource provisioning
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Prometheus exemplars
- OpenTelemetry Collector
- OpenTelemetry Go metrics API
- Kubernetes StatefulSet, Deployment, Service, and ConfigMap resources

## Sources Consulted
- Grafana Tempo 3.0 release notes: https://grafana.com/docs/tempo/latest/release-notes/v3-0/
- Grafana Tempo configuration manifest: https://grafana.com/docs/tempo/latest/configuration/manifest/
- Grafana Tempo datasource provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana traces visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/traces/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack chart metadata and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The Tempo deployment used `grafana/tempo:latest` with removed pre-3.0 components such as ingester, querier, query-frontend, and compactor. Updated the example to pin `grafana/tempo:3.0.0` and use the current monolithic `target: all` deployment.
- The Tempo configuration used removed `ingester` fields and old compactor configuration. Replaced them with current `live_store`, `backend_scheduler`, and `backend_worker` settings from the Tempo 3.0 manifest.
- The Zipkin support claim did not match the receiver configuration. Added the Zipkin receiver endpoint and Service port.
- The Grafana Tempo datasource used the older `tracesToLogs` block and positive start time shifts. Updated it to `tracesToLogsV2`, object-style tag mappings, and a negative start shift.
- The traces-to-metrics datasource block omitted the required query definition for metric links. Added a sample Prometheus query using Grafana's `$$__tags` interpolation.
- The OpenTelemetry Collector exporter comment implied metrics are pushed to Prometheus. Updated it to say the Collector exposes metrics for Prometheus to scrape.
- The Go exemplar snippet was not syntactically valid and overstated automatic exemplar behavior. Replaced it with a valid function using the OpenTelemetry Go metrics API and clarified that trace/span IDs can be attached when the context contains a sampled span and exemplars are enabled.
- The Grafana dashboard example used the invalid `tempo-panel` panel type. Updated it to the current `traces` visualization with a TraceQL target.
- The ServiceMonitor selected a Service label that did not exist after the Tempo Service change, and the alert depended on a job label that was not guaranteed. Added the Service label and `jobLabel: app`.
- The kube-prometheus-stack prerequisite used a stale fixed Kubernetes version. Replaced it with a version-neutral requirement to use a Kubernetes version supported by the installed chart.
- The post's "no indexing" wording was too absolute for current Tempo. Adjusted it to describe direct trace ID lookup without full trace indexing.

## Review Notes
The examples are now aligned with Tempo 3.0's current monolithic mode. A production deployment that needs horizontal scale should use Tempo's current microservices architecture with its Kafka-compatible ingest layer rather than the old ingester-based split.
