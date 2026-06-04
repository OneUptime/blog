# Validation Summary: How to Configure Multi-Scheduler Setup for Parallel Scheduling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling
- Kubernetes scheduler profiles
- KubeSchedulerConfiguration (`kubescheduler.config.k8s.io/v1`)
- Kubernetes scheduler plugins (`NodeResourcesFit`, `NodeResourcesBalancedAllocation`, `PodTopologySpread`, `ImageLocality`)
- Kubernetes RBAC
- Kubernetes Metrics Server / `metrics.k8s.io`
- kubectl commands

## Sources Consulted
- Kubernetes documentation: Configure Multiple Schedulers - https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes documentation: Scheduler Configuration - https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes API reference: kube-scheduler Configuration (v1) - https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes documentation: Resource Bin Packing - https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/
- Kubernetes documentation: Releases - https://kubernetes.io/releases/
- Kubernetes documentation: Version Skew Policy - https://kubernetes.io/releases/version-skew-policy/
- Kubernetes documentation: Resource Metrics Pipeline - https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes documentation: Pods / Pod update and replacement - https://kubernetes.io/docs/concepts/workloads/pods/

## Issues Found
- The bin-packing scheduler examples only increased the `NodeResourcesFit` score weight. Kubernetes documents that `NodeResourcesFit` defaults to `LeastAllocated`; bin packing requires `scoringStrategy.type: MostAllocated` or `RequestedToCapacityRatio`. I added `pluginConfig` with `MostAllocated` to the bin-packing examples.
- The custom scheduler RBAC examples omitted the `extension-apiserver-authentication-reader` RoleBinding, and the GPU scheduler omitted the `system:volume-scheduler` binding. I added the missing bindings and noted the required `system:kube-scheduler` ClusterRole update for leader-election lock resource names.
- The GPU scheduler scoring configuration did not actually include GPU resources in the `NodeResourcesFit` scoring strategy. I added `nvidia.com/gpu` to the scoring resources with a higher weight.
- The scheduler profile example configured `PodTopologySpread.defaultConstraints` without `defaultingType: List`. I added `defaultingType: List` so the provided custom default constraints are selected.
- The Deployment examples pinned `registry.k8s.io/kube-scheduler:v1.28.0`, which is outside the Kubernetes release branches maintained as of 2026-06-04. I updated the examples to `v1.36.1` and added a note to match the scheduler image to the cluster control plane version.
- The default scheduler inspection command assumed a `kube-scheduler` ConfigMap exists. I changed it to inspect the scheduler pod YAML, which is more generally applicable across static-pod and managed configurations.
- The monitoring command queried `metrics.k8s.io`, which reports pod CPU and memory resource usage rather than scheduler control-plane metrics. I changed the comment to describe it as scheduler pod CPU and memory usage requiring Metrics Server.
- The failure handling section implied that an existing Pod could be updated to change schedulers. Kubernetes Pod updates do not allow changing `spec.schedulerName`, so I changed the guidance to recreate the Pod or update its controller template.
- The throughput bullet could be read as implying that multiple replicas of the same scheduler increase throughput. With leader election, replicas are for high availability. I clarified that throughput distribution applies across schedulers handling different workload types.

## Review Notes
- YAML code fences were parsed successfully with PyYAML after the edits.
- `kubectl` was not available in this workspace, so CLI behavior was reviewed against official Kubernetes documentation rather than local `kubectl --help` output.
