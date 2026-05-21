# Validation Summary: How to Set Up Network Segmentation with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio Sidecar resources
- Istio PeerAuthentication and mutual TLS
- Kubernetes namespaces
- Kubernetes NetworkPolicy
- kubectl and istioctl CLI usage

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The public-zone examples said public workloads could talk to each other, but the destination policy in the `public` namespace only allowed traffic from `istio-system`. I updated the policy to allow both `istio-system` and `public` sources, and clarified the application-zone policy comment.
- The admin-zone text described reading from other zones, but the shown AuthorizationPolicy only controls inbound traffic to workloads in the `admin` namespace. I changed the description to match the policy behavior.
- The Sidecar section implied Sidecar host scoping is an enforcement control. Istio documents Sidecar as configuration scoping, and notes outbound traffic settings are not a security policy. I changed the wording to describe service discovery/configuration reduction and kept AuthorizationPolicy and NetworkPolicy as the enforcement controls.
- The PeerAuthentication explanation overstated what STRICT mTLS guarantees. I clarified that mesh workloads accept mutual TLS connections and noted that the mesh-wide policy belongs in the Istio root namespace, commonly `istio-system`.
- The Layer 7 and verification examples used HTTP methods and `curl` against database-style ports. Istio HTTP method/path matches apply to HTTP traffic, so I changed those examples to a `data-api` HTTP workload on port `8080`.
- The Kubernetes NetworkPolicy selected namespaces with `zone: application`, but the setup commands did not create that label. I added namespace labels and scoped the NetworkPolicy pod selector to the `data-api` workload used by the Layer 7 example.

## Review Notes
The Istio APIs used in the examples are current `security.istio.io/v1` and `networking.istio.io/v1` APIs. Namespace and principal based AuthorizationPolicy matches depend on peer identity from mTLS, so keeping the mTLS step is important for those examples.
