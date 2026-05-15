# Validation Summary: How to Configure Resource Limits for Services Using systemd Cgroups on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd service units and slice units
- Linux cgroups v2
- systemd resource control directives for CPU, memory, and I/O
- systemctl and systemd-cgtop

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: "Understanding control groups" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/setting-limits-for-applications_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: "Using systemd to manage resources used by applications" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/assembly_using-systemd-to-manage-resources-used-by-applications_monitoring-and-managing-system-status-and-performance
- systemd.resource-control(5) manual - https://man7.org/linux/man-pages/man5/systemd.resource-control.5.html
- systemctl(1) manual - https://man7.org/linux/man-pages/man1/systemctl.1.html
- systemd.slice(5) manual - https://man7.org/linux/man-pages/man5/systemd.slice.5.html
- systemd-cgtop(1) manual - https://man7.org/linux/man-pages/man1/systemd-cgtop.1.html
- Local systemd man pages and command help output for systemd.resource-control, systemctl, systemd.slice, and systemd-cgtop

## Issues Found
- The post referred to "RHEL" generally when describing cgroups v2 as the default. RHEL 9 uses cgroups v2 by default, while RHEL 7 and RHEL 8 defaulted to cgroups v1. I changed those statements to explicitly say RHEL 9.
- The monitoring section stated that systemd-cgtop shows CPU time, memory usage, and I/O for each cgroup. The systemd-cgtop manual notes that accounting must be enabled for complete CPU, memory, and I/O data. I added that caveat.

## Review Notes
The resource control directives, unit sections, set-property usage, slice example, cgroup filesystem paths, and systemd-cgtop batch flags were verified against systemd and Red Hat documentation. The I/O examples are syntactically correct, but real systems should use the correct block device path for their storage layout.
