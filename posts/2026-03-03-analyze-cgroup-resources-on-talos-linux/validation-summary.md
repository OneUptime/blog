# Validation Summary: How to Analyze Cgroup Resources on Talos Linux

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Talos Linux
- Linux cgroup v2 (control groups)
- Kubernetes QoS classes (Guaranteed, Burstable, BestEffort)
- kubelet (systemd cgroup driver)
- talosctl CLI
- cAdvisor / Prometheus metrics
- Grafana dashboards
- kubectl (debug pods, privileged containers)

## Sources Consulted
- Linux cgroup v2 kernel docs: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Kubernetes "About cgroup v2": https://kubernetes.io/docs/concepts/architecture/cgroups/
- Kubernetes "Configuring a cgroup driver": https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/configure-cgroup-driver/
- Talos Linux "Cgroups Analysis" docs: https://www.talos.dev/v1.11/advanced/cgroups-analysis/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Prometheus Operator PrometheusRule CRD docs

## Issues Found
1. **Conceptual cgroup hierarchy tree contained a non-existent `guaranteed/` subdirectory.** Under both cgroupfs and systemd cgroup drivers, Guaranteed-class pods are placed directly under the `kubepods` (or `kubepods.slice`) root — there is no QoS sub-slice for Guaranteed pods. The tree also mixed cgroupfs-style names (`kubepods/burstable/`) with systemd-style names (`system.slice/kubelet.service/`), which is inconsistent because Talos uses the systemd cgroup driver throughout. Rewrote the tree to show the correct Talos/systemd layout: Guaranteed at `kubepods.slice/kubepods-pod<uid>.slice/`, Burstable at `kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/`, BestEffort at `kubepods.slice/kubepods-besteffort.slice/kubepods-besteffort-pod<uid>.slice/`. Updated the accompanying paragraph to clarify this distinction.

2. **Two bash scripts used a glob (`*/kubepods-*-pod*.slice`) that silently skipped Guaranteed pods.** Because Guaranteed pods live directly under `kubepods.slice/` (one level shallower than the glob), the throttling-check loop and the health-check script never inspected them. Added a second glob path (`kubepods.slice/kubepods-pod*.slice`) so the scripts cover all three QoS classes, and added a short comment explaining the two paths.

## Review Notes
- All cgroup v2 file references (`cpu.stat`, `cpu.weight`, `cpu.max`, `memory.stat`, `memory.current`, `memory.max`, `memory.events`, `io.stat`, `io.max`) and their field names match the kernel.org spec.
- All cAdvisor metric names (`container_cpu_cfs_throttled_seconds_total`, `container_cpu_cfs_periods_total`, `container_memory_working_set_bytes`, `container_spec_memory_limit_bytes`, `container_oom_events_total`) are valid.
- `talosctl read` and `talosctl ls` invocations are correct and documented for Talos.
- The privileged debug pod assumes the `kube-system` namespace is exempt from any Pod Security Admission restrictions — true for the default Talos baseline, but worth noting that on hardened clusters with stricter PSA enforcement the manifest may need a dedicated namespace with `pod-security.kubernetes.io/enforce: privileged` labels.
- `cpu.stat` also exposes `nr_bursts` and `burst_usec` (when CPU burst is configured) and `io.stat` exposes `dbytes`/`dios` for discard operations — not mentioned in the post, but the omission is not an error.
- The throttle-percentage script computes `nr_throttled * 100 / nr_periods` (percentage of CFS periods that hit the limit), which matches the explanatory text.
