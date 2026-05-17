# Validation Summary: How to Configure Cgroup v2 Settings on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, MachineConfig)
- Linux cgroup v2 (unified hierarchy, memory/CPU/IO controllers, PSI)
- Kubernetes kubelet (KubeletConfiguration, feature gates, CPU/Memory Manager, Topology Manager)
- containerd / runc (cgroup driver, CPU weight conversion)
- Prometheus / node_exporter (PSI metrics, PrometheusRule)

## Sources Consulted
- Kubernetes Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes blog — New cgroup v1 → v2 CPU conversion formula: https://kubernetes.io/blog/2026/01/30/new-cgroup-v1-to-v2-cpu-conversion-formula/
- KEP-5246 (cgroup v1→v2 conversion alignment with systemd): https://github.com/kubernetes/enhancements/issues/5246
- Kubernetes 1.27 blog — QoS for Memory Resources (alpha MemoryQoS): https://kubernetes.io/blog/2023/05/05/qos-memory-resources/
- Kubernetes — Configuring a cgroup driver: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/configure-cgroup-driver/
- Kubernetes — Control CPU Management Policies on the Node: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes — Control Memory Management Policies on a Node: https://kubernetes.io/docs/tasks/administer-cluster/memory-manager/
- Kubernetes — Understand PSI Metrics: https://kubernetes.io/docs/reference/instrumentation/understand-psi-metrics/
- node_exporter pressure collector source: https://github.com/prometheus/node_exporter/blob/master/collector/pressure_linux.go
- Talos MachineConfig reference: https://www.talos.dev/latest/reference/configuration/
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/Documentation/admin-guide/cgroup-v2.rst

## Issues Found

1. **Incorrect CPU weight formula and example values (§ Configuring CPU Controller Settings)** — The original formula `weight = max(2, min(10000, ceil(cpuRequest * 1024 / 1000)))` is wrong and internally inconsistent (the worked example multiplied by an extra 1024 to reach 512). It also conflated cgroup v1 `cpu.shares` with cgroup v2 `cpu.weight`. Kubernetes (via runc) uses a logarithmic mapping aligned with systemd, where 1 CPU corresponds to weight 100, not 1024. Replaced the broken formula and made-up numbers with an accurate textual description and noted that the weight is derived automatically by the runtime.

2. **Non-existent feature gate `KubeletCgroupDriverSystemd` (§ Configuring IO Controller Settings)** — This feature gate does not exist in Kubernetes. The IO controller section was using this fake gate plus a fabricated annotation as the entire mechanism. Rewrote the section to explain that Kubernetes has no native per-pod IO weight API and that IO tuning must be done via runtime-specific mechanisms (containerd NRI plugins, CRI-O `BlockIOClass`).

3. **Fabricated annotation `io.kubernetes.cri/blkio-weight` (§ Configuring IO Controller Settings)** — This annotation is not implemented by containerd or CRI-O and is not part of the CRI spec. Removed the misleading pod example and replaced with accurate guidance about runtime-level options.

4. **Misleading use of `UserNamespacesSupport` for cgroup delegation (§ Delegating Cgroup Controllers to Containers)** — `UserNamespacesSupport` governs user-namespace isolation for pods; it does not enable cgroup delegation. Cgroup delegation is a systemd unit property (`Delegate=yes`) applied by the container runtime. Rewrote the section to clarify the distinction and to keep the user-namespace example as a separate, correctly-scoped tip.

5. **Missing `MemoryQoS` feature gate dependency (§ Configuring Memory QoS with Cgroup v2)** — `memoryThrottlingFactor` only takes effect when the `MemoryQoS` alpha feature gate is enabled. Added `feature-gates: "MemoryQoS=true"` to the example and corrected the comment about what the factor does (it is the ratio of `memory.high` to `memory.max`, not "90% of memory.max" as a fixed claim).

6. **`cgroup-driver` configured via deprecated kubelet flag (§ Configuring Kubelet Cgroup Settings)** — The `--cgroup-driver` command-line flag is deprecated; the modern path is the `cgroupDriver` field in KubeletConfiguration. Moved the setting from `extraArgs` to `extraConfig` and noted that Talos already defaults to `systemd`.

## Review Notes

- Many of the kubelet command-line flags retained in the post (`system-reserved`, `kube-reserved`, `enforce-node-allocatable`, `cpu-cfs-quota`, `cpu-cfs-quota-period`, `kubelet-cgroups`, `runtime-cgroups`) are technically deprecated in favor of equivalent KubeletConfiguration fields, but they still function and Talos documents them in `extraArgs` form. Left them as written to avoid restructuring the post.
- The `reservedMemory` configuration requires the sum across NUMA nodes to equal `kubeReserved + systemReserved + evictionHard.memory.available`, or the Memory Manager will fail to start. Worth a sidebar in a future revision but not strictly an error in the current example.
- `cpuManagerPolicyOptions.full-pcpus-only` is GA as of Kubernetes 1.33 and `distribute-cpus-across-numa` is beta (on by default) as of 1.33. Examples are accurate for current versions.
- node_exporter PSI metric names (`node_pressure_cpu_waiting_seconds_total`, `node_pressure_memory_waiting_seconds_total`, `node_pressure_io_waiting_seconds_total`) verified correct.
- `talosctl read` against `/proc/filesystems`, `/proc/mounts`, and `/proc/pressure/*` is supported and documented.
- The alert expressions use raw counter values rather than `rate()`, which would page on any historical pressure on a node. Functionally not "incorrect" for a tutorial sketch but readers should wrap these in `rate()` for production use.
