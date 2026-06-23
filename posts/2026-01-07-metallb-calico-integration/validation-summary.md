# Validation Summary: How to Configure MetalLB with Calico for Advanced Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Calico
- Kubernetes Services and NetworkPolicy
- BGP and BFD
- Helm
- Prometheus Operator ServiceMonitor

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB Calico compatibility notes: https://metallb.io/configuration/calico/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB Helm chart values: https://github.com/metallb/metallb/blob/main/charts/metallb/README.md
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico NetworkPolicy and GlobalNetworkPolicy references: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy and https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- RFC 7454 BGP operations and security: https://www.rfc-editor.org/rfc/rfc7454

## Issues Found
- Removed `keepAliveTime` from the Calico `BGPPeer` example because Calico's BGPPeer schema does not define that field.
- Corrected the MetalLB Helm install command for deprecated FRR mode by explicitly setting `frrk8s.enabled=false` instead of pinning an old FRR image tag.
- Reworked the BGP conflict guidance. MetalLB's Calico notes describe duplicate BGP sessions between the same node and router as the issue, not a simple local port conflict. The post now recommends a separate router/VRF or Calico-managed LoadBalancer BGP advertisements.
- Updated the MetalLB BGP peer and troubleshooting examples to use a separate peer address (`10.0.0.2`) from Calico's router peer (`10.0.0.1`).
- Fixed Calico policy examples by using `projectcalico.org/name` namespace selectors and removing a duplicate `destination` key that would have produced invalid or misleading YAML.
- Added the separate MetalLB router address to the host endpoint BGP allow policy.
- Updated MetalLB service annotations from the legacy `metallb.universe.tf/*` keys to current `metallb.io/*` annotations.
- Updated MetalLB monitoring examples and troubleshooting selectors to match current Helm chart labels and metrics defaults.
- Corrected the MetalLB BGP password example to use `passwordSecret` without an inline `password`, and changed the Secret creation command to create a `kubernetes.io/basic-auth` Secret.
- Updated the MetalLB official documentation link to `https://metallb.io/`.

## Review Notes
The tutorial still uses MetalLB's deprecated FRR sidecar mode for the `vtysh` troubleshooting flow. The post now pins that mode correctly, but a future update should consider migrating the example to the current default FRR-K8s backend.
