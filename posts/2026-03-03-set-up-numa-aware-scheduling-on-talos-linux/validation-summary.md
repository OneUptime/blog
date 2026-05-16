# Validation Summary: How to Set Up NUMA-Aware Scheduling on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Linux NUMA kernel parameters and sysctls
- Kubernetes kubelet configuration
- Kubernetes Topology Manager
- Kubernetes CPU Manager
- Kubernetes Memory Manager
- Kubernetes Device Plugins

## Sources Consulted
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Topology Manager documentation: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes Memory Manager documentation: https://kubernetes.io/docs/tasks/administer-cluster/memory-manager/
- Kubernetes Node Resource Managers documentation: https://kubernetes.io/docs/concepts/workloads/resource-managers/
- Kubernetes Device Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Linux kernel command-line parameter documentation: https://kernel.org/doc/html/next/admin-guide/kernel-parameters.html
- Linux kernel sysctl documentation for NUMA balancing: https://www.kernel.org/doc/html/v5.15/admin-guide/sysctl/kernel.html
- Linux kernel sysctl documentation for zone reclaim: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html

## Issues Found
- The post described Topology Manager as the key component for NUMA-aware pod scheduling. Kubernetes Topology Manager is a kubelet component that makes node-local admission and allocation decisions, not a scheduler plugin, so the wording was corrected.
- The kubelet snippet used deprecated command-line flags through `machine.kubelet.extraArgs` for settings that have current `KubeletConfiguration` fields. The snippet was changed to use `machine.kubelet.extraConfig`, including `reservedSystemCPUs`.
- The post said a pod would stay pending if a node could not satisfy `single-numa-node` alignment. Official Kubernetes documentation says the kubelet rejects the pod admission and the pod enters a terminated admission-failure state, so that behavior was corrected.
- The post stated that Topology Manager would place CPUs, memory, and GPU on the same NUMA node unconditionally. This depends on the device plugin reporting NUMA topology information and on a feasible allocation, so the statement was qualified.
- The verification command read only CPU Manager state while claiming to verify Topology Manager. The wording was corrected and Memory Manager state verification was added.

## Review Notes
The technical approach is valid for Linux nodes using Kubernetes versions where Memory Manager `Static` is available. The exact Talos and Kubernetes versions should still be checked before applying these settings in production, because kubelet configuration fields and feature-state details are version-specific.
