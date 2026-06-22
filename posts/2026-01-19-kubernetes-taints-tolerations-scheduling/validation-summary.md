# Validation Summary: How to Configure Taints and Tolerations in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes taints and tolerations
- Kubernetes scheduler behavior
- kubectl node taint, cordon, drain, and label commands
- Kubernetes Pod, Deployment, DaemonSet, and PriorityClass manifests
- Node affinity and node selectors

## Sources Consulted
- Kubernetes: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl taint reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes kubectl cordon reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes kubectl drain reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: Safely Drain a Node - https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes API: Toleration v1 - https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes: DaemonSet - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- The high-security node setup used an invalid taint command: `security=high:NoSchedule:NoExecute`. Kubernetes taints accept exactly one effect per taint argument, so this was changed to add separate `NoSchedule` and `NoExecute` taints in the same command.
- The multiple tolerations example described a `node.kubernetes.io/unschedulable:NoSchedule` toleration as a way to tolerate "short maintenance windows". `tolerationSeconds` only applies to `NoExecute` tolerations, and Kubernetes documentation recommends avoiding the unschedulable taint for ordinary workloads except DaemonSets. The example was changed to a regular `workload=batch:NoSchedule` toleration.

## Review Notes
- `kubectl` is not installed in this workspace, so CLI verification was done against the official Kubernetes command reference rather than local `kubectl --help` output.
- The `node-role.kubernetes.io/master` control-plane taint is deprecated but still shown as a compatibility toleration. The post also includes the current `node-role.kubernetes.io/control-plane` taint, so no change was required.
