# Validation Summary: How to Announce Services to a Subset of BGP Peers in MetalLB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- MetalLB
- MetalLB BGPPeer
- MetalLB IPAddressPool
- MetalLB BGPAdvertisement
- BGP

## Sources Consulted
- MetalLB Advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB basic configuration documentation: https://metallb.io/configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB current CRD manifests on GitHub: https://github.com/metallb/metallb/tree/main/config/crd/bases
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.ietf.org/rfc/rfc5737

## Issues Found
- The description referred to "peer selectors", but `BGPAdvertisement` uses a `peers` string list rather than a label selector. Changed the wording to "using the peers field".
- The public pool comment described `203.0.113.0/28` as internet-routable. RFC 5737 reserves `203.0.113.0/24` for documentation examples, so the comment now states that it is an example prefix and should be replaced with an allocated, routed block.
- The overlapping-advertisements warning said different aggregation lengths can cause unpredictable behavior. MetalLB supports multiple advertisements and aggregate routes, so the warning now says such a configuration can advertise both per-service and aggregate prefixes and should be intentional.
- The cleanup command omitted the optional `shared-services` advertisement shown in the multi-peer example. Added it to the `kubectl delete bgpadvertisement` command.

## Review Notes
The MetalLB API versions and fields used in the examples are current: `BGPPeer` uses `metallb.io/v1beta2`, while `IPAddressPool` and `BGPAdvertisement` use `metallb.io/v1beta1`. The `peers` field behavior matches the official MetalLB documentation: when set, it limits announcements for the selected pools to the named BGPPeers; when empty, announcements go to all configured BGPPeers.
