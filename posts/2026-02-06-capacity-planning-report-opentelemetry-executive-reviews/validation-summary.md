# Validation Summary: How to Build a Capacity Planning Report from OpenTelemetry Data

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Kubernetes Attributes Processor
- OpenTelemetry Resource Processor
- Prometheus Remote Write
- Prometheus HTTP API
- PromQL
- kube-state-metrics
- Kubernetes CronJob
- Python

## Sources Consulted
- OpenTelemetry Collector Kubernetes components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector transforming telemetry and resource processor guidance: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Prometheus Remote Write exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/prometheusremotewriteexporter
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/storage/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The Collector snippet used the `attributes` processor to copy `team` into `cost_center`, but `k8sattributes` extracts Kubernetes labels as resource attributes. Changed this to the `resource` processor so the metadata copy applies to resource attributes.
- The Collector snippet queried `team` as a Prometheus label but did not enable Prometheus Remote Write resource attribute conversion. Added `resource_to_telemetry_conversion.enabled: true` so resource attributes such as `team` and `service_tier` are emitted as metric labels.
- The Prometheus remote write endpoint `/api/v1/write` requires Prometheus to have its remote write receiver enabled. Added a short prerequisite noting `--web.enable-remote-write-receiver`.
- The PromQL CPU request joins matched only on `pod` and `namespace`, which can produce incorrect vector matching when a pod has multiple containers. Updated joins to match on `pod`, `namespace`, and `container`.
- The CPU request queries did not constrain `unit="core"`. Added the unit matcher to avoid mixing incompatible resource units.
- The CPU usage selector excluded only the synthetic `POD` container. Added `container!=""` to avoid pod-level cgroup series with an empty container label.
- The risk query and report wording said "services" while the query counted time series. Updated the query to aggregate by pod and changed the report wording to "Pods at Risk."
- The Python script hardcoded `PROM_URL`, while the CronJob supplied `PROMETHEUS_URL`. Updated the script to read `PROMETHEUS_URL` from the environment with the original URL as a fallback.

## Review Notes
- Embedded Python snippets were parsed successfully with `python3 ast.parse`.
- Embedded YAML snippets were parsed successfully with PyYAML.
- The cost rates remain illustrative blended rates, not provider-specific billing calculations.
