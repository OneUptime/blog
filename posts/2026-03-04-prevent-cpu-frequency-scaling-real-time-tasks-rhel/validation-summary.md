# Validation Summary: How to Prevent CPU Frequency Scaling from Affecting Real-Time Tasks on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux CPUFreq
- TuneD and tuned-adm
- grubby kernel command-line management
- CPU C-states and P-states
- intel_pstate
- Turbo Boost / CPU frequency boost
- cyclictest / rt-tests

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Configuring kernel command-line parameters with grubby: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters
- Red Hat Enterprise Linux 10 documentation: Disabling C-states by using a kernel command line option: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/network_troubleshooting_and_performance_tuning/disabling-c-states-by-using-a-kernel-command-line-option
- Red Hat Enterprise Linux 8 documentation: Getting started with TuneD and setting TuneD profiles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/getting-started-with-tuned_monitoring-and-managing-system-status-and-performance
- Linux kernel documentation: CPU Performance Scaling / CPUFreq: https://docs.kernel.org/next/admin-guide/pm/cpufreq.html
- Linux kernel documentation: intel_pstate CPU Performance Scaling Driver: https://docs.kernel.org/admin-guide/pm/intel_pstate.html
- rt-tests cyclictest man page: https://kernel.googlesource.com/pub/scm/utils/rt-tests/rt-tests.git/+/refs/heads/unstable/devel/latest/src/cyclictest/cyclictest.8
- Linux Foundation Real-Time Linux wiki: cyclictest overview and usage: https://wiki.linuxfoundation.org/realtime/documentation/howto/tools/cyclictest/start

## Issues Found
- The post stated that the `performance` governor "locks CPUs at their maximum frequency." The Linux CPUFreq documentation says it requests the highest frequency within the `scaling_max_freq` policy limit. I changed the wording to avoid implying a hardware-level guarantee.
- The TuneD section installed `tuned` but did not explicitly enable or start the service before using a persistent profile. I added `sudo systemctl enable --now tuned`.
- The post suggested the `realtime` profile without noting that RHEL real-time profiles require RHEL for Real Time / additional repositories and the `tuned-profiles-realtime` package. I clarified that caveat while keeping the existing `latency-performance` example.
- The `intel_pstate=disable` comment described the setting as enabling "manual frequency control." The kernel documentation defines it as preventing `intel_pstate` from registering as the scaling driver. I changed the comment to say it is used when another cpufreq driver is needed.
- The C-state verification only checked `intel_idle`. Red Hat documentation also verifies `/sys/module/processor/parameters/max_cstate`, so I added that check.
- The frequency verification and closing statement implied exact constant maximum clock speed. CPUFreq and intel_pstate documentation note that requested and actual frequencies can differ because of driver behavior, hardware, thermal limits, and turbo behavior. I changed the wording to describe constrained frequency policy and reduced transitions.

## Review Notes
The commands are broadly appropriate for RHEL-style systems, but exact sysfs paths and available governors depend on CPU vendor, firmware settings, the active cpufreq driver, and whether the system is running a real-time kernel. For production real-time systems, TuneD custom profiles or RHEL for Real Time guidance may be preferable to hard-coding kernel parameters globally.
