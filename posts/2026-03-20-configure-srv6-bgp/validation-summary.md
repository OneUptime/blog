# Validation Summary: How to Configure SRv6 with BGP

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- BGP (Border Gateway Protocol)
- BGP Prefix-SID attribute
- BGP L3VPN (VPNv6, SAFI 128)
- BGP EVPN (L2VPN)
- FRRouting (FRR)
- Linux IPv6 routing (`ip -6 route`, seg6 encap)

## Sources Consulted
- [RFC 9252 - BGP Overlay Services Based on Segment Routing over IPv6 (SRv6)](https://datatracker.ietf.org/doc/html/rfc9252)
- [RFC 8986 - Segment Routing over IPv6 (SRv6) Network Programming](https://datatracker.ietf.org/doc/html/rfc8986)
- [RFC 9602 - A Recommendation for IPv6 Address Text Representation (5f00::/16 documentation prefix for SRv6 SIDs)](https://datatracker.ietf.org/doc/html/rfc9602)
- [IANA SRv6 Endpoint Behaviors registry](https://www.iana.org/assignments/segment-routing/segment-routing.xhtml)
- [FRRouting documentation - BGP and Segment Routing](https://docs.frrouting.org/)
- [FRR SRv6 uSID presentation (segment-routing.net)](https://www.segment-routing.net/images/20250311-srv6-usid-frr-netdev-0x19.pdf)

## Issues Found
1. **Incorrect endpoint_behavior code for End.DT6.** The post had `0x000D` but per the IANA SRv6 Endpoint Behaviors registry (RFC 8986), End.DT6 is `0x0012` (decimal 18). The value `0x000D` (decimal 13) is actually allocated to End.DT2M. Fixed by changing the value to `0x0012` in the BGP UPDATE example.

## Review Notes
- The RFC 9252 reference is correct (BGP Overlay Services Based on Segment Routing over IPv6).
- The 5f00::/16 prefix is the correct IANA-assigned documentation prefix for SRv6 SIDs (RFC 9602).
- FRR configuration syntax (`segment-routing srv6 locators locator NAME prefix ...`) matches FRR's documented syntax.
- The `sid vpn per-vrf export locator NAME` syntax is consistent with FRR's BGP SRv6 implementation.
- The `capability extended-nexthop` (RFC 8950) is correctly used for IPv4-NLRI over IPv6 transport.
- BGP AFI=2 / SAFI=128 correctly identifies VPNv6 (MPLS-labeled VPN over IPv6).
- The `next_hop: "::ffff:0:0"` in the conceptual BGP UPDATE example is unusual; in real deployments the next-hop carries the egress PE's loopback IPv6 address. Since the example is explicitly marked "conceptual", this is acceptable but could be clarified in a future revision.
- The `vrf RED` block nested inside `router bgp 65001` is illustrative; real FRR commonly uses a separate `router bgp ASN vrf VRFNAME` block, though FRR has been adding more nested forms over time. The example is readable as a high-level illustration.
