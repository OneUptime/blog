# Validation Summary: How to Configure IPv6 Underlay in Data Center Fabrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 underlay routing
- BGP unnumbered
- FRRouting (FRR)
- NVIDIA Cumulus Linux
- IS-IS
- OSPFv3
- Cisco NX-OS
- Arista EOS
- VXLAN
- BGP EVPN

## Sources Consulted
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR IS-IS documentation: https://docs.frrouting.org/en/stable-10.0/isisd.html
- NVIDIA Cumulus Linux BGP documentation: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-44/Layer-3/Border-Gateway-Protocol-BGP/
- NVIDIA Cumulus Linux EVPN overview: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-58/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/
- NVIDIA Cumulus Linux EVPN basic configuration: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-59/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/Basic-Configuration/
- Cisco Nexus 9000 NX-OS IS-IS configuration guide: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m-n9k-configuring-is-is-101x.html
- Cisco Nexus 9000 NX-OS OSPFv3 configuration guide: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m-n9k-configuring-ospfv3-93x.html
- Cisco Nexus 9000 VXLANv6 guide: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/configuration/vxlan/cisco-nexus-9000-series-nx-os-vxlan-configuration-guide-release-103x/m-vxlan-ipv6.pdf
- Arista EOS VXLAN configuration guide: https://www.arista.com/en/um-eos/eos-vxlan-configuration
- Local CLI help consulted for Linux VXLAN endpoint syntax: `ip link help vxlan`

## Issues Found
- The FRR IS-IS example used `ip router isis` on IPv6-only interfaces and an outdated `address-family ipv6` / `multi-topology` block. I changed it to `ipv6 router isis` on the interfaces and `topology ipv6-unicast` under `router isis`, which matches FRR documentation.
- The FRR IS-IS NET comment incorrectly said the NET includes the router ID. I corrected it to say it includes the system ID.
- The Cisco NX-OS routed interface examples for IS-IS and OSPFv3 were missing `no switchport` on `Ethernet1/1`. I added it so the IPv6 address and routing protocol commands are valid on a routed port.
- The Cisco NX-OS OSPFv3 verification commands used undocumented forms (`show ospfv3 neighbor` and `show ospfv3 database`). I changed them to the documented commands `show ipv6 ospfv3 neighbors` and `show ipv6 ospfv3 database`.
- The Cumulus VXLAN example placed `vxlan-local-tunnelip` under the VXLAN interface. I moved it under the loopback stanza, which is how Cumulus documents the setting.
- The Arista EOS VXLAN example was missing `vxlan encapsulation ipv6`, which is required for an IPv6 VXLAN underlay. I added it.
- The EVPN example attempted to peer directly to a spine IPv6 loopback without the additional overlay session details that would be required. I replaced it with the documented Cumulus model of reusing the existing eBGP underlay sessions for the EVPN address family.
- The traceroute verification note overstated ECMP behavior by saying a single traceroute should show all spine paths. I corrected it to note that repeated probes can sample ECMP paths.
- The conclusion contained an over-broad claim that IS-IS and OSPFv3 are faster and less operationally complex. I narrowed it to a technically defensible statement about differing trade-offs.
- The BGP unnumbered benefits list said it works for both IPv4 and IPv6 underlay. I corrected this to the more accurate claim that IPv4 and IPv6 reachability can be carried over IPv6 link-local peering.

## Review Notes
- VXLAN over an IPv6 underlay is platform- and release-dependent on both Cisco NX-OS and Arista EOS; readers should confirm hardware and software support before using the examples in production.
- BGP unnumbered behavior described here is consistent with FRR/Cumulus documentation that uses IPv6 link-local peering and supports carrying IPv4 reachability over that transport.
