# Validation Summary: How to Create a Capacity Planning Checklist for RHEL Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- sysstat / sar
- systemd / systemctl
- firewalld / firewall-cmd
- systemd journal / journalctl
- SELinux audit tooling
- Linux disk, memory, and uptime commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Overview of performance monitoring options - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- Red Hat Enterprise Linux 9 documentation: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- firewalld manual page for firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld documentation: Open a Port or Service - https://firewalld.org/documentation/howto/open-a-port-or-service
- Local command help/man output for `systemctl`, `journalctl`, `df`, `free`, and `uptime`
- sysstat sar manual/reference - https://sysstat.github.io/faq.html

## Issues Found
- The baseline examples used `sar`, but the prerequisites did not mention that RHEL provides `sar` through the `sysstat` package. I added `sysstat` as a prerequisite so the commands can run on a fresh system.
- The disk baseline command wrote `sar -d` output to `disk_baseline.txt`, but `sar -d` reports block-device I/O activity, not disk capacity usage or growth. I added `df -h > disk_capacity_baseline.txt` and renamed the `sar -d` output to `disk_io_baseline.txt` to distinguish capacity from I/O.

## Review Notes
- The service and firewall examples are generic placeholders. They are syntactically valid when `<service-name>` and `<PORT>` are replaced with real values, but a future revision could make the example more directly tied to capacity planning.
