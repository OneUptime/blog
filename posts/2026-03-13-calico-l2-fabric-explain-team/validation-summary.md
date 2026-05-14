# Validation Summary: How to Explain L2 Interconnect Fabric with Calico to Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes pod networking
- VXLAN encapsulation
- IP-in-IP encapsulation
- BGP routing
- tcpdump
- Linux networking interfaces and bridge FDB inspection

## Sources Consulted
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Kubernetes system and network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico MTU configuration guidance: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Linux tcpdump manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html

## Issues Found
- The post described VXLAN and IP-in-IP together as "L2 overlay networking." IP-in-IP is an IP encapsulation mode, and Calico documentation describes both VXLAN and IP-in-IP as overlay encapsulation types. I changed the wording to "overlay networking" and added IP-in-IP to the tags.
- The tcpdump example captured on `vxlan.calico` while expecting to show the outer VXLAN packet. Capturing on the VXLAN device usually shows decapsulated overlay traffic, so I changed the command to capture UDP 4789 on the node underlay interface.
- The post said inner pod IPs are "only Calico knows." The more accurate point is that the underlay does not route those pod IPs, so I corrected that wording.
- The developer guidance tied MTU impact to application messages close to 64KB. MTU issues are more directly relevant to large UDP datagrams and MTU-sensitive traffic; TCP usually segments streams. I changed the wording accordingly.
- The IP-in-IP firewall guidance omitted BGP. Calico's default IP-in-IP model uses BGP to distribute cluster routes, so I added TCP 179 to the IP-in-IP firewall guidance.
- The VXLAN FDB explanation said the FDB maps node IPs to pod CIDRs and should have one entry per remote node. Calico documentation says Felix programs cluster routes for VXLAN IP pools and manages the VXLAN device; FDB entries are not pod CIDR mappings. I corrected the explanation.
- The latency answer gave an unsupported fixed estimate of 5-15 microseconds per round trip. I replaced it with a qualified statement because exact overhead depends on kernel, NIC offload, packet size, and workload.
- The BGP answer overgeneralized cloud VPC limitations and overlays. I clarified that VXLAN works when UDP traffic can route between VMs and that BGP can also use supported route-reflector designs.

## Review Notes
The post is technically relevant and includes commands and implementation details. The remaining examples are intentionally illustrative and assume the reader substitutes real pod names, service addresses, and the correct node underlay interface.
