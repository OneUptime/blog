# Validation Summary: How to Tune Network Performance on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel networking sysctl parameters
- TCP buffer sizing, keepalive, backlog, TCP Fast Open, TIME_WAIT reuse, and congestion control
- BBR congestion control and fq queue discipline
- ethtool NIC features, ring buffers, channels, and interrupt coalescing
- iperf3 network throughput testing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Tuning the network performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation, "TCP BBR support in RHEL 8": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/networking_considerations-in-adopting-rhel-8
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- ethtool command help/man page output from ethtool 6.7
- sysctl command help output from procps-ng
- iperf3 official documentation: https://software.es.net/iperf/

## Issues Found
- The TCP Fast Open section implied that setting `net.ipv4.tcp_fastopen=3` generally enables faster connection setup. The Linux kernel documentation specifies this enables client support and server support, but server applications still need to use the `TCP_FASTOPEN` socket option unless broader server flags are used. Updated the sentence to clarify the application requirement.
- The persistent sysctl block claimed to save all network tuning but omitted the TCP keepalive settings shown earlier. Added `net.ipv4.tcp_keepalive_time`, `net.ipv4.tcp_keepalive_intvl`, and `net.ipv4.tcp_keepalive_probes` to the persistent configuration.
- The `ethtool -L eth0 combined 8` example was labeled "Enable multi-queue (RSS)". The ethtool documentation describes `-L` as setting channel counts, while RSS hash configuration is handled separately with other ethtool options. Renamed the heading to "Adjust multi-queue channels."

## Review Notes
The commands and sysctl names are valid for Linux/RHEL-style systems, but the exact values are workload and NIC-driver dependent. Several ethtool changes are temporary unless stored in a NetworkManager profile or another boot-time mechanism.
