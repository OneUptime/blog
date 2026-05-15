# Validation Summary: How to Use pidstat and mpstat for Per-Process CPU Analysis on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux sysstat package
- pidstat
- mpstat
- systemd
- awk

## Sources Consulted
- Local `pidstat(1)` man page from sysstat 12.6.1
- Local `mpstat(1)` man page from sysstat 12.6.1
- Local `pidstat --help` and `mpstat --help` output
- Sysstat official features page: https://sysstat.github.io/features.html
- Sysstat official FAQ: https://sysstat.github.io/faq.html
- Red Hat Enterprise Linux monitoring documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/monitoring-performance-by-using-the-metrics-rhel-system-role_monitoring-and-managing-system-status-and-performance

## Issues Found
- The post described `mpstat -P ALL` as reporting CPU cores. The `mpstat(1)` man page describes `-P` as selecting processors, and on modern systems these are logical CPUs rather than necessarily physical cores. Changed wording from CPU core to logical CPU.
- The post described the `pidstat` `CPU` column as the core the process ran on. The `pidstat(1)` man page and sysstat FAQ clarify that it is the processor to which the task is attached when statistics are displayed, not proof that the task spent the whole interval there. Updated the description.
- The I/O section described read/write values as kilobytes. The local `pidstat(1)` man page notes sysstat's displayed kB values are binary units. Changed the wording to KiB.
- The CPU imbalance `awk` example assumed the CPU number is always in field 2. Sysstat timestamps can include AM/PM depending on locale, shifting fields. Added `S_TIME_FORMAT=ISO` to make the field layout predictable for the example.
- The combined `pidstat` report was described as showing all processes. The `pidstat(1)` man page notes that, without `-p ALL`, only active tasks with non-zero statistics are displayed. Changed the wording to active processes.

## Review Notes
The commands and flags used in the tutorial are valid for sysstat. The `sysstat` service is not required for one-off live `pidstat` or `mpstat` commands, but enabling it is a common RHEL setup step for sysstat data collection and is not technically wrong.
