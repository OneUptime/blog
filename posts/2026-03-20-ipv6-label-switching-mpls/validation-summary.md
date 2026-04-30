# Validation Summary: How IPv6 Label Switching Works in MPLS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- MPLS
- 6PE
- 6VPE
- MP-BGP labeled unicast
- LDP
- RSVP-TE
- SR-MPLS
- Cisco IOS / IOS XE
- Junos

## Sources Consulted
- RFC 3032, MPLS Label Stack Encoding: https://www.rfc-editor.org/rfc/rfc3032
- RFC 5462, MPLS Traffic Class Field Definition: https://www.rfc-editor.org/rfc/rfc5462
- RFC 4798, Connecting IPv6 Islands over IPv4 MPLS Using IPv6 Provider Edge Routers (6PE): https://www.rfc-editor.org/rfc/rfc4798
- RFC 7552, Updates to LDP for IPv6: https://www.rfc-editor.org/rfc/rfc7552
- Cisco IOS IPv6 Command Reference, `show bgp ipv6 unicast labels`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-r1.html
- Cisco IOS XE MPLS Configuration Guide, IPv6 Switching: Provider Edge Router over MPLS (6PE): https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/mpls/b-mpls/m_ip6-mpls-pe-rtr-xe.html
- Cisco IOS XE Segment Routing With OSPFv2 Node SID: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_sr-ospf.html
- Junos `show route forwarding-table` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-forwarding-table.html
- Junos IPv6 Traffic over Layer 3 VPNs (6VPE): https://www.juniper.net/documentation/us/en/software/junos/vpn-l3/topics/topic-map/l3-vpns-ipv6-traffic.html

## Issues Found
- The 6PE forwarding walkthrough incorrectly had a P router swapping the outer transport label to the inner IPv6 service label, and it described PHP on the wrong label. I corrected the flow so the core swaps or pops only the outer transport label while preserving the inner BGP IPv6 label until the egress PE, which matches RFC 4798.
- The post treated the 6PE BGP next hop too loosely and used simplified CLI output that did not match documented vendor behavior. I updated the examples to use Cisco-documented `show bgp ipv6 unicast` and `show bgp ipv6 unicast labels` output patterns and reflected the IPv4-mapped IPv6 next hop used by 6PE.
- The MPLS header explanation used EXP terminology and implied a fixed DSCP-to-EXP mapping for QoS. I corrected the field wording to TC and replaced the fixed EF mapping with platform- and policy-dependent wording, which is consistent with RFC 5462.
- The SR-MPLS section mixed transport-SID concepts with BGP `send-label` and used `segment-routing prefix-sid-map advertise-local` as if it were the basic enablement path. I replaced it with a Cisco-documented OSPFv2 SR-MPLS example based on `connected-prefix-sid-map` and valid verification commands.
- The monitoring section used commands and filters that were not defensible as written for the cited platforms, including `grep`-style filtering and `show mpls label table` in IOS-style context. I replaced them with Cisco and Junos commands that are documented by the vendors.

## Review Notes
- No further technical issues found after correction.
- The post now correctly focuses on the common 6PE/6VPE model of carrying IPv6 services across an IPv4 MPLS core. Native IPv6 LDP signaling also exists under RFC 7552, but that is a different deployment model than the 6PE transport examples used here.
- Exact label values remain illustrative; real values vary by topology, signaling protocol, and platform release.
