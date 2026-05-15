# Validation Summary: How to Use perf and SystemTap for Advanced Performance Profiling on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux perf
- SystemTap
- Kernel debuginfo packages
- FlameGraph tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Getting started with perf: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Counting events with perf stat: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/counting-events-during-process-execution-with-perf-stat_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Recording and analyzing performance profiles with perf: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/recording-and-analyzing-performance-profiles-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Getting started with SystemTap: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-systemtap_monitoring-and-managing-system-status-and-performance
- SystemTap syscall tapset reference: https://sourceware.org/systemtap/tapsets/syscalls.html
- SystemTap kprocess tapset man page: https://sourceware.org/systemtap/man/probe%3A%3Akprocess.create.3stap.html
- SystemTap disk examples / VFS read return usage: https://www.sourceware.org/systemtap/SystemTap_Beginners_Guide/mainsect-disk.html
- SystemTap networking tapset reference for transmit variables: https://docs.redhat.com/de/documentation/red_hat_enterprise_linux/7/html/systemtap_tapset_reference/api-netdev-transmit
- Local `perf` help output for `record`, `report`, `stat`, `top`, and `script` options.

## Issues Found
- The SystemTap installation command used unversioned `kernel-debuginfo` and `kernel-devel` package names. Updated the installation section to install `perf` and `systemtap`, run `stap-prep`, and show the documented fallback with version-matched `kernel-debuginfo-$(uname -r)`, `kernel-debuginfo-common-$(uname -m)-$(uname -r)`, and `kernel-devel-$(uname -r)`.
- `perf report --call-graph` was missing an explicit call graph print type. Updated it to `perf report --call-graph graph`.
- The VFS read return example used `bytes_read`; the documented VFS return examples use the return value. Updated the script to use `returnval()`.
- The process creation example used `process.create`, but the documented SystemTap process creation probe is `kprocess.create`. Updated the script to use `kprocess.create` and its `new_pid` variable.

## Review Notes
RHEL debug repositories must be enabled before installing kernel debuginfo packages. The post now shows the correct package pattern, but future improvements could mention repository enablement explicitly for subscribed RHEL systems.
