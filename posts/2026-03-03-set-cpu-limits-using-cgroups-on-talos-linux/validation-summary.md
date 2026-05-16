# Validation Summary: How to Set CPU Limits Using Cgroups on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, kubelet `extraArgs` / `extraConfig`)
- Linux cgroup v2 (`cpu.max`, `cpu.stat`, `cpu.weight`, `cpuset.cpus.effective`)
- Linux CFS (Completely Fair Scheduler) bandwidth control
- Kubernetes CPU requests/limits and QoS classes
- Kubernetes CPU Manager (static policy, `full-pcpus-only`)
- Kubernetes Topology Manager (`single-numa-node`, scope `container`)
- Prometheus / cAdvisor container CPU throttling metrics
- Prometheus Operator `PrometheusRule` CRD

## Sources Consulted
- Talos v1alpha1 config reference: https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- Kubelet command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- KubeletConfiguration v1beta1: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Pod QoS classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- cAdvisor Prometheus metrics: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Kubernetes Control CPU Management Policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes Topology Management Policies: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/

## Issues Found
- **Missing `CustomCPUCFSQuotaPeriod` feature gate requirement.** The "Configuring the CFS Period" section showed setting `cpu-cfs-quota-period: "50ms"` via kubelet `extraArgs`, but any non-default value (other than 100ms) requires the `CustomCPUCFSQuotaPeriod` feature gate to be enabled. Without it the kubelet will refuse to start. Fixed by adding the `feature-gates: "CustomCPUCFSQuotaPeriod=true"` arg to the example and adding a sentence at the end of the paragraph noting the requirement.

## Review Notes
- All cgroup v2 paths, file formats, and field names (`cpu.max`, `cpu.stat` fields `nr_periods` / `nr_throttled` / `throttled_usec`, `cpuset.cpus.effective`) are accurate.
- The CFS quota math (1 core → `100000 100000`, 500m → `50000 100000`, 2 cores → `200000 100000`) is correct.
- The cgroup path `kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/cri-containerd-*.scope` is correct for Talos (which uses containerd) with the systemd cgroup driver.
- The cAdvisor metric names `container_cpu_cfs_throttled_periods_total` and `container_cpu_cfs_periods_total` are correct.
- The Talos `machine.kubelet.extraArgs` and `machine.kubelet.extraConfig` fields, and all KubeletConfiguration field names used (`cpuManagerPolicy`, `cpuManagerReconcilePeriod`, `cpuManagerPolicyOptions`, `topologyManagerPolicy`, `topologyManagerScope`), are accurate.
- The QoS class claim (CPU request only + memory limit → Burstable) is correct; Guaranteed requires CPU and memory limits equal to requests.
- Minor note for the future: the `cpu-cfs-quota-period` and `cpu-cfs-quota` kubelet command-line flags are deprecated in favor of the equivalent `cpuCFSQuotaPeriod` / `cpuCFSQuota` fields in the kubelet config file (which on Talos would go under `machine.kubelet.extraConfig`). The current `extraArgs` form still works but the config-file form is preferred upstream.
