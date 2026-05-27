# Validation Summary: How to Configure External Traffic Policy with MetalLB BGP Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- MetalLB BGP mode
- BGP
- ECMP
- kube-proxy
- FRRouting

## Sources Consulted
- MetalLB BGP mode concepts: https://metallb.io/concepts/bgp/
- MetalLB usage documentation for Cluster and Local traffic policies: https://metallb.io/usage/
- MetalLB troubleshooting documentation for advertisement behavior: https://metallb.io/troubleshooting/
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference for BGPPeer and BGPAdvertisement fields: https://metallb.io/apis/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes virtual IPs and Service proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/

## Issues Found
- The BGPPeer example said MetalLB's ASN must be different from the router's ASN. That is only true for eBGP; iBGP uses the same ASN. Updated the comment to describe both cases.
- The BGPPeer example included a single `sourceAddress` in a broad peer configuration. MetalLB supports the field, but its documentation recommends using it mainly with per-node peers because the address must make sense on the selected node. Removed it from the basic example to avoid a misleading configuration.
- The ECMP and session affinity section implied Kubernetes session affinity can mitigate ECMP next-hop rehashing. MetalLB documents that BGP routers use stateless hashing and active connections can break when the backend set changes. Updated the text to state that resilient ECMP is the relevant router-side mitigation, while Kubernetes session affinity only affects pod selection after traffic reaches a node.
- The comparison table said all nodes always advertise under Cluster policy. MetalLB can still limit advertisement based on eligible speaker nodes, active endpoints, node selectors, and node exclusion rules. Updated the table wording to be more precise.

## Review Notes
The YAML snippets use current MetalLB CRD API versions for BGPPeer (`metallb.io/v1beta2`) and BGPAdvertisement (`metallb.io/v1beta1`) and valid Kubernetes Service fields. The post intentionally omits the IPAddressPool definition, so the BGPAdvertisement examples assume `production-pool` already exists.
