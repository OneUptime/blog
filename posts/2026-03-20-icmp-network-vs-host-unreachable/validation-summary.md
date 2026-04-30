# Validation Summary: How to Understand ICMP Network Unreachable vs Host Unreachable

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP
- IPv4
- Routing
- Linux networking tools (`tcpdump`, `ip`, `iptables`, `traceroute`)
- ARP / neighbour resolution

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1122, Requirements for Internet Hosts -- Communication Layers: https://www.rfc-editor.org/rfc/rfc1122
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812.html
- `iptables-extensions(8)` REJECT target documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `pcap-filter(7)` packet filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ip-neighbour(8)` neighbour / ARP table management: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `traceroute(8)` options reference: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Local command help/output checked for syntax: `tcpdump --help`, `tcpdump -d`, `ip route help`, `ip neigh help`, `arp --help`, `iptables -j REJECT -h`, `ping -h`

## Issues Found
- The post stated that Code 1 means the route exists but the host is "not responding" and framed it as a host-level problem. RFC 1812 is narrower: router-generated Host Unreachable is specifically a final-hop delivery failure on a directly connected network. I updated the table, troubleshooting text, decision tree, and conclusion to describe final-hop delivery correctly.
- The post included "Host has wrong default gateway configured" as a cause of ICMP Host Unreachable. That does not match the RFC 1812 condition for Code 1; it more typically causes missing return traffic or timeouts, not a last-hop router generating Host Unreachable. I removed that troubleshooting block.
- The post used `arp` commands for neighbour inspection. The commands are valid, but `ip neigh` is the current Linux interface for neighbour/ARP table inspection and exposes the relevant `INCOMPLETE` and `FAILED` states directly. I replaced the `arp` examples with `ip neigh`.
- The local-host Network Unreachable explanation was too absolute. A missing default route is only part of the diagnosis; the real condition is that no matching route exists. I clarified that wording and added `ip route get` to verify route selection directly.
- The conclusion said the ICMP source IP tells you which router identified the problem. That is usually true for routed failures, but Linux can also generate these codes locally via `REJECT`. I changed this to "device" to keep the statement technically correct.

## Review Notes
- The `tcpdump` capture filter is syntactically valid. `pcap-filter(7)` documents packet-data accessors such as `icmp[0]` and `icmp[1]`, and local `tcpdump -d` successfully compiled the expression.
- The `iptables ... --reject-with icmp-host-unreachable` and `icmp-net-unreachable` examples are valid for IPv4 per `iptables-extensions(8)`.
- RFC 1122 treats received ICMP Network Unreachable and Host Unreachable as hints rather than proof because they may be transient. The post’s troubleshooting guidance is still reasonable, but readers should avoid treating a single unreachable as permanent evidence without corroboration.
