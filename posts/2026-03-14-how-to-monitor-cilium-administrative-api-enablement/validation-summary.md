# Validation Summary: How to Monitor Cilium Administrative API Enablement

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium CLI and cilium-dbg
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana dashboards
- Hubble metrics
- eBPF

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Administrative API Enablement documentation: https://docs.cilium.io/en/stable/configuration/api-restrictions.html
- Cilium API Reference: https://docs.cilium.io/en/stable/api/
- Cilium cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium cilium-health status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- Hubble metrics were enabled with `hubble.metrics.enableOpenMetrics=true` but without `hubble.metrics.enabled`, which means Hubble flow/drop metrics would not be exported. Added a concrete Hubble metric set including `drop`.
- Several examples used `cilium metrics list`, `cilium identity list`, `cilium endpoint list`, `cilium policy get`, and `cilium bpf tunnel list` as cluster CLI commands. Current Cilium documentation exposes those local agent API and debug commands through `cilium-dbg`, so the examples were changed to run `cilium-dbg` inside a selected Cilium agent pod.
- The post used `cilium status --brief`, but the documented `cilium status` flags do not include `--brief`. Replaced it with `cilium status`.
- The verification command used `cilium health status`, but the documented health client command is `cilium-health status`. Updated the example to run `cilium-health status` inside a Cilium agent pod.
- The Grafana dashboard example enabled `hubble.ui.enabled=true`, which deploys Hubble UI rather than Grafana dashboard ConfigMaps. Replaced it with the chart dashboard values for Cilium, operator, and Hubble metrics dashboards.
- The Prometheus alert for policy regeneration referenced `cilium_policy_regeneration_time_stats_seconds_*`, which is not a current documented metric. Replaced it with `cilium_policy_implementation_delay`.
- The high-drop alert referenced only `cilium_drop_count_total` while the post also configures Hubble drop metrics. Kept the Cilium datapath drop metric and added `hubble_drop_total`.
- The endpoint count verification used `cilium endpoint list -o json`, which is not a current cluster CLI command. Replaced it with `kubectl get ciliumendpoints --all-namespaces`.
- Added an explicit `cilium config view | grep enable-cilium-api-server-access` check so the guide directly validates the administrative API enablement setting discussed in the title.

## Review Notes
The guide is now technically valid for the documented Cilium 1.14+ administrative API enablement feature and current Cilium CLI split between cluster-level `cilium` commands and local agent `cilium-dbg` commands. The PrometheusRule assumes the Prometheus Operator CRDs are installed, which the post already implies by using `monitoring.coreos.com/v1`.
