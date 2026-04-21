# Validation Summary: How to Troubleshoot Bridge Networking Issues on Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux bridge networking
- iproute2 `ip` and `bridge` commands
- Forwarding database (FDB) / MAC learning
- Spanning Tree Protocol (STP)
- tcpdump packet capture
- Linux routing and neighbor/ARP tables
- nftables, ebtables, iptables, and bridge netfilter

## Sources Consulted
- Linux kernel Ethernet Bridging documentation: https://docs.kernel.org/networking/bridge.html
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` Linux manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- `tcpdump(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tcpdump.8.html
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- nftables rule management documentation: https://wiki.nftables.org/wiki-nftables/index.php/Operations_at_ruleset_level
- Local command help output for `iproute2` 6.1.0, `bridge` 6.1.0, `iptables` 1.8.10, `ebtables` 1.8.10, and `nftables` 1.0.9

## Issues Found
- Replaced `cat /sys/class/net/br0/bridge/stp_state` with `ip -d link show br0` for checking STP state. The kernel documentation notes that the bridge sysfs interface is deprecated, while iproute2 uses the current netlink API.
- Changed the tcpdump comment from saying the bridge capture sees "all bridged traffic" to "traffic visible on br0". Capturing on the bridge interface is useful, but visibility can depend on the bridge setup, offload behavior, and whether packets are better observed on a specific bridge port.
- Changed the ARP diagnostic comment so ARP success followed by ping failure points to routing or firewall policy, not only routing. ICMP can fail for reasons other than route selection.
- Added nftables to the bridge filter checks and summary. The Linux kernel documentation describes br_netfilter/iptables bridge filtering as a legacy path and recommends nftables for packet filtering.

## Review Notes
The remaining iproute2, bridge FDB, STP, tcpdump, ping, neighbor table, ebtables, iptables, and nftables commands were syntactically valid for current Linux tooling. The `forward_delay 0` example is used only after disabling STP; with STP enabled, current documentation limits bridge forwarding delay to 2-30 seconds.
