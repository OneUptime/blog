# Validation Summary: How to Measure and Benchmark Latency Using cyclictest on RHEL Real-Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux for Real Time
- rt-tests
- cyclictest
- stress-ng
- Linux real-time scheduling and CPU affinity

## Sources Consulted
- Red Hat Enterprise Linux for Real Time 9: Optimizing RHEL 9 for Real Time for low latency operation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html-single/optimizing_rhel_9_for_real_time_for_low_latency_operation/index
- Red Hat Enterprise Linux for Real Time 8: Optimizing RHEL 8 for Real Time for low latency operation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/8/html-single/optimizing_rhel_8_for_real_time_for_low_latency_operation/optimizing_rhel_8_for_real_time_for_low_latency_operation
- cyclictest upstream man page from rt-tests: https://kernel.googlesource.com/pub/scm/utils/rt-tests/rt-tests.git/+/refs/heads/unstable/devel/latest/src/cyclictest/cyclictest.8
- Linux Foundation realtime wiki, cyclictest priority option: https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/options/priority

## Issues Found
- The cyclictest examples used `--priority=99`. Current rt-tests/cyclictest documentation lists the long option as `--prio=PRIO` and the short option as `-p`. Updated all examples to use `--prio=99`.
- The post listed 99th percentile as a key metric without clarifying that it is not part of the default live cyclictest columns. Updated the text to say it is useful when calculated from histogram or verbose output.

## Review Notes
- The install command for `rt-tests`, the use of `--mlockall`, `--threads`, `--affinity`, `--interval`, `--distance`, `--duration`, `--loops`, and `--histogram`, and the description of cyclictest's wake-up latency measurement are consistent with the consulted documentation.
- The "under 50 microseconds" guidance is workload- and hardware-dependent. It is acceptable as a tuning target in this post, but future revisions could frame it explicitly as an example threshold rather than a universal requirement.
