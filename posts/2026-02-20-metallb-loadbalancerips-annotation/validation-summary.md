# Validation Summary: How to Use the metallb.io/loadBalancerIPs Annotation for Dual-Stack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services
- Kubernetes IPv4/IPv6 dual-stack networking
- MetalLB
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- kubectl
- curl
- jq

## Sources Consulted
- MetalLB Usage documentation: https://metallb.io/usage/
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB Release Notes: https://metallb.io/release-notes/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/

## Issues Found
- The post said dual-stack could use separate IPv4 and IPv6 address pools. MetalLB's current documentation says a dual-stack service needs at least one compatible `IPAddressPool` containing both IPv4 and IPv6 addresses, so the example was changed to a single `dual-stack-pool` with both ranges.
- The configuration example only created address pools. MetalLB also requires service IPs to be advertised, so the example now includes an `L2Advertisement` and notes that BGP users should configure `BGPAdvertisement` instead.
- The duplicate IP section said each IP can only be assigned to one service. MetalLB supports explicit IP sharing with `metallb.io/allow-shared-ip`, so the wording now says this is the default behavior unless sharing is configured.
- The migration section said the old `metallb.universe.tf` annotation prefix was deprecated since MetalLB v0.13. Current MetalLB release notes describe the old prefix as deprecated but do not support that exact version-specific claim, so the wording now avoids the unsupported version assertion.

## Review Notes
The service manifest, `ipFamilyPolicy` guidance, `kubectl` commands, `curl` examples, and use of the `metallb.io/loadBalancerIPs` annotation are consistent with current Kubernetes and MetalLB documentation.
