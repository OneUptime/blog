# Validation Summary: How to Use Kubernetes DaemonSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSet (apps/v1)
- kubectl rollout subcommands
- Node selection (nodeSelector, nodeAffinity)
- Taints and tolerations
- Update strategies (RollingUpdate, OnDelete)
- hostPath volumes, hostNetwork, hostPID
- Pod securityContext
- Prometheus node-exporter (v1.7.0)
- Fluent Bit (v2.2.0)
- Priority Classes (system-node-critical, system-cluster-critical)
- Kubernetes recommended labels (app.kubernetes.io/*)

## Sources Consulted
- Kubernetes DaemonSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Perform a Rolling Update on a DaemonSet: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout (pause/resume only support Deployments)
- Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Node Affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity
- hostPath volume types: https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
- Mount propagation: https://kubernetes.io/docs/concepts/storage/volumes/#mount-propagation
- Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Prometheus node_exporter v1.7.0 release: https://github.com/prometheus/node_exporter/releases/tag/v1.7.0
- node_exporter filesystem collector flag rename (mount-points-exclude introduced in v1.5.0)
- kubeadm taint history: control-plane taint introduced in 1.20, kubeadm stopped applying the master taint in 1.24, master taint removed in 1.25

## Issues Found
- **`kubectl rollout pause` / `kubectl rollout resume` on a DaemonSet**: These subcommands are only supported for Deployments. Running them against a DaemonSet returns an error like `error: daemonsets.apps "..." pausing is not supported`. Removed both lines from the "Managing DaemonSets" section and replaced them with `kubectl rollout restart daemonset/...`, which IS supported for DaemonSets and is a more useful command to highlight in that section.

## Review Notes
- The statement "By default, DaemonSet pods won't be scheduled on nodes with taints" is a slight simplification: the DaemonSet controller automatically adds tolerations for several built-in node-condition taints (e.g. `node.kubernetes.io/not-ready`, `node.kubernetes.io/unreachable`, `node.kubernetes.io/disk-pressure`, `node.kubernetes.io/memory-pressure`, `node.kubernetes.io/pid-pressure`, `node.kubernetes.io/unschedulable`, and `node.kubernetes.io/network-unavailable` for host-network pods). However, the framing is accurate for user-applied taints such as the control-plane taint, which is the case the example targets, so left as-is.
- The comments tying the `node-role.kubernetes.io/control-plane` taint to "Kubernetes 1.24+" and `node-role.kubernetes.io/master` to "pre-1.24" are accurate from a kubeadm perspective: kubeadm stopped applying the master taint in 1.24 and the taint was fully removed in 1.25. Strictly, the control-plane taint key was added in 1.20 alongside the master deprecation, but the comments reflect the practical kubeadm timeline correctly.
- The first mermaid diagram shows the DaemonSet controller "creating" pods directly. Since Kubernetes 1.12 the default scheduler is also involved in placing DaemonSet pods (the controller just creates pods which the scheduler binds), but the diagram's level of abstraction is acceptable for a tutorial.
- `prom/node-exporter:v1.7.0` was released 2023-11-12. The `--collector.filesystem.mount-points-exclude` flag was introduced in v1.5.0, so it's valid for v1.7.0. A newer node-exporter release exists at the time of review, but v1.7.0 is a real, working version and no breaking flag changes affect this example.
- node-exporter `livenessProbe` / `readinessProbe` on path `/` works because the root path returns a 200 with a small landing HTML page. Using `/metrics` would be equally valid.
- `effect: NoExecute` tolerations without `tolerationSeconds` (in the tolerations example) intentionally make the toleration permanent, which is appropriate for monitoring agents that should keep running on degraded nodes — left unchanged.
