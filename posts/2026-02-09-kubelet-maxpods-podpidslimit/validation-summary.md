# Validation Summary: How to Configure kubelet maxPods and podPidsLimit for Node Capacity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubelet
- kubeadm
- KubeletConfiguration
- Prometheus and cAdvisor metrics
- CRI tooling with crictl

## Sources Consulted
- Kubernetes kubelet configuration API v1beta1: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kubelet configuration file task guide: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- Kubernetes PID limiting documentation: https://kubernetes.io/docs/concepts/policy/pid-limiting/
- Kubernetes kubeadm configuration API v1beta4: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubeadm component customization documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/control-plane-flags/
- Kubernetes assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes large cluster considerations: https://kubernetes.io/docs/setup/best-practices/cluster-large/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- containerd crictl documentation: https://containerd.io/docs/2.1/cri/crictl/

## Issues Found
- The kubeadm example used `kubeadm.k8s.io/v1beta3`. Updated it to the current `kubeadm.k8s.io/v1beta4` API shown in current Kubernetes documentation.
- The kubeadm example showed `kubeadm join` with the same `ClusterConfiguration` file. Removed that command because join configuration uses join-specific config; the shown file is appropriate for `kubeadm init`.
- The `podPidsLimit` default behavior was described as a common `4096` PID default. Corrected it to Kubernetes' documented default of `-1`, where kubelet defaults to node allocatable PID capacity.
- The `crictl stats` example implied PID usage is exposed directly through `crictl stats`. Replaced it with an in-pod process count and kept `crictl inspect` for configured runtime PID limits.
- The cgroup PID limit path only covered cgroup v1. Added the cgroup v2 `pids.max` path.
- The PromQL alert for remaining pod slots subtracted `kube_pod_info` directly from node allocatable pods. Changed it to subtract `count by (node) (kube_pod_info)`.
- The PID PromQL examples referenced a non-standard `container_spec_pids_limit` metric. Updated them to use cAdvisor's documented `container_threads` and `container_threads_max` metrics, with a note that process metrics must be enabled.
- The maxPods test used `spec.nodeName`, which bypasses the scheduler. Changed it to label the target node and use `nodeSelector` so the scheduler can produce the expected "Too many pods" scheduling result.

## Review Notes
- Kubernetes large-cluster guidance still recommends no more than 110 pods per node for officially supported large-cluster scalability targets. The post's higher example values can be valid for specific environments, but should be treated as workload- and provider-specific tuning rather than a general Kubernetes scalability recommendation.
