# Validation Summary: How to Schedule Pods on Master Nodes in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes scheduling
- Taints and tolerations
- Node selectors and node affinity
- DaemonSets
- PriorityClass
- Kubelet resource reservations

## Sources Consulted
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: kubectl taint - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: DaemonSet - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Creating a cluster with kubeadm, control plane node isolation - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes documentation: Reserve Compute Resources for System Daemons - https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/

## Issues Found
- The custom `PriorityClass` example used the name `system-critical`. Kubernetes reserves the `system-` prefix for built-in priority classes, so a user-created PriorityClass with that name is invalid. I changed the example to mention the built-in `system-node-critical` and `system-cluster-critical` classes and kept only a valid lower-priority workload class.
- The schedulability check used `kubectl auth can-i create pods`, which checks RBAC authorization rather than whether a pod can schedule on a node. It also said `kubectl run --dry-run=server` would show where a pod would schedule, but server-side dry run only validates/defaults the object and does not bind it to a node. I replaced those commands with creating a test pod, inspecting events, checking `kubectl get pod -o wide`, and deleting the test pod.

## Review Notes
- `kubectl` was not installed in the local environment, so command validation was performed against official Kubernetes command and concept documentation rather than local CLI help.
- The post correctly covers the current `node-role.kubernetes.io/control-plane` taint and the older `node-role.kubernetes.io/master` taint, but real clusters may vary depending on distribution and bootstrap tool.
