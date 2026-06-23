# Validation Summary: How to Share IPs Between Services in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes Services
- Kubernetes LoadBalancer services
- MetalLB IPAddressPool, L2Advertisement, and BGPAdvertisement CRDs
- EndpointSlices
- kubectl

## Sources Consulted
- MetalLB Usage: https://metallb.io/usage/
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB Advanced BGP Configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The post used the older `metallb.universe.tf/allow-shared-ip` annotation. Updated examples and commands to the current `metallb.io/allow-shared-ip` annotation documented by MetalLB.
- The post used deprecated Kubernetes `spec.loadBalancerIP` fields throughout the examples. Replaced them with MetalLB's `metallb.io/loadBalancerIPs` annotation for current Kubernetes compatibility.
- The explanation of IP sharing omitted MetalLB's traffic policy compatibility requirement. Added that sharing requires services to both use `externalTrafficPolicy: Cluster` or select the exact same pods.
- Troubleshooting commands queried the deprecated Endpoints API. Updated the health check command to query EndpointSlices by the `kubernetes.io/service-name` label.
- Updated the MetalLB documentation URL from `https://metallb.universe.tf/` to `https://metallb.io/`.

## Review Notes
The YAML snippets were parsed successfully after the edits. The examples rely on MetalLB's current CRD-based configuration model introduced for MetalLB v0.13.0 and later.
