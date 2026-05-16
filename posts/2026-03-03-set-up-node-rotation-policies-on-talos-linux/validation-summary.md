# Validation Summary: How to Set Up Node Rotation Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- etcd
- jq
- Prometheus Operator PrometheusRule
- kube-state-metrics

## Sources Consulted
- Talos Linux v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux v1.12 Scale up a Talos cluster: https://docs.siderolabs.com/talos/v1.12/deploy-and-manage-workloads/scaling-up
- Talos Linux v1.12 Scale down a Talos cluster: https://docs.siderolabs.com/talos/v1.12/deploy-and-manage-workloads/scaling-down
- Talos Linux v1.12 Control Plane guide: https://docs.siderolabs.com/talos/v1.12/learn-more/control-plane
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- kube-state-metrics Node Metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The control plane rotation script used `talosctl etcd remove-member "$CP_NODE_NAME"`, but the Talos CLI expects an etcd member ID for `remove-member`, and the official documentation says to prefer `etcd leave`/`talosctl reset` for an accessible node. I changed the script to reset the old control plane node with `talosctl reset -n "$CP_NODE_IP" --graceful`, which makes the node leave etcd as part of the documented reset flow, then deletes the Kubernetes Node object.

## Review Notes
- The worker rotation flow matches Talos scale-up guidance for applying a machine config to new nodes and Kubernetes guidance for cordon/drain/delete operations.
- `talosctl reset` already attempts to cordon/drain during a graceful reset, so operators may not need a separate Kubernetes drain before resetting Talos nodes.
- The sample rotation policy YAML is an example policy document, not a Talos or Kubernetes API object.
- The `kube_node_created` metric used in the alert is a stable kube-state-metrics node metric.
