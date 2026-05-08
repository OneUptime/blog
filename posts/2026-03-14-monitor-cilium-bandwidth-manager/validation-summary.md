# Validation Summary: Monitoring Cilium Bandwidth Manager

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium Bandwidth Manager
- Kubernetes
- Prometheus and Prometheus Operator
- Grafana
- Hubble
- Helm

## Sources Consulted
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Prometheus and Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium command reference for cilium-dbg metrics: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction said Cilium Bandwidth Manager enforces pod bandwidth limits without traditional Linux traffic control rules. Cilium's documentation states more specifically that it does not use the bandwidth CNI plugin; egress limits use EDT and ingress limits use an eBPF token bucket. Updated the wording to match the documented behavior.
- The Helm example enabled Hubble metrics without explicitly enabling Hubble. Added `hubble.enabled=true`, which Cilium documents as required for Hubble metrics.
- The Helm example pinned Cilium `1.16.5`, while the reviewed metric names and Helm examples were verified against the current stable Cilium `1.19.3` documentation. Updated the example version to `1.19.3`.
- The Helm example used the deprecated Hubble `http` metric. Changed it to `httpV2`.
- The Helm example did not enable `bandwidthManager.enabled=true`, even though the post is about monitoring Bandwidth Manager. Added the Helm value so the feature metric and alert are meaningful.
- The primary metric `cilium_datapath_conntrack_entries` is not a documented Cilium metric. Replaced it with the documented Bandwidth Manager feature metric `cilium_feature_adv_connect_and_lb_bandwidth_manager_enabled` and changed the conntrack dashboard example to `cilium_datapath_conntrack_gc_entries`.
- The example used `cilium metrics list`, but the current in-pod Cilium command reference documents `cilium-dbg metrics list`. Updated the commands accordingly.
- The endpoint state examples grouped on `endpoint_state`, but Cilium documents the label as `state`. Updated the PromQL examples to use `state`.
- The agent health example used `cilium_agent_uptime_seconds`, which is not documented as a Cilium metric. Replaced it with an `up` query for Cilium scrape targets.
- The alert for not-ready endpoints used the wrong endpoint metric label. Replaced it with a Bandwidth Manager disabled alert based on the documented feature metric.
- The Hubble examples used `kubectl exec` into Cilium pods. While Hubble CLI is available in agent pods, the official Hubble setup flow recommends using Hubble Relay through the local Hubble CLI with `-P`. Updated the examples to use `hubble observe -P`.

## Review Notes
The Prometheus job labels in examples such as `job="cilium-agent"` and `job="cilium-operator"` depend on the Prometheus scrape configuration or ServiceMonitor setup. The examples are plausible for common kube-prometheus-stack deployments, but users may need to adjust label selectors for their cluster.
