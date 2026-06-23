# Validation Summary: How to Configure Multiple IP Pools in MetalLB for Different Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes Services of type LoadBalancer
- Kubernetes Custom Resource Definitions
- L2 Advertisement
- BGP Advertisement and BGP Peer configuration
- Prometheus Operator ServiceMonitor
- kubectl

## Sources Consulted
- MetalLB Advanced AddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB Advanced BGP configuration: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB Usage documentation: https://metallb.universe.tf/usage/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB v0.14.9 native manifests: https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Several selector-based pool examples set `autoAssign: false` while describing automatic allocation by namespace or service labels. Changed those examples to `autoAssign: true`, keeping `autoAssign: false` only for the explicit pool-selection example.
- Namespace examples used wildcard strings such as `prod-*`, `dev-*`, and `tenant-a-*` in `serviceAllocation.namespaces`. MetalLB expects exact namespace names there. Replaced wildcard patterns with `namespaceSelectors` using Kubernetes label selectors.
- Service annotations used the older `metallb.universe.tf/address-pool` and `metallb.universe.tf/loadBalancerIPs` keys. Updated them to the current documented `metallb.io/address-pool` and `metallb.io/loadBalancerIPs` annotations.
- The `BGPPeer` example used `metallb.io/v1beta1`, which is deprecated in current MetalLB CRDs. Updated it to `metallb.io/v1beta2`.
- The BGP local preference comment described outbound path selection too narrowly. Updated it to say it affects BGP best-path selection.
- The controller log command used an outdated `app=metallb` selector. Updated it to the current `component=controller` label used by the official manifests.
- The ServiceMonitor selector matched `app.kubernetes.io/name: metallb`, which does not match the current official MetalLB services in the referenced manifests. Updated it to select `component` values for `controller` and `speaker`.

## Review Notes
Validated YAML fenced examples by parsing them with PyYAML after edits. The article remains version-sensitive because MetalLB CRDs are still beta-level APIs and labels may vary if installed through a customized Helm chart or operator.
