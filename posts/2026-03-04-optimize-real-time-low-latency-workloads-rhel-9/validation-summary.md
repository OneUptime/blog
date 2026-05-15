# Validation Summary: How to Optimize RHEL for Real-Time and Low-Latency Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL for Real Time
- TuneD cpu-partitioning profile
- IRQ affinity and irqbalance
- Transparent Huge Pages
- Linux memory locking with mlockall()
- Real-time scheduling with chrt and SCHED_FIFO
- Kernel sysctl tuning
- grubby kernel command-line updates
- cyclictest, rt-tests, taskset, and stress-ng

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Tuning scheduling policy and cpu-partitioning profile, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-scheduling-policy_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux for Real Time 9 documentation: Optimizing RHEL 9 for Real Time for low latency operation, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html-single/optimizing_rhel_9_for_real_time_for_low_latency_operation/index
- Red Hat Enterprise Linux 9 documentation: Managing transparent hugepages, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux for Real Time 9 documentation: Using mlock() system calls, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/optimizing_rhel_9_for_real_time_for_low_latency_operation/assembly_using-mlock-system-calls-on-rhel-for-real-time_optimizing-rhel9-for-real-time-for-low-latency-operation
- Red Hat Enterprise Linux for Real Time 9 documentation: Controlling power management transitions, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/optimizing_rhel_9_for_real_time_for_low_latency_operation/assembly_controlling-power-management-transitions_optimizing-rhel9-for-real-time-for-low-latency-operation
- systemd.exec manual for LimitMEMLOCK, https://www.freedesktop.org/software/systemd/man/253/systemd.exec.html
- rt-tests cyclictest manual page, https://man.docs.euro-linux.com/EL%208/rt-tests/cyclictest.8
- Local command help for chrt and taskset.

## Issues Found
- The irqbalance example used `IRQBALANCE_BANNED_CPULIST=2-7`. Red Hat's RHEL for Real Time documentation uses `IRQBALANCE_BANNED_CPUS` with a hexadecimal CPU mask in `/etc/sysconfig/irqbalance`. Changed the example to `IRQBALANCE_BANNED_CPUS=000000fc`, which bans CPUs 2-7.
- The sysctl comment said `vm.swappiness=0` disables swap. This setting minimizes swap usage but does not disable swap devices. Changed the comment to "Minimize swap usage."
- The power-management description mentioned P-states, but the provided kernel arguments only address idle polling and C-state depth. Reworded the sentence to describe deep C-state transitions, matching the command and Red Hat documentation.

## Review Notes
- The THP runtime commands are correct but are not persistent across reboot unless implemented through TuneD, kernel command-line parameters, or a systemd unit.
- The cyclictest options are valid for rt-tests, and `-D 300s` is a five-minute duration.
- `stress-ng` is installed after its first example in the post. The command is valid, but placing the install command before first use would improve reader flow.
