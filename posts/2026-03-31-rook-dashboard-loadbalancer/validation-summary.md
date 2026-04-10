# Validation Summary: How to Expose the Ceph Dashboard via LoadBalancer in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard (MGR module)
- Kubernetes Services (LoadBalancer type)
- MetalLB (bare-metal load balancer)
- AWS NLB (Network Load Balancer)
- OpenSSL (TLS certificate verification)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- Kubernetes API reference for Service spec (loadBalancerSourceRanges): https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- AWS Load Balancer Controller annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/

## Issues Found
No technical issues found.

## Review Notes
- The MetalLB annotation `metallb.universe.tf/loadBalancerIPs` is the current approach for MetalLB v0.13+. The older `spec.loadBalancerIP` field is deprecated as of Kubernetes v1.24. The post correctly uses the modern annotation.
- The selector label `rook_cluster` (with underscore) is correct for Rook's labeling convention — this is not a typo despite looking unusual.
- The `loadBalancerSourceRanges` section shows a partial YAML snippet (only `spec:` without full metadata). This is intentional as it demonstrates adding the field to an existing service definition, which is clear in context.
- The post could mention in the future that `spec.loadBalancerIP` is deprecated in favor of provider-specific annotations, but this is not an error since the post already uses the correct MetalLB annotation approach.
