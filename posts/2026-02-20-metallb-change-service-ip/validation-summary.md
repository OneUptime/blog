# Validation Summary: How to Change the IP Address of an Existing Service in MetalLB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes kubectl
- MetalLB
- LoadBalancer IP assignment
- ARP and BGP service advertisement

## Sources Consulted
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB FAQ: https://metallb.io/faq/
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- OneUptime website: https://oneuptime.com/

## Issues Found
- The post used the older `metallb.universe.tf/address-pool` annotation. Current MetalLB documentation uses `metallb.io/address-pool`, so all pool annotation examples were updated.
- The post led with Kubernetes `spec.loadBalancerIP` for fixed IP assignment. Kubernetes deprecated this field in v1.24, and current MetalLB documentation supports `metallb.io/loadBalancerIPs`; the fixed-IP examples were updated to use the MetalLB annotation while preserving a legacy removal example for existing Services that still use `spec.loadBalancerIP`.
- The pool migration examples implied that changing only the address pool annotation applies to all Services. A Service with a fixed IP request can remain constrained by that fixed IP, so the Method 2 and batch migration wording was narrowed to Services without fixed IP requests.

## Review Notes
The remaining commands and examples are syntactically plausible for kubectl and MetalLB. The zero-downtime strategy is conceptually valid, but in production it should be implemented through the team's normal declarative workflow rather than piping exported Service YAML through `sed`, because exported live objects can contain cluster-managed fields.
