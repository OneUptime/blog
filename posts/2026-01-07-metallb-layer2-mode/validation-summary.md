# Validation Summary: How to Configure MetalLB Layer 2 Mode for Local Networks

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- MetalLB
- Kubernetes Services of type LoadBalancer
- MetalLB IPAddressPool and L2Advertisement custom resources
- Layer 2 networking, ARP, and NDP
- kubectl
- Prometheus monitoring
- Kubernetes NetworkPolicy

## Sources Consulted
- MetalLB official documentation: https://metallb.universe.tf/
- MetalLB installation guide: https://metallb.io/installation/
- MetalLB configuration guide: https://metallb.universe.tf/configuration/
- MetalLB Layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB advanced L2 configuration: https://metallb.universe.tf/configuration/_advanced_l2_configuration/
- MetalLB usage guide: https://metallb.universe.tf/usage/
- MetalLB troubleshooting guide: https://metallb.universe.tf/troubleshooting/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB release notes: https://metallb.universe.tf/release-notes/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Updated the MetalLB manifest version from `v0.14.5` to `v0.16.1` to match the current MetalLB documentation and release notes.
- Replaced deprecated `metallb.universe.tf/*` service annotations with the current `metallb.io/*` annotations.
- Corrected the failover sequence. The post implied the controller detects speaker heartbeat timeout and elects a new leader; MetalLB Layer 2 ownership is handled by speakers using memberlist detection and stateless owner calculation.
- Reworded the failover timing claim from a fixed `1-3 seconds` expectation to "usually a few seconds" with a note that client ARP cache behavior can make recovery slower.
- Removed the unsupported `<100 RPS` production guidance and replaced it with a throughput-based recommendation tied to the single-node ingress limitation.
- Updated the speaker metrics examples from the old HTTP port `7472` to the current HTTPS metrics port `9120`.
- Replaced the `kubectl exec ... wget` metrics check with `kubectl port-forward` and `curl -k`, because current MetalLB containers are distroless and newer metrics endpoints are HTTPS.
- Updated the NetworkPolicy example to allow metrics on port `9120` and added Kubernetes API server egress, since blocking API access would break speaker operation in many clusters.

## Review Notes
The core IPAddressPool, L2Advertisement, LoadBalancer Service, node selector, interface selector, `externalTrafficPolicy`, and Layer 2 limitation explanations align with current MetalLB and Kubernetes documentation. The Prometheus alert job labels remain deployment-specific and may need adjustment for a user's scrape configuration.
