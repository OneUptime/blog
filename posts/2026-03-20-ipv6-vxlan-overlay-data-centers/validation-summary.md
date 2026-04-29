# Validation Summary: How to Configure IPv6 VXLAN Overlay in Data Centers

## Status
validated

## Post Type
Configuration guide

## Technologies Covered
- VXLAN
- BGP EVPN
- IPv6
- FRRouting (FRR)
- NVIDIA Cumulus Linux
- Arista EOS

## Sources Consulted
- FRRouting EVPN documentation: https://docs.frrouting.org/en/stable-10.1/evpn.html
- FRRouting BGP documentation and show-command reference: https://docs.frrouting.org/en/latest/bgp.html
- NVIDIA Cumulus Linux EVPN overview: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-44/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/
- NVIDIA Cumulus Linux inter-subnet routing and anycast gateway configuration: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-50/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/Inter-subnet-Routing/
- NVIDIA Cumulus Linux EVPN enhancements and ARP/ND suppression behavior: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-55/Network-Virtualization/Ethernet-Virtual-Private-Network-EVPN/EVPN-Enhancements/
- NVIDIA Cumulus Linux interface address syntax: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-53/Layer-1-and-Switch-Ports/Interface-Configuration-and-Management/
- Arista EOS EVPN configuration guide: https://www.arista.com/en/um-eos/eos-configuring-evpn
- Arista EOS VXLAN configuration guide: https://www.arista.com/en/um-eos/eos-vxlan-configuration?searchword=eos+section+29+2+ipv6+description
- Arista EOS EVPN and VCS command reference: https://www.arista.com/en/um-eos/eos-evpn-and-vcs-commands?searchword=eos+vxlan
- RFC 7348 (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348
- RFC 9135 (Integrated Routing and Bridging in EVPN): https://datatracker.ietf.org/doc/html/rfc9135

## Issues Found
- The post used invalid IPv6 example prefixes such as `2001:db8:tenant-a::/64` and `2001:db8:tenant-b::/64`. These were replaced with valid documentation prefixes under `2001:db8::/32`.
- The Cumulus Linux example mixed incorrect and incomplete interface syntax: it used `address6`, had a VNI mismatch (`vxlan-id 100` while the architecture used VNI `10100`), omitted explicit access-VLAN bridge settings for the server ports, and reused the same IPv6 address for both the SVI and the anycast virtual gateway. These were corrected to align with documented Cumulus interface and EVPN examples.
- The FRR EVPN example used `advertise ipv6 unicast` as if it advertised EVPN Type-2 IPv6 host MAC/IP routes. This is not the correct knob for that purpose; it is used for exporting IPv6 prefixes as EVPN Type-5 routes from a VRF. The post was corrected to use `advertise-svi-ip` for the local SVI MAC/IP advertisement.
- The Arista EOS sample used incorrect anycast-gateway syntax (`ip virtual-router address ipv6 ...`) and omitted the per-VLAN EVPN route advertisement elements needed for MAC/IP learning. It was corrected to use `ipv6 virtual-router address`, add a shared virtual-router MAC, and include per-VLAN RD/RT plus `redistribute learned`.
- The verification and NDP sections contained misleading commands and explanations. The host-mobility section now uses documented EVPN route inspection commands, and the NDP section no longer confuses router-advertisement suppression with EVPN ND suppression behavior.
- The closing summary overstated ND suppression as eliminating neighbor-discovery flooding and implied stronger routed-overlay behavior than the shown snippets configured. The wording was adjusted to reflect reduced flooding for known neighbors and a consistent first-hop anycast gateway.

## Review Notes
- Full inter-subnet distributed routing in EVPN-VXLAN typically also requires explicit tenant VRFs and L3 VNIs. The corrected post now avoids implying Type-5/prefix-route behavior that is not actually configured in the sample snippets.
- Vendor syntax and defaults differ across EOS, Cumulus Linux, and FRR releases, especially around ND suppression and EVPN route advertisement. Production deployments should still be validated against the exact software version in use.
