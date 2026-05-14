# Validation Summary: Cilium Metrics with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- PromQL

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium v1.19.4 Helm chart ServiceMonitor and Service templates: https://github.com/cilium/cilium/tree/v1.19.4/install/kubernetes/cilium/templates
- Cilium v1.19.4 metric definitions: https://github.com/cilium/cilium/tree/v1.19.4/pkg/metrics and https://github.com/cilium/cilium/tree/v1.19.4/pkg/bgp/metrics
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The Helm command enabled Hubble metrics without enabling Hubble itself. Added `--set hubble.enabled=true`, as Cilium requires Hubble to be enabled for Hubble metrics.
- The manually managed ServiceMonitor examples used incorrect service port names and incomplete selectors for current Cilium chart services. Updated the examples to use the `metrics` and `hubble-metrics` service ports and Cilium chart labels.
- The ServiceMonitor examples assumed Cilium agent and operator metrics Services existed. Added `prometheus.metricsService=true` and `operator.prometheus.metricsService=true` to the Helm command so the referenced Services are created when ServiceMonitors are managed separately.
- The post described `cilium_endpoint_regenerations_total` as a latency metric. Replaced it with `cilium_endpoint_regeneration_time_stats_seconds`, the current endpoint regeneration duration metric.
- The key metrics list used outdated or incorrect metric names: replaced `cilium_policy_regeneration_time_stats_seconds`, `cilium_bpf_map_ops_total`, `cilium_bgp_session_state`, and `cilium_policy_import_errors_total` with current metrics or selectors.
- The policy alert referenced the removed/obsolete `cilium_policy_import_errors_total` metric. Updated it to alert on `cilium_policy_change_total{outcome="fail"}`.
- The verification command port-forwarded a DaemonSet while the guide's scraping configuration uses the Cilium metrics Service. Updated it to port-forward `svc/cilium-agent`.
- The architecture diagram labeled Hubble metrics as coming from Hubble Relay. Updated it to show Hubble Metrics on port 9965.
- The conclusion said BPF map operation metrics warn about capacity. Updated it to refer to BPF map pressure metrics.

## Review Notes
The article now matches the current Cilium 1.19.x metric names and Helm chart ServiceMonitor/service behavior. Prometheus Operator selection of ServiceMonitors can still depend on the Prometheus instance's `serviceMonitorSelector`, so users may need to adjust labels for their monitoring stack.
