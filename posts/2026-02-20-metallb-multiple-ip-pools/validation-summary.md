# Validation Summary: How to Define Multiple IP Address Pools in MetalLB

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kubernetes Services of type LoadBalancer
- MetalLB
- MetalLB IPAddressPool custom resources
- MetalLB L2Advertisement and BGPAdvertisement resources
- kubectl
- YAML

## Sources Consulted
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB Advanced IPAddressPool Configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API Reference: https://metallb.io/apis/
- MetalLB Full Example / Usage: https://metallb.io/usage/example/
- MetalLB Release Notes: https://metallb.universe.tf/release-notes/
- IANA IPv4 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv4-special-registry

## Issues Found
- The service annotation used the deprecated `metallb.universe.tf/address-pool` prefix. Updated it to the current `metallb.io/address-pool` prefix documented by MetalLB.
- The allocation precedence section incorrectly said MetalLB picks pools alphabetically by name. Updated it to describe `spec.serviceAllocation.priority`, lower priority numbers taking precedence, and random selection when matching pools have the same priority.
- The post implied `203.0.113.0/28` and `198.51.100.10-198.51.100.15` were real routable/premium IPs. Clarified that these are documentation-only example ranges that must be replaced with assigned addresses.
- The namespace guidance said MetalLB resources always live in `metallb-system`. Updated it to say resources should use the namespace where MetalLB is deployed, usually `metallb-system`, which matches MetalLB's Helm/custom namespace guidance.
- The controller log verification command used a case-sensitive grep for `assigned`. Updated it to `grep -i "assigned"` so it works with common `Assigned IP` log/event wording.

## Review Notes
The IPAddressPool examples use the current `metallb.io/v1beta1` API and valid `addresses` and `autoAssign` fields. The post correctly notes that service IPs must be advertised with L2Advertisement or BGPAdvertisement resources, but future improvements could include complete advertisement examples for each pool.
