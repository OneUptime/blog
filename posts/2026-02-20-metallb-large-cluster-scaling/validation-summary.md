# Validation Summary: How to Scale MetalLB for Clusters with Hundreds of Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- MetalLB IPAddressPool, L2, and BGP configuration
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- kubectl

## Sources Consulted
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB Usage: https://metallb.io/usage/index.html
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB Advanced L2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB Prometheus Metrics: https://metallb.io/prometheus-metrics/
- MetalLB Installation and Prometheus manifests: https://metallb.io/installation/index.html
- MetalLB v0.16.0 native Prometheus manifest: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/manifests/metallb-native-prometheus.yaml
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Replaced legacy MetalLB annotation keys `metallb.universe.tf/address-pool` and `metallb.universe.tf/allow-shared-ip` with the current `metallb.io/address-pool` and `metallb.io/allow-shared-ip` keys documented by MetalLB.
- Replaced `spec.loadBalancerIP` in the shared-IP example with MetalLB's `metallb.io/loadBalancerIPs` annotation because Kubernetes deprecated `.spec.loadBalancerIP` in v1.24 and MetalLB documents its annotation as the preferred specific-IP mechanism.
- Corrected the ServiceMonitor example to match MetalLB's current Prometheus service shape by selecting the controller monitor service label and using the `metricshttps` port with HTTPS TLS settings.
- Clarified that speakers announce eligible services and that `externalTrafficPolicy: Local` requires local endpoints on the speaker node.
- Clarified that BGP distributes traffic across multiple eligible nodes when routers are configured for multipath, rather than implying unconditional distribution across every node.

## Review Notes
- The capacity planning table is reasonable as guidance, but actual thresholds depend on router ECMP limits, service churn, endpoint count, node count, and MetalLB deployment mode.
- The speaker node-selection example is syntactically valid as a DaemonSet overlay, but L2Advertisement or BGPAdvertisement node selectors are often a more targeted way to constrain where particular pools or services are announced.
