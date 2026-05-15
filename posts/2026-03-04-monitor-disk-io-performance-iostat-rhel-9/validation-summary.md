# Validation Summary: How to Monitor Disk I/O Performance with iostat on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sysstat
- iostat
- awk
- iotop
- fatrace

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance, "Tools for monitoring and diagnosing I/O and file system issues" (https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index)
- iostat(1) Linux manual page from the sysstat project (https://man7.org/linux/man-pages/man1/iostat.1.html)
- Local iostat manual/help output from sysstat 12.6.1 (`man iostat`, `iostat --help`, `iostat -V`)
- iotop(8) Linux manual page (https://man7.org/linux/man-pages/man8/iotop.8.html)
- fatrace(1) manual page reference (https://manpages.ubuntu.com/manpages/bionic/en/man1/fatrace.1.html)

## Issues Found
- The `tps` description equated transfers per second with generic I/O operations per second. The `iostat` manual defines a transfer as an I/O request issued to the device after possible merging, so the post now uses that wording.
- The `%util` section stated that a device is saturated when `%util` approaches 100%. The `iostat` manual notes this is true for devices serving requests serially, but not always for RAID arrays and modern SSDs that serve requests in parallel. The post now says the device "may be saturated, especially for devices that serve requests serially."
- The sample `awk` script for `iostat -xmt 1` used fixed field numbers that did not match current extended output, causing incorrect write-rate and throughput values. The script now builds a column map from the `Device` header and prints `r_await` and `w_await` explicitly.

## Review Notes
The latency thresholds in the post are reasonable rules of thumb, but real baselines vary by device model, workload, storage controller, queue depth, and virtualization layer. The first `iostat` report behavior and the documented flags (`-x`, `-m`, `-t`, interval/count, and device arguments) were verified against the manual.
