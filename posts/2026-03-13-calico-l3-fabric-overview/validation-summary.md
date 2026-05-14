# Validation Summary: How to Understand L3 Interconnect Fabric with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes networking
- BGP
- BIRD
- Calico BGPConfiguration and BGPPeer resources
- Calico IPAM
- VXLAN and IP-in-IP encapsulation
- Route reflectors and node-to-node BGP mesh

## Sources Consulted
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPAM documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico data path documentation: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The introduction described VXLAN and IP-in-IP together as "L2 overlay modes". VXLAN is an overlay encapsulation and IP-in-IP is IP-layer encapsulation, so the wording was changed to "encapsulated overlay modes such as VXLAN or IP-in-IP."
- The comparison table gave overlay overhead as 50 bytes per packet, which is accurate for VXLAN over IPv4 but not for IP-in-IP. It now distinguishes 20 bytes for IP-in-IP and 50 bytes for VXLAN over IPv4.
- The comparison table described overlay networking as requiring any UDP network. That is only accurate for VXLAN, while IP-in-IP uses IP protocol 4. The row now says the underlay must permit the chosen encapsulation.
- The route advertisement explanation said BIRD advertises the Kubernetes pod CIDR block allocated to each node. Calico IPAM actually subdivides IP pools into blocks associated with nodes, commonly `/26` for IPv4 by default, and nodes may have one or more blocks. The wording now refers to pod address routes and Calico IPAM blocks.
- The routing explanation said Node 1 finds a direct route to Node 2's IP. This was clarified to say Node 2's IP is the next hop for the pod address block.
- The node-to-node mesh section said full mesh is not scalable beyond approximately 50 nodes. Current Calico documentation describes full mesh as suitable for about 100 nodes or less and recommends route reflectors at significantly larger scales, so the threshold was corrected.

## Review Notes
The BGPConfiguration and BGPPeer YAML snippets use valid current `projectcalico.org/v3` resource fields. The `calicoctl patch bgpconfiguration default -p ...` command matches current Calico documentation. The post assumes Calico's BIRD-based routing mode; current Calico documentation also notes Felix can be configured to program cluster routes in some modes, but the BIRD-focused explanation is valid for the scenario described.
