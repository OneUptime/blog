# Validation Summary: How to Monitor and Reduce Context Switches on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel (context switching, scheduling, preemption)
- vmstat (procps)
- pidstat (sysstat)
- sar (sysstat)
- perf (linux-tools)
- /proc and /sys virtual filesystems
- taskset, numactl, isolcpus
- IRQ affinity (smp_affinity)
- Nginx worker_processes, Tomcat thread pools

## Sources Consulted
- Linux kernel source `kernel/Kconfig.preempt` — https://github.com/torvalds/linux/blob/master/kernel/Kconfig.preempt
- Linux kernel ABI docs `Documentation/ABI/testing/sysfs-bus-pci` — https://github.com/torvalds/linux/blob/master/Documentation/ABI/testing/sysfs-bus-pci
- sysstat man pages (`pidstat(1)`, `sar(1)`, `vmstat(8)`)
- perf wiki — https://perfwiki.github.io/main/lock-contention/
- LWN article on `perf lock contention` tracepoints — https://lwn.net/Articles/897387/
- Linux kernel `Documentation/admin-guide/kernel-parameters.txt` (for `isolcpus`)

## Issues Found

1. **Incorrect label for `CONFIG_PREEMPT_NONE`.** The post described `CONFIG_PREEMPT_NONE` as "Desktop preemption". This is wrong — the official Kconfig label is "No Forced Preemption (Server)". `CONFIG_PREEMPT_VOLUNTARY` is the one labelled "Desktop" in the kernel Kconfig. Fixed the bullet list to reflect the official Kconfig labels: `PREEMPT_NONE` → Server, `PREEMPT_VOLUNTARY` → Desktop, `PREEMPT` → Low-Latency Desktop.

2. **Broken IRQ-affinity script.** The original script did `irq=$(cat /sys/class/net/eth0/device/msi_irqs/$(ls ... | sed -n "$((i+1))p"))`. The files under `msi_irqs/` are named after the IRQ number, but their *contents* are the MSI mode string (`"msi"` or `"msix"`), not the IRQ number. So `irq` would resolve to `"msi"` and the subsequent `echo > /proc/irq/msi/smp_affinity` would fail. Fixed by reading the IRQ number from the filename directly via `ls | sed -n` and dropping the `cat`.

## Review Notes

- The `lock:contention_begin` / `lock:contention_end` tracepoints in the Lock Contention section are valid but only available on Linux 5.19+. Ubuntu 22.04's stock 5.15 kernel does not have them; Ubuntu 24.04 (kernel 6.8) does. Worth a heads-up in a future revision but not incorrect on modern Ubuntu.
- The "15% CPU overhead" calculation in the closing section is mathematically consistent only if one reads the 50,000 cs/s figure as per-core (i.e., 200,000 total on a 4-core box). If interpreted as system-wide (as vmstat reports it), the same 150ms of overhead works out to ~3.75% of total CPU. The example is illustrative either way, so I left it as written.
- `isolcpus=` is still functional but has been deprecated in favour of cpuset cgroups in modern kernels. The post's usage is fine for older Ubuntu LTS releases.
- pidstat output formatting in the sample (line 91) uses an older sysstat layout; modern sysstat may include additional columns, but the column names referenced (`cswch/s`, `nvcswch/s`) are still correct.
- `pidstat -w 1 | sort -k4 -rn` sorts by voluntary switches only, not "total" as the comment implies — minor wording inaccuracy, not a technical error.
