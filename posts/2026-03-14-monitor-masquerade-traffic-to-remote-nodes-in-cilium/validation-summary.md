# Validation Summary: Monitoring Masquerade Traffic to Remote Nodes in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator
- Grafana
- Hubble

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Masquerading documentation: https://docs.cilium.io/en/stable/network/concepts/masquerading/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Hubble setup and CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction incorrectly described remote-node masquerading as affecting pod-to-pod traffic across nodes. Updated it to state that `enable-remote-node-masquerade` affects endpoint traffic directed to remote node addresses in BPF masquerading mode, not endpoint-to-endpoint traffic.
- The Helm example used Cilium `1.16.5` and enabled Hubble metrics without enabling Hubble. Updated the example to Cilium `1.19.3`, added `hubble.enabled=true`, enabled OpenMetrics for Hubble metrics, and used the current `httpV2` Hubble metric name from the official example.
- The metrics verification commands used `cilium metrics list`, but the in-agent documented command is `cilium-dbg metrics list`. Updated both commands accordingly and used the documented `--match-pattern` flag.
- The agent health panel referenced `cilium_agent_uptime_seconds`, which is not in the current Cilium metrics reference. Replaced it with the Prometheus scrape health metric `up{job="cilium-agent"}`.
- The endpoint state queries grouped and filtered by `endpoint_state`, but the current metric label is `state`. Updated the PromQL examples and alert expression to use `state`.
- The dashboard referenced `cilium_datapath_conntrack_entries`, which is not in the current Cilium metrics reference. Replaced it with `cilium_datapath_conntrack_gc_entries`.

## Review Notes
The article remains a general monitoring guide rather than a direct per-packet SNAT audit. Cilium's built-in Prometheus metrics can show forwards, drops, endpoint state, BPF map pressure, and conntrack garbage collection state, while Hubble is the better tool for inspecting individual flows. Thresholds such as the drop-rate alert should be tuned per cluster workload and traffic volume.
