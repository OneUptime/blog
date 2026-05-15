# Validation Summary: How to Configure Control Groups (cgroups v2) for Resource Management on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux cgroups v2
- systemd resource control
- CPU, memory, I/O, cpuset, and pids cgroup controllers
- Linux command-line administration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance, "Understanding control groups" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-limits-for-applications_monitoring-and-managing-system-status-and-performance
- Linux kernel documentation: Control Group v2 - https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux man-pages: cgroups(7), local system man page
- systemd.resource-control(5), local system man page and freedesktop.org documentation - https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html

## Issues Found
- The introduction said "RHEL uses cgroups v2 by default." This is only accurate for RHEL 9 in the context of this post; RHEL 8 defaults differ. Changed it to "RHEL 9 uses cgroups v2 by default."
- The `cgroup.controllers` output was presented as fixed output, but available controllers depend on the kernel and system configuration. Changed it to "Example output."
- The controller enablement command enabled only `cpu`, `memory`, and `io`, but later examples write `cpuset.*` and `pids.max` files. In cgroups v2, a parent cgroup's `cgroup.subtree_control` determines which controller interface files are created in child cgroups. Updated the command to enable `cpuset` and `pids` as well.

## Review Notes
- The direct `/sys/fs/cgroup` examples are technically valid for manual cgroup manipulation, but on RHEL 9, systemd manages the cgroup hierarchy and Red Hat generally recommends systemd resource-control settings for services.
- Hardware-specific examples such as `cpuset.cpus`, `cpuset.mems`, and block device major:minor numbers must be adjusted to the target system.
