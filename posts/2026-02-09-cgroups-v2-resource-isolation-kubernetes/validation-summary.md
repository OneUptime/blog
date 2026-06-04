# Validation Summary: How to Use cgroups v2 Features for Better Resource Isolation in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Linux cgroups v2
- kubelet configuration
- containerd
- MemoryQoS
- CPU Manager
- Pressure Stall Information
- Ephemeral storage and I/O cgroup controls

## Sources Consulted
- Kubernetes documentation: About cgroup v2 - https://kubernetes.io/docs/concepts/architecture/cgroups/
- Kubernetes documentation: Container Runtimes and cgroup drivers - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes documentation: Resource managers / CPU Manager - https://kubernetes.io/docs/concepts/workloads/resource-managers/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Local ephemeral storage - https://kubernetes.io/docs/concepts/storage/ephemeral-storage/
- Kubernetes documentation: Swap memory management - https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Kubernetes feature gates documentation - https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes v1.36 blog: Tiered Memory Protection with Memory QoS - https://kubernetes.io/blog/2026/04/29/kubernetes-v1-36-memory-qos-tiered-protection/
- Linux kernel documentation: Control Group v2 - https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html

## Issues Found
- The post implied Kubernetes always uses containerd. Changed this to clarify that containerd is one supported runtime and the snippet applies when the cluster uses containerd.
- The containerd example included `enable_cdi = true` as if it enabled cgroups v2 support. Removed it because CDI is unrelated to cgroup v2.
- The kubelet example included a `CgroupsV2` feature gate. Removed it because current Kubernetes cgroup v2 support is stable and kubelet detects cgroup v2 from the OS.
- The MemoryQoS example claimed memory requests directly set `memory.min`. Updated it to reflect current Kubernetes v1.36 behavior: memory reservation requires `memoryReservationPolicy: TieredReservation`; Guaranteed pods use `memory.min`, and Burstable pods use `memory.low`.
- The pod example used a non-upstream `io.kubernetes.cri.memory-swap-max` annotation. Removed it because Kubernetes swap behavior is configured through kubelet/node swap settings, not that pod annotation.
- The I/O section implied ephemeral-storage requests and a pod annotation configure cgroup v2 `io.weight` / `io.max`. Updated it to state that upstream Kubernetes does not expose native pod fields for these cgroup I/O controls.
- The CPU isolation example claimed Guaranteed QoS while setting CPU request and limit to different values. Changed the CPU limit to match the request.
- The cgroup path lookup examples used `.info.runtimeSpec.linux.cgroupsPath` as a filesystem path. Updated them to derive the actual cgroup v2 filesystem path from `/proc/<pid>/cgroup`.
- The CPU shares migration formula was incorrect. Replaced it with the correct cgroup v2 `cpu.weight` scale and default value.

## Review Notes
The Linux cgroups v2 concepts, cgroup version detection command, GRUB kernel argument, systemd cgroup driver guidance, PSI file names, and CPU Manager static policy requirements are consistent with current official documentation. MemoryQoS remains alpha in Kubernetes v1.36, so production use should account for version-specific behavior.
