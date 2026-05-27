# Validation Summary: How to Set Up MetalLB BGP Peering with a Top-of-Rack Router

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services and LoadBalancer Services
- MetalLB BGP mode
- MetalLB CRDs: IPAddressPool, BGPPeer, BGPAdvertisement
- BGP and private ASNs
- FRRouting BGP configuration
- ECMP routing

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/index.html
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB usage and traffic policies: https://metallb.io/usage/index.html
- MetalLB troubleshooting: https://metallb.io/troubleshooting/index.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes virtual IPs and Service proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 6996, private-use AS number reservations: https://datatracker.ietf.org/doc/html/rfc6996

## Issues Found
- The post correctly stated that private 16-bit ASNs are in the 64512-65534 range, but the example used ASN 64500 for the ToR router. Changed the example ASNs to 64512 for the ToR router and 64513 for the Kubernetes nodes/MetalLB.
- The post stated that all nodes with healthy endpoints announce a LoadBalancer IP. MetalLB's BGP behavior depends on `externalTrafficPolicy`: the default `Cluster` policy announces from every eligible node, while `Local` announces only from nodes with local endpoints. Updated the explanation to reflect this distinction.
- The test service used the default `externalTrafficPolicy: Cluster` while the verification text expected route announcements only from nodes with replicas. Added `externalTrafficPolicy: Local` to the test service and clarified the route verification note.
- The FRR route output explanation treated the `*` marker as the proof of ECMP. Updated the text to say that multiple next-hop entries for the same prefix indicate ECMP.
- The commented `sourceAddress` field in the BGPPeer example could be misleading in a multi-node peer configuration. Clarified that node selectors or separate BGPPeer resources are needed if the source address differs per node.

## Review Notes
The MetalLB CRD apiVersions and fields used in the examples are current in the official MetalLB API reference. FRRouting command usage for BGP neighbors, prefix-list filtering, BGP summaries, and maximum paths is consistent with the official FRR documentation.
