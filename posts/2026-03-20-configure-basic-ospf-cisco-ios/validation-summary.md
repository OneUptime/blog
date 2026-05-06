# Validation Summary: How to Configure Basic OSPF on Cisco IOS Routers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OSPFv2
- Cisco IOS
- Cisco IOS XE
- IP routing

## Sources Consulted
- Cisco IOS IP Routing: OSPF Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book.pdf
- IP Routing Configuration Guide, Cisco IOS XE 17.x - Enabling OSPFv2 on an Interface Basis: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iro-mode-ospfv2.html
- OSPF Configuration Guide - OSPF [Cisco IOS XE 17]: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr3-fwd/ospf/ospf-configuration-guide/ospf.html
- IP Routing Configuration Guide, Cisco IOS XE 17.x - Default Passive Interfaces: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iri-default-passive-interface.html
- Understand Show IP OSPF Neighbor Command Output - Cisco: https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13688-16.html
- RFC 2328: OSPF Version 2: https://www.rfc-editor.org/rfc/rfc2328

## Issues Found
- Step 1: Clarified that the OSPF process ID is locally significant, while neighboring interfaces must agree on the OSPF area. The previous wording was too broad and could be read as implying area numbers simply "match between routers" in all cases.
- Step 2: Clarified router ID selection order to match Cisco behavior: highest loopback IP address first, otherwise the highest active interface IP address. The original phrasing was ambiguous about loopback precedence.
- Step 3: Replaced "preferred on IOS XE" for the interface-level `ip ospf` method. Cisco documents the `ip ospf area` approach as an alternative to `network ... area`, not as a blanket preferred method.

## Review Notes
- No unsupported or deprecated commands were found for a basic OSPFv2 Cisco IOS guide.
- The Hello and Dead timer defaults in the post are accurate for Ethernet-style interfaces; different OSPF network types can use different defaults.
