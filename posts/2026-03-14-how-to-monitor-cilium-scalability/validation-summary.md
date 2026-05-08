# Validation Summary: How to Monitor Cilium Scalability

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
- Grafana
- Prometheus Operator PrometheusRule resources
- eBPF

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium-dbg` agent-local commands: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- The Hubble metrics Helm example enabled OpenMetrics but did not set `hubble.metrics.enabled`, so Hubble metrics would not be exposed. Added a concrete metrics list.
- Several examples used `cilium metrics list`, `cilium identity list`, `cilium endpoint list`, and `cilium policy get`. Current Cilium documentation exposes these as agent-local `cilium-dbg` commands, so the examples now run them through `kubectl exec` against the Cilium daemonset.
- The Grafana dashboard example used `hubble.ui.enabled=true`, which enables Hubble UI rather than Grafana dashboard ConfigMaps. Changed it to `dashboards.enabled=true`.
- The alert rule used deprecated policy regeneration metrics. Updated it to use `cilium_endpoint_regeneration_time_stats_seconds`.
- The alert rule referenced `cilium_unreachable_health_endpoints`, which is not in the current Cilium metrics reference. Replaced it with an endpoint readiness alert using `cilium_endpoint_state`.
- The verification section used `cilium health status`, but the documented health client command is `cilium-health status`. Updated the example to run it inside a Cilium agent pod.
- The endpoint count verification left the old `cilium endpoint list` command in place. Replaced it with `cilium-dbg endpoint list -o json`.
- The troubleshooting section referenced `cilium bpf tunnel list`, which is not in the current `cilium-dbg bpf` command reference. Replaced it with `cilium-dbg bpf ipcache list` for checking remote endpoint mappings.
- The troubleshooting section asserted a generic kernel version of 4.19 or later. Current Cilium system requirements are version-specific and recommend newer kernels, so the wording now points readers to the system requirements for their Cilium version.
- The configuration troubleshooting command used `cilium config view`, which is not the documented current agent-local debug command. Updated it to `cilium-dbg config`.

## Review Notes
The Prometheus alert thresholds remain examples and should be tuned per cluster size, traffic profile, and alerting policy. The Cilium CLI, Helm, and kubectl binaries were not installed in the local workspace, so CLI verification was performed against the official Cilium command reference and documentation rather than local `--help` output.
