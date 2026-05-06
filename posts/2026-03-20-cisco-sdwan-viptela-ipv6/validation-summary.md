# Validation Summary: How to Configure Cisco SD-WAN (Viptela) with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco SD-WAN
- Cisco vEdge
- Cisco IOS XE Catalyst SD-WAN (cEdge)
- IPv6
- OMP
- Cisco vManage / Cisco SD-WAN Manager
- DHCPv6

## Sources Consulted
- Cisco Catalyst SD-WAN Command Reference - Configuration Commands: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/command/sdwan-cr-book/config-cmd.html
- Cisco Catalyst SD-WAN Command Reference - Operational Commands: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/command/sdwan-cr-book/operational-cmd.html
- Systems and Interfaces Configuration Guide, Cisco SD-WAN Release 20.x - IPv6 Functionality (vEdge): https://www.cisco.com/c/en/us/td/docs/routers/sdwan/configuration/system-interface/vedge-20-x/systems-interfaces-book/m-ipv6-functionality.html
- Cisco Catalyst SD-WAN Policies Configuration Guide, Cisco IOS XE Catalyst SD-WAN Release 17.x - Application-Aware Routing: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/configuration/policies/ios-xe-17/policies-book-xe/application-aware-routing.html
- Cisco Catalyst SD-WAN Network Configuration Guide, Releases 26.x and Later - DHCP for IPv6: https://www.cisco.com/c/en/us/td/docs/routers/sdwan/26x-later/network/network-configuration-guide/dhcp-for-ipv6.html
- IP Addressing Configuration Guide, Cisco IOS XE 17.x - IPv6 Access Services: DHCPv6 Prefix Delegation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-dhcp-prefix-xe.html
- Cisco IOS IPv6 Command Reference - `ipv6 nd managed-config-flag`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html

## Issues Found
- The vEdge service-side example used unsupported `ipv6 dhcp-server` syntax. Cisco’s vEdge command reference documents `dhcp-server` under the interface for IPv4 address pools, not an `ipv6 dhcp-server` submode, so the unsupported DHCPv6 lines were removed from the vEdge example.
- The vEdge example also used `ip route 0.0.0.0/0 vpn 0` and `ipv6 route ::/0 vpn 0` in a way that did not match the documented IPv6 static-route syntax. The unsupported IPv6 route form was removed, and the section was kept focused on service-side interface configuration.
- The vManage “device template” JSON was not documentation-backed and mixed a vEdge example with the IOS XE `ISR-4331` device type. It was replaced with an accurate feature-template representation based on the documented `Cisco VPN Interface Ethernet` template fields.
- The OMP verification section used incorrect or non-documented command forms such as `show ip route vrf 1 ipv6`. These were corrected to documented commands: `show omp routes family ipv6 vpn 1`, `show ipv6 routes vpn 1`, and `show ipv6 route vrf 1`.
- The cEdge DHCPv6 example was incomplete for stateful address assignment because it omitted the Router Advertisement managed flag. The interface example was corrected to use `ipv6 nd managed-config-flag` with documented `ipv6 dhcp pool` / `ipv6 dhcp server` syntax.
- The “Application-Aware Routing” section actually described DSCP and port-based centralized data policy steering, not true IPv6 AAR by application or app-list. The section was relabeled as traffic steering, and the closing paragraph now notes the documented release requirement for IPv6 AAR application matching: Cisco IOS XE Catalyst SD-WAN 17.9.1a with Cisco vManage 20.9.1 or later.
- The metadata overstated coverage by claiming IPv6 BGP peering even though the post did not include BGP configuration. The description and tags were corrected to match the actual content.

## Review Notes
- Cisco documents IPv6 DHCP support for Cisco IOS XE Catalyst SD-WAN beginning with Cisco IOS XE Catalyst SD-WAN Release 17.7.1a and Cisco vManage Release 20.7.1. The post now stays within that documented feature set.
- Cisco documents IPv6 AAR application or app-list matching beginning with Cisco IOS XE Catalyst SD-WAN Release 17.9.1a and Cisco vManage Release 20.9.1. Earlier releases can still use IPv6-aware centralized traffic policies, but not full IPv6 application matching for AAR.
- Cisco’s vEdge documentation contains release-specific caveats around dual-stack behavior on transport interfaces. The post’s remaining examples are accurate for service-side IPv6 and OMP route distribution, but transport-side design should still be checked against the target release.
