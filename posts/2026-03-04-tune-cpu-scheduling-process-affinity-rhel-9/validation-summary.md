# Validation Summary: How to Tune CPU Scheduling and Process Affinity on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux CPU scheduling policies
- `chrt`
- `taskset`
- TuneD scheduler plugin
- systemd service scheduling and CPU affinity options
- Linux kernel `isolcpus` parameter

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Tuning scheduling policy: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-scheduling-policy_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Customizing TuneD profiles and scheduler plugin parameters: https://docs.redhat.com/fr/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/customizing-tuned-profiles_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: CPUAffinity systemd unit option: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Linux kernel documentation: kernel command-line parameters and `isolcpus`: https://docs.kernel.org/admin-guide/kernel-parameters.html
- `chrt(1)`, `taskset(1)`, `sched(7)`, `systemd.exec(5)`, and `sysctl.d(5)` man pages on the review system.

## Issues Found
- The CFS tuning section used `kernel.sched_latency_ns` and `kernel.sched_min_granularity_ns` as direct sysctl settings. On RHEL 9 and recent kernels, Red Hat documents these scheduler runtime tunables as handled through TuneD's `scheduler` plugin because they may live under debugfs rather than `/proc/sys/kernel`. Replaced the sysctl commands and persistent `/etc/sysctl.d` example with a TuneD profile using `[scheduler]`.
- The `SCHED_BATCH` description said it was lower priority than `SCHED_OTHER`. Linux documents it as a normal policy for CPU-intensive, non-interactive workloads with static priority 0, not simply a lower static priority class. Updated the description.
- The `SCHED_IDLE` description said it runs only when the system is idle. Linux documents it as a very low priority policy; the original wording was too absolute. Updated the description.
- The `isolcpus` section said only processes explicitly assigned with `taskset` would run on isolated CPUs. Kernel documentation states that `isolcpus=domain` removes CPUs from general scheduler load balancing and that processes can be moved onto or off isolated CPUs using affinity syscalls or cpusets. Updated the wording accordingly.

## Review Notes
- The `chrt`, `taskset`, and systemd examples match documented command syntax and unit options.
- `isolcpus` is documented by the Linux kernel as deprecated in favor of cpusets for scheduler-domain isolation, but the command remains valid and is also referenced by Red Hat documentation. A future revision could mention TuneD `cpu-partitioning` or cpusets as preferred approaches for more flexible CPU isolation.
