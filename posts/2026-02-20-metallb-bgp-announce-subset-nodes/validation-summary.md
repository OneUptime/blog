# Validation Summary: How to Announce Services from a Subset of Nodes in MetalLB BGP Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- MetalLB
- MetalLB BGP mode
- MetalLB IPAddressPool, BGPPeer, and BGPAdvertisement CRDs
- BGP
- FRRouting

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- FRRouting BGP command reference: https://docs.frrouting.org/en/latest/bgp.html

## Issues Found
- The opening statement said every node with a MetalLB speaker announces service IPs by default. MetalLB's documented behavior also depends on the service traffic policy, matching BGP peers, and other service eligibility checks. Updated the wording to specify the default `Cluster` external traffic policy and eligible nodes with matching BGP peers.
- The architecture note implied worker nodes can run workloads while ingress nodes advertise without clarifying the traffic policy dependency. Added that this is correct with the default `Cluster` external traffic policy.
- The verification step recommended checking speaker logs for announcement messages. MetalLB documents service events such as `announcing from node "xxx" with protocol "bgp"` for advertisement verification. Updated the command to use `kubectl describe svc <service-name> -n <service-namespace>`.
- The explanation of `BGPPeer` and `BGPAdvertisement` selectors omitted service eligibility conditions. Added a short note that `externalTrafficPolicy: Local` only announces from nodes with local endpoints.
- The "no matching nodes" mistake said the service IP would never be announced. Clarified that this applies to that advertisement, unless another valid advertisement covers the service IP.

## Review Notes
The MetalLB CRD API versions and fields used in the examples are current in the official API reference: `IPAddressPool` and `BGPAdvertisement` use `metallb.io/v1beta1`, while `BGPPeer` uses `metallb.io/v1beta2`. The FRRouting verification command `show bgp ipv4 unicast` is valid in current FRR documentation.
