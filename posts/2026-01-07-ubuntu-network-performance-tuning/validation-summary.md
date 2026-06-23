# Validation Summary: How to Tune Ubuntu for High-Performance Networking

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Ubuntu Linux networking
- Linux kernel sysctl networking parameters
- TCP buffer, backlog, TIME_WAIT, TCP Fast Open, and BBR tuning
- ethtool network interface tuning
- IRQ affinity, RPS, RFS, and XPS
- Netplan MTU configuration
- iperf3, netperf, hping3, ApacheBench, wrk, sysstat, and ss benchmarking/monitoring tools
- Nginx listen backlog configuration

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel /proc/sys/net documentation: https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux kernel networking scaling documentation: https://docs.kernel.org/networking/scaling.html
- Netplan YAML configuration documentation: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Nginx ngx_http_core_module listen directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Local Linux man/help output for sysctl, ip-link, ethtool, ss, ping, and netplan
- Ubuntu package metadata for iperf3, netperf, nuttcp, hping3, and related benchmark dependencies

## Issues Found
- The SYN cookies comment implied they are a normal way to continue handling full SYN queues. Updated it to match kernel documentation: syncookies are a fallback for SYN backlog overflow and should not replace proper backlog sizing for legitimate load.
- The conntrack sysctl example did not mention that `net.netfilter.nf_conntrack_max` only applies when connection tracking is loaded and used. Added that caveat.
- The TIME_WAIT section described `tcp_tw_reuse` as a safe alternative to `tcp_tw_recycle`. Updated the wording to say it is the supported alternative but still requires testing.
- The TCP Fast Open comment implied `net.ipv4.tcp_fastopen = 3` fully enables client and server behavior by itself. Clarified that server applications/listeners still need to enable TFO unless the global listener flag is used.
- The Netplan jumbo-frame example created a standalone interface file with only `mtu`, which could be unsafe if copied without preserving the existing interface configuration. Added guidance to merge the setting and made the example preserve DHCP for a DHCP-configured `eth0`.
- The BBR description overstated that it significantly improves throughput universally. Changed it to say BBR can improve throughput and latency on suitable paths.
- The busy polling snippet duplicated `net.core.busy_read` and mislabeled the purpose of `busy_poll` versus `busy_read`. Removed the duplicate and corrected the comments.
- The benchmark install command omitted tools used later in the post, including `ab`, `wrk`, `jq`, `mpstat`, `sar`, and `bc`. Added the corresponding Ubuntu packages.

## Review Notes
- Several tuning values are workload- and hardware-dependent. The post correctly frames them as starting points, but production systems should still benchmark before and after changes.
- Some examples assume the primary interface is `eth0`; modern Ubuntu systems often use predictable interface names such as `ens*` or `enp*`.
- Some commands depend on kernel configuration, NIC driver support, enabled repositories, or installed modules, especially BBR, busy polling, offload features, conntrack, and ethtool ring/coalescing controls.
