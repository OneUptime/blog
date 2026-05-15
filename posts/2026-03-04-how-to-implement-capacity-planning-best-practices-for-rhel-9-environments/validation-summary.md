# Validation Summary: How to Implement Capacity Planning Best Practices for RHEL 9 Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sysstat, sar, and mpstat
- Linux disk, memory, CPU, and network monitoring commands
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- Red Hat Customer Portal: How to use SAR to Monitor System Performance in Red Hat Enterprise Linux - https://access.redhat.com/solutions/276533
- Red Hat Enterprise Linux 9 considerations: sadf and sysstat archive location notes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf
- Local `sar(1)` and `mpstat(1)` manual pages for sysstat command syntax and output fields
- Local `free(1)`, `df(1)`, `ip-link(8)`, and `crontab(5)` manual pages for command and crontab syntax

## Issues Found
- The baseline collection commands redirected output to `/var/log/capacity/*.txt`, but the post did not create `/var/log/capacity` first. Added `sudo mkdir -p /var/log/capacity` before those redirects so the commands work on a clean system.
- The network examples assumed the network interface was named `eth0`. RHEL 9 commonly uses predictable interface names, so this can fail. Changed the examples to derive the default-route interface with `ip route show default`.
- The growth CSV labeled the network column `Network_Mbps`, but the command wrote a raw `sar -n DEV` field that represents receive kB/s, not Mbps. Changed the command to calculate combined receive and transmit Mbps from the `rxkB/s` and `txkB/s` fields.

## Review Notes
The threshold values in the post are reasonable planning heuristics, not RHEL defaults or hard technical limits. The cron example is syntactically valid for a system crontab, but it assumes `/opt/scripts/capacity-check.sh` exists and that a mail command/MTA is configured.
