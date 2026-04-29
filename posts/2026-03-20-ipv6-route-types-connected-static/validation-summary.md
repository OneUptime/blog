# Validation Summary: How to Understand IPv6 Route Types (Connected, Static, Dynamic)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 routing on Linux
- `iproute2` (`ip -6 addr`, `ip -6 route`)
- Linux kernel route protocol identifiers (`rtnetlink`)
- FRRouting / dynamic routing software behavior
- OSPFv3, BGP, RIPng, IS-IS, EIGRP
- IPv6 Neighbor Discovery and Router Advertisements

## Sources Consulted
- Linux kernel `rtnetlink.h` protocol identifiers: https://kernel.googlesource.com/pub/scm/linux/kernel/git/torvalds/linux.git/+/master/include/uapi/linux/rtnetlink.h
- FRR Zebra documentation, including Administrative Distance and Route Replace Semantics: https://docs.frrouting.org/en/latest/zebra.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4191, Default Router Preferences and More-Specific Routes: https://datatracker.ietf.org/doc/html/rfc4191
- Local `man ip-route` and `man ip-address` from installed `iproute2 6.1.0`
- Local `/etc/iproute2/rt_protos` on the review host

## Issues Found
- The post treated the topic as if IPv6 only had these three route types. I corrected the wording to make the scope explicit: this guide covers three common forwarding route sources in Linux.
- The connected-route explanation was too absolute and the example output included a specific link-local route and metrics that are not guaranteed across systems. I changed this to the default Linux behavior and simplified the sample output to the relevant connected prefix route.
- The static-route example used an invalid IPv6 next-hop value (`fe80::router`). I replaced it with a valid link-local address (`fe80::1`).
- The dynamic-route section implied FRRouting-specific behavior and used `ripng` as a Linux `proto` label. I changed the command and explanation to reflect actual Linux protocol labels such as `ospf`, `bgp`, `rip`, `isis`, `eigrp`, and implementation-specific labels such as `zebra`.
- The route protocol number table had incorrect mappings. I corrected it to match Linux kernel and `rt_protos` values, including `11 = zebra`, `187 = isis`, `188 = ospf`, and `189 = rip`.
- The administrative-distance section incorrectly implied that Linux kernel route preference works like Cisco administrative distance. I rewrote it to reflect Linux route selection by longest-prefix match and lower metric, while noting that administrative distance is a routing-suite concept used by software such as FRR.
- The floating static-route example used another invalid IPv6 next-hop value (`fe80::backup`). I replaced it with a valid link-local address and clarified that the lower-metric dynamic route remains active until it disappears.
- The final combined route-view example had an incorrect source address (`2001:db8::1`) and overly specific metric examples. I fixed the address to `2001:db8:1::1` and made the sample output less implementation-specific.

## Review Notes
- The post is now technically accurate for Linux and `iproute2`, but the title is broader than the implementation shown. All commands and route-source examples are Linux-specific.
- Exact `proto` labels and displayed metrics for dynamic routes can vary by routing suite and configuration. The revised post now reflects that variability instead of implying fixed defaults.
