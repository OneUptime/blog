# Validation Summary: How to Configure IPv6 on Cisco NX-OS Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco NX-OS
- Cisco Nexus switches
- IPv6
- VRF
- OSPFv3
- BGP
- IPv6 ACLs

## Sources Consulted
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.5(x) - IPv6 Addresses: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/105x/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m-n9k-configuring-ipv6-93x.html
- Cisco Nexus 9000 Series NX-OS Interfaces Configuration Guide, Release 10.4(x) - Configuring Layer 3 Interfaces: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/104x/configuration/interfaces/cisco-nexus-9000-series-nx-os-interfaces-configuration-guide-release-104x/m_configuring_layer_3_interfaces_9x.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 9.x - OSPFv3: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/9-x/unicast/configuration/guide/l3_cli_nxos/l3_ospfv3.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.6(x) - BGP: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/configuring-bgp.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.6(x) - Configure static route: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m_configuring_static_routing.html
- Cisco Nexus 9000 Series NX-OS Security Configuration Guide, Release 10.6(x) - Configure IP ACLs: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/security/cisco-nexus-9000-series-nx-os-security-configuration-guide-release-106x/m-configuring-ip-acls.html
- Cisco Nexus 9000 Series NX-OS Command Reference (Configuration Commands), Release 7.0(3)I4(1) - P Commands: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/7-x/command_references/configuration_commands/b_N9K_Config_Commands_703i4x/b_N9K_Config_Commands_703i4x_chapter_010000.html

## Issues Found
- Replaced the `feature ipv6` step with accurate NX-OS guidance. On Nexus 9000, IPv6 processing is enabled on an interface when you configure an IPv6 address; the post now enables `feature interface-vlan`, which is actually required for the SVI example.
- Added `vlan 100` before the `interface Vlan100` example so the SVI example includes the VLAN it depends on.
- Corrected the loopback comment. An IPv6-only loopback is not itself a router ID; OSPFv3 and BGP router IDs remain 32-bit IPv4-format values.
- Added the missing VRF interface-level OSPFv3 command so the VRF example actually enables OSPFv3 on the interface, not just in router configuration mode.
- Removed `activate` from the IPv6 BGP neighbor example. In NX-OS, entering the neighbor address-family configuration mode enables that address family for the neighbor.
- Corrected verification commands to NX-OS forms verified in Cisco documentation: `show ipv6 interface`, `show ipv6 ospfv3 neighbors`, and `show ipv6 neighbor`.
- Updated the conclusion to remove the inaccurate `feature ipv6` claim and softened the “preferred routing protocol” statement to a technically safer description.

## Review Notes
- Exact IPv6 feature behavior can vary by Nexus platform and NX-OS release; the corrected post now aligns with current Cisco Nexus 9000 documentation rather than older IOS-style assumptions.
- IPv6 ACL behavior has platform- and release-specific caveats, including special handling for some ICMPv6 and IPv6 extension-header traffic on certain Nexus 9000 platforms.
- The post is technically valid as a general NX-OS guide after correction, but production deployments should still be checked against the target switch model and NX-OS release notes.
