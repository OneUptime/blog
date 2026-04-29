# Validation Summary: How to Assign External IPv4 Addresses to Kubernetes Services with MetalLB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MetalLB
- Kubernetes Services
- `kubectl`
- IPv4 networking
- LoadBalancer services on bare-metal Kubernetes

## Sources Consulted
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB release notes: https://metallb.io/release-notes/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used the deprecated `metallb.universe.tf/*` annotation prefix. I replaced it with the current `metallb.io/*` prefix because MetalLB documents the old prefix as deprecated.
- The shared-IP example used Kubernetes `spec.loadBalancerIP`, which is deprecated in Kubernetes. I replaced it with the current MetalLB-specific `metallb.io/loadBalancerIPs` annotation.
- The shared-IP example omitted selectors, which made the Service manifests incomplete for normal pod-backed routing. I added selectors so the example works as an actual Service definition.
- The introduction implied that an IP pool alone is enough after installation. I corrected it to note that MetalLB also needs the appropriate L2/BGP advertisement configuration to announce assigned addresses.
- The automatic-assignment example said MetalLB would use the "first available" IP. I changed that wording to "an address from the configured pool" because current docs do not guarantee that exact allocation wording.
- The verification section used `curl http://...:443` for a Service example that exposes port 443. I corrected it to `curl -k https://...` to match the protocol implied by the example.
- The verification section checked the IP pool object for allocation details. I changed that to `kubectl describe svc my-api`, which matches MetalLB's documented guidance to inspect Service events for allocation behavior.

## Review Notes
- `spec.loadBalancerIP` still works with MetalLB, but Kubernetes deprecated it in v1.24, so using the MetalLB annotation is the safer current recommendation.
- Actual reachability still depends on valid `IPAddressPool` resources plus the corresponding L2 or BGP announcement configuration in the cluster.
