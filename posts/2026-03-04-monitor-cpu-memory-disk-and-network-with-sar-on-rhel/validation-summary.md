# Validation Summary: How to Monitor CPU, Memory, Disk, and Network with sar (sysstat) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- sysstat
- sar
- sadf
- systemd timers
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Overview of performance monitoring options, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- Red Hat Customer Portal: How to use SAR to Monitor System Performance in Red Hat Enterprise Linux, https://access.redhat.com/solutions/276533
- CentOS Stream sysstat RPM package metadata, https://gitlab.com/redhat/centos-stream/rpms/sysstat
- sysstat upstream source and service/timer templates, https://github.com/sysstat/sysstat
- Local sysstat 12.6.1 manual pages: sar(1), sadf(1), sa1(8), and sysstat(5)

## Issues Found
- The disk I/O example said it showed I/O for a specific device, but `sar -d -p 1 5` reports all block devices. Updated the command to `sar -d -p --dev=sda 1 5` and clarified that `--dev=sda` limits the report while `-p` makes reports easier to read.
- The collection interval section only described editing `/etc/cron.d/sysstat`. Current RHEL-family sysstat packages include `sysstat-collect.timer`, so the section now shows a systemd timer override for current systems and keeps the cron edit as the older cron-based approach.

## Review Notes
The remaining `sar`, `sadf`, `dnf`, and `systemctl` examples are valid for RHEL-family systems with sysstat installed. Some historical report availability depends on what `sadc` was configured to collect before the problem window.
