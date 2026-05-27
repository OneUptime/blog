# Validation Summary: How to Request a Specific IP Address for a Service in MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes LoadBalancer service configuration
- MetalLB
- MetalLB IPAddressPool
- MetalLB L2Advertisement and BGPAdvertisement
- Dual-stack IPv4/IPv6 service configuration
- kubectl

## Sources Consulted
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB Configuration documentation: https://metallb.io/configuration/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/

## Issues Found
- The post used the older `metallb.universe.tf/loadBalancerIPs` annotation. Updated examples to the current MetalLB-documented `metallb.io/loadBalancerIPs` annotation.
- The post described `spec.loadBalancerIP` as the simplest standard option without noting its Kubernetes deprecation. Added a concise caveat that Kubernetes deprecated `.spec.loadBalancerIP` in v1.24 and that the MetalLB annotation is preferred for new configurations.
- The flowchart and failure section said the Service stays `Pending`. Clarified that the Service's external IP remains pending, matching how `kubectl get svc` reports LoadBalancer services.
- The dual-stack example requested an IPv6 address, but the shown `IPAddressPool` only contained IPv4 addresses. Added an IPv6 CIDR to the pool so the requested IPv6 address can be allocated.

## Review Notes
The examples are otherwise consistent with current MetalLB documentation: `IPAddressPool` uses `metallb.io/v1beta1`, specific IP requests are supported, dual-stack requests require the MetalLB annotation, and advertising requires L2 or BGP advertisement configuration. The `kubectl` commands are syntactically valid.
