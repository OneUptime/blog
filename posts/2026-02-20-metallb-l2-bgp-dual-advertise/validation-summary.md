# Validation Summary: How to Advertise the Same Service via Both L2 and BGP in MetalLB

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- MetalLB IPAddressPool, L2Advertisement, BGPPeer, and BGPAdvertisement CRDs
- Layer 2 ARP/NDP advertisement
- BGP service advertisement
- kubectl
- FRRouting route verification

## Sources Consulted
- MetalLB FAQ, including dual L2 and BGP advertisement: https://metallb.io/faq/
- MetalLB configuration guide for L2, BGP, IPAddressPool, BGPPeer, and BGPAdvertisement resources: https://metallb.io/configuration/
- MetalLB API reference for BGPPeer, L2Advertisement, and BGPAdvertisement fields: https://metallb.io/apis/
- MetalLB advanced BGP configuration, including BGPAdvertisement nodeSelectors: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB advanced L2 configuration, including interfaces and nodeSelectors: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB layer 2 mode concepts and single-leader behavior: https://metallb.io/concepts/layer2/
- MetalLB BGP mode concepts and ECMP behavior: https://metallb.io/concepts/bgp/
- MetalLB troubleshooting guide for BGP and L2 advertisement behavior: https://metallb.io/troubleshooting/

## Issues Found
- The post said "the MetalLB speaker on the elected node handles both" L2 ARP responses and BGP route advertisement. MetalLB elects a single L2 announcer for a VIP, but BGP advertisements are made by eligible speakers with BGP sessions rather than by the L2-elected node. Updated the wording to describe the two advertisement mechanisms independently.
- The selective-node example said "all nodes participate in L2 for local redundancy." In L2 mode, all matching nodes are eligible announcers, but only one leader announces a given service IP at a time. Updated the comment to say all nodes are eligible for L2 leader election.

## Review Notes
The CRD examples use current MetalLB API versions: `IPAddressPool`, `L2Advertisement`, and `BGPAdvertisement` at `metallb.io/v1beta1`, and `BGPPeer` at `metallb.io/v1beta2`. The fields `ipAddressPools`, `interfaces`, `nodeSelectors`, `aggregationLength`, `peerAddress`, `peerASN`, `myASN`, `keepaliveTime`, and `holdTime` match the current MetalLB API reference. The tutorial remains version-independent but assumes current CRD-based MetalLB configuration rather than the older ConfigMap-based configuration.
