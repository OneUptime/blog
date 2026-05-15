# Validation Summary: How to Profile Application Performance with perf on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux perf
- CPU profiling
- Performance counters
- Call graph recording
- Flame graphs
- Debug symbols

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Getting started with perf: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Recording and analyzing performance profiles with perf: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/recording-and-analyzing-performance-profiles-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Profiling CPU usage in real time with perf top: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/profiling-cpu-usage-in-real-time-with-top_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Getting started with flamegraphs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-flamegraphs_monitoring-and-managing-system-status-and-performance
- Local perf CLI help output for `perf record`, `perf report`, `perf stat`, `perf top`, `perf list`, `perf annotate`, and `perf script`.
- Brendan Gregg FlameGraph repository: https://github.com/brendangregg/FlameGraph

## Issues Found
- The `perf stat` description said the default output shows cache misses. Default `perf stat` output commonly includes instructions, cycles, branches, branch misses, and IPC, while cache misses are not always part of the default event set. Changed the sentence to avoid promising cache misses in the default output.
- The debug symbol installation command installed `kernel-debuginfo` using a broad `--enablerepo=*debug*` pattern, but the surrounding text referred to system libraries. Red Hat documents enabling the relevant debug repositories and using `dnf debuginfo-install` for the package being analyzed. Replaced the command with the RHEL 9 BaseOS/AppStream debug repository enablement and `dnf debuginfo-install <package-name>`.

## Review Notes
The commands and options for `perf record`, `perf report`, `perf stat`, `perf top`, `perf list`, `perf annotate`, and call graph modes are valid. RHEL 9 also provides a packaged flamegraph workflow through `js-d3-flame-graph` and `perf script flamegraph`; the Brendan Gregg FlameGraph pipeline shown in the post remains a plausible external workflow.
