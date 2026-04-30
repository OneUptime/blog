# Validation Summary: How to Configure IPv6 for Data Center Interconnect (DCI)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Data center interconnect (DCI)
- Cisco NX-OS BGP
- Cisco NX-OS OSPFv3
- FRRouting (FRR) EVPN
- Linux VXLAN and bridge configuration with iproute2
- BGP communities
- IPv6 Path MTU Discovery

## Sources Consulted
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, OSPFv3: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/9-x/unicast/configuration/guide/l3_cli_nxos/l3_ospfv3.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Basic BGP: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/102x/configuration/Unicast-routing/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide-release-102x/m-n9k-configuring-basic-bgp-101x.html
- FRRouting EVPN documentation: https://docs.frrouting.org/en/stable-10.5/evpn.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/stable-10.4/bgp.html
- FRRouting Route Maps documentation: https://docs.frrouting.org/en/stable-8.1/routemap.html
- RFC 4271, BGP-4: https://datatracker.ietf.org/doc/rfc4271/
- RFC 7348, VXLAN: https://datatracker.ietf.org/doc/html/rfc7348
- RFC 7432, BGP MPLS-Based Ethernet VPN: https://datatracker.ietf.org/doc/html/rfc7432.html
- RFC 8200, IPv6 Specification: https://datatracker.ietf.org/doc/rfc8200/
- RFC 8201, Path MTU Discovery for IPv6: https://datatracker.ietf.org/doc/rfc8201/
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.15/networking/ip-sysctl.html
- Local CLI help/output used for command verification: `ip link help vxlan`, `ip link help bridge_slave`, `ping -h`, `sysctl -a`

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:transit::1`, `2001:db8:dc2::router`, and `2001:db8:dc1::vtep`. These were replaced with syntactically valid documentation-prefix addresses.
- The NX-OS OSPFv3 interface command was incorrect. Cisco NX-OS uses `ipv6 router ospfv3 <instance> area <area-id>`, not `ipv6 ospfv3 ...`, so that line was corrected.
- The NX-OS snippet referenced `EXPORT_TO_OSPF` without defining it and omitted the required `feature ospfv3` and `feature bgp` enablement lines. Those were added so the example is internally consistent.
- The Linux EVPN example applied `neigh_suppress` to the bridge object, but iproute2 exposes `neigh_suppress` on the `bridge_slave` type. The command was moved to `vxlan100` and `learning off` was added to match FRR-compatible EVPN guidance.
- The EVPN example used a VTEP source address without first assigning it locally. A loopback VTEP address was added because FRR documents the local VTEP IP as a reachable local address.
- The MTU section stated that VXLAN over IPv6 adds 50 bytes of overhead. RFC 7348 plus IPv6/UDP header sizes make the outer IP/UDP/VXLAN overhead 56 bytes, so the MTU math and conclusion were corrected.
- The sysctl `net.ipv6.conf.eth-dci.mtu_expires` does not exist. It was replaced with the valid global PMTU cache timer `net.ipv6.route.mtu_expires`, and the comment was changed so it no longer incorrectly claims to "enable" PMTU discovery.
- The BGP communities example incorrectly set `local-preference` on export. Per RFC 4271, `LOCAL_PREF` is used within an AS and is not sent to external peers, so the example was rewritten to tag routes with a community on export and set `local-preference` on import.
- The BGP communities example also defined a match against `DCI_ROUTES` without defining the community list or applying the export route-map. The missing community list and neighbor route-map attachments were added.
- The monitoring script checked `show bgp summary` for the string `Establ`, which is not a reliable FRR established-state check. It was updated to use `show bgp ipv6 unicast summary established` and to test valid example peer/prefix values.

## Review Notes
- The FRR-related commands were reviewed against upstream documentation, but they were not runtime-tested in this environment because `vtysh` is not installed here.
- The EVPN section remains a minimal control-plane example and still assumes the DCI underlay already has reachability to the chosen VTEP address.
