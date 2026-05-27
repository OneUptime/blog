# Validation Summary: How to Disable Automatic IP Assignment for Expensive Address Pools in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- MetalLB IPAddressPool custom resources
- Kubernetes YAML manifests
- kubectl

## Sources Consulted
- MetalLB Advanced AddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB API reference: https://metallb.io/apis/index.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/

## Issues Found
- The post used the legacy `metallb.universe.tf/address-pool` annotation. Updated the examples to the current documented `metallb.io/address-pool` annotation.
- The specific-IP example used `spec.loadBalancerIP`, which Kubernetes deprecated in v1.24 and MetalLB recommends replacing with `metallb.io/loadBalancerIPs` for current examples. Updated the example to use `metallb.io/loadBalancerIPs`.
- The post claimed allocation was alphabetically ordered and recommended naming the default pool alphabetically first. Current MetalLB documentation says matching pools are sorted by `serviceAllocation.priority`, and pools with the same priority are chosen randomly. Updated the flow text and best-practice table accordingly.

## Review Notes
The `IPAddressPool` examples, `autoAssign` field, address formats, `kubectl apply`, `kubectl expose`, JSONPath usage, and custom-column command are consistent with the reviewed documentation. Services that explicitly request a pool or IP that does not match MetalLB configuration will remain pending, which supports the post's explanation that `autoAssign: false` prevents fallback into expensive pools.
