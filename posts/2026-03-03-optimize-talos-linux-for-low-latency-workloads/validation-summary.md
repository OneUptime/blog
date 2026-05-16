# Validation Summary: How to Optimize Talos Linux for Low Latency Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl`)
- Linux kernel boot parameters (`isolcpus`, `nohz_full`, `rcu_nocbs`, C-state / P-state controls, hugepages, `transparent_hugepage`)
- Linux sysctls (scheduler, networking, VM/dirty pages, hugepages, swappiness)
- Kubernetes (CPU manager, Guaranteed QoS pods, DaemonSet, Pod resource specs)
- Prometheus scrape configuration
- Benchmarking (`cyclictest`)

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- `tcp(7)` man page (kernel.org): https://man7.org/linux/man-pages/man7/tcp.7.html
- sysctl-explorer entries for `tcp_low_latency`, `busy_poll`, `busy_read`, `netdev_budget`: https://sysctl-explorer.net/
- Linux 6.6 EEVDF release notes: https://kernelnewbies.org/Linux_6.6
- Linux EEVDF scheduler documentation: https://github.com/torvalds/linux/blob/master/Documentation/scheduler/sched-eevdf.rst
- Talos Linux v1.10 release notes (kernel 6.12.25): https://github.com/siderolabs/talos/releases/tag/v1.10.0
- Talos Linux kernel reference: https://www.talos.dev/v1.10/reference/kernel/
- `talosctl` reference: https://docs.siderolabs.com/talos/v1.6/learn-more/talosctl
- Red Hat KB on sched_* kernel parameters: https://access.redhat.com/solutions/177953

## Issues Found

1. **`net.ipv4.tcp_nodelay` is not a real sysctl** — `TCP_NODELAY` is only a per-socket option set via `setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, ...)`. Setting it through `machine.sysctls` would fail (Talos rejects unknown sysctls).
   - Fix: Removed the line from the network sysctl block and added a clarifying sentence describing how `TCP_NODELAY` is actually applied.

2. **`net.ipv4.tcp_low_latency` has been a no-op since Linux 4.14** — Per `tcp(7)`, the file still exists but its value is ignored. Recommending it on a Talos 1.10 kernel (6.12.x) is misleading.
   - Fix: Removed the line and noted the deprecation in the surrounding prose.

3. **`kernel.sched_min_granularity_ns` and `kernel.sched_wakeup_granularity_ns` no longer exist as sysctls on Linux 6.6+** — When CFS was replaced by EEVDF in 6.6, these tunables were removed (or moved to `/sys/kernel/debug/sched/`). Talos 1.8+ ships kernels at or above 6.6, so these would fail to apply.
   - Fix: Removed both keys from the scheduler-tuning sysctl block; kept the still-valid `sched_migration_cost_ns` and `sched_rt_runtime_us`; added a note explaining the CFS→EEVDF change and pointing readers to `base_slice_ns` for slice tuning.

## Review Notes

- The Talos machine config structure (`machine.install.extraKernelArgs` as a list, `machine.sysctls` as a quoted string map) is correct.
- The `talosctl apply-config` and `talosctl read` commands are valid.
- The remaining sysctls (`net.core.busy_read`, `net.core.busy_poll`, `net.core.netdev_budget`, `net.core.somaxconn`, `net.ipv4.tcp_fastopen`, `vm.*`, `kernel.sched_migration_cost_ns`, `kernel.sched_rt_runtime_us`) are all valid on current kernels.
- Kernel boot args for CPU isolation (`isolcpus`, `nohz_full`, `rcu_nocbs`), power management (`processor.max_cstate`, `intel_idle.max_cstate`, `idle=poll`, `intel_pstate=disable`), and hugepages (`hugepagesz`, `hugepages`, `transparent_hugepage=never`) are all accurate.
- Minor caveat (not fixed, since the post is functional as written): the hugepages section sets both `vm.nr_hugepages` via sysctl and `hugepages=` via boot args. This is redundant but not incorrect — the boot args win at startup, and the sysctl is a fallback. For huge-page-heavy workloads, the boot-arg path is preferred since post-boot allocation can fail due to memory fragmentation.
- `isolcpus=` is technically deprecated upstream in favor of cpuset cgroups, but it remains widely used and supported, and is still the most direct mechanism for kernel-level CPU isolation on Talos. Left unchanged.
- The `irq-tuning` DaemonSet relies on `grep eth0 /proc/interrupts`, which depends on the host NIC being named `eth0`. On predictable-network-interface-name systems this may be `enpXsY` or similar; the author may want to make that configurable in a future revision.
