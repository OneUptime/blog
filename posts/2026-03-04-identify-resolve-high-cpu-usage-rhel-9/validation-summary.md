# Validation Summary: How to Identify and Resolve High CPU Usage on RHEL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux CPU monitoring and process inspection
- procps-ng tools: uptime, top, ps, kill, nice, renice
- sysstat tools: mpstat, iostat
- Linux perf
- Linux cgroups v2
- Performance Co-Pilot (PCP)

## Sources Consulted
- Red Hat Enterprise Linux 9: Monitoring and managing system status and performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 9: Managing, monitoring, and updating the kernel, cgroups v2 controller setup: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/managing_monitoring_and_updating_the_kernel
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- procps-ng top manual: https://www.mankier.com/1/top
- procps-ng ps, uptime, kill, nice, and renice local man pages / command help
- sysstat mpstat and iostat local man pages / command help
- Linux perf local command help and Red Hat perf documentation
- Performance Co-Pilot CPU performance documentation: https://pcp.io/docs/howto.cpuperf.html
- Performance Co-Pilot pmval manual: https://www.mankier.com/1/pmval

## Issues Found
- The load average explanation stated that a load average higher than CPU cores indicates the system is overloaded. Updated it to clarify that this can indicate overload and that Linux load average includes runnable tasks and tasks in uninterruptible sleep, not only CPU execution.
- The `STAT` field description called `D` state "disk wait." Updated it to "uninterruptible sleep, often I/O wait," which is more accurate for Linux process states.
- The `%iowait` description implied the CPU itself is actively waiting for I/O. Updated it to describe idle CPU time while the system has outstanding I/O, matching sysstat-style definitions.
- The `perf record` syscall tracepoint glob was unquoted. Quoted `syscalls:sys_enter_*` so the shell does not treat `*` as a pathname glob before perf receives the event selector.
- The cgroups v2 CPU limit example wrote `cpu.max` in a child cgroup without first enabling the CPU controller for child cgroups. Added the RHEL 9 cgroup v2 step to enable `+cpu` in `/sys/fs/cgroup/cgroup.subtree_control` before creating and configuring the child cgroup.

## Review Notes
- The remaining commands and options were checked against local command help/man pages or official documentation and are technically valid for the guide's level of detail.
- `pmval -t 5sec kernel.all.cpu.idle` reports a cumulative/rate-converted PCP CPU metric depending on PCP tool behavior and setup; it is a reasonable quick metric check, but production alerting would normally be configured in a monitoring system rather than with a one-off command.
