# Validation Summary: How to Block ICMP Ping Requests with iptables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iptables / Linux netfilter
- ICMP (IPv4)
- Linux kernel `sysctl`
- `ping`

## Sources Consulted
- `iptables` local CLI help on the review system: `iptables --help`, `iptables -p icmp -h`, `iptables -j REJECT -h`, `iptables -m limit -h`
- iptables(8) Linux man page — https://man7.org/linux/man-pages/man8/iptables.8.html
- iptables-extensions(8) Linux man page — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- ping(8) Linux man page — https://man7.org/linux/man-pages/man8/ping.8.html
- Linux kernel IP sysctl documentation — https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 792: Internet Control Message Protocol — https://www.rfc-editor.org/rfc/rfc792
- Nmap Host Discovery reference — https://nmap.org/book/man-host-discovery.html

## Issues Found
1. The introduction said blocking ICMP ping requests prevents attackers from discovering the server via network scans. That was too broad. Nmap host discovery is not limited to ICMP echo requests and commonly uses TCP, ARP, and other probes. Updated the sentence to say blocking ping reduces visibility to simple ICMP-based host discovery instead of preventing discovery outright.

2. The "Allow Essential ICMP, Block Only Ping" example contradicted its own title. It ended with a blanket `-p icmp -j DROP`, which drops more than echo requests and also blocks inbound `echo-reply`, breaking pings initiated from the server itself. Replaced that behavior by explicitly allowing `echo-reply` and removing the blanket ICMP drop.

3. The outbound echo-reply section said this prevents responses "even when pinged internally," which was misleading. The `OUTPUT` rule drops IPv4 `echo-reply` packets generally, not just an internal case. Updated the wording to describe the actual behavior.

4. The verification section said a blocked ping "should time out." That is only true for `DROP`; with `REJECT`, the sender should typically fail immediately with an ICMP error. Updated the verification note to distinguish `DROP` from `REJECT`.

5. The kernel sysctl section described the setting as blocking "all ICMP echo requests." The documented sysctl path used in the post is `net.ipv4.icmp_echo_ignore_all`, which is IPv4-specific. Updated the wording to say IPv4 explicitly.

## Review Notes
- The examples in this post are IPv4-specific. `iptables -p icmp` and `net.ipv4.icmp_echo_ignore_all` do not cover ICMPv6; IPv6 requires `ip6tables` or `nftables`, and ICMPv6 should not be broadly blocked because it is more operationally critical.
- The examples are valid on current `iptables` systems, including the `iptables-nft` frontend, but modern Linux distributions increasingly prefer `nftables` for new firewall deployments.
