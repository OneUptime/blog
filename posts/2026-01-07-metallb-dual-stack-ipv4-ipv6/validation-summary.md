# Validation Summary: How to Configure MetalLB for Dual-Stack IPv4/IPv6 Networks

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- MetalLB
- Kubernetes Services
- IPv4/IPv6 dual-stack networking
- Layer 2 ARP/NDP announcements
- BGP, FRR-K8s, BFD
- Prometheus monitoring

## Sources Consulted
- MetalLB Installation: https://metallb.universe.tf/installation/
- MetalLB Usage, including IPv6 and dual-stack Services: https://metallb.universe.tf/usage/
- MetalLB Configuration: https://metallb.universe.tf/configuration/
- MetalLB Advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB Advanced BGP configuration: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB Prometheus metrics: https://metallb.universe.tf/prometheus-metrics/
- MetalLB Release Notes: https://metallb.universe.tf/release-notes/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/

## Issues Found
- Corrected the MetalLB dual-stack allocation guidance. MetalLB requires at least one `IPAddressPool` containing both IPv4 and IPv6 ranges for dual-stack LoadBalancer allocation, so examples using only separate IPv4 and IPv6 pools were adjusted to include dual-stack pools.
- Updated the installation example from the older native v0.14.5 manifest to the current v0.16.1 FRR-K8s manifest because IPv6 and dual-stack BGP are supported through FRR-based modes.
- Replaced deprecated `metallb.universe.tf/*` annotations with current `metallb.io/*` annotations.
- Fixed the `RequireDualStack` pool-selection example to use one dual-stack pool instead of a comma-separated pair of single-stack pools.
- Corrected the `metallb.io/loadBalancerIPs` annotation example and quoted the comma-separated value.
- Fixed invalid documentation-only IPv6 literals such as `2001:db8:client::1`, `2001:db8:svc::/48`, and `2001:db8:tor1::1`.
- Corrected the IPv6 range size comment for `2001:db8:1::100-2001:db8:1::1ff`.
- Fixed BGP password examples to use `passwordSecret` with a `kubernetes.io/basic-auth` Secret, matching the MetalLB BGPPeer schema.
- Updated eBGP multihop wording because `ebgpMultiHop` is a boolean, not a numeric hop count.
- Updated Prometheus alerting to include the FRR-K8s `frrk8s_bgp_session_up` metric prefix and added HTTPS scheme to the ServiceMonitor endpoint for recent MetalLB releases.
- Removed wording implying that Service `ipFamilies` controls external client address-family preference; Kubernetes uses the first family for the primary `clusterIP`.

## Review Notes
YAML examples were parsed successfully after edits. Some operational examples remain environment-dependent, such as router CLI commands, exact ServiceMonitor selectors, and CNI/kube-proxy behavior, but they are technically plausible with appropriate cluster-specific adjustments.
