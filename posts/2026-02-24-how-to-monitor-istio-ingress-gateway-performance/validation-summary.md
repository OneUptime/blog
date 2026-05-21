# Validation Summary: How to Monitor Istio Ingress Gateway Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Prometheus
- PromQL
- Prometheus Operator
- Grafana
- Kubernetes

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio secure metrics scraping for sidecars and gateways: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio access logging with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Prometheus and Grafana addon install commands used the old `release-1.22` branch. Updated both URLs to `release-1.30`, matching the current Istio documentation.
- The setup text implied the Istio demo profile itself means Prometheus is scraping metrics. Updated it to refer to the Istio sample Prometheus addon or an explicitly configured Prometheus scrape setup.
- The Prometheus Operator `ServiceMonitor` example selected the default ingress gateway Service and used a metrics port name that the default Service does not expose. Added a small metrics Service for port `15020` and updated the ServiceMonitor to scrape that Service at `/stats/prometheus`.
- The dashboard CPU panel queried `container_cpu_usage_seconds_total` directly even though it is a cumulative counter. Updated the panel query to use `rate(...[5m])`.
- The gateway-down alert assumed `job="istio-ingressgateway"`, which is not a reliable label for Istio's sample Prometheus scrape config. Updated it to use the namespace and pod labels that the sample scrape configuration relabels onto targets.

## Review Notes
- The Prometheus Operator ServiceMonitor may still need additional labels depending on the local Prometheus resource's `serviceMonitorSelector`.
- The Envoy-specific metrics listed in the post can vary with Istio and Envoy stat inclusion settings, but the Istio standard metrics and PromQL patterns are current.
