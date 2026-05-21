# Validation Summary: How to Monitor Istio Health During an Upgrade

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana dashboards
- Envoy sidecar proxy metrics
- kube-state-metrics

## Sources Consulted
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod with proxy-status: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Prometheus histogram_quantile function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator PrometheusRule API documentation: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Kubernetes kubectl reference documentation: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl quick reference for logs examples: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
- The post referenced `pilot_xds_push_errors`, which is not listed in the current Istio pilot-discovery exported metrics. I replaced it with `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`, which are current Istio metrics for internal XDS errors and proxy-rejected XDS responses.
- The recording rule `istio:xds_push_error_rate:5m` used the obsolete `pilot_xds_push_errors` metric. I renamed it to `istio:xds_error_rate:5m` and updated the expression to sum `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`.
- The `IstioUpgradeStaleProxies` alert used `envoy_server_live{} unless on(pod) kube_pod_status_ready{condition="true"}`, which does not correctly identify unready proxies because kube-state-metrics readiness series can exist even when their value is `0`. I changed the alert to `IstioUpgradeUnreadyProxyContainers` and used `sum(kube_pod_container_status_ready{container="istio-proxy"} == 0) > 10`.
- The proxy log command assumed the status code was always the final field in the log line. I updated it to extract a standard Envoy access-log response code pattern and clarified that the command applies when Envoy access logging is enabled.

## Review Notes
The dashboard item for STALE proxies is best implemented from `istioctl proxy-status` output or another purpose-built exporter, since Istio's documented Prometheus metrics do not expose `SYNCED` versus `STALE` proxy-status columns directly as a simple built-in metric. The rest of the PromQL examples and Kubernetes commands are syntactically plausible for a cluster with Istio telemetry, kube-state-metrics, Prometheus Operator CRDs, and metrics-server installed.
