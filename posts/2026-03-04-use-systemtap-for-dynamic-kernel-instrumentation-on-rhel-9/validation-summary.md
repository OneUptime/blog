# Validation Summary: How to Use SystemTap for Dynamic Kernel Instrumentation on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- SystemTap
- Linux kernel instrumentation
- DNF package management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Getting started with SystemTap": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-systemtap_monitoring-and-managing-system-status-and-performance
- SystemTap Tapset Reference, syscalls: https://sourceware.org/systemtap/tapsets/syscalls.html
- Red Hat SystemTap Tapset Reference, probe::ioblock.request: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/systemtap_tapset_reference/api-ioblock-request
- SystemTap Beginners Guide, I/O block time example: https://www.sourceware.org/systemtap/SystemTap_Beginners_Guide/ioblktimesect.html
- stap-prep(1) manual page: https://man7.org/linux/man-pages/man1/stap-prep.1.html

## Issues Found
- The simple file-open probe used `syscall.open` with `argstr`. Although `syscall.open` is documented, modern RHEL user-space programs commonly use `openat`, so the example might not show expected file-open activity. Changed it to `syscall.openat` and used the documented `filename` convenience variable.

## Review Notes
The RHEL 9 installation commands, `stap-prep` usage, manual kernel debuginfo package command, `stap -e` usage, file-based script execution, verification probe, and `ioblock.request` variables/functions were checked against Red Hat and upstream SystemTap documentation. The local environment does not have `stap` installed, so commands were validated against documentation rather than executed.
