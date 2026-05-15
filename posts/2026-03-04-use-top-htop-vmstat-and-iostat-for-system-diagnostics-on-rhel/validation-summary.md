# Validation Summary: How to Use top, htop, vmstat, and iostat for System Diagnostics on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- procps-ng `top`
- procps-ng `vmstat`
- `htop`
- sysstat `iostat`
- DNF package installation

## Sources Consulted
- Local `top(1)` man page from procps-ng, checked command-line options and interactive keys.
- Local `vmstat(8)` man page from procps-ng, checked options and field descriptions.
- Local `iostat(1)` man page from sysstat, checked options and extended field descriptions.
- Local `uptime(1)` man page from procps-ng, checked load average output.
- Red Hat Enterprise Linux documentation, "Overview of performance monitoring options": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux documentation, "iostat": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-performance_monitoring_tools-iostat
- Red Hat Enterprise Linux documentation, "DNF commands list": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/dnf-commands-list
- htop upstream manual page via man7.org: https://man7.org/linux/man-pages/man1/htop.1.html

## Issues Found
- The `vmstat` `bi` and `bo` field description said "blocks in from disk" and "blocks out to disk." Current procps-ng documentation describes these as KiB received from and sent to block devices per second. Updated the wording to "KiB received from block devices" and "KiB sent to block devices."

## Review Notes
- The remaining commands and flags were verified as valid: `top -b -n -d -u -p`, `htop -u -t`, `vmstat -t -a -d -m`, and `iostat -x -m -d` with optional device arguments.
- `htop` availability depends on enabled repositories on RHEL systems; the post already notes enabling EPEL if the configured RHEL repositories do not provide it.
