# Validation Summary: How to Use Memory Cgroups to Limit and Monitor Application Memory on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- Linux cgroups v2 memory controller
- systemd resource control
- systemctl
- systemd-run
- stress-ng

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using systemd to manage resources used by applications": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/assembly_using-systemd-to-manage-resources-used-by-applications_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation, "Configuring resource management by using cgroups-v2 and systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_configuring-resource-management-using-systemd_managing-monitoring-and-updating-the-kernel
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- systemd.resource-control(5) manual page: https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- Local systemd man pages and CLI help: `systemctl(1)`, `systemd-run(1)`, `systemd.slice(5)`, and `systemd.resource-control(5)`

## Issues Found
- The introduction described memory cgroups as setting "hard and soft limits." In cgroup v2, `MemoryLow` and `MemoryMin` are memory protections and `MemoryHigh` is a throttling threshold, not generic soft limits. Updated the wording to "hard limits, throttling thresholds, and memory protections."
- The slice example created `/etc/systemd/system/memlimited.slice` manually but did not reload the systemd manager configuration. Added `sudo systemctl daemon-reload` after the slice unit file example so the new unit file is loaded.

## Review Notes
The remaining commands and configuration properties match the RHEL and systemd documentation for cgroup v2 memory control. The direct `/sys/fs/cgroup/system.slice/myapp.service/...` paths are correct for a regular system service in `system.slice`; services assigned to a custom slice will appear under that slice instead.
