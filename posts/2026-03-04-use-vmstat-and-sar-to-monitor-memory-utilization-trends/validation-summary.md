# Validation Summary: How to Use vmstat and sar to Monitor Memory Utilization Trends on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux memory monitoring
- procps-ng `vmstat`
- sysstat `sar`
- systemd timers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Overview of performance monitoring options": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- Red Hat Enterprise Linux documentation, "The sadc command": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/introduction_to_system_administration/s3-resource-tools-sar-sadc
- Red Hat Enterprise Linux documentation, "The sar command": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/introduction_to_system_administration/s3-resource-tools-sar-sar
- Local `vmstat(8)` manual page from procps-ng.
- Local `sar(1)` and `sysstat(5)` manual pages from sysstat.
- Local `systemd.timer(5)` and `systemd.time(7)` manual pages.

## Issues Found
- The `swpd` column was described as "Virtual memory used (swap)". The `vmstat(8)` manual defines it as the amount of swap memory used, so the description was changed to "Swap memory used".
- The `sysstat-collect.timer` drop-in set `OnCalendar=*:00/2` without first clearing the existing `OnCalendar=*:00/10` value. `systemd.timer(5)` treats timer settings as a list and requires an empty assignment to reset previous values, so `OnCalendar=` was added before the new schedule.

## Review Notes
The remaining `vmstat`, `sar -r`, `sar -W`, `sar -B`, sysstat retention, and systemd timer examples match the documented commands and field meanings. The `/var/log/sa/saDD` path is correct for RHEL sysstat defaults, though other distributions commonly use `/var/log/sysstat/saDD`.
