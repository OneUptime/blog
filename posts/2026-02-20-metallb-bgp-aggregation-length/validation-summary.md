# Validation Summary: How to Configure BGP Aggregation Length for Route Summarization in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- MetalLB `IPAddressPool` and `BGPAdvertisement` custom resources
- IPv4 and IPv6 route aggregation
- `kubectl`
- FRRouting / `vtysh`

## Sources Consulted
- MetalLB Advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB release notes: https://metallb.io/release-notes/
- MetalLB migration to CRDs documentation: https://metallb.io/configuration/migration_to_crds/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- RFC 4271, Border Gateway Protocol 4: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The `localPref` example described the field as influencing general "inbound path selection." `LOCAL_PREF` is used in BGP best-path selection within the local AS and is carried to internal BGP peers. Updated the comments to describe it as influencing iBGP path selection and preference within the local AS.

## Review Notes
- The MetalLB CRD examples use current valid fields for `metallb.io/v1beta1` `IPAddressPool` and `BGPAdvertisement`.
- `aggregationLength` and `aggregationLengthV6` remain current fields. The documented defaults are `/32` for IPv4 and `/128` for IPv6.
- MetalLB's current API also includes `serviceSelectors` on `BGPAdvertisement`, but that field is mutually exclusive with non-default aggregation lengths. The post does not use `serviceSelectors`, so no change was needed.
