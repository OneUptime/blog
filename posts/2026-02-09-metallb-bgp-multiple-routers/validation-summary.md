# Validation Summary: How to Configure MetalLB BGP Mode with Multiple Upstream Routers for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes LoadBalancer Services
- BGP
- BFD
- FRR-K8s
- Cisco IOS route maps
- FRRouting
- Helm
- kubectl

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB BGP configuration documentation: https://metallb.io/configuration/
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP concepts documentation: https://metallb.io/concepts/bgp/
- MetalLB usage documentation for service annotations: https://metallb.io/usage/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB GitHub releases API: https://api.github.com/repos/metallb/metallb/releases
- MetalLB v0.16.1 CRDs and manifests: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-frr-k8s.yaml

## Issues Found
- The manifest install command used MetalLB v0.13.12 native mode, but the guide later configures BFD and graceful restart features that require FRR-based modes. Updated the manifest URL to the current v0.16.1 FRR-K8s manifest.
- The BGP peer examples set the same `sourceAddress` on all peers, which is only valid if that address exists on each node establishing BGP sessions. Removed the generic `sourceAddress` fields.
- The graceful restart example used unsupported `gracefulRestart.enabled` and `gracefulRestart.restartTime` fields and referenced an undefined BFD profile. Replaced it with the supported `enableGracefulRestart: true` field.
- Troubleshooting commands checked BGP state through the controller pod and attempted to run `vtysh` from the controller. Updated them to check speaker logs and FRR-K8s status resources.
- The service examples used the deprecated `metallb.universe.tf` annotation prefix and `spec.loadBalancerIP`. Updated them to the current `metallb.io` annotation prefix and `metallb.io/loadBalancerIPs`.
- The AS path prepending example used an unsupported `asPrepend` field in `BGPAdvertisement`. Replaced it with a supported community-based lower-preference example and a corrected Cisco IOS community-list/route-map configuration.

## Review Notes
The examples now align with current MetalLB v0.16.1 documentation and CRD schemas. The article still uses private RFC1918 addresses and example ASNs, so operators must adapt addresses, ASNs, router syntax, and peer authentication to their own environment.
