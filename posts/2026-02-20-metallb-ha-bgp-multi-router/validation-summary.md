# Validation Summary: How to Achieve High Availability with MetalLB BGP and Multiple Routers

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Kubernetes LoadBalancer Services
- MetalLB BGP mode
- MetalLB CRDs: BGPPeer, IPAddressPool, BGPAdvertisement, BFDProfile
- BGP, ECMP, BFD, and private ASNs
- FRRouting (FRR)
- kubectl

## Sources Consulted
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB usage and externalTrafficPolicy behavior: https://metallb.io/usage/index.html
- MetalLB configuration guide: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- RFC 6996, private-use ASNs: https://www.rfc-editor.org/rfc/rfc6996
- RFC 4271, BGP-4 timers and KEEPALIVE guidance: https://datatracker.ietf.org/doc/html/rfc4271

## Issues Found
- The original examples used ASNs 64500 and 64501 while the prerequisites said private ASNs should be used. Those ASNs are outside the RFC 6996 16-bit private range. Changed the examples to 64512 for the routers and 64513 for MetalLB.
- The prerequisite only mentioned the 16-bit private ASN range. Added the RFC 6996 32-bit private ASN range, 4200000000-4294967294.
- The `BGPAdvertisement` comment said `aggregationLength: 32` aggregated routes to reduce routing table size. In MetalLB, `/32` is the IPv4 default and advertises each service IP individually. Updated the comment to say it advertises each service IP as a `/32`.
- The router-failure test only shut down one BGP neighbor on Router A, leaving the other Router A peerings active. Updated the example to shut down and re-enable all three MetalLB neighbors on Router A.
- The BFD section implied BFD support was universal. Clarified that this applies to FRR-backed MetalLB BGP mode and requires BFD on the routers as well.

## Review Notes
The MetalLB CRD API versions and fields used in the post are current for MetalLB v0.13+ CRD-based configuration. BFD support requires a MetalLB BGP mode that supports BFD, such as FRR-backed mode, and the upstream router must also be configured for compatible BFD settings.
