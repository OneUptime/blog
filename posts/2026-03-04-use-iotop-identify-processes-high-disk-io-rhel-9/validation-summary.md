# Validation Summary: How to Use iotop to Identify Processes Causing High Disk I/O on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iotop
- sysstat pidstat
- sysstat iostat
- Bash

## Sources Consulted
- Red Hat Enterprise Linux 9.7 Release Notes, known issue for delay accounting and iotop: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/known-issues
- iotop manual page: https://manpages.org/iotop
- sysstat project documentation and tool list: https://sysstat.github.io/
- Local `pidstat --help` and `man pidstat` output from sysstat
- Local `iostat --help` and `man iostat` output from sysstat
- Linux iostat manual page: https://man7.org/linux/man-pages/man1/iostat.1.html

## Issues Found
- RHEL 9 disables delay accounting by default, so `iotop` may not display the `SWAPIN` and `IO>` columns unless delay accounting is enabled. Added a RHEL 9 caveat with the runtime and persistent enablement options documented by Red Hat.
- The monitoring script used `iotop -t -k`, then summed `$6` as the write-rate field. With timestamps and kilobyte units enabled, `$6` is the read unit (`K/s`), while the numeric write rate is `$7`. Changed the script to sum `$7` so the threshold comparison uses write throughput as intended.

## Review Notes
The remaining commands and options were consistent with the referenced manual pages. `iotop -qqq` is valid for suppressing batch headers, `--iter` is valid as the long form for iteration count, `pidstat -d 1` reports per-task I/O statistics, and `iostat -x 1` reports extended device-level I/O statistics.
