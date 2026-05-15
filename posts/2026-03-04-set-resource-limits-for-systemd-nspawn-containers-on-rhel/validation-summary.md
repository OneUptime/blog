# Validation Summary: How to Set Resource Limits for systemd-nspawn Containers on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd-nspawn
- systemd service units and overrides
- systemd resource control directives
- cgroups v2
- machinectl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using systemd to manage resources used by applications: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/assembly_using-systemd-to-manage-resources-used-by-applications_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation: Configuring resource management by using cgroups-v2 and systemd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_configuring-resource-management-using-systemd_managing-monitoring-and-updating-the-kernel
- systemd.resource-control(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd-nspawn(1): https://www.freedesktop.org/software/systemd/man/systemd-nspawn.html
- systemd.nspawn(5): https://www.freedesktop.org/software/systemd/man/systemd.nspawn.html
- systemd-run(1): https://www.freedesktop.org/software/systemd/man/systemd-run.html
- machinectl(1): https://www.freedesktop.org/software/systemd/man/latest/machinectl.html

## Issues Found
- The introduction implied cgroups v2 behavior for all RHEL systems without version context. RHEL 8 uses cgroups v1 by default, while RHEL 9 and later use cgroups v2 by default. Added a RHEL 8 caveat.
- The service-unit explanation implied every nspawn container always runs as `systemd-nspawn@<name>.service`. That is accurate for containers started through `machinectl` or the `systemd-nspawn@.service` template, but direct `systemd-nspawn` launches can use a transient scope. Qualified the statement.
- The launch-time example used `systemd-run --machine=mycontainer --scope`, which runs a command via the container's service manager instead of applying host-side limits to the nspawn container launch. Replaced it with `systemd-nspawn --property=MemoryMax=... --property=CPUQuota=...`, matching the documented `systemd-nspawn` property option.
- The disk quota section omitted that `machinectl set-limit` per-container size limits are only supported on btrfs file systems. Added that limitation.

## Review Notes
The resource control directives shown in the service override are valid systemd unit resource-control settings. I/O resource controls depend on cgroups v2 and appropriate kernel/controller support, so administrators should verify controller availability on their target RHEL release and storage stack.
