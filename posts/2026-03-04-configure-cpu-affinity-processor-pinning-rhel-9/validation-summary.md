# Validation Summary: How to Configure CPU Affinity and Processor Pinning on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux CPU affinity
- util-linux `taskset` and `lscpu`
- `numactl`
- systemd service and manager configuration
- Linux cgroups v2 cpuset controller
- Linux IRQ affinity
- `ps` process reporting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using systemd to manage resources used by applications": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/assembly_using-systemd-to-manage-resources-used-by-applications_monitoring-and-managing-system-status-and-performance
- systemd.exec official manual, `CPUAffinity=`, `NUMAPolicy=`, and `NUMAMask=`: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd-system.conf official manual, `CPUAffinity=` manager configuration: https://www.freedesktop.org/software/systemd/man/systemd-system.conf.html
- Linux kernel cgroup v2 documentation, cpuset interface files: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Local `taskset --help` output from util-linux.
- Local `lscpu --help` output from util-linux.
- Local `numactl` usage output.
- Local `ps --help output` output from procps.

## Issues Found
- The systemd NUMA example used `CPUAffinity=numa:0`, which is not valid systemd syntax. systemd accepts `CPUAffinity=numa` and derives CPUs from `NUMAMask=`, so the snippet was changed to `CPUAffinity=numa` plus `NUMAMask=0`.
- The system-wide `/etc/systemd/system.conf` section did not mention that Red Hat documents a daemon reload and reboot after changing the manager-level default CPU affinity. Added `sudo systemctl daemon-reload` and `sudo reboot`.

## Review Notes
- The cgroups example uses direct cgroup v2 cpuset files. This is technically valid when the cpuset controller is available and enabled for the child cgroup, but Red Hat recommends using systemd for resource control in normal RHEL 9 service-management workflows and manually configuring the cgroup filesystem only in special cases.
