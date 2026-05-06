# Validation Summary: How to Understand BGP VPNv6 Address Family

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- MP-BGP VPNv6
- MPLS L3VPN
- IPv6
- Cisco IOS
- FRRouting

## Sources Consulted
- RFC 4659, "BGP-MPLS IP Virtual Private Network (VPN) Extension for IPv6 VPN" - https://www.ietf.org/rfc/rfc4659
- RFC 4364, "BGP/MPLS IP Virtual Private Networks (VPNs)" - https://www.rfc-editor.org/rfc/rfc4364
- Cisco IOS IPv6 Command Reference, `address-family vpnv6` and related BGP commands - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_01.html
- Cisco IOS IPv6 Command Reference, `route-target` command - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_11.pdf
- Cisco IOS IP Routing: BGP Command Reference, `show bgp vpnv6 unicast` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-n1.html
- Cisco feature guide, "MPLS VPN—VRF CLI for IPv4 and IPv6 VPNs" - https://www.cisco.com/c/en/us/td/docs/ios/12_2sr/12_2srb/feature/guide/sr_mpvrf.pdf
- FRRouting BGP documentation - https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Zebra documentation - https://docs.frrouting.org/en/latest/zebra.html
- FRRouting EVPN documentation - https://docs.frrouting.org/en/stable-10.4/evpn.html

## Issues Found
- The post said a VPNv6 route was a "136-bit globally unique prefix." Per RFC 4659, a VPN-IPv6 address is 24 bytes: an 8-byte RD plus a 16-byte IPv6 address. I corrected the VPNv6 route description accordingly.
- The post described Route Targets as a generic BGP community. Route Targets are BGP extended communities, so I corrected that wording.
- The example PE neighbor address `2001:db8:pe2::1` was not valid IPv6 syntax because `p` is not a hexadecimal character. I replaced it with the valid documentation address `2001:db8:0:2::1` everywhere it appeared.
- The FRRouting example used `vni 100` under `vrf CUSTOMER_A` and labeled it "VXLAN/MPLS VNI". In FRR, that `vni` association is for EVPN/VXLAN L3VNI use, not MPLS L3VPN, and FRR does not create Linux VRFs itself. I removed that misleading block and clarified the kernel-VRF prerequisite.
- The FRRouting MPLS L3VPN example omitted `label vpn export`, which FRR requires to attach an MPLS label to exported VPN routes. I added `label vpn export auto`.
- The Cisco verification command combined `show bgp vpnv6 unicast` with neighbor-route syntax in a way that is not the documented Cisco IOS form I verified. I replaced it with `show bgp all neighbors ... routes`, which is the documented neighbor inspection command covering VPNv6.

## Review Notes
- The Cisco and FRR examples are now technically consistent for a basic MPLS L3VPN VPNv6 control-plane illustration, but both still assume the underlying MPLS transport, IGP reachability, and PE/VRF plumbing already exist.
- FRRouting VRFs depend on Linux kernel VRF objects or namespaces managed outside FRR. The post now reflects that, but it does not attempt to cover the Linux-side setup.
