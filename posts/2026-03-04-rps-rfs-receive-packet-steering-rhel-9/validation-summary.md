# Validation Summary: How to Configure Receive Packet Steering (RPS) and RFS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux kernel networking
- Receive Packet Steering (RPS)
- Receive Flow Steering (RFS)
- ethtool
- sysctl
- udev
- TuneD

## Sources Consulted
- Linux kernel documentation, "Scaling in the Linux Networking Stack": https://docs.kernel.org/networking/scaling.html
- Linux kernel documentation, "/proc/sys/net" sysctl reference: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- Red Hat Enterprise Linux 9 documentation, "Tuning the network performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 6 Performance Tuning Guide, "Receive Flow Steering (RFS)": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/performance_tuning_guide/network-rfs
- ethtool manual page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- TuneD upstream network-throughput profile: https://raw.githubusercontent.com/redhat-performance/tuned/master/profiles/network-throughput/tuned.conf

## Issues Found
- The post described RFS as ensuring packets are processed on the same CPU as the application. RFS steers toward the CPU where the receiving application thread is running, but the kernel uses flow tables and reordering safeguards, so this is not an absolute guarantee. Updated the wording to "tries to steer."
- The RPS CPU mask example used Bash arithmetic with `2**NCPUS`, which fails or overflows on larger CPU counts and does not produce the comma-separated bitmap format needed for CPU masks above 32 CPUs. Replaced it with an awk-based CPU bitmap generator.
- The persistence example claimed to apply RPS/RFS but only wrote a hard-coded `ff` RPS mask. Replaced it with a helper script and udev rule that recomputes the CPU bitmap and applies both `rps_cpus` and `rps_flow_cnt`.
- The `netdev_budget` comments described it as a per-CPU packet processing backlog. Kernel documentation defines it as the maximum number of packets processed in one NAPI polling cycle. Updated the comments.
- The monitoring section described `/proc/net/softnet_stat` as a way to check RPS flow hash collisions. This file exposes softnet counters such as drops and squeeze/backlog pressure, not a simple RPS hash-collision report. Updated the comment.
- The TuneD section said the `network-throughput` profile automatically configures RPS/RFS. The upstream profile tunes general network throughput settings such as TCP buffer sysctls and inherits throughput-performance settings; it does not set RPS/RFS queue sysfs values. Updated the comment.

## Review Notes
- The examples still use `ens3` as a concrete interface name; readers must replace it with their actual NIC name.
- RPS is often unnecessary when RSS already maps enough hardware RX queues to CPUs. The summary now notes that RPS is most useful when hardware RSS is unavailable or when there are fewer hardware queues than CPU cores.
