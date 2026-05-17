# Validation Summary: How to Configure CPU Pinning on Talos Linux

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Linux kernel boot parameters (isolcpus, nohz_full, rcu_nocbs, nmi_watchdog, nosmt)
- Kubernetes kubelet (KubeletConfiguration: CPU Manager, Topology Manager)
- Kubernetes Pod resource requests/limits and QoS classes
- NUMA topology and SMT/Hyperthreading
- Prometheus / node_exporter metrics
- cgroup v2

## Sources Consulted
- Talos v1alpha1 configuration reference — https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- Kubernetes CPU Management Policies — https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes Control Topology Management Policies — https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Linux Kernel command-line parameters — https://docs.kernel.org/admin-guide/kernel-parameters.html
- Red Hat: isolcpus / nohz_full / rcu_nocbs guidance — https://access.redhat.com/articles/3720611
- node_exporter schedstat collector source — https://github.com/prometheus/node_exporter/blob/master/collector/schedstat_linux.go
- Robust Perception: CPU scheduling metrics from node_exporter — https://www.robustperception.io/cpu-scheduling-metrics-from-the-node-exporter/
- Sidero talosctl CLI reference — https://www.talos.dev/v1.7/reference/cli/
- Linux kernel cgroup v2 docs — https://www.kernel.org/doc/Documentation/admin-guide/cgroup-v2.rst

## Issues Found
1. **Incorrect Prometheus metric for CPU migrations.** The original "Monitoring CPU Pinning Performance" section used a recording rule `rate(node_cpu_guest_seconds_total[5m])` and labeled it `node:cpu_migrations:rate5m`. This is wrong — `node_cpu_guest_seconds_total` measures time the CPU spent running a virtual CPU for a guest OS (KVM/virtualization), not scheduler migrations. node_exporter does not expose a direct CPU-migration counter at all. Fixed by replacing the rule with `rate(node_schedstat_waiting_seconds_total[5m])` (a real metric from node_exporter's `schedstat` collector that reflects scheduler waiting time, which is meaningfully reduced by CPU pinning) and adding a note that for explicit migration counts users should turn to `perf sched` or eBPF tooling.

## Review Notes
- The kubelet `extraArgs` block in Step 2 sets `cpu-manager-policy`, `cpu-manager-reconcile-period`, and `reserved-cpus` as CLI flags while the `extraConfig` block sets the same fields via KubeletConfiguration. Both forms work and resolve to the same values here, but Kubernetes has broadly deprecated kubelet CLI flags in favor of KubeletConfiguration. A future revision could drop the `extraArgs` entries and keep only `extraConfig` for cleaner, future-proof configuration. Left as-is since both forms are still functional today.
- The verification step shows `cat /sys/fs/cgroup/cpuset.cpus` from inside a pinned pod. Under cgroup v2 (Talos default), this file does exist and shows the cgroup's cpuset. For the most accurate "what's actually enforced" view, `cpuset.cpus.effective` is slightly preferred (it reflects the intersection with parent cgroups). Left as-is because the value displayed will normally match for a Guaranteed pod assigned exclusive CPUs.
- The `nohz_full` description ("disables periodic timer interrupts") is a useful simplification — in practice, `nohz_full` reduces the tick to as low as ~1 Hz on the isolated CPU when only one runnable task is present, rather than eliminating it entirely. The simplification is acceptable for an operator-facing guide.
- The NUMA topology example (Node 0: CPUs 0-15, 32-47) is one plausible enumeration scheme for a dual-socket system with SMT; real layouts vary by vendor/BIOS, which the post correctly tells the reader to inspect with `talosctl read`.
- All `talosctl` subcommands (`read`, `apply-config`, `reboot`, `health`) and their flags are valid.
- All kernel boot parameters (`isolcpus`, `nohz_full`, `rcu_nocbs`, `nmi_watchdog`, `nosmt`) are documented Linux kernel parameters.
- All KubeletConfiguration field names (`cpuManagerPolicy`, `topologyManagerPolicy`, `topologyManagerScope`, `reservedSystemCPUs`) are correct.
