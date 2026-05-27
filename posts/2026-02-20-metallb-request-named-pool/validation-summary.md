# Validation Summary: How to Request IPs from a Named Address Pool in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- kubectl
- MetalLB
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- MetalLB BGPAdvertisement
- MetalLB Service annotations

## Sources Consulted
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/index.html
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB Release Notes: https://metallb.io/release-notes/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post used the deprecated `metallb.universe.tf/address-pool` annotation prefix. Updated all examples and explanatory text to use the current `metallb.io/address-pool` annotation, matching current MetalLB documentation.
- The specific IP example used `spec.loadBalancerIP`, which Kubernetes deprecated in v1.24 and MetalLB documents an annotation-based alternative for. Updated the example to use `metallb.io/loadBalancerIPs: 203.0.113.25`.
- The expected output for `kubectl get svc -A --field-selector spec.type=LoadBalancer` omitted the `NAMESPACE` column. Added the `NAMESPACE` column and `default` namespace values to match all-namespaces output.

## Review Notes
The MetalLB CRD examples use current `metallb.io/v1beta1` APIs for `IPAddressPool`, `L2Advertisement`, and `BGPAdvertisement`, and the referenced fields (`addresses`, `autoAssign`, and `ipAddressPools`) match the current MetalLB API reference. The BGP advertisement example assumes BGP peers are configured elsewhere; that is reasonable for a focused post about pool selection.
