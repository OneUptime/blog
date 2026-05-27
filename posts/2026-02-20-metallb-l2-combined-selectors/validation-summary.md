# Validation Summary: How to Combine Interface Selectors and Node Selectors in MetalLB L2 Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB Layer 2 mode
- MetalLB IPAddressPool and L2Advertisement CRDs
- Kubernetes Services of type LoadBalancer
- kubectl

## Sources Consulted
- MetalLB Advanced L2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Layer 2 configuration: https://metallb.io/configuration/
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB Release Notes: https://metallb.io/release-notes/

## Issues Found
- The post originally stated that `interfaces` participates in L2 leader election and that a node without a listed interface is excluded from election. MetalLB documentation states that the interface selector does not affect leader election; it only restricts which interfaces are used for advertisement after a node is selected. Updated the explanation, diagram, and common mistake entry to reflect this.
- The Service example used the older `metallb.universe.tf/address-pool` annotation. Updated it to the current `metallb.io/address-pool` annotation used by official MetalLB documentation.
- The log command selected speakers with `app=metallb-speaker`, which does not match current MetalLB labeling guidance. Updated it to select `app=metallb,app.kubernetes.io/component=speaker`.

## Review Notes
The YAML examples use current MetalLB `metallb.io/v1beta1` `IPAddressPool` and `L2Advertisement` resources. The post's multi-advertisement example uses separate pools, so it avoids the union behavior caveat that applies when multiple `L2Advertisement` resources select the same pool.
