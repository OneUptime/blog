# Validation Summary: How to Use cgroups v2 to Limit CPU and Memory for Individual Processes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- Linux cgroups v2
- systemd transient scopes and slices
- CPU, memory, and I/O cgroup controllers

## Sources Consulted
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Red Hat Enterprise Linux 9 documentation, cgroup-v2 resource management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/index
- Red Hat Enterprise Linux 8 documentation, enabling cgroups-v2: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/
- systemd-run manual: https://www.freedesktop.org/software/systemd/man/systemd-run.html
- systemd.resource-control manual: https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- systemd.slice manual: https://www.freedesktop.org/software/systemd/man/systemd.slice.html

## Issues Found
- The post said the `systemd-run --scope --slice=limited.slice` command starts a new process "in the cgroup." That wording was inaccurate because it creates a systemd-managed transient scope under the specified slice, not the manually created `/sys/fs/cgroup/limited` cgroup. Changed the sentence to say it starts the process in a systemd-managed scope with equivalent limits.

## Review Notes
- The raw cgroup filesystem examples are consistent with cgroups v2 interface files, including `cpu.max`, `cpu.weight`, `memory.max`, `memory.high`, `cgroup.procs`, and `io.max`.
- RHEL 9 uses cgroups v2 by default; RHEL 8 requires enabling the unified hierarchy first. On some systems, the `cpu` or `io` controller must be available in `cgroup.controllers` before it can be enabled in `cgroup.subtree_control`.
