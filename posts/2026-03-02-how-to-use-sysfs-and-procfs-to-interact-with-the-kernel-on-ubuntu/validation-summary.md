# Validation Summary: How to Use sysfs and procfs to Interact with the Kernel on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux kernel virtual filesystems: procfs (`/proc`) and sysfs (`/sys`)
- Kernel runtime tuning (`/proc/sys`, `sysctl`)
- Block device I/O scheduler (`mq-deadline`, blk-mq)
- CPU frequency scaling (`cpufreq`)
- CPU hotplug (`/sys/devices/system/cpu/cpuN/online`)
- Thermal zones (`/sys/class/thermal/`)
- Module parameters (`/sys/module/*/parameters/`)
- Hugepages, kernel lockdown, security subsystem
- Ubuntu system administration

## Sources Consulted
- Linux kernel documentation: `Documentation/filesystems/proc.rst` (https://www.kernel.org/doc/html/latest/filesystems/proc.html)
- Linux kernel documentation: `Documentation/filesystems/sysfs.rst` (https://www.kernel.org/doc/html/latest/filesystems/sysfs.html)
- Linux kernel docs: `Documentation/admin-guide/sysctl/` for `vm`, `net`, `kernel`
- Linux kernel docs: `Documentation/admin-guide/pm/cpufreq.rst`
- Linux kernel docs: `Documentation/core-api/cpu_hotplug.rst`
- Linux kernel docs: `Documentation/admin-guide/blockdev/` and `Documentation/block/queue-sysfs.rst`
- `proc(5)` man page (https://man7.org/linux/man-pages/man5/proc.5.html)
- `sysfs(5)` man page (https://man7.org/linux/man-pages/man5/sysfs.5.html)
- Linux thermal subsystem: `Documentation/driver-api/thermal/sysfs-api.rst`
- Verified actual `mount`, `/proc/loadavg`, and `/sys/` layout on a live Linux system

## Issues Found
1. **Broken `cat` on a directory (line ~46)**: The example `cat /proc/1/fd/ 2>/dev/null && ls /proc/1/fd/` cannot work — `cat` on a directory always fails, so the `&&` short-circuits and `ls` never runs. Replaced with simply `ls /proc/1/fd/`, which is what the comment ("Open file descriptors") implies.
2. **Misleading "Count physical cores" comment (line ~57)**: `cat /proc/cpuinfo | grep "cpu cores" | uniq` prints `cpu cores : N`, which is the number of cores per physical socket, not the total physical core count on multi-socket systems. Reworded the comment to say "Cores per physical CPU (multiply by socket count for total physical cores)".
3. **Misleading "Running processes count" comment (line ~72)**: Field 4 of `/proc/loadavg` is the `runnable/total` ratio of kernel scheduling entities (e.g. `1/1230`), not just a count of running processes. Reworded the comment to describe what is actually printed.

## Review Notes
- The `mount | grep -E "proc|sysfs"` example will also match unrelated mounts that contain the substring `proc` or `sysfs` (e.g. cgroups). It is fine as an illustrative one-liner but `grep -E '^(proc|sysfs) '` would be more precise. Left as-is — not technically wrong.
- `cat /proc/dma` is largely a historical artifact on modern x86 hardware (ISA DMA channels are essentially unused); the file still exists, so the example is technically valid.
- `/sys/devices/system/cpu/cpuN/cpufreq/` only exists when a cpufreq driver is loaded; on systems using `intel_pstate` in active mode the layout/contents may differ slightly. The commands shown work on a standard Ubuntu install with `intel_pstate`/`acpi-cpufreq`.
- The "CPU 0 cannot be taken offline" note is correct for the default Ubuntu kernel; it can be allowed only when the kernel is built with `CONFIG_BOOTPARAM_HOTPLUG_CPU0` (and that option has been removed/reworked in newer kernels). The general advice in the post is accurate.
- `/sys/kernel/security/lockdown` only exists when the kernel lockdown LSM is enabled (Linux 5.4+, default on Ubuntu when Secure Boot is active). The post correctly uses `2>/dev/null`.
