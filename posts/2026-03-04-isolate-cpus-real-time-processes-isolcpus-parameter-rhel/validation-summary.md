# Validation Summary: How to Isolate CPUs for Real-Time Processes Using the isolcpus Parameter on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux for Real Time
- Linux kernel boot parameters: `isolcpus`, `nohz`, `nohz_full`, `rcu_nocbs`
- `grubby`
- `tuned` and `tuned-profiles-realtime`
- `tuna`
- `taskset` and `chrt`

## Sources Consulted
- Red Hat Documentation: Optimizing RHEL 8 for Real Time, "Isolating CPUs using tuned-profiles-real-time" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/8/html/optimizing_rhel_8_for_real_time_for_low_latency_operation/assembly_isolating-cpus-using-tuned-profiles-realtime_optimizing-rhel8-for-real-time-for-low-latency-operation
- Red Hat Documentation: Optimizing RHEL for Real Time 10, CPU isolation, `nohz_full`, RCU callbacks, and `taskset` references - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/10/html-single/optimizing_rhel_for_real_time_for_low_latency_operation/optimizing_rhel_for_real_time_for_low_latency_operation
- Red Hat Documentation: Performance Tuning Guide, "Tuning CPUs with Tuna" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sec-tuna-cpu-tuning
- Linux manual page: `taskset(1)` - https://man7.org/linux/man-pages/man1/taskset.1.html
- Linux manual page: `chrt(1)` - https://man7.org/linux/man-pages/man1/chrt.1.html
- Linux manual page: `sched(7)` - https://man7.org/linux/man-pages/man7/sched.7.html

## Issues Found
- The opening description and final claim overstated CPU isolation as guaranteeing uninterrupted or exclusive execution. Updated the wording to reflect that `isolcpus` removes CPUs from scheduler load balancing and helps reduce interference, especially when combined with interrupt and kernel-thread tuning.
- The `grubby` example used `nohz_full` without `nohz=on`. Red Hat's Real Time documentation states that `nohz=on` is required to activate `nohz_full`, so the boot arguments and verification grep were updated.
- The TuneD example used `sudo mkdir -p /etc/tuned/realtime-variables.conf`, which would create a directory where the configuration file should be. Removed that command so `tee` writes the expected file path.
- The `tuna` comment claimed it moves kernel threads off isolated CPUs. Red Hat documents `tuna --cpus=cpu_list --isolate` as moving tasks and adjusting thread affinity, while some bound kernel threads cannot be moved. Updated the comment to "Move tasks".

## Review Notes
The post is accurate after the fixes. For future improvement, the guide could mention that Red Hat recommends `tuned-profiles-realtime` for RHEL for Real Time and that newer `tuned-profiles-realtime` versions can calculate isolated cores automatically, but those additions were not required to correct the existing content.
