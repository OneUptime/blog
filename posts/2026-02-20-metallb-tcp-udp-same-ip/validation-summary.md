# Validation Summary: How to Expose Both TCP and UDP on the Same IP with MetalLB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes LoadBalancer Services
- MetalLB
- MetalLB IPAddressPool and L2Advertisement resources
- CoreDNS
- DNS over TCP and UDP
- kubectl

## Sources Consulted
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- MetalLB usage and IP address sharing documentation: https://metallb.io/usage/index.html
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post incorrectly stated that Kubernetes cannot mix TCP and UDP protocols in a single LoadBalancer Service. Kubernetes documents mixed-protocol LoadBalancer Services as stable since v1.26, subject to load balancer implementation support. Updated the wording to describe this as a compatibility and implementation-support concern rather than a blanket Kubernetes limitation.
- The examples used the older `metallb.universe.tf/allow-shared-ip` annotation. Updated examples and troubleshooting commands to use the current `metallb.io/allow-shared-ip` annotation documented by MetalLB.
- The DNS example relied on `allow-shared-ip` alone while expecting a specific shared IP. MetalLB documents that sharing may colocate Services but does not have to unless the address is explicitly requested. Added `metallb.io/loadBalancerIPs` to both Services so the expected shared IP is deterministic.
- The apply commands omitted `ip-pool.yaml` and `dns-udp-service.yaml`, so the stated setup would not create all required resources. Added both commands.
- The pinning example used deprecated Kubernetes `spec.loadBalancerIP`. Updated it to patch MetalLB's `metallb.io/loadBalancerIPs` annotation instead.

## Review Notes
The tutorial is technically valid after the corrections. The CoreDNS image is pinned to `1.11.1`, which is not the latest release, but the example remains valid because the post is not specifically about CoreDNS version selection.
