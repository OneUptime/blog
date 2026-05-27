# Validation Summary: How to Use Service Selectors to Pin IPAddressPools to Specific Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes labels and LabelSelector syntax
- kubectl
- MetalLB
- MetalLB IPAddressPool CRDs

## Sources Consulted
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API reference docs: https://metallb.io/apis/
- MetalLB usage docs: https://metallb.io/usage/index.html
- MetalLB installation manifest for v0.15.3: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- Kubernetes labels and selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The annotation example used the legacy `metallb.universe.tf/address-pool` annotation key. Updated it to the current `metallb.io/address-pool` key documented by MetalLB.

## Review Notes
The `serviceAllocation.serviceSelectors`, `priority`, `matchLabels`, and `matchExpressions` examples match the current MetalLB API. MetalLB uses the lowest numeric priority first, with unset or `0` priority used last, so future examples with multiple overlapping pools should state that ordering explicitly.
