# Validation Summary: How to Implement Capacity Planning Best Practices for RHEL Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- sysstat
- sar
- iostat
- GNU coreutils df and du
- systemd
- journalctl
- Bash

## Sources Consulted
- Red Hat Enterprise Linux 7 Performance Tuning Guide: System Activity Reporter (sar): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-performance_monitoring_tools-built_in_command_line_tools
- Red Hat Enterprise Linux documentation: sadc default files and 10-minute collection interval: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/introduction_to_system_administration/s3-resource-tools-sar-sadc
- sysstat sar(1) manual page on the local system
- sysstat iostat(1) manual page on the local system
- GNU coreutils df documentation: https://www.gnu.org/software/coreutils/manual/coreutils.html#df-invocation

## Issues Found
- The CPU peak usage command sorted on field 3 of `sar -u` output, which is `%nice`, not total CPU usage. Changed it to calculate busy CPU from `%idle` and sort on that calculated value.
- The memory section described swap usage as directly indicating memory pressure. Changed the wording to describe sustained growth as a signal and added `sar -W` to check swap activity trends.
- The Disk I/O section used `sar -d` for I/O wait percentage, but `sar -d` reports block device statistics. Changed the iowait command to `sar -u` and kept `sar -d` for block device activity.
- The network section said dropped packets indicate saturation. Adjusted the wording because `sar -n EDEV` drops can also point to buffer or driver issues.

## Review Notes
The sysstat, sar, iostat, df, du, journalctl, and Bash examples are otherwise syntactically valid for the intended RHEL capacity-planning workflow. The `eth0` interface name is an example; many RHEL systems use predictable interface names such as `ens*` or `enp*`.
