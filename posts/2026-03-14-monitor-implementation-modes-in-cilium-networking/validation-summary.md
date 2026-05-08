# Validation Summary: Monitoring Implementation Modes in Cilium Networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Grafana
- Hubble

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble exporter/filter examples: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium GitHub README stable release table: https://github.com/cilium/cilium

## Issues Found
- The Helm example used Cilium chart version `1.16.5`, which is no longer one of the maintained stable Cilium branches as of 2026-05-08. Updated the example to `1.19.3`, the current stable release listed by Cilium.
- The Helm example enabled Hubble metrics but did not explicitly enable Hubble or Hubble Relay, which are required for the later Hubble flow examples. Added `hubble.enabled=true` and `hubble.relay.enabled=true`.
- The Helm example assumed Prometheus Operator scraping but did not enable ServiceMonitor resources. Added Cilium, operator, and Hubble ServiceMonitor settings.
- The Hubble metrics list used deprecated `http`; updated it to `httpV2`, which the current Cilium metrics documentation recommends.
- The post referenced `cilium_datapath_conntrack_entries`, which is not a documented Cilium metric. Replaced it with `cilium_datapath_conntrack_gc_entries`.
- The post applied `rate()` to conntrack entries, which are not a counter-style packet rate. Replaced the PromQL with a gauge aggregation by `family`.
- The post used `cilium_agent_uptime_seconds`, which is not documented in the Cilium metrics reference. Replaced it with Prometheus scrape health via `up{job="cilium-agent"}`.
- The post grouped and filtered `cilium_endpoint_state` with the label `endpoint_state`, but Cilium 1.19 documents the label as `state`. Updated the dashboard query and alert expression.
- The commands used `cilium metrics list` inside the Cilium pod; current Cilium command reference documents `cilium-dbg metrics list`. Updated the metric inspection commands.
- The Hubble flow examples executed `hubble` inside the Cilium DaemonSet pod. Official Hubble docs use the local Hubble CLI with `-P` for automatic port-forwarding. Updated the examples and added the Hubble CLI prerequisite.

## Review Notes
- The PrometheusRule CRD shape is correct for Prometheus Operator, but the `release: kube-prometheus-stack` label still depends on the local Prometheus `ruleSelector`.
- The ServiceMonitor resources may also need additional labels in clusters where Prometheus uses a strict `serviceMonitorSelector`.
