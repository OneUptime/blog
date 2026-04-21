# Validation Summary: How to Understand SRv6 in Data Center Fabrics - A Practical Guide

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- BGP EVPN
- Linux iproute2 `seg6local` and VRF
- FRRouting IS-IS and SRv6 locator configuration
- Cisco IOS XR EVPN SRv6 L2VPN
- VXLAN and MPLS VPN comparison

## Sources Consulted
- RFC 8986, "Segment Routing over IPv6 (SRv6) Network Programming": https://datatracker.ietf.org/doc/html/rfc8986
- RFC 9252, "BGP Overlay Services Based on Segment Routing over IPv6 (SRv6)": https://www.ietf.org/rfc/rfc9252
- RFC 9602, "Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture": https://www.ietf.org/rfc/rfc9602.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ip-link(8)` manual page for VRF creation syntax: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `ip-vrf(8)` manual page for VRF execution and table behavior: https://man7.org/linux/man-pages/man8/ip-vrf.8.html
- FRRouting BGP documentation for BGP SRv6 service support and EVPN command scope: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Zebra documentation for SRv6 locator configuration: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting IS-IS documentation for SRv6 locator advertisement and show commands: https://docs.frrouting.org/en/latest/isisd.html
- Cisco IOS XR SRv6-Based Layer 2 and Integrated VPN Services documentation: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/srv6/b-srv6-configuration-guide/srv6-based-layer-2-and-integrated-vpn-services.html
- Local `iproute2-6.1.0` `ip -6 route help` output for `End.DX2` action parameters.

## Issues Found
- The post described SRv6 as directly replacing VXLAN VNIs/MPLS labels and as categorically more efficient. Updated the description, introduction, and conclusion to state that SRv6 service SIDs carry equivalent service context over an IPv6 underlay.
- The L2VPN section treated `End.DX2` as the general EVPN L2 bridging behavior. Updated it to distinguish `End.DX2` for L2 cross-connect/VPWS from `End.DT2U` and `End.DT2M` for EVPN E-LAN unicast and BUM traffic.
- The Linux `End.DX2` example omitted the required output-interface action parameter. Added `oif bridge100` and made `dev lo` the local SID route device.
- The FRRouting EVPN SRv6 L2VPN snippet used FRR EVPN-VXLAN/L3 SRv6 syntax as if it configured EVPN L2 SRv6. Replaced it with a Cisco IOS XR EVPN SRv6 L2VPN example that matches official EVPN SRv6 service documentation.
- The VRF setup used invalid `ip vrf add` syntax. Replaced it with `ip link add TENANT_A type vrf table 100`, brought the VRF up, enabled `net.vrf.strict_mode=1`, and used `vrftable 100 dev TENANT_A` for `End.DT6` and `End.DT4`.
- The EVPN route-type table said SRv6 simply replaces the EVPN MPLS label field and mapped Type 2 to `End.DX6`. Updated the explanation to use RFC 9252 Prefix-SID and transposition terminology and corrected Type 2 and Type 5 behavior mappings.
- The underlay requirements were too absolute about IS-IS and plain IPv6 forwarding. Updated them to require IPv6 locator reachability, present IS-IS as one underlay option, clarify when transit nodes need SRv6 support, and add the required FRR Zebra locator configuration.
- The overhead comparison mixed assumptions and omitted SRH overhead. Updated the VXLAN and SRv6 overhead values and caveats.
- The monitoring section included invalid or unsupported commands and an invalid IPv6 address. Replaced them with FRR IS-IS/SRv6 locator commands, Cisco IOS XR EVPN SRv6 show commands, and a valid Linux `ip vrf exec` ping example.

## Review Notes
The post is technically valid after correction, but it now intentionally mixes Linux data-plane examples, FRR underlay examples, and Cisco IOS XR EVPN SRv6 service examples. A future improvement would be a single-platform lab with explicit software versions and complete interface/locator setup.
