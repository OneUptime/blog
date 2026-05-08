# Validation Summary: Monitoring a Cilium Installation for Ongoing Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana
- Hubble
- PromQL

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/stable/cmdref/cilium_status/
- Cilium debug CLI command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Prometheus Operator API reference for `PrometheusRule` and `ServiceMonitor`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm command enabled only agent metrics and the agent ServiceMonitor. I added the operator and Hubble metrics ServiceMonitor settings so the command matches the surrounding Cilium, operator, and Hubble monitoring configuration.
- The post referenced `cilium_agent_uptime_seconds`, which is not listed in the current Cilium metrics reference. I replaced it with a PromQL restart check using `process_start_time_seconds`.
- The post used `cilium_ct_entries / cilium_ct_max_entries`, which is not a current Cilium metrics pair. I replaced it with documented conntrack garbage collection metrics: `cilium_datapath_conntrack_gc_entries` and `cilium_datapath_conntrack_dump_resets_total`.
- The custom script used `cilium endpoint list`, but endpoint inspection is provided by the in-agent debug CLI as `cilium-dbg endpoint list`. I changed the example to select a Cilium pod and run `cilium-dbg` with `kubectl exec`.
- The custom script used `cilium status --brief`, but `--brief` belongs to `cilium-dbg status`, not the Kubernetes-level `cilium status` command. I changed it to `cilium status`.
- The verification section port-forwarded `svc/cilium-agent` for agent metrics. I changed it to port-forward an actual Cilium pod on port 9962, which matches the documented Cilium agent metrics endpoint.
- The Hubble verification checked the Hubble API rather than the Hubble metrics endpoint. I changed it to port-forward `svc/hubble-metrics` on port 9965 and curl `/metrics`.

## Review Notes
- The `up{job="cilium"}` examples depend on Prometheus target labels and may need adjustment if a cluster's ServiceMonitor uses different job labels.
- Hubble metrics require Hubble itself to be enabled; the post already lists this as a prerequisite.
