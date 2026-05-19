# Validation Summary: How to Set Up CPU Isolation for Real-Time Workloads on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel boot parameters (`isolcpus`, `nohz_full`, `rcu_nocbs`, `rcu_nocb_poll`, `nosoftlockup`, `nohz`)
- GRUB bootloader configuration
- `taskset` for CPU affinity
- `chrt` for real-time scheduling
- `numactl` for NUMA binding
- cgroups v1 (cpuset) and cgroups v2 (systemd slices)
- systemd unit `Slice`, `CPUAffinity`, `CPUSchedulingPolicy`, `CPUSchedulingPriority`
- `cyclictest` from `rt-tests`
- `mpstat`, `ps`, `/proc/interrupts`, `/proc/irq/*/smp_affinity`
- sysfs CPU topology (`/sys/devices/system/cpu/...`)

## Sources Consulted
- Linux kernel admin-guide (kernel-parameters): https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- Linux scheduler / nohz documentation: https://www.kernel.org/doc/html/latest/timers/no_hz.html
- `cyclictest(8)` manpage — verified directly against rt-tests 2.5 from the Ubuntu noble repository (downloaded `.deb`, extracted binary, ran `cyclictest --help`)
- `taskset(1)`, `chrt(1)`, `numactl(8)` manpages
- systemd.resource-control(5): https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html (for `AllowedCPUs`, `CPUAffinity`)
- systemd.exec(5): for `CPUSchedulingPolicy`, `CPUSchedulingPriority`
- Linux cgroup-v1 cpusets: https://www.kernel.org/doc/Documentation/cgroup-v1/cpusets.txt
- sysfs CPU topology layout under `/sys/devices/system/cpu/`

## Issues Found
- **`cyclictest` CPU affinity flag (lines 230, 233):** The post used `-c 0` and `-c 4` to pin cyclictest to a specific CPU. In rt-tests `cyclictest`, `-c`/`--clock` selects the clock source (`0 = CLOCK_MONOTONIC`, `1 = CLOCK_REALTIME`), not CPU affinity. `-c 4` would be an invalid clock value, and `-c 0` would silently set the default clock without pinning to any CPU. The correct flag for CPU affinity is `-a`/`--affinity`. Verified against `cyclictest --help` from rt-tests 2.5 on Ubuntu. Fixed by changing `-c 0` → `-a 0` and `-c 4` → `-a 4`.

## Review Notes
- The cgroups v1 path (`/sys/fs/cgroup/cpuset/realtime`) used in the "Using cgroups for CPU Isolation" section requires the legacy cgroup v1 hierarchy to be mounted. Ubuntu 22.04+ defaults to unified cgroups v2, where this path won't exist unless the system is booted with `systemd.unified_cgroup_hierarchy=0` or hybrid mode. The post does cover the cgroups v2 systemd approach in the section immediately after, so users on modern Ubuntu have a working path forward — but this caveat is not called out explicitly. Not a correctness bug since the v1 example is presented as an alternative.
- `isolcpus=` is considered "soft-deprecated" in favor of cpusets in newer kernel docs but remains fully functional and widely used; no change needed.
- The HT sibling example uses pairs `0,4 / 1,5 / 2,6 / 3,7` for a 4-core/8-thread system, which is one valid topology layout (Intel commonly numbers siblings as `N` and `N + cores`). Actual numbering varies by CPU/BIOS; the post correctly instructs the reader to inspect `thread_siblings_list` first, so this is fine.
- `nohz=on` is the default when `CONFIG_NO_HZ_*` is enabled in the kernel config; including it explicitly is harmless.
- The awk one-liner that sums per-CPU IRQ counts (line 141) starts at field `$3` rather than `$2`, so it skips CPU0's count and includes a trailing non-numeric field. It still gives a usable ranking for "which IRQs hit which CPUs" but is slightly imprecise. Left as-is since it's a quick eyeball check, not a measurement.
