# Validation Summary: How to Set Up Telemetry for Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Istio waypoint proxies
- Istio Telemetry API
- Prometheus
- Grafana
- Kubernetes
- Kubernetes Gateway API
- OpenTelemetry tracing

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio ambient waypoint proxy configuration: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient getting started guide: https://istio.io/latest/docs/ambient/getting-started/
- Istio ztunnel troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio sidecar vs ambient dataplane mode comparison: https://istio.io/latest/docs/overview/dataplane-modes/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration guide: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana dashboard task: https://istio.io/latest/docs/tasks/observability/metrics/using-istio-dashboard/
- Istio Envoy access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Istio ztunnel Helm chart values and manifest for port/annotation checks: https://github.com/istio/istio/tree/release-1.30/manifests/charts/ztunnel

## Issues Found
- The ambient install command omitted the non-interactive confirmation flag used in the official ambient getting started guide. Updated it to `istioctl install --set profile=ambient --skip-confirmation`.
- The ztunnel metric inspection command assumed `curl` exists inside the ztunnel container. Updated it to use `kubectl debug` with `curlimages/curl`, matching the debugging pattern in the official ztunnel guide.
- The Prometheus scrape config replaced `__address__` from the Prometheus port annotation alone, which would produce an invalid address. Updated it to set `metrics_path: /stats/prometheus` and rewrite the discovered pod address to port `15020`.
- The metric label examples used `source_namespace` and `destination_namespace`, but Istio standard metric labels use `source_workload_namespace` and `destination_workload_namespace`. Corrected the label names.
- The waypoint section omitted the Gateway API CRD prerequisite. Added the official CRD install check before `istioctl waypoint apply`.
- The Telemetry API custom TCP label used `connection.id` directly. Because metric tag values are strings and Envoy exposes `connection.id` as an unsigned integer, changed the expression to `string(connection.id)`.
- The access logging section implied the `envoy` Telemetry provider configures ztunnel access logs. Clarified that Telemetry API configures Envoy access logs for waypoint proxies, while ztunnel L4 traffic logs are read from ztunnel pod logs.
- Several ztunnel log/debug commands targeted `ds/ztunnel` or Envoy-style stats. Replaced them with label-based `kubectl logs`, `istioctl ztunnel-config workloads`, and the official ztunnel `config_dump` debug pattern.
- The Grafana addon URL used the old `release-1.24` branch. Updated it to `release-1.30`, current in the official Istio docs as of this review.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. The Grafana addon remains a sample/demo install and should not be presented as a production-grade observability stack.
