# Validation Summary: Monitoring Cilium Masquerading

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- Hubble
- Helm

## Sources Consulted
- Cilium Masquerading documentation: https://docs.cilium.io/en/latest/network/concepts/masquerading/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium CLI `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm upgrade example pinned Cilium `1.16.5`, which is outdated for a current guide. Updated it to `1.19.3`, matching the current stable documentation reviewed.
- The Hubble metrics Helm values enabled `hubble.metrics.enabled` but did not explicitly enable Hubble. Added `hubble.enabled=true` and `hubble.metrics.enableOpenMetrics=true`, and changed `http` to `httpV2` because current Cilium documentation describes `httpV2` as the updated HTTP metrics implementation.
- The in-pod metrics commands used `cilium metrics list`, but the current agent-container command reference documents `cilium-dbg metrics list`. Updated the examples accordingly.
- The post referenced `cilium_datapath_conntrack_entries`, which is not the current documented conntrack metric. Replaced it with `cilium_datapath_conntrack_gc_entries`.
- The PromQL example used `rate()` on a conntrack entries metric. Replaced it with the direct gauge query for conntrack entries.
- The `cilium_endpoint_state` PromQL examples used the label `endpoint_state`, but Cilium documents this metric with the label `state`. Updated dashboard and alert queries.
- The agent health example used `cilium_agent_uptime_seconds`, which was not present in the current metrics reference. Replaced it with the standard scrape health query `up{job="cilium-agent"}` already used elsewhere in the post.
- The Hubble examples attempted to run `hubble observe` inside the Cilium DaemonSet pod. Current Cilium docs require the Hubble CLI and show access through Hubble Relay with `-P` / port-forwarding. Updated the examples to local `hubble observe -P` commands and added the Hubble CLI prerequisite.
- The Hubble troubleshooting note recommended restarting Hubble Relay. Replaced it with current verification steps using `cilium status` and `hubble status -P`.

## Review Notes
The alerts and dashboards are useful operational checks, but Cilium does not expose a dedicated "masquerade failures" metric in the reviewed metrics reference. The post now frames conntrack, drops, endpoint state, and Hubble flow data as supporting signals for masquerading-related investigations rather than as masquerade-specific counters.
