# Validation Summary: How to Debug Connectivity Issues Between Network Namespaces

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Linux network namespaces (`ip netns`)
- iproute2 (`ip addr`, `ip link`, `ip route`, `ip neigh`)
- veth pairs
- tcpdump
- iptables (filter and nat tables, FORWARD chain)
- sysctl / `/proc/sys/net/ipv4/ip_forward`
- arping (iputils)
- ICMP / ping

## Sources Consulted
- ip-netns(8) man page — https://man7.org/linux/man-pages/man8/ip-netns.8.html
- ip-route(8) man page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- ip-neighbour(8) man page — https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- ip-link(8) man page — https://man7.org/linux/man-pages/man8/ip-link.8.html
- tcpdump(1) man page — https://www.tcpdump.org/manpages/tcpdump.1.html
- iptables(8) man page — https://man7.org/linux/man-pages/man8/iptables.8.html
- arping(8) iputils man page — https://man7.org/linux/man-pages/man8/arping.8.html
- Linux kernel sysctl networking docs (ip_forward) — https://docs.kernel.org/networking/ip-sysctl.html
- ping(8) man page — https://man7.org/linux/man-pages/man8/ping.8.html

## Issues Found
No technical issues found.

All commands and flags were verified:
- `ip netns exec <ns> <cmd>` invocations are correct.
- `ip addr show`, `ip link show`, `ip route show`, `ip neigh show`, `ip neigh flush all` are valid iproute2 syntax.
- `ip route add 10.0.2.0/24 via 10.0.1.1` and `ip route add default via 10.0.1.1` are correct.
- `ping -c3` is valid syntax (no space required between flag and value).
- `tcpdump -i <iface> -nn icmp` is correct (`-nn` disables both name and port resolution; ICMP filter is valid BPF syntax).
- `iptables -L -n -v --line-numbers` and `iptables -t nat -L -n -v` are correct.
- `sysctl -w net.ipv4.ip_forward=1` is correct, and the claim that `net.ipv4.ip_forward` is per-namespace is accurate (it has been namespaced since Linux 2.6.26).
- `arping -I veth1 10.0.1.2` uses the iputils flag (`-I` for interface), which is standard on most Linux distros.
- The note that the host's FORWARD chain applies to packets routed between namespaces (when bridging/routing through the host) is correct.

## Review Notes
- The Thomas Habets variant of `arping` uses lowercase `-i` for the interface flag rather than `-I`. The post's `-I` form is correct for the iputils version, which is the default on Debian/Ubuntu/RHEL-derived distros, but readers using the Habets variant would need to swap the flag.
- The post does not explicitly mention nftables-equivalent commands (`nft list ruleset`) even though it lists nftables in the checklist; this is a minor omission but not an inaccuracy.
- For modern systems where the firewall is managed by `firewalld`/`nftables`, `iptables -L` may show the legacy translation; a reader on such a system might want to additionally check `nft list ruleset`.
