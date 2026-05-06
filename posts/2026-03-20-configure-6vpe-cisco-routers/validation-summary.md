# Validation Summary: How to Configure 6VPE on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- IPv6
- 6VPE
- MPLS
- MP-BGP
- VRF
- L3VPN

## Sources Consulted
- Cisco IOS XE 17.x router documentation, "SSO and ISSU--MPLS VPN 6VPE and 6PE Support": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/mpls/b-mpls/m_mp-6vpe-6pe-issu-sso-0.html
- Cisco IOS XE documentation, "Implementing IPv6 VPN over MPLS": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-36s-book/ip6-ov-mpls-6vpe.html
- Cisco IOS XE documentation, "MPLS VPN VRF CLI for IPv4 and IPv6 VPNs": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/mp_l3_vpns/configuration/xe-3s/mp-l3-vpns-xe-3s-book/mp-vpn-ipv4-ipv6.html
- Cisco IOS IP Routing: BGP Command Reference, `show ip bgp summary`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS IP Routing: BGP Command Reference, `show bgp vpnv6 unicast`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-n1.html
- Cisco IOS IPv6 Command Reference, `ipv6 unicast-routing` and `ping vrf`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.html
- Cisco IOS Configuration Fundamentals Command Reference, `traceroute`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/Cisco_IOS_Configuration_Fundamentals_Command_Reference/test_cable-diagnostics_through_xmodem.html
- Cisco IOS Multiprotocol Label Switching Command Reference, `show mpls forwarding-table`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/mpls/command/mp-cr-book/mp-s2.html
- RFC 4659, "BGP-MPLS IP Virtual Private Network (VPN) Extension for IPv6 VPN": https://www.rfc-editor.org/rfc/rfc4659.html

## Issues Found
- The post used multiple invalid IPv6 examples such as `2001:db8:pe1-cea::/64` and `2001:db8:cust-a-site1::/48`. Those are not legal IPv6 prefixes because the hextets contain non-hex characters. I replaced them with valid documentation prefixes under `2001:db8::/32`.
- The PE and CE configurations omitted `ipv6 unicast-routing`. Cisco documents this as required to forward IPv6 unicast traffic, so I added it to both device examples.
- The verification examples used incorrect VRF-aware test syntax for current Cisco IOS XE documentation. I updated the examples to `ping vrf CUSTOMER-A <ipv6-host>` and `traceroute vrf CUSTOMER-A <ipv6-host>`.
- The route-target example `65000:shared` was invalid because route targets use numeric extended-community formats such as `ASN:number` or `IPv4-address:number`. I replaced it with a valid numeric example.
- The conclusion incorrectly stated that 6VPE requires VRF definitions with both IPv4 and IPv6 address families. Cisco documents that IPv4 and IPv6 address families can be enabled separately, so I corrected the statement to require the RD, IPv6 route-target policy, and VPNv6 MP-BGP pieces actually needed by the example.
- The introduction implied the shown PE/CE snippets were sufficient on their own. Cisco’s 6VPE documentation requires a working MPLS IPv4-signaled core between PE routers, so I added that prerequisite to the explanatory text.

## Review Notes
- The examples now match Cisco router-oriented 6VPE behavior, including PE-CE eBGP support. Some Cisco IOS XE Catalyst switch platforms document additional 6VPE restrictions, so platform support should still be checked against the exact hardware/software release.
- The post still focuses on the PE/VRF/CE-facing configuration and assumes the MPLS transport, label distribution, and inter-PE reachability are already operational.
- The `redistribute connected` lines under the VRF IPv6 BGP address families are syntactically valid, but many production deployments prefer more selective route origination to avoid advertising PE-CE link prefixes.
