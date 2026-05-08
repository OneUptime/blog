# Validation Summary: Monitoring Native Routing in Cilium

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- Kubernetes
- Prometheus and Prometheus Operator
- Grafana
- Hubble
- Helm

## Sources Consulted
- Cilium native routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Prometheus and Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Monitoring & Metrics reference: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Hubble troubleshooting examples: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Prometheus Operator `PrometheusRule` API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm example pinned Cilium `1.16.5`, which is outdated relative to the current stable Cilium documentation consulted during review. Updated the example to `1.19.3`.
- The Hubble metrics Helm values omitted `hubble.enabled=true`, even though Cilium documentation states Hubble must be enabled for Hubble metrics to work. Added `hubble.enabled=true`.
- The Hubble metrics list used deprecated `http`. Updated it to `httpV2` and enabled OpenMetrics, matching current Cilium examples.
- The kube-prometheus-stack context requires Prometheus Operator discovery in many installations. Added ServiceMonitor enablement and matching `release: kube-prometheus-stack` labels for Cilium agent, operator, and Hubble metrics.
- The examples used `cilium metrics list` inside the Cilium DaemonSet. Current Cilium agent images expose the in-container debugging CLI as `cilium-dbg`; changed those examples to `cilium-dbg metrics list`.
- The PromQL examples used `endpoint_state` as a label for `cilium_endpoint_state`. The official metric label is `state`; updated dashboard and alert examples accordingly.
- The agent health panel used `cilium_agent_uptime_seconds`, which is not listed in the current Cilium metrics reference. Replaced it with the Prometheus scrape health metric `up{job="cilium-agent"}`.
- The dashboard used `cilium_datapath_conntrack_entries`, which is not listed in the current Cilium metrics reference. Replaced it with `cilium_datapath_conntrack_gc_entries`.

## Review Notes
- The native routing explanation is consistent with Cilium documentation: native routing delegates non-local endpoint traffic to the Linux routing subsystem and requires the network to route pod/workload addresses.
- The exact Prometheus `job` labels can vary by ServiceMonitor configuration. The examples are reasonable for the Cilium chart defaults, but users may need to adjust selectors in custom Prometheus setups.
