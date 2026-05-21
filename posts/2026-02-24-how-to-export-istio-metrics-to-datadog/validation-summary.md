# Validation Summary: How to Export Istio Metrics to Datadog

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Istio
- Datadog Agent and Istio integration
- Datadog Helm chart
- Kubernetes
- Prometheus and OpenMetrics scraping
- OpenTelemetry Collector

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Datadog Istio integration documentation: https://docs.datadoghq.com/integrations/istio
- Datadog Kubernetes Prometheus and OpenMetrics collection documentation: https://docs.datadoghq.com/containers/kubernetes/prometheus/
- Datadog OpenMetrics integration documentation: https://docs.datadoghq.com/integrations/openmetrics/
- Datadog OpenTelemetry Collector setup documentation: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Datadog integrations-core Istio sample configuration: https://github.com/DataDog/integrations-core/blob/master/istio/datadog_checks/istio/data/conf.yaml.example

## Issues Found
- The post described port 15090 as the main Istio sidecar metrics endpoint. Istio documents 15020 as the sidecar workload metrics endpoint and 15090 as Envoy-only telemetry, so I updated the explanation and examples to use `:15020/stats/prometheus`.
- The Datadog Istio check example omitted current Istio integration options and used histogram/counter flags that do not match the documented Datadog Istio integration example. I updated it to use `use_openmetrics: true`, include `proxyv2-rhel8`, set `send_histograms_buckets: false`, and set `tag_by_endpoint: false`.
- The pod annotation example was missing required `apps/v1` Deployment selector and matching pod labels, and its Istio check configuration used the outdated endpoint. I added the selector/labels and updated the check configuration.
- The OpenTelemetry Collector example used an older filter processor style and an unescaped Prometheus relabel replacement value. I moved metric filtering into Prometheus `metric_relabel_configs`, escaped `$1` as `$$1`, and used the documented `${env:DD_API_KEY}` environment-variable syntax.
- The collector Deployment referenced a service account that was not created in the YAML example. I added the `ServiceAccount` manifest before the Deployment.
- The Datadog metric example used `istio.mesh.request.count`, while the documented Datadog Istio integration metric for request counts is `istio.mesh.request.count.total`. I corrected the verification and dashboard examples.
- The production tips referred to `metrics_filter` in Datadog config. The current Istio/OpenMetrics-style Datadog configuration uses options such as `exclude_metrics`, so I corrected that reference.

## Review Notes
- The OpenTelemetry example uses `otel/opentelemetry-collector-contrib:latest`; pinning an explicit Collector version would be better for production reproducibility.
- The guide intentionally remains version-neutral. Istio and Datadog metric names can vary depending on Datadog integration mode and whether metrics are collected through the Datadog Istio integration or a generic OpenTelemetry/Prometheus path.
