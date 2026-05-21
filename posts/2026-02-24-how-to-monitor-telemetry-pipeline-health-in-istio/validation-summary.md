# Validation Summary: How to Monitor Telemetry Pipeline Health in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy sidecars
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- OpenTelemetry Collector
- Jaeger
- Kubernetes
- Grafana dashboards
- Bash, curl, and jq

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy Statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/3.9/querying/api/
- Prometheus Jobs and Instances: https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus Query Functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API Reference: https://prometheus-operator.dev/docs/api-reference/api/
- OpenTelemetry Collector Internal Telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- Kubernetes kubectl Reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Jaeger Monitoring: https://www.jaegertracing.io/docs/1.76/monitoring/
- Local curl help output for `-s`, `-o`, and `-w` flags.

## Issues Found
- The OpenTelemetry Collector trace-dropping alert used `otelcol_processor_dropped_spans`, which is not part of the current Collector internal telemetry metrics documented for monitoring data loss. Replaced it with `otelcol_exporter_enqueue_failed_spans`, which the Collector docs recommend for detecting spans that failed to enter the exporter sending queue.
- The Grafana dashboard query for dropped spans used the same outdated Collector metric. Updated it to the matching exporter enqueue-failure metric.
- One Prometheus HTTP API query URL in the shell script was unquoted. Quoted it so shell globbing cannot affect PromQL containing query syntax.

## Review Notes
- Prometheus job names such as `kubernetes-pods` and the Prometheus service hostname are deployment-specific placeholders; users may need to adjust them for their Prometheus setup.
- OpenTelemetry Collector Prometheus metric names can vary if internal telemetry readers or Prometheus exporter suffix settings are customized. The updated metric name follows the current Collector documentation's internal metric naming.
- `istio_requests_total` and the `source_workload` label are valid Istio standard telemetry, but the canary alert assumes sidecar mode and that Prometheus is scraping Istio metrics for the canary workload.
