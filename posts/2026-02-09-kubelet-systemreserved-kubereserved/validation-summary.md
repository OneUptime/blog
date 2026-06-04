# Validation Summary: How to Configure kubelet systemReserved and kubeReserved Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubelet
- KubeletConfiguration v1beta1
- kubeadm
- Linux cgroups / systemd slices
- Prometheus / PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Reserve Compute Resources for System Daemons - https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes API reference: Kubelet Configuration v1beta1 - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes CLI reference: kubelet flags - https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes API reference: kubeadm Configuration v1beta4 - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes reference: kubeadm config - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/
- kube-state-metrics node metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Prometheus Node Exporter documentation - https://prometheus.io/docs/guides/node-exporter/

## Issues Found
- The introduction said kubelet uses `systemReserved` and `kubeReserved` to "guarantee" resources for non-pod processes. Changed this to "reserve node capacity" because the reservation reduces Node Allocatable, while hard cgroup enforcement requires additional cgroup configuration.
- The enforcement section said enabling `enforceNodeAllocatable` creates cgroups. Kubernetes documentation states kubelet does not create `systemReservedCgroup` or `kubeReservedCgroup` and fails if a configured cgroup is invalid. Added `systemReservedCgroup` and `kubeReservedCgroup` fields and corrected the explanation and verification commands.
- The kubeReserved control plane example listed API server, controller manager, scheduler, and etcd as covered by `kubeReserved`. Kubernetes documentation says kubeReserved is not meant for system daemons run as Pods, so the text now clarifies that static Pod control plane components need their own Pod resource requests and limits.
- The complete kubelet and kubeadm examples enforced `system-reserved` and `kube-reserved` without the required cgroup fields. Added `systemReservedCgroup` and `kubeReservedCgroup`.
- The kubeadm example used `kubeadm.k8s.io/v1beta3`. Updated it to the current `kubeadm.k8s.io/v1beta4` API shown in current kubeadm documentation.
- The monitoring section used nonstandard Prometheus metric names `node_cpu_capacity` and `node_cpu_allocatable`. Replaced them with kube-state-metrics `kube_node_status_capacity` and `kube_node_status_allocatable` queries with `resource` and `unit` labels.
- The Prometheus CPU alert compared against `kube_node_status_allocatable{resource="cpu"}` without a `unit` label or explicit node matching. Added `unit="core"` and `on (node)` matching.
- The troubleshooting section referred to kubelet not creating cgroups. Reworded it to focus on failure to enforce reserved cgroups and added a check for the configured cgroup fields.

## Review Notes
The sizing values in the post are heuristics rather than Kubernetes defaults. They are technically acceptable as examples, but production reservations should be based on measured OS, kubelet, container runtime, pod density, and eviction behavior for the specific node pool.
