# Validation Summary: How to Configure EVPN VXLAN with IPv6 on Cisco Nexus

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco Nexus NX-OS
- BGP EVPN
- VXLAN
- IPv6 underlay
- OSPFv3
- Symmetric IRB

## Sources Consulted
- Cisco Nexus 9000 Series NX-OS VXLAN Configuration Guide, Release 10.5(x) - Configure VXLAN with IPv6 in the Underlay (VXLANv6): https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/105x/configuration/vxlan/cisco-nexus-9000-series-nx-os-vxlan-configuration-guide-release-105x/m_configuring_vxlan_with_ipv6_in_the_underlay_vxlanv6.html
- Cisco Nexus 9000 Series NX-OS VXLAN Configuration Guide, Release 10.4(x) - Configure VXLAN BGP EVPN: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/104x/configuration/vxlan/cisco-nexus-9000-series-nx-os-vxlan-configuration-guide-release-104x/m_configuring_vxlan_bgp_evpn.html
- Cisco Nexus 9000 Series NX-OS VXLAN Configuration Guide, Release 10.3(x) - Configuring External VRF Connectivity and Route Leaking: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/configuration/vxlan/cisco-nexus-9000-series-nx-os-vxlan-configuration-guide-release-103x/m_configuring_external_vrf_connectivity_and_route_leaking_93x.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.6(x) - OSPFv3: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m-n9k-configuring-ospfv3-93x.html
- RFC 8365 - A Network Virtualization Overlay Solution Using Ethernet VPN (EVPN): https://datatracker.ietf.org/doc/html/rfc8365
- RFC 7348 - Virtual eXtensible Local Area Network (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348

## Issues Found
- The original underlay feature block was missing `feature vn-segment`, `feature interface-vlan`, and `nv overlay evpn`, which Cisco documents as part of enabling VXLAN EVPN on Nexus. I added those commands.
- The original loopback example included `ip router ospf 1 area 0` even though the post is describing an IPv6-only underlay and did not enable the IPv4 OSPF feature. I removed that line so the snippet matches the stated design and can be pasted as shown.
- The tenant VRF example omitted the BGP VRF `advertise l2vpn evpn` configuration for IPv4 and IPv6 unicast families. I added those lines so routed tenant prefixes are advertised into EVPN as documented for VXLAN routing.
- The L3VNI example defined the VRF VNI and NVE membership but omitted the required L3VNI SVI. I added `interface vlan3001` with `ip forward`, `ipv6 address use-link-local-only`, and redirect suppression so the symmetric IRB example is complete.
- The VRF address-family example only showed `route-target both auto evpn`. Cisco examples for classic VLAN-backed L3VNI configuration include both the per-AF route target and EVPN-specific route target, so I added `route-target both auto` under both IPv4 and IPv6 address families.
- The verification section used `show vxlan interface` to check overlay state. That command is not broadly supported across current Nexus 9300 variants and is less appropriate for VNI validation than `show nve vni`, so I replaced it and added `show ipv6 neighbor vrf tenant1` for IPv6 host verification.

## Review Notes
- The post uses the classic VLAN-backed L3VNI model (`vlan 3001` plus `interface vlan3001`). Cisco also supports the newer `vni ... l3` mode on certain platforms beginning with NX-OS 10.2(3)F, but the classic model remains valid and is appropriate for this guide.
