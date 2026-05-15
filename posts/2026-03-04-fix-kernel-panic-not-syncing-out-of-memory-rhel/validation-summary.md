# Validation Summary: How to Fix 'Kernel Panic - Not Syncing: Out of Memory' on RHEL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux kernel OOM handling
- Linux sysctl VM settings
- Swap files and `/etc/fstab`
- systemd service resource controls
- journalctl, ps, top, and systemd-cgtop

## Sources Consulted
- Linux kernel documentation for `/proc/sys/vm`, including `panic_on_oom`, `overcommit_memory`, and `overcommit_ratio`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel overcommit accounting documentation: https://docs.kernel.org/mm/overcommit-accounting.html
- Red Hat documentation for managing Out of Memory states on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/8/html/optimizing_rhel_8_for_real_time_for_low_latency_operation/assembly_managing-out-of-memory-states_optimizing-rhel8-for-real-time-for-low-latency-operation
- Red Hat documentation for creating swap files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/managing_storage_devices/Red_Hat_Enterprise_Linux-8-Managing_storage_devices-en-US.pdf
- Red Hat documentation for systemd memory allocation options on RHEL 8: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_configuring-resource-management-using-systemd_managing-monitoring-and-updating-the-kernel
- systemd resource control documentation for `MemoryHigh=` and `MemoryMax=`: https://www.freedesktop.org/software/systemd/man/249/systemd.resource-control.html
- systemd-cgtop documentation for `-m` / `--order=memory`: https://www.freedesktop.org/software/systemd/man/latest/systemd-cgtop.html
- journalctl manual for `-k` and `-b`: https://man7.org/linux/man-pages/man1/journalctl.1.html
- swapon and mkswap manuals for swap file and `/etc/fstab` behavior: https://man7.org/linux/man-pages/man8/swapon.8.html and https://man7.org/linux/man-pages/man8/mkswap.8.html
- ps manual for `--sort=-%mem`: https://man7.org/linux/man-pages/man1/ps.1.html

## Issues Found
- The opening explanation said an OOM panic means all memory and swap were exhausted and that the kernel panics by default when the OOM killer fails. This was too broad because OOM can be affected by policy, cgroups, cpusets, and `panic_on_oom`; the documented default is `panic_on_oom=0`, which runs the OOM killer. Updated the wording to reflect the documented default and panic conditions.
- The `panic_on_oom` comment only listed values `0` and `1`, and described `1` as "always panic." Linux documents value `2` as the compulsory panic mode, while `1` panics for system-wide OOM with exceptions for constrained OOM situations. Updated the comment to include value `2` and clarify value `1`.
- The overcommit section said strict mode should be used "for servers." Strict mode is technically valid, but workload-sensitive. Updated the comment to state that it prevents overcommit and should be tested with the workload first.

## Review Notes
The commands for checking logs, adding a swap file, configuring persistent sysctl settings, finding memory-heavy processes, and setting systemd memory limits are technically valid. `MemoryHigh=` is most relevant on systems using the unified cgroup hierarchy, and `systemd-cgtop` memory output can be incomplete unless memory accounting is enabled for the relevant units.
