# Validation Summary: How to Monitor Solution in Cilium configuration

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator
- Grafana
- eBPF

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Service Map & Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui.html
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-health status`: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- Hubble metrics were partially enabled with `hubble.metrics.enableOpenMetrics=true` but no Hubble metric set was selected. Added `hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp}"` because Cilium only creates and serves selected Hubble metrics when `hubble.metrics.enabled` is non-empty.
- The key metrics commands used `cilium metrics list`, which is not the current local-agent diagnostic command in the Cilium docs. Replaced these examples with `kubectl exec ... -- cilium-dbg metrics list`.
- Several metric names and grep patterns were outdated or inaccurate, including `identity_count`, `endpoint_count`, and policy regeneration metric names. Updated patterns to match current Cilium metric names such as `cilium_identity`, `cilium_endpoint`, `cilium_policy`, `cilium_drop`, and `cilium_forward`.
- The Grafana dashboard example enabled Hubble UI instead of Cilium dashboard ConfigMaps. Replaced it with the chart values `dashboards.enabled=true`, `operator.dashboards.enabled=true`, and `hubble.metrics.dashboards.enabled=true`.
- The Prometheus alert examples used a non-documented metric, `cilium_unreachable_health_endpoints`, and deprecated policy regeneration metrics. Replaced them with alerts based on documented metrics: `cilium_controllers_failing`, `cilium_endpoint_regeneration_time_stats_seconds_bucket`, and `cilium_drop_count_total`.
- The alert rule snippet did not clarify that `PrometheusRule` is a Prometheus Operator CRD. Updated the snippet comment to specify Prometheus Operator usage.
- Local Cilium agent commands such as `status --brief`, `identity list`, `endpoint list`, `policy get`, and `endpoint get` were shown as top-level `cilium` CLI commands. Updated them to run through `cilium-dbg` inside a Cilium agent pod.
- The inter-node health command used `cilium health status`, but the documented command is `cilium-health status`. Updated the verification command to execute `cilium-health status` inside a Cilium agent pod.
- The troubleshooting note used a fixed Linux kernel version of 4.19 or later. Replaced it with a version-aware requirement to meet the kernel requirements for the installed Cilium version because current Cilium documentation recommends Linux kernel 5.10 or equivalent for recent releases.

## Review Notes
- The guide is technically relevant and contains concrete commands, Helm values, Prometheus rules, and Kubernetes troubleshooting steps.
- The prerequisites still mention Kubernetes v1.21+ and Cilium v1.14+ as a broad baseline. For future maintenance, consider aligning these version references to the exact Cilium release targeted by the post because current Cilium releases document a narrower tested Kubernetes version matrix.
