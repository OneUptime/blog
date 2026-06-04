# Validation Summary: How to Configure Kubernetes Node Maintenance with Cordoning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl cordon, drain, and uncordon
- PodDisruptionBudget
- kube-state-metrics / Prometheus
- Bash scripting
- jq

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl command reference for cordon and node patching: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Nodes concept documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes Node API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/
- Kubernetes Node Status reference: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes guide for specifying PodDisruptionBudgets: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The cordon verification example used `kubectl describe node node-1 | grep Taints` and said it shows `node.kubernetes.io/unschedulable:NoSchedule`. Cordoning is represented directly by the Node `spec.unschedulable` field, and Kubernetes documentation notes that `SchedulingDisabled` is not a Node condition. Changed the example to query `.spec.unschedulable` with `kubectl get node ... -o jsonpath`, which reliably verifies cordon state.
- The maintenance script counted remaining pods with default table output and `grep -v DaemonSet`. Default `kubectl get pods` output does not include owner reference kind, so this would not reliably exclude DaemonSet pods. Changed the command to read pod JSON and use `jq` to count pods whose owner references do not include `DaemonSet`.

## Review Notes
The drain flags, PDB API version, PDB `minAvailable` behavior, and kube-state-metrics metric names used in the monitoring examples are current. `kubectl top` requires Metrics Server or another provider for the Metrics API, so those commands depend on cluster monitoring setup.
