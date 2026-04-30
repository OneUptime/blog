# Validation Summary: How to Plan IPv6 for Multi-Tenant Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnet planning
- VRFs on Cisco IOS-XE
- MP-BGP/MPLS VPN route-target import/export
- DHCPv6 with ISC Kea
- IPFIX/NetFlow
- pmacct

## Sources Consulted
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Cisco, Configuring VRF-lite on IOS XE: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/26-x/configuration_guide/rtng/b_26x_rtng_9400_cg/configuring_vrf_lite.html
- Cisco, MPLS VPN VRF CLI for IPv4 and IPv6 VPNs on IOS XE 17: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/mp_l3_vpns/configuration/xe-17/mp-l3-vpns-xe-17-book/mpls-vpn-vrf-cli-for-ipv4-and-ipv6-vpns.html
- Cisco, Flexible NetFlow Overview: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fnetflow/configuration/xe-16-12/fnf-xe-17-book/fnf-fnetflow.pdf
- Kea 2.7.6 ARM, The DHCPv6 Server: https://kea.readthedocs.io/en/kea-2.7.6/arm/dhcp6-srv.html
- pmacct QUICKSTART: https://github.com/pmacct/pmacct/blob/master/QUICKSTART

## Issues Found
- The VLAN-to-prefix table used tenant aggregate prefixes such as `/48` for individual VLANs. I changed those entries to per-VLAN `/64` subnets, which matches IPv6 link addressing practice and the addressing architecture in RFC 4291.
- The Cisco IOS-XE interface example used `2001:db8:1:1::1/64`, which no longer matched the corrected VLAN 100 subnet. I changed it to `2001:db8:1:100::1/64` to keep the example internally consistent.
- The shared-services route-leaking snippet used `import path from default` under `router bgp`, which does not match Cisco IOS-XE IPv6 VRF configuration shown in the official documentation. I replaced it with a valid MP-BGP/VRF route-target import example using `vrf definition`, `route-target both`, and `route-target import`.

## Review Notes
- The post correctly uses `2001:db8::/32`, which RFC 3849 reserves for documentation and examples.
- The Kea example is a valid DHCPv6 subnet fragment, not a complete standalone Kea server configuration.
- The example hextets `:100`, `:200`, and `:300` are mnemonic labels in hexadecimal notation; operators should not assume they numerically equal decimal VLAN IDs unless that is an intentional convention.
