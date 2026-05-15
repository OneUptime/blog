# Validation Summary: How to Use perf to Profile Process Performance and CPU Hotspots on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux perf
- CPU profiling
- Hardware performance counters
- FlameGraphs

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Getting started with perf - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/getting-started-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation: Recording and analyzing performance profiles with perf - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/recording-and-analyzing-performance-profiles-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation: Monitoring application performance with perf - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/monitoring-application-performance-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation: Getting started with flamegraphs - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/getting-started-with-flamegraphs_monitoring-and-managing-system-status-and-performance
- Red Hat Customer Portal: How can I download or install kernel debuginfo packages for RHEL systems? - https://access.redhat.com/solutions/9907
- Local command help: `perf record -h`, `perf stat -h`, `perf top -h`, `perf script -h`, `perf list cache-misses cache-references`

## Issues Found
- The running-process examples used `$(pidof myapp)`. `pidof` can return multiple space-separated PIDs, but `perf -p` expects a single PID or a comma-separated PID list. Updated the singular-process examples to use `$(pidof -s myapp)` so the command reliably expands to one PID.

## Review Notes
- The `dnf debuginfo-install` example is technically valid for modern RHEL-family systems when the required debug repositories and tooling are available. RHEL debug repository setup varies by major version and subscription configuration, so a future post could add a note about enabling debug repositories before installing debuginfo packages.
- Red Hat documents a packaged flamegraph workflow using `js-d3-flame-graph` and `perf script flamegraph`; the Brendan Gregg FlameGraph pipeline shown in the post is also a common and technically valid workflow.
