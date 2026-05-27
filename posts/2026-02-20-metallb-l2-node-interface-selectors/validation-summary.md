# Validation Summary: How to Use Node Selectors with L2Advertisement in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Services of type LoadBalancer
- Kubernetes labels and label selectors
- MetalLB Layer 2 mode
- MetalLB IPAddressPool and L2Advertisement CRDs
- ARP and NDP
- `kubectl`

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage documentation for Service annotations: https://metallb.io/usage/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB release notes for v0.13.2 CRD support and annotation deprecation notes: https://metallb.io/release-notes/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The prerequisites said MetalLB v0.13+ was sufficient for the CRD examples. MetalLB release notes identify CRD configuration support in v0.13.2, so the prerequisite was changed to MetalLB v0.13.2+.
- The L2Advertisement example comment said nodes must match all selectors. MetalLB `nodeSelectors` is a list of Kubernetes label selectors, where each selector block combines its requirements with AND logic and multiple selector blocks act as OR conditions. The comment was updated to avoid implying that every selector block must match.
- The Service example used the deprecated `metallb.universe.tf/address-pool` annotation. It was updated to the current `metallb.io/address-pool` annotation documented by MetalLB.
- The verification step used a speaker log label selector that is not guaranteed by current MetalLB manifests or Helm labels. MetalLB troubleshooting documentation says Service events show the speaker announcement, so the command was changed to `kubectl describe svc test-lb-service | grep "announcing from node"`.
- The failover diagram referred to the MetalLB controller as handling L2 failure detection and re-election. MetalLB documentation describes L2 failover as speaker/memberlist behavior, so the diagram label and wording were corrected to refer to MetalLB speakers recalculating ownership.

## Review Notes
The `IPAddressPool` and `L2Advertisement` YAML fields, `apiVersion: metallb.io/v1beta1`, `nodeSelectors`, `ipAddressPools`, and `interfaces` explanation match the current MetalLB API reference. The explanation of Layer 2 behavior, ARP for IPv4, NDP for IPv6, single-node service ownership, and kube-proxy forwarding aligns with official MetalLB Layer 2 documentation. `kubectl` was not installed in the local environment, so CLI syntax was checked against Kubernetes and MetalLB documentation rather than local `--help` output.
