# Validation Summary: How to Troubleshoot IPv6 Routing Loops

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux `iproute2`
- `traceroute6`
- `mtr`
- FRRouting (FRR)
- OSPFv3
- BGP
- `tcpdump`
- Linux kernel IPv6/ICMPv6 counters

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc4443
- `traceroute(8)` Linux man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- `ip-route(8)` Linux man page: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- `pcap-filter(7)` Linux man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `nstat(8)` Linux man page: https://www.man7.org/linux/man-pages/man8/nstat.8.html
- FRRouting Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting OSPFv3 documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Local command help and host validation: `mtr --help`, `ip -6 route help`, `nstat --help`, `tcpdump --help`, and `/proc/net/snmp6`

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8::external`, `fe80::router-b`, and `2001:db8::isp-router`. These were replaced with syntactically valid documentation-prefix addresses so the commands are usable examples.
- The `mtr --ipv6` example was incorrect for current `mtr`; the installed CLI exposes `-6`, not `--ipv6`. The command was corrected to `mtr -6`.
- The static-route loop example did not actually show a loop condition. It was rewritten to show both routers installing the same destination prefix via each other, which is the real loop pattern being described.
- The next-hop verification example used an invalid link-local placeholder and an extra tool that was not necessary for the explanation. It was replaced with valid `ip route get` and `ip neigh get` examples that match current Linux `iproute2` syntax.
- The FRR section incorrectly suggested checking `no-export` communities for route-reflector loops. That is not the BGP route-reflector loop-prevention mechanism. The guidance was corrected to inspect reflected routes for `ORIGINATOR_ID` and `CLUSTER_LIST`, and the route-inspection command was updated accordingly.
- The prevention section incorrectly said MED and local preference prevent iBGP loops. Those are path-selection attributes, not route-reflector loop-prevention attributes. The text now refers to `ORIGINATOR_ID` and `CLUSTER_LIST`.
- The packet-capture filter originally matched ICMPv6 type 3 using a fixed IPv6-header offset, which is brittle and too broad. It was replaced with a `pcap-filter` expression that matches ICMPv6 Time Exceeded with code 0 explicitly.
- The `/proc/net/snmp6` and `ip -6 -s route show | grep "Rt6Stats"` examples did not match current Linux counters/output. They were replaced with existing `snmp6` counter names and a working `nstat` example.
- The conclusion said the fix is to ensure "only one path" per destination prefix, which is too strong because loop-free ECMP is valid. The conclusion was corrected to require a loop-free next hop instead.

## Review Notes
- `traceroute6` is still documented as equivalent to `traceroute -6` in the Linux man page, so the post title and primary command remain acceptable.
- The commands and routing-daemon examples are Linux/FRR-specific. Equivalent workflows on network operating systems such as IOS, Junos, or RouterOS would use different command syntax.
