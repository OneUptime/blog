# Validation Summary: How to Tune Network Kernel Parameters for High-Throughput Workloads on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel network sysctl parameters
- TCP socket buffers, listen backlog, SACK, timestamps, TIME_WAIT reuse, and FIN_WAIT2 timeout
- TCP BBR congestion control and queuing disciplines
- iperf3 throughput testing
- ethtool NIC ring buffers and offload features
- irqbalance and Linux IRQ handling
- iproute2 tools: ip and ss

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Tuning the network performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation: TCP BBR support and the required `fq` queuing discipline: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/tcp_networking
- Linux kernel documentation: IP sysctl parameters: https://docs.kernel.org/networking/ip-sysctl.html
- procps-ng `sysctl(8)` manual: https://www.mankier.com/8/sysctl
- Local command help for `sysctl --help`, `ethtool --help`, and `ss --help`
- ESnet iperf3 documentation: https://software.es.net/iperf/

## Issues Found
- The BBR instructions set `net.ipv4.tcp_congestion_control=bbr` without also setting the `fq` queuing discipline. Red Hat's BBR guidance says BBR users should switch to `fq`, not `fq_codel`, so I added `net.core.default_qdisc=fq` to the runtime commands and persistent sysctl snippet.
- The post stated that BBR performs significantly better than CUBIC on long-distance or lossy links. That was too absolute, so I changed it to say BBR can perform better in many scenarios.
- The listen backlog explanation implied that increasing `net.core.somaxconn` alone is sufficient. Red Hat documents that the application backlog must also be updated or requested, so I added that caveat and corrected the comment to describe `somaxconn` as the kernel's maximum listen backlog.
- The `tcp_tw_reuse` comment omitted the kernel's safety condition for TIME_WAIT reuse. I updated the wording to "when safe" to match the kernel documentation.
- The NIC ring-buffer example claimed `rx 4096 tx 4096` increased ring buffers to their maximum. Actual maximums are NIC and driver specific, so I changed the comment to make it an example that must be within the pre-set maximums shown by `ethtool -g`.
- The LRO instruction was too broad. I clarified that LRO should only be enabled on endpoint hosts where the driver supports it.

## Review Notes
The remaining commands are syntactically valid for the tools discussed, but many values are workload and hardware dependent. In a future revision, the guide could mention that direct `ethtool` changes are usually runtime-only on RHEL and NetworkManager profiles are preferred for persistent NIC settings.
