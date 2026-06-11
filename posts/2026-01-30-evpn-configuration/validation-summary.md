# Validation Summary: How to Create EVPN Configuration

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- EVPN
- VXLAN
- BGP L2VPN EVPN
- Cisco NX-OS / Nexus 9000 configuration
- OSPF underlay routing
- Symmetric IRB
- EVPN Ethernet Segment multi-homing

## Sources Consulted
- RFC 7432: BGP MPLS-Based Ethernet VPN - https://www.rfc-editor.org/rfc/rfc7432.html
- RFC 9136: IP Prefix Advertisement in Ethernet VPN (EVPN) - https://datatracker.ietf.org/doc/html/rfc9136
- IANA Ethernet VPN (EVPN) route type registry - https://www.iana.org/assignments/evpn/evpn.xhtml
- Cisco Nexus 9000 Series NX-OS VXLAN Configuration Guide, Release 10.6(x): Configure VXLAN BGP EVPN - https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/vxlan/cisco-nexus-9000-series-nx-os-vxlan-configuration-guide-release-106x/m_configuring_vxlan_bgp_evpn.html
- Cisco Nexus 9000 Series NX-OS VXLAN Configuration Guide, Release 10.6(x): EVPN Ethernet Segment Identifier Multi-Homing - https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/vxlan/cisco-nexus-9000-series-nx-os-vxlan-configuration-guide-release-106x/configuring-esi-tx.html

## Issues Found
- The post implied RFC 7432 defined all five listed EVPN route types. Updated the text to clarify that RFC 7432 defines the core route types 1 through 4, while Type 5 IP Prefix routes are defined by RFC 9136.
- The EVPN overview said BGP distributes MAC and IP address information as a single RFC 7432 baseline behavior. Updated it to distinguish RFC 7432 MAC reachability from later integrated routing and IP prefix advertisement extensions.
- The text said EVPN has "No flood-and-learn behavior" and later "eliminates flood-and-learn." Tightened those statements because EVPN replaces classic data-plane MAC flood-and-learn for advertised hosts, while BUM and unknown traffic forwarding still exists.
- The NVE example described a VNI as using a multicast group while configuring BGP ingress replication. Updated the comment to match the actual `ingress-replication protocol bgp` configuration.
- The EVPN multi-homing snippets used non-current NX-OS `evpn ethernet-segment` / `identifier` / manual ES route-target syntax on both the physical member and port-channel. Updated the examples to use NX-OS `evpn multihoming`, `ethernet-segment`, and `esi` under the Layer 2 port-channel.
- The EVPN multi-homing section omitted required NX-OS operational prerequisites. Added the key TCAM carving, EVPN BGP multipath, and core-link tracking commands called out by Cisco documentation.
- The Ethernet Segment verification commands used `show evpn ethernet-segment`, which does not match current NX-OS documentation. Updated them to `show nve ethernet-segment` and `show l2route evpn ethernet-segment ... detail`.
- The leaf prerequisites used LACP later without enabling the feature in the earlier leaf feature list. Added `feature lacp`.

## Review Notes
The guide remains platform-specific to Cisco NX-OS-style syntax even though that is not stated explicitly in the title. Future improvements could add a short version/platform note, because NX-OS VXLAN EVPN behavior differs across releases and newer releases include a newer L3VNI mode that can simplify configuration.
