# Validation Summary: How to Configure Cilium Gateway API Addresses Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes Gateway API
- Cilium LB IPAM
- CiliumLoadBalancerIPPool
- Kubernetes LoadBalancer Services
- kubectl

## Sources Consulted
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium LoadBalancer IP Address Management documentation: https://docs.cilium.io/en/stable/network/lb-ipam/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Kubernetes Gateway API Gateway documentation: https://gateway-api.sigs.k8s.io/api-types/gateway/

## Issues Found
- The post described Cilium Gateway API address handling as passing address configuration to a cloud provider or MetalLB. Cilium documents Gateway `spec.addresses` support as working with Cilium LB IPAM, so the introduction and prerequisites were updated to reference Cilium LB IPAM and CiliumLoadBalancerIPPool.
- The `CiliumLoadBalancerIPPool` example used `apiVersion: cilium.io/v2alpha1` and `spec.cidrs`. Current Cilium documentation uses `apiVersion: cilium.io/v2` and `spec.blocks`, so the YAML was corrected.
- The IP pool example used a `serviceSelector` label that is not documented by Cilium as a generated Gateway Service label. It was removed to keep the example valid and broadly applicable.
- The conclusion stated that both static and dynamic approaches are managed through the Gateway spec. Dynamic allocation comes from the generated LoadBalancer Service receiving an address from LB IPAM, so the conclusion was corrected.

## Review Notes
- Cilium currently documents Gateway API address support for `IPAddress` addresses only.
- Cilium also documents that `io.cilium/lb-ipam-ips` in `spec.infrastructure.annotations` takes precedence over `spec.addresses` when both are set. The post does not cover that edge case, but the existing examples are correct after the edits.
