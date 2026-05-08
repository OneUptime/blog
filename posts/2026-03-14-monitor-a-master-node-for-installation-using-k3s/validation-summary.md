# Validation Summary: Monitoring a Master Node for Cilium Installation Using K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- K3s
- Prometheus
- Prometheus Operator
- Grafana
- kube-state-metrics
- node-exporter

## Sources Consulted
- K3s Architecture documentation: https://docs.k3s.io/architecture
- K3s Metrics documentation: https://docs.k3s.io/reference/metrics
- K3s Cluster Datastore documentation: https://docs.k3s.io/datastore
- K3s Managing Server Roles documentation: https://docs.k3s.io/installation/server-roles
- Cilium Monitoring & Metrics reference: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API reference for `ServiceMonitor` and `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The prerequisites did not state that Cilium Prometheus metrics must be enabled. Added this because Cilium metrics are only exposed when configured for Prometheus.
- The `K3sMasterNodeNotReady` alert matched node names with `node=~".*master.*"`, which is brittle and can miss valid K3s server nodes. Updated it to select nodes by the `control-plane` or `master` role using `kube_node_role`.
- The Cilium troubleshooting commands used `cilium` inside the agent pod. Current Cilium command documentation uses `cilium-dbg` for these in-pod debug operations, so the metrics, endpoint, and BPF conntrack commands were updated.
- The Cilium CPU and memory PromQL examples filtered Cilium pods by node name regex. Updated them to join against `kube_node_role` so they target control-plane/master nodes by Kubernetes role instead of hostname convention.
- The policy metrics query referenced `cilium_policy_import_errors_total`, which is not a documented current Cilium metric. Replaced it with `cilium_policy_change_total`.
- The dashboard referenced `cilium_agent_uptime_seconds`, which is not a documented current Cilium metric. Replaced it with the Prometheus scrape health query `up{job="cilium-agent"}`.
- The endpoint count dashboard query used `cilium_endpoint_state` without grouping by its documented `state` label. Updated it to `sum(cilium_endpoint_state) by (state)`.
- The dashboard listed etcd latency without noting that K3s uses SQLite by default and etcd metrics only apply to embedded or external etcd clusters. Added that caveat to the panel description.

## Review Notes
- The node-exporter resource alert examples still assume the node-exporter `instance` label contains the master node name. This is common in kube-prometheus-style setups but should be adjusted if a cluster uses IP:port or another target label format.
- Prometheus `job` label values such as `cilium-agent` can vary depending on ServiceMonitor or scrape configuration.
