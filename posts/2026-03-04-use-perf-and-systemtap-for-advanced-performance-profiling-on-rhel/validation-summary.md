# Validation Summary: How to Use perf and SystemTap for Advanced Performance Profiling on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux perf
- SystemTap
- Linux performance events and tracepoints
- FlameGraph tools

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Getting started with perf: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/getting-started-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 10 documentation: Getting started with SystemTap: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/monitoring_and_managing_system_status_and_performance/getting-started-with-systemtap
- Red Hat SystemTap Tapset Reference: probe::ioblock.request: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/systemtap_tapset_reference/api-ioblock-request
- Linux perf-record man page: https://man7.org/linux/man-pages/man1/perf-record.1.html
- Linux perf-stat man page: https://man7.org/linux/man-pages/man1/perf-stat.1.html
- SystemTap target() function documentation: https://www.sourceware.org/systemtap/man/function::target.3stap.html
- SystemTap syscall tapset documentation: https://sourceware.org/systemtap/tapsets/syscalls.html
- procps pgrep man page: https://www.man7.org/linux/man-pages/man1/pgrep.1%40%40procps-ng.html

## Issues Found
- The `perf stat` example used `$(pgrep nginx)` directly with `-p`. If multiple nginx processes matched, shell expansion could pass extra positional arguments instead of the comma-separated PID list expected by perf. Changed it to `$(pgrep -d, nginx)`.
- The SystemTap `-x` example used `$(pgrep myapp)` directly. `stap -x` targets a single process ID through `target()`, so multiple matches would break the command. Changed it to `$(pgrep -n myapp)` to select one process.

## Review Notes
The perf and SystemTap commands, options, probe names, and context variables reviewed are consistent with the referenced documentation. The SystemTap examples require matching kernel support packages and appropriate privileges, as noted in Red Hat's SystemTap documentation.
