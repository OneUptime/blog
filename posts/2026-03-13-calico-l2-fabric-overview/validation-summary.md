# Validation Summary: How to Understand L2 Interconnect Fabric with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes networking
- VXLAN
- IP-in-IP
- Calico IPPool resources
- CrossSubnet encapsulation
- BGP/static route based pod routing
- MTU sizing for overlays

## Sources Consulted
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Azure public cloud documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico over Ethernet fabrics documentation: https://docs.tigera.io/calico/latest/reference/architecture/design/l2-interconnect-fabric
- Calico over IP fabrics documentation: https://docs.tigera.io/calico/latest/reference/architecture/design/l3-interconnect-fabric
- RFC 7348, Virtual eXtensible Local Area Network: https://www.rfc-editor.org/rfc/rfc7348
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003

## Issues Found
- The post described VXLAN and IP-in-IP as "L2-based interconnect." Calico's documentation distinguishes Ethernet/L2 fabrics from overlay networking, and IP-in-IP is an IP-layer tunnel. Updated the title, description, introduction, and conclusion to describe these modes as overlay interconnect/encapsulation.
- The cloud VPC explanation stated too broadly that AWS VPC, GCP VPC, and Azure VNet do not know about pod IPs. Revised it to explain that many cloud VPCs are not automatically aware of Calico pod IPs and need either pod routes or overlay encapsulation.
- The VXLAN implementation steps over-specified Felix as programming only MAC-to-node-IP FDB mappings for each pod CIDR. Updated this to reflect Calico's documented route programming plus VXLAN neighbor/FDB state.
- The VXLAN recommendation claimed it works in all cloud VPCs without special configuration. Replaced this with a narrower compatibility claim and added the documented Azure behavior that VXLAN is supported while IPIP packets are blocked.
- The IPPool example omitted `natOutgoing`, which Calico recommends for IPPool resources with IPIP or VXLAN enabled. Added `natOutgoing: true`.
- The comparison table said VXLAN has "no special protocol support" as a requirement. Updated this to the more precise requirement that UDP/4789 be allowed.
- The unencapsulated mode row implied only BGP. Updated it to include BGP or static routes and to state the real requirement: the underlay must route pod CIDRs.

## Review Notes
Calico's current documentation notes that IP-in-IP supports only IPv4 addresses, and that VXLAN over IPv6 has kernel version requirements. The post is IPv4-focused and does not claim IPv6 support, so no content change was required for that caveat.
