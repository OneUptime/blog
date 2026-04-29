# Validation Summary: How to Configure Kubernetes Services with externalIPs for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes Services
- kube-proxy
- Linux networking (`ip`, `iptables`)
- keepalived
- MetalLB

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Security Checklist: https://kubernetes.io/docs/concepts/security/security-checklist/
- MetalLB installation documentation: https://metallb.io/installation/

## Issues Found
- The post described `externalIPs` as a normal exposure option without noting that the field is deprecated in Kubernetes v1.36. I added a deprecation note in the introduction and conclusion so the guidance matches current Kubernetes documentation.
- The post said the external IP must be assigned to a node and used comments implying each `externalIP` is assigned to a cluster node. I corrected this to say the IP must be routed to one or more cluster nodes, with assigning a VIP to a node interface shown as one common bare-metal implementation.
- The kube-proxy explanation and verification command were written as though `iptables` is always the proxy backend. I narrowed that language to say the rule inspection example applies to `iptables` mode specifically.
- The security section implied RBAC alone can restrict `externalIPs` and included an OPA/Gatekeeper example that would not work by itself because it referenced a non-built-in constraint kind. I replaced that guidance with the built-in `DenyServiceExternalIPs` admission controller and clarified that field-level enforcement requires admission control.
- The MetalLB install example pinned `v0.14.5`, which is older than the current installation example in MetalLB's official docs. I updated the manifest URL to `v0.15.3`.

## Review Notes
- `externalIPs` remains available but is deprecated in Kubernetes v1.36, so this post should be rechecked against future Kubernetes releases.
- `kubectl` was not installed in the review environment, so CLI syntax was verified against official documentation and the referenced MetalLB manifest URL was checked directly.
