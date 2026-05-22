# Validation Summary: How to Combine Kubernetes Network Policies with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes networking
- Istio AuthorizationPolicy
- Istio sidecar proxy / Envoy
- Istio mTLS identity
- istioctl

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces and DNS naming: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Authorization Policy Normalization: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio Application Requirements / Ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Diagnose your Configuration with istioctl analyze: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post described Istio AuthorizationPolicy as purely Layer 7. Istio AuthorizationPolicy can enforce HTTP/gRPC attributes, but it can also match TCP connection attributes such as ports and source identity. Updated the opening and layer explanation to avoid overstating it as only Layer 7.
- The post implied Istio can validate JWT claims directly with AuthorizationPolicy. Istio uses RequestAuthentication to validate JWTs; AuthorizationPolicy can then authorize based on authenticated JWT claims. Updated the responsibility list accordingly.
- The NetworkPolicy example allowed egress from sidecars to istiod on ports 15012 and 15014 as control-plane communication. Istio documents 15012 as XDS and CA traffic, while 15014 is the control-plane monitoring port. Removed 15014 from the sidecar egress example and clarified the text.

## Review Notes
- The Kubernetes NetworkPolicy manifests use the current `networking.k8s.io/v1` API and valid selector syntax. The database example correctly uses a single `from` entry containing both `namespaceSelector` and `podSelector`, which means both selectors must match.
- The Istio AuthorizationPolicy manifests use the current `security.istio.io/v1` API. The empty `spec: {}` default-deny pattern and ALLOW rule examples match the official Istio semantics.
- DNS egress policy behavior can vary with CNI implementation and service IP NAT ordering, so production clusters should test DNS policy behavior with their chosen CNI.
