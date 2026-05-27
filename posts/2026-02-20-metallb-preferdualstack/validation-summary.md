# Validation Summary: How to Use PreferDualStack IP Family Policy with MetalLB

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes Services
- Kubernetes IPv4/IPv6 dual-stack networking
- MetalLB
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- kubectl JSONPath output

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB release notes: https://metallb.io/release-notes/

## Issues Found
- The post said MetalLB supports `PreferDualStack` through separate IPv4 and IPv6 address pools. MetalLB documentation says dual-stack allocation requires at least one compatible `IPAddressPool` containing both IPv4 and IPv6 addresses. Updated the introduction, pool example, L2Advertisement example, architecture diagram, troubleshooting table, and wrap-up to use a single `dualstack-pool` with both address families.
- The prerequisite listed MetalLB v0.13+ and said dual-stack support was added in v0.12.1. MetalLB release notes show dual-stack services in v0.12.0 and `PreferDualStack` support in v0.14.9. Updated the version prerequisite accordingly.
- The cluster verification command checked kube-apiserver feature gates for "dual". Dual-stack is stable in current Kubernetes, so this is not a reliable validation method. Replaced it with a command that inspects Service `clusterIPs` and `ipFamilies`.
- The `RequireDualStack` description implied the Service would stay pending when either family is unavailable. Kubernetes documentation says API object creation fails if dual-stack is not enabled or supported. Updated the policy table and diagram wording.
- The troubleshooting table still referred to creating an advertisement for an IPv6-only pool after the pool model was corrected. Updated it to refer to the dual-stack pool.

## Review Notes
The Service, IPAddressPool, and L2Advertisement YAML now use current API fields shown in official Kubernetes and MetalLB documentation. For BGP dual-stack deployments, MetalLB currently requires FRR-based BGP modes; the post now notes this caveat without expanding the scope of the guide.
