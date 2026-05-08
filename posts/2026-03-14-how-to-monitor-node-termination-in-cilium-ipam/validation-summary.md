# Validation Summary: Monitoring Node Termination in Cilium IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- Prometheus
- Prometheus Operator
- Bash
- kubectl

## Sources Consulted
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Operator internals: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Cilium operator command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator.html
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The metrics section used `cilium_operator_ces_slice_count` for CiliumNode-to-node divergence. That metric tracks CiliumEndpointSlice state, not CiliumNode count, so the expression was replaced with a comparison between `count(kube_node_info)` and the documented Cilium operator IPAM node metric `cilium_operator_ipam_nodes{category="total"}`.
- The post referred to `cilium_operator_ipam_node_release_total`, which is not a documented current Cilium operator IPAM metric. Replaced it with `sum(rate(cilium_operator_ipam_ip_release_ops[1h]))`, matching the documented `ipam_ip_release_ops` operator metric name with the `cilium_operator_` namespace prefix.
- The post used `cilium_ipam_available`, which is not the documented operator metric for available IPs. Replaced it with `sum(cilium_operator_ipam_available_ips)`.
- The alert rule used `cilium_nodes_all`, which is not a documented current Cilium metric. Replaced it with the same documented node-count comparison used in the metrics section.
- The troubleshooting text mentioned decreasing a generic GC interval. Updated it to the documented `--nodes-gc-interval` Cilium operator flag for CiliumNode GC.
- The shell script used a word-boundary grep check and singular resource lookup. Updated the check to `grep -Fxq` for exact node-name matching and used `kubectl get ciliumnodes "$cn"` for the CiliumNode resource lookup.

## Review Notes
- The Cilium operator IPAM metrics used in the PromQL examples are documented for AWS ENI, Azure IPAM, and AlibabaCloud IPAM. The post now notes that other IPAM modes should use the kubectl-based CiliumNode comparison or expose CiliumNode counts through kube-state-metrics custom resource metrics.
