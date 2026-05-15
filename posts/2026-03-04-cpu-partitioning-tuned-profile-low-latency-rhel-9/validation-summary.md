# Validation Summary: How to Use the cpu-partitioning TuneD Profile for Low-Latency Workloads on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- TuneD
- cpu-partitioning TuneD profile
- Linux CPU isolation
- Linux scheduler affinity
- nohz_full and RCU callback offloading
- taskset, numactl, chrt, and cyclictest

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Tuning scheduling policy": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-scheduling-policy_monitoring-and-managing-system-status-and-performance
- TuneD upstream documentation: https://tuned-project.org/docs/manual.html
- TuneD upstream cpu-partitioning profile source: https://raw.githubusercontent.com/redhat-performance/tuned/master/profiles/cpu-partitioning/tuned.conf
- Linux kernel CPU isolation documentation: https://docs.kernel.org/admin-guide/cpu-isolation.html
- Red Hat Customer Portal, verifying isolated and nohz_full CPUs from sysfs: https://access.redhat.com/solutions/3875421
- Red Hat Enterprise Linux for Real Time 9 documentation, cyclictest latency testing example: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html-single/configuring_virtualization_on_rhel_9_for_real_time/index
- rt-tests cyclictest man page source: https://kernel.googlesource.com/pub/scm/utils/rt-tests/rt-tests/+/refs/heads/manpage/src/cyclictest/cyclictest.8
- Local command help for taskset, chrt, and numactl

## Issues Found
- The introduction overstated isolation as removing CPUs from the general scheduler and disabling timer ticks unconditionally. Updated it to describe moving general work and interrupts to housekeeping CPUs and enabling full dynticks, which better matches TuneD and kernel behavior.
- The install section said the profile is included with TuneD. Updated it to say the profile is available as a TuneD profile package, matching the documented `tuned-profiles-cpu-partitioning` package.
- The `no_balance_cores` comment incorrectly described CPUs that do not use `nohz_full`. Updated it to the documented meaning: isolated CPUs without kernel scheduler load balancing.
- The configuration explanation implied `isolated_cores` disables load balancing. Updated it to explain that `isolated_cores` isolates CPUs while retaining scheduler load balancing, and `no_balance_cores` is used for isolated CPUs that should not use scheduler load balancing.
- The `/proc/cmdline` example showed `isolcpus=2-7` even though the shown configuration leaves `no_balance_cores` commented out. Updated the expected parameters to `nohz_full`, `rcu_nocbs`, and `tuned.non_isolcpus`, and noted that `isolcpus=` appears when `no_balance_cores` is configured.
- The process verification command used `psr`, which shows the last/current processor rather than the process affinity mask. Replaced it with Red Hat's documented affinity checks using `/proc/self/status` and `taskset -cp`.
- The latency section claimed properly isolated CPUs should show latencies under 10 microseconds, and the conclusion claimed consistent sub-10-microsecond latency. Replaced those absolute claims with hardware- and workload-dependent wording.

## Review Notes
The remaining commands are syntactically valid. Interrupt migration is still described at a high level because some interrupts and kernel tasks cannot always be moved; the post now avoids implying perfect isolation.
