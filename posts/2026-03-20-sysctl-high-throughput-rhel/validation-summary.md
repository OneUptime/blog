# Validation Summary: How to Tune sysctl Parameters for High-Throughput Workloads on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux sysctl
- TCP socket buffers
- TCP connection backlogs
- TIME_WAIT reuse
- Linux network device queues
- Receive-Side Scaling and Receive Packet Steering
- TCP BBR congestion control
- iperf3

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Tuning the network performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8.0 Release Notes, "TCP BBR support in RHEL 8": https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/pdf/8.0_release_notes/80-release-notes.pdf
- Linux kernel documentation, "IP Sysctl": https://docs.kernel.org/6.2/networking/ip-sysctl.html
- Linux kernel documentation, "/proc/sys/net/": https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux kernel documentation, "Scaling in the Linux Networking Stack": https://docs.kernel.org/networking/scaling.html
- IETF RFC 7323, "TCP Extensions for High Performance": https://datatracker.ietf.org/doc/html/rfc7323
- iperf3 official documentation, "Invoking iperf3": https://software.es.net/iperf/invoking.html
- Enterprise Linux procps-ng sysctl and sysctl.conf man pages: https://man.docs.euro-linux.com/EL%209/procps-ng/sysctl.8.en.html and https://man.docs.euro-linux.com/EL%209/procps-ng/sysctl.conf.5.en.html

## Issues Found
- The buffer-size comment said the defaults were increased to 16MB, but the snippet only sets `net.core.rmem_default` and `net.core.wmem_default` to 256KB while setting the max values to 16MB. Updated the comment to accurately distinguish default and maximum socket buffer settings.
- The TCP window scaling comment referenced RFC 1323. Updated it to RFC 7323, which obsoletes RFC 1323 and is the current RFC for TCP window scaling.
- The RPS note implied receive packet steering can be enabled with `ethtool`. Updated it to distinguish RSS tuning with `ethtool` from RPS configuration through `/sys/class/net/.../rps_cpus`.
- The BBR example set `net.ipv4.tcp_congestion_control = bbr` without the `fq` queueing discipline recommended by Red Hat for BBR. Added `net.core.default_qdisc = fq` to the BBR snippet and complete profile.
- The "Complete Tuning Profile" omitted settings shown earlier in the post (`rmem_default`, `wmem_default`, and `tcp_max_tw_buckets`). Added them so the profile matches the preceding examples.
- The key takeaways implied all TCP buffer values should be at least 16MB. Updated this to refer specifically to the maximum TCP buffer size.

## Review Notes
The commands and sysctl key syntax are valid. The numeric tuning values are plausible examples, but production values should still be sized from workload measurements, available RAM, connection counts, NIC behavior, and bandwidth-delay product rather than applied blindly.
